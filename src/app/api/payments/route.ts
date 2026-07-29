import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireOwnWallet, UnauthorizedError } from '@/lib/auth/require-role';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { createTreasuryTransfer, findUsdcTokenId } from '@/lib/circle/transactions';
import { getWalletBalance } from '@/lib/circle/wallets';
import { evmAddressSchema, usdcAmountSchema } from '@/lib/validation';
import { feeForUsdcAtomic, formatUsdcAtomic, parseUsdcAtomic } from '@/lib/money';

const paymentSchema = z.object({ walletId: z.string().min(1), recipientAddress: evmAddressSchema, amount: usdcAmountSchema });
const feeBps = () => {
  const value = Number(process.env.PAYMENT_FEE_BPS ?? '100');
  if (!Number.isInteger(value) || value < 0 || value > 10_000) throw new Error('PAYMENT_FEE_BPS must be an integer from 0 to 10000.');
  return value;
};

export async function GET(request: NextRequest) {
  const amount = request.nextUrl.searchParams.get('amount');
  if (!amount) return NextResponse.json({ error: 'amount is required' }, { status: 400 });
  try {
    const atomic = parseUsdcAtomic(amount);
    const appliedFeeBps = feeBps();
    const fee = feeForUsdcAtomic(atomic, appliedFeeBps);
    return NextResponse.json({ quote: { amount: formatUsdcAtomic(atomic), fee: formatUsdcAtomic(fee), total: formatUsdcAtomic(atomic + fee), feeBps: appliedFeeBps } });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Invalid amount' }, { status: 400 });
  }
}

export async function POST(request: NextRequest) {
  const idempotencyKey = request.headers.get('idempotency-key');
  const parsed = paymentSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success || !idempotencyKey || !z.string().uuid().safeParse(idempotencyKey).success) {
    return NextResponse.json({ error: 'A valid payment body and Idempotency-Key UUID are required.' }, { status: 400 });
  }
  try {
    const { user, wallet } = await requireOwnWallet(parsed.data.walletId);
    if (wallet.chain_key !== 'ARC_TESTNET') return NextResponse.json({ error: 'Payments are available on Arc only.' }, { status: 400 });
    const amount = parseUsdcAtomic(parsed.data.amount);
    const appliedFeeBps = feeBps();
    const fee = feeForUsdcAtomic(amount, appliedFeeBps);
    const total = amount + fee;
    const admin = getSupabaseServerClient();

    const intentPayload = {
      user_id: user.id, source_wallet_id: wallet.id, recipient_address: parsed.data.recipientAddress,
      amount_atomic: amount.toString(), fee_atomic: fee.toString(), total_atomic: total.toString(),
      fee_bps: appliedFeeBps, idempotency_key: idempotencyKey,
    };
    const { data: created, error: insertError } = await admin.from('payment_intents').insert(intentPayload).select().maybeSingle();
    let intent = created;
    if (insertError) {
      const { data: prior, error: priorError } = await admin.from('payment_intents').select().eq('user_id', user.id).eq('idempotency_key', idempotencyKey).maybeSingle();
      if (priorError || !prior) throw insertError;
      intent = prior;
    }
    if (!intent) throw new Error('Could not create payment intent.');
    if (intent.circle_transaction_id || intent.status === 'CONFIRMED') return NextResponse.json({ payment: intent, replayed: true });
    if (intent.status === 'FAILED') return NextResponse.json({ payment: intent }, { status: 409 });

    try {
      const balances = await getWalletBalance(parsed.data.walletId);
      const usdc = balances.find((entry) => entry.token?.symbol === 'USDC');
      const available = usdc?.amount ? parseUsdcAtomic(usdc.amount) : 0n;
      if (available < total) {
        return NextResponse.json({ error: `Insufficient USDC. This payment needs ${formatUsdcAtomic(total)} USDC including the platform fee.` }, { status: 409 });
      }
      const tokenId = await findUsdcTokenId(parsed.data.walletId);
      const transaction = await createTreasuryTransfer({ walletId: parsed.data.walletId, destinationAddress: parsed.data.recipientAddress, tokenId, amount: formatUsdcAtomic(amount) });
      if (!transaction?.id) throw new Error('Circle did not return a transaction ID.');
      const { data: submitted, error: updateError } = await admin.from('payment_intents')
        .update({ circle_transaction_id: transaction.id, status: transaction.state === 'COMPLETE' ? 'CONFIRMED' : 'SUBMITTED', updated_at: new Date().toISOString() })
        .eq('id', intent.id).select().single();
      if (updateError) throw updateError;
      await admin.rpc('create_payment_journal', { payment_id: intent.id });
      return NextResponse.json({ payment: submitted, quote: { amount: formatUsdcAtomic(amount), fee: formatUsdcAtomic(fee), total: formatUsdcAtomic(total), feeBps: appliedFeeBps } }, { status: 201 });
    } catch (error) {
      await admin.from('payment_intents').update({ status: 'FAILED', failure_reason: error instanceof Error ? error.message : 'Submission failed', updated_at: new Date().toISOString() }).eq('id', intent.id);
      throw error;
    }
  } catch (error) {
    if (error instanceof UnauthorizedError) return NextResponse.json({ error: error.message }, { status: error.status });
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Payment failed' }, { status: 500 });
  }
}
