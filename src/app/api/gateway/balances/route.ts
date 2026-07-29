import { NextResponse } from 'next/server';
import { requireUser, UnauthorizedError } from '@/lib/auth/require-role';
import { getUserGatewayWalletPairs } from '@/lib/circle/user-wallets';
import {
  getPendingGatewayDeposits,
  getUnifiedBalances,
} from '@/lib/circle/gateway';

export async function GET() {
  try {
    const { user } = await requireUser();
    const wallets = await getUserGatewayWalletPairs(user.id);

    const [balances, pendingDeposits] = await Promise.all([
      getUnifiedBalances(wallets),
      getPendingGatewayDeposits(wallets),
    ]);

    return NextResponse.json({
      asset: 'USDC',
      balances,
      pendingDeposits,
      refreshedAt: new Date().toISOString(),
    });
  } catch (error) {
    const status = error instanceof UnauthorizedError ? error.status : 500;

    return NextResponse.json(
      {
        error: error instanceof Error
          ? error.message
          : 'Could not load unified balance.',
      },
      { status },
    );
  }
}