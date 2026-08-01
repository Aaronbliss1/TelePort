import { NextResponse } from 'next/server';
import { requireUser, UnauthorizedError } from '@/lib/auth/require-role';
import { getUserGatewayWalletPairs } from '@/lib/circle/user-wallets';
import { getCircleClient } from '@/lib/circle/client';
import { CHAINS, GATEWAY_CONTRACTS_TESTNET } from '@/lib/circle/chains';

export async function GET() {
  try {
    const { user } = await requireUser();
    const pairs = await getUserGatewayWalletPairs(user.id);
    const client = getCircleClient();

    const results = await Promise.all(
      pairs.map(async (pair) => {
        const chain = CHAINS[pair.chainKey];
        try {
          const response = await client.createContractExecutionTransaction({
            walletId: pair.paymentWalletId,
            contractAddress: GATEWAY_CONTRACTS_TESTNET.wallet,
            abiFunctionSignature: 'addDelegate(address,address)',
            abiParameters: [chain.usdcAddress, pair.delegateAddress],
            fee: {
              type: 'level',
              config: { feeLevel: 'MEDIUM' },
            },
          });
          return {
            chainKey: pair.chainKey,
            submitted: true,
            transactionId: response.data?.id ?? null,
            raw: response.data ?? null,
          };
        } catch (error) {
          return {
            chainKey: pair.chainKey,
            submitted: false,
            error: error instanceof Error ? error.message : String(error),
            raw: JSON.parse(JSON.stringify(error, Object.getOwnPropertyNames(error))),
          };
        }
      }),
    );

    return NextResponse.json({ results });
  } catch (error) {
    const status = error instanceof UnauthorizedError ? error.status : 500;
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Repair failed.' },
      { status },
    );
  }
}