import { NextResponse } from 'next/server';
import { requireUser, UnauthorizedError } from '@/lib/auth/require-role';
import { getUserGatewayWalletPairs } from '@/lib/circle/user-wallets';
import { getCircleClient } from '@/lib/circle/client';
import { GATEWAY_CONTRACTS_TESTNET } from '@/lib/circle/chains';

export async function GET() {
  try {
    const { user } = await requireUser();
    const pairs = await getUserGatewayWalletPairs(user.id);
    const client = getCircleClient();

    const report = await Promise.all(
      pairs.map(async (pair) => {
        const result = await client.listTransactions({
          walletIds: [pair.paymentWalletId],
          operation: 'CONTRACT_EXECUTION',
        });

        const allTxs = (result.data?.transactions ?? []).map((tx) => ({
          id: tx.id,
          state: tx.state,
          txHash: tx.txHash,
          contractAddress: tx.contractAddress ?? null,
          abiFunctionSignature: tx.abiFunctionSignature ?? null,
          errorReason: tx.errorReason ?? null,
          createDate: tx.createDate,
        }));

        return {
          chainKey: pair.chainKey,
          paymentAddress: pair.paymentAddress,
          delegateAddress: pair.delegateAddress,
          gatewayWalletContract: GATEWAY_CONTRACTS_TESTNET.wallet,
          allContractExecutions: allTxs,
        };
      }),
    );

    return NextResponse.json({ report });
  } catch (error) {
    const status = error instanceof UnauthorizedError ? error.status : 500;
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : 'Could not load delegate status.',
      },
      { status },
    );
  }
}