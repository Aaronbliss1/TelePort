import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireUser, UnauthorizedError } from '@/lib/auth/require-role';
import { getUserGatewayWalletPairs } from '@/lib/circle/user-wallets';
import { depositIntoGateway } from '@/lib/circle/gateway';
import { isUnifiedChainKey } from '@/lib/circle/chains';
import { parseUsdcAtomic } from '@/lib/money';
import { usdcAmountSchema } from '@/lib/validation';

const input = z.object({
  chainKey: z.string().refine(isUnifiedChainKey, 'Choose a supported source chain.'),
  amount: usdcAmountSchema,
});

export const maxDuration = 300; // allow up to 5 min for on-chain polling

export async function POST(request: NextRequest) {
  try {
    const parsed = input.safeParse(await request.json().catch(() => null));
    if (!parsed.success)
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? 'Invalid deposit.' },
        { status: 400 },
      );

    const { user } = await requireUser();
    const pairs = await getUserGatewayWalletPairs(user.id);
    const wallet = pairs.find((p) => p.chainKey === parsed.data.chainKey);
    if (!wallet)
      return NextResponse.json(
        { error: 'No wallet found for this chain. Make sure your wallets are provisioned.' },
        { status: 404 },
      );

    // Check wallet actually has USDC before attempting
    const { getWalletBalance } = await import('@/lib/circle/wallets');
    const balances = await getWalletBalance(wallet.paymentWalletId);
    const usdcBalance = balances.find((b) => b.token?.symbol === 'USDC');
    const available = Number(usdcBalance?.amount ?? '0');
    const requested = Number(parsed.data.amount);

    if (available < requested) {
      return NextResponse.json(
        { error: `Insufficient USDC. Your wallet on this chain has ${available.toFixed(2)} USDC but you requested ${requested.toFixed(2)} USDC.` },
        { status: 400 },
      );
    }
const amountAtomic = parseUsdcAtomic(parsed.data.amount);

const deposit = await depositIntoGateway(wallet, amountAtomic);

return NextResponse.json(
  {
    success: true,
    deposit,
    depositTransactionId: deposit.depositTransactionId,
    depositTransactionHash: deposit.depositTransactionHash,
    message:
      'Deposit confirmed on-chain. Waiting for Gateway finality to update the unified balance.',
  },
  { status: 202 },
);
  } catch (error) {
    const status = error instanceof UnauthorizedError ? error.status : 500;
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Gateway deposit failed.' },
      { status },
    );
  }
}