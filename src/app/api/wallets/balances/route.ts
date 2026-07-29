import { NextResponse } from 'next/server';
import { requireUser } from '@/lib/auth/require-role';
import { getUserGatewayWalletPairs } from '@/lib/circle/user-wallets';
import { getWalletBalance } from '@/lib/circle/wallets';
import { CHAINS } from '@/lib/circle/chains';

export async function GET() {
  try {
    const { user } = await requireUser();
    const pairs = await getUserGatewayWalletPairs(user.id);

    const wallets = await Promise.all(
      pairs.map(async (pair) => {
        const balances = await getWalletBalance(pair.paymentWalletId).catch(() => []);
        const usdc = (balances ?? []).find(
          (b: { token?: { symbol?: string } }) => b.token?.symbol === 'USDC',
        );
        return {
          chainKey: pair.chainKey,
          chainLabel: CHAINS[pair.chainKey]?.label ?? pair.chainKey,
          address: pair.paymentAddress,
          usdcBalance: usdc?.amount ?? '0',
        };
      }),
    );

    return NextResponse.json({ wallets });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to load wallet balances.' },
      { status: 500 },
    );
  }
}