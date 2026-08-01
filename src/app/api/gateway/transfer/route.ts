import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import type { Address } from 'viem';
import { requireUser, UnauthorizedError } from '@/lib/auth/require-role';
import { isUnifiedChainKey } from '@/lib/circle/chains';
import { executeGatewayTransfer, getUnifiedBalances, type BurnAllocation } from '@/lib/circle/gateway';
import { getUserGatewayWalletPairs, type UserGatewayWalletPair } from '@/lib/circle/user-wallets';
import { feeForUsdcAtomic, formatUsdcAtomic, parseUsdcAtomic, parseUsdcAtomicAllowZero } from '@/lib/money';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { evmAddressSchema, usdcAmountSchema } from '@/lib/validation';

const input = z.object({
  destinationChainKey: z.string().refine(isUnifiedChainKey, 'Choose a supported destination chain.'),
  recipientAddress: evmAddressSchema,
  amount: usdcAmountSchema,
});

function feeBps() {
  const value = Number(process.env.PAYMENT_FEE_BPS ?? '100');
  if (!Number.isInteger(value) || value < 0 || value > 10_000) throw new Error('PAYMENT_FEE_BPS must be an integer from 0 to 10000.');
  return value;
}

function platformFeeRecipient(): Address | null {
  const value = process.env.PLATFORM_FEE_RECIPIENT;
  if (!value) return null;
  if (!/^0x[a-fA-F0-9]{40}$/.test(value)) throw new Error('PLATFORM_FEE_RECIPIENT must be a valid EVM address.');
  return value as Address;
}

function allocate(wallets: UserGatewayWalletPair[], balances: { chainKey: string; amount: string }[], total: bigint) {
  let remaining = total;
  const sourceAmounts: { source: UserGatewayWalletPair; amountAtomic: bigint }[] = [];
  for (const wallet of wallets) {
   const available = parseUsdcAtomicAllowZero(balances.find((balance) => balance.chainKey === wallet.chainKey)?.amount ?? '0');
    const amountAtomic = available < remaining ? available : remaining;
    if (amountAtomic > 0n) sourceAmounts.push({ source: wallet, amountAtomic });
    remaining -= amountAtomic;
    if (remaining === 0n) break;
  }
  if (remaining > 0n) throw new Error(`Insufficient unified USDC. This payment needs ${formatUsdcAtomic(total)} USDC including the platform fee.`);
  return sourceAmounts;
}

/** Splits source allocations between the recipient and the platform fee wallet.
 * Gateway permits several burn intents to be minted atomically in one call. */
function splitAllocations(sourceAmounts: { source: UserGatewayWalletPair; amountAtomic: bigint }[], recipient: Address, paymentAmount: bigint, fee: bigint, feeRecipient: Address | null): BurnAllocation[] {
  let recipientRemaining = paymentAmount;
  let feeRemaining = fee;
  const result: BurnAllocation[] = [];
  for (const allocation of sourceAmounts) {
    let remaining = allocation.amountAtomic;
    const recipientPart = remaining < recipientRemaining ? remaining : recipientRemaining;
    if (recipientPart > 0n) {
      result.push({ source: allocation.source, recipient, amountAtomic: recipientPart });
      recipientRemaining -= recipientPart;
      remaining -= recipientPart;
    }
    const feePart = remaining < feeRemaining ? remaining : feeRemaining;
    if (feePart > 0n) {
      if (!feeRecipient) throw new Error('PLATFORM_FEE_RECIPIENT is required when PAYMENT_FEE_BPS is greater than zero.');
      result.push({ source: allocation.source, recipient: feeRecipient, amountAtomic: feePart });
      feeRemaining -= feePart;
    }
  }
  if (recipientRemaining > 0n || feeRemaining > 0n) throw new Error('Could not allocate the unified balance.');
  return result;
}

export async function GET(request: NextRequest) {
  const amount = request.nextUrl.searchParams.get('amount');
  if (!amount) return NextResponse.json({ error: 'amount is required' }, { status: 400 });
  try {
    const atomic = parseUsdcAtomic(amount);
    const fee = feeForUsdcAtomic(atomic, feeBps());
    return NextResponse.json({ quote: { amount: formatUsdcAtomic(atomic), fee: formatUsdcAtomic(fee), total: formatUsdcAtomic(atomic + fee), feeBps: feeBps() } });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Invalid amount.' }, { status: 400 });
  }
}

export async function POST(request: NextRequest) {
  const idempotencyKey = request.headers.get('idempotency-key');
  const parsed = input.safeParse(await request.json().catch(() => null));
  if (!parsed.success || !idempotencyKey || !z.string().uuid().safeParse(idempotencyKey).success) {
    return NextResponse.json({ error: 'A valid payment body and Idempotency-Key UUID are required.' }, { status: 400 });
  }
  try {
    const { user } = await requireUser();
    const wallets = await getUserGatewayWalletPairs(user.id);
    const destination = wallets.find((wallet) => wallet.chainKey === parsed.data.destinationChainKey);
    if (!destination) throw new Error('Destination wallet is unavailable.');
    const amount = parseUsdcAtomic(parsed.data.amount);
    const fee = feeForUsdcAtomic(amount, feeBps());
    const total = amount + fee;
    const sourceAmounts = allocate(wallets, await getUnifiedBalances(wallets), total);
    const primarySource = sourceAmounts[0];
    if (!primarySource) throw new Error('No finalized unified USDC is available for this payment.');
    const admin = getSupabaseServerClient();
    const { data: created, error: insertError } = await admin.from('payment_intents').insert({
      user_id: user.id, source_wallet_id: primarySource.source.paymentDbId, recipient_address: parsed.data.recipientAddress,
      chain_key: destination.chainKey, transfer_kind: 'GATEWAY', amount_atomic: amount.toString(), fee_atomic: fee.toString(), total_atomic: total.toString(),
      fee_bps: feeBps(), idempotency_key: idempotencyKey,
    }).select().maybeSingle();
    let payment = created;
    if (insertError) {
      const { data: prior, error } = await admin.from('payment_intents').select().eq('user_id', user.id).eq('idempotency_key', idempotencyKey).maybeSingle();
      if (error || !prior) throw insertError;
      payment = prior;
    }
    if (!payment) throw new Error('Could not create a payment intent.');
    if (payment.circle_transaction_id || payment.status === 'CONFIRMED') return NextResponse.json({ payment, replayed: true });
    const { error: sourcesError } = await admin.from('gateway_transfer_sources').upsert(sourceAmounts.map(({ source, amountAtomic }) => ({
      payment_intent_id: payment.id, source_wallet_id: source.paymentDbId, source_chain_key: source.chainKey, amount_atomic: amountAtomic.toString(),
    })), { onConflict: 'payment_intent_id,source_wallet_id', ignoreDuplicates: true });
    if (sourcesError) throw sourcesError;
    const transfer = await executeGatewayTransfer(destination, splitAllocations(sourceAmounts, parsed.data.recipientAddress as Address, amount, fee, platformFeeRecipient()));
    const { data: submitted, error: updateError } = await admin.from('payment_intents').update({ circle_transaction_id: transfer.mintTransactionId, status: 'SUBMITTED', updated_at: new Date().toISOString() }).eq('id', payment.id).select().single();
    if (updateError) throw updateError;
    await admin.rpc('create_payment_journal', { payment_id: payment.id });
    return NextResponse.json({ payment: submitted, gatewayTransferId: transfer.gatewayTransferId, quote: { amount: formatUsdcAtomic(amount), fee: formatUsdcAtomic(fee), total: formatUsdcAtomic(total), feeBps: feeBps() } }, { status: 201 });
  } catch (error) {
    console.error('Gateway transfer POST error:', error);
    const status = error instanceof UnauthorizedError ? error.status : 500;
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Gateway payment failed.' }, { status });
  }
}