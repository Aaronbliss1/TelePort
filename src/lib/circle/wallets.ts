import { Blockchain } from '@circle-fin/developer-controlled-wallets';
import { getCircleClient, getWalletSetId } from './client';
import {
  CHAINS,
  UNIFIED_CHAIN_LIST,
  GATEWAY_CONTRACTS_TESTNET,
  type ChainKey,
} from './chains';

export type WalletRole = 'PAYMENT' | 'GATEWAY_DELEGATE';

export interface UserWallet {
  id: string;
  address: string;
  blockchain: string;
  chainKey: ChainKey;
  state: string;
  role: WalletRole;
}

async function createWalletSet(
  userId: string,
  accountType: 'SCA' | 'EOA',
  role: WalletRole,
) {
  const response = await getCircleClient().createWallets({
    walletSetId: getWalletSetId(),
    accountType,
    blockchains: UNIFIED_CHAIN_LIST.map(
      (chain) => chain.circleBlockchain as Blockchain,
    ),
    count: 1,
   metadata: [
  {
    name:
      role === 'PAYMENT'
        ? 'TelePort payment wallet'
        : 'TelePort Gateway delegate',
    refId: 'teleport-' + role.toLowerCase() + '-' + userId,
},
],
});

const wallets = response.data?.wallets ?? [];
  
  
  if (wallets.length !== UNIFIED_CHAIN_LIST.length) {
    throw new Error('Circle did not create all requested chain wallets.');
  }

  const result: UserWallet[] = [];

  for (const wallet of wallets) {
    const chainKey = UNIFIED_CHAIN_LIST.find(
      (chain) => chain.circleBlockchain === wallet.blockchain,
    )?.key;

    if (!chainKey) continue;

    result.push({
      id: wallet.id,
      address: wallet.address,
      blockchain: wallet.blockchain,
      chainKey,
      state: wallet.state ?? 'LIVE',
      role,
    });
  }

  return result;
}

export async function provisionUserWallets(userId: string) {
  const payments = await createWalletSet(userId, 'SCA', 'PAYMENT');
  const delegates = await createWalletSet(
    userId,
    'EOA',
    'GATEWAY_DELEGATE',
  );

  const delegateByChain = new Map(
    delegates.map((wallet) => [wallet.chainKey, wallet]),
  );

  const delegateAuthorizations = await Promise.all(
    payments.map(async (wallet) => {
     
       const delegate = delegateByChain.get(wallet.chainKey);
const delegateAddress = delegate?.address;

if (!delegateAddress) {
  throw new Error(
    'Missing Gateway delegate for ' + wallet.chainKey + '.',
  );
}

const chain = CHAINS[wallet.chainKey];

try {
  const response =
    await getCircleClient().createContractExecutionTransaction({
      walletId: wallet.id,
      contractAddress: GATEWAY_CONTRACTS_TESTNET.wallet,
      abiFunctionSignature: 'addDelegate(address,address)',
      abiParameters: [chain.usdcAddress, delegateAddress],
      fee: {
        type: 'level',
        config: { feeLevel: 'MEDIUM' },
      },
    });

  const transactionId = response.data?.id;

  if (!transactionId) {
    throw new Error('Circle did not return a transaction ID.');
  }

  return {
    chainKey: wallet.chainKey,
    transactionId,
    submitted: true,
  };
      } catch (error) {
        return {
          chainKey: wallet.chainKey,
          transactionId: null,
          submitted: false,
          error:
            error instanceof Error
              ? error.message
              : 'Delegate authorization could not be submitted.',
        };
      }
    }),
  );

  return { payments, delegates, delegateAuthorizations };
}

export async function getWalletBalance(walletId: string) {
  const response = await getCircleClient().getWalletTokenBalance({
    id: walletId,
    includeAll: true,
  });

  return response.data?.tokenBalances ?? [];
}