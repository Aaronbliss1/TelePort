import { randomBytes } from 'crypto';
import {
  maxUint256,
  pad,
  zeroAddress,
  type Address,
  type Hex,
} from 'viem';
import {
  CHAINS,
  GATEWAY_API_BASE_URL,
  GATEWAY_CONTRACTS_TESTNET,
  type UnifiedChainKey,
} from './chains';
import { getCircleClient } from './client';

export interface GatewayWalletPair {
  paymentWalletId: string;
  paymentAddress: Address;
  delegateWalletId: string;
  delegateAddress: Address;
  chainKey: UnifiedChainKey;
}

export interface GatewayBalance {
  chainKey: UnifiedChainKey;
  amount: string;
}

export interface PendingGatewayDeposit {
  chainKey: UnifiedChainKey;
  transactionHash: string;
  amount: string;
  status: string;
  blockHeight: string | null;
  blockTimestamp: string | null;
}

export interface BurnAllocation {
  source: GatewayWalletPair;
  recipient: Address;
  amountAtomic: bigint;
}

const addressToBytes32 = (address: Address): Hex =>
  pad(address.toLowerCase() as Hex, { size: 32 });

const gatewayDomain = {
  name: 'GatewayWallet',
  version: '1',
};

const gatewayTypes = {
  EIP712Domain: [
    { name: 'name', type: 'string' },
    { name: 'version', type: 'string' },
  ],
  TransferSpec: [
    { name: 'version', type: 'uint32' },
    { name: 'sourceDomain', type: 'uint32' },
    { name: 'destinationDomain', type: 'uint32' },
    { name: 'sourceContract', type: 'bytes32' },
    { name: 'destinationContract', type: 'bytes32' },
    { name: 'sourceToken', type: 'bytes32' },
    { name: 'destinationToken', type: 'bytes32' },
    { name: 'sourceDepositor', type: 'bytes32' },
    { name: 'destinationRecipient', type: 'bytes32' },
    { name: 'sourceSigner', type: 'bytes32' },
    { name: 'destinationCaller', type: 'bytes32' },
    { name: 'value', type: 'uint256' },
    { name: 'salt', type: 'bytes32' },
    { name: 'hookData', type: 'bytes' },
  ],
  BurnIntent: [
    { name: 'maxBlockHeight', type: 'uint256' },
    { name: 'maxFee', type: 'uint256' },
    { name: 'spec', type: 'TransferSpec' },
  ],
};

function json(value: unknown) {
  return JSON.stringify(
    value,
    (_key, item) => (typeof item === 'bigint' ? item.toString() : item),
  );
}
async function gatewayFetch(path: string, init?: RequestInit) {
  const response = await fetch(`${GATEWAY_API_BASE_URL}${path}`, init);
  const body = (await response.json().catch(() => null)) as {
    message?: string;
  } | null;

  if (!response.ok || !body) {
    console.error(
      'Gateway API error',
      path,
      response.status,
      JSON.stringify(body, null, 2),
    );
    throw new Error(
      body?.message
        ? `${body.message} — full response: ${JSON.stringify(body)}`
        : `Gateway request failed (${response.status}).`,
    );
  }

  return body;
}

/** Returns finalized balances available for Gateway transfers. */
export async function getUnifiedBalances(
  wallets: Pick<GatewayWalletPair, 'paymentAddress' | 'chainKey'>[],
): Promise<GatewayBalance[]> {
  const body = (await gatewayFetch('/balances', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: json({
      token: 'USDC',
      sources: wallets.map((wallet) => ({
        depositor: wallet.paymentAddress,
        domain: CHAINS[wallet.chainKey].gatewayDomain,
      })),
    }),
  })) as {
    balances?: Array<{
      depositor?: string;
      domain?: string | number;
      balance?: string;
    }>;
  };

  return wallets.map((wallet) => ({
    chainKey: wallet.chainKey,
    amount:
      body.balances?.find(
        (balance) =>
          Number(balance.domain) === CHAINS[wallet.chainKey].gatewayDomain &&
          balance.depositor?.toLowerCase() ===
            wallet.paymentAddress.toLowerCase(),
      )?.balance ?? '0',
  }));
}

/** Returns deposits observed on-chain but not yet finalized by Gateway. */
export async function getPendingGatewayDeposits(
  wallets: Pick<GatewayWalletPair, 'paymentAddress' | 'chainKey'>[],
): Promise<PendingGatewayDeposit[]> {
  const body = (await gatewayFetch('/deposits', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: json({
      token: 'USDC',
      sources: wallets.map((wallet) => ({
        depositor: wallet.paymentAddress,
        domain: CHAINS[wallet.chainKey].gatewayDomain,
      })),
    }),
  })) as {
    deposits?: Array<{
      depositor?: string;
      domain?: string | number;
      transactionHash?: string;
      amount?: string;
      status?: string;
      blockHeight?: string;
      blockTimestamp?: string;
    }>;
  };

  return (body.deposits ?? []).flatMap((deposit) => {
    const chainKey = wallets.find(
      (wallet) =>
        CHAINS[wallet.chainKey].gatewayDomain === Number(deposit.domain) &&
        wallet.paymentAddress.toLowerCase() ===
          deposit.depositor?.toLowerCase(),
    )?.chainKey;

    if (!chainKey || !deposit.transactionHash || !deposit.amount) {
      return [];
    }

    return [
      {
        chainKey,
        transactionHash: deposit.transactionHash,
        amount: deposit.amount,
        status: deposit.status ?? 'pending',
        blockHeight: deposit.blockHeight ?? null,
        blockTimestamp: deposit.blockTimestamp ?? null,
      },
    ];
  });
}

/**
 * Approves USDC, deposits it into Gateway, then waits for the Circle
 * transaction to complete on-chain. Gateway finality is tracked separately
 * through getPendingGatewayDeposits and getUnifiedBalances.
 */
export async function depositIntoGateway(
  wallet: GatewayWalletPair,
  amountAtomic: bigint,
) {
  const client = getCircleClient();
  const chain = CHAINS[wallet.chainKey];

  const fee = {
    type: 'level' as const,
    config: { feeLevel: 'MEDIUM' as const },
  };

  const approve = await client.createContractExecutionTransaction({
    walletId: wallet.paymentWalletId,
    contractAddress: chain.usdcAddress,
    abiFunctionSignature: 'approve(address,uint256)',
    abiParameters: [
      GATEWAY_CONTRACTS_TESTNET.wallet,
      amountAtomic.toString(),
    ],
    fee,
  });

  if (!approve.data?.id) {
    throw new Error('Circle did not return an approval transaction ID.');
  }

  const approval = await client.getTransaction({
    id: approve.data.id,
    waitForState: 'COMPLETE',
  });

  const approvalTransactionHash = approval.data?.transaction?.txHash;
  if (!approvalTransactionHash) {
    throw new Error('USDC approval did not complete.');
  }

  const deposit = await client.createContractExecutionTransaction({
    walletId: wallet.paymentWalletId,
    contractAddress: GATEWAY_CONTRACTS_TESTNET.wallet,
    abiFunctionSignature: 'deposit(address,uint256)',
    abiParameters: [chain.usdcAddress, amountAtomic.toString()],
    fee,
  });

  if (!deposit.data?.id) {
    throw new Error('Circle did not return a Gateway deposit transaction ID.');
  }

  const completedDeposit = await client.getTransaction({
    id: deposit.data.id,
    waitForState: 'COMPLETE',
  });

  const depositTransactionHash = completedDeposit.data?.transaction?.txHash;
  if (!depositTransactionHash) {
    throw new Error(
      'Gateway deposit did not complete. Ensure the Arc wallet can pay USDC gas.',
    );
  }

  return {
    approvalTransactionId: approve.data.id,
    approvalTransactionHash,
    depositTransactionId: deposit.data.id,
    depositTransactionHash,
  };
}

function burnIntent(
  source: GatewayWalletPair,
  destination: GatewayWalletPair,
  recipient: Address,
  amountAtomic: bigint,
) {
  return {
    maxBlockHeight: maxUint256,
    maxFee: 2_010000n,
    spec: {
      version: 1,
      sourceDomain: CHAINS[source.chainKey].gatewayDomain,
      destinationDomain: CHAINS[destination.chainKey].gatewayDomain,
      sourceContract: GATEWAY_CONTRACTS_TESTNET.wallet,
      destinationContract: GATEWAY_CONTRACTS_TESTNET.minter,
      sourceToken: CHAINS[source.chainKey].usdcAddress,
      destinationToken: CHAINS[destination.chainKey].usdcAddress,
      sourceDepositor: source.paymentAddress,
      destinationRecipient: recipient,
      sourceSigner: source.delegateAddress,
      destinationCaller: zeroAddress,
      value: amountAtomic,
      salt: `0x${randomBytes(32).toString('hex')}` as Hex,
      hookData: '0x' as Hex,
    },
  };
}

function typedBurnIntent(intent: ReturnType<typeof burnIntent>) {
  return {
    types: gatewayTypes,
    domain: gatewayDomain,
    primaryType: 'BurnIntent',
    message: {
      ...intent,
      spec: {
        ...intent.spec,
        sourceContract: addressToBytes32(intent.spec.sourceContract),
        destinationContract: addressToBytes32(intent.spec.destinationContract),
        sourceToken: addressToBytes32(intent.spec.sourceToken),
        destinationToken: addressToBytes32(intent.spec.destinationToken),
        sourceDepositor: addressToBytes32(intent.spec.sourceDepositor),
        destinationRecipient: addressToBytes32(intent.spec.destinationRecipient),
        sourceSigner: addressToBytes32(intent.spec.sourceSigner),
        destinationCaller: addressToBytes32(intent.spec.destinationCaller),
      },
    },
  };
}

/** Signs burns, obtains a Gateway attestation, then submits destination mint. */
export async function executeGatewayTransfer(
  destination: GatewayWalletPair,
  allocations: BurnAllocation[],
) {
  const client = getCircleClient();

  const requests = await Promise.all(
    allocations.map(async ({ source, recipient, amountAtomic }) => {
      const typedData = typedBurnIntent(
        burnIntent(source, destination, recipient, amountAtomic),
      );

      const signed = await client.signTypedData({
        walletId: source.delegateWalletId,
        data: json(typedData),
        memo: 'TelePort unified USDC payment',
      });

      if (!signed.data?.signature) {
        throw new Error(
          `Circle did not sign the Gateway intent for ${source.chainKey}.`,
        );
      }

      return {
        burnIntent: typedData.message,
        signature: signed.data.signature,
      };
    }),
  );

  const attestation = (await gatewayFetch('/transfer', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: json(requests),
  })) as {
    attestation?: string;
    signature?: string;
    id?: string;
    message?: string;
  };

  if (!attestation.attestation || !attestation.signature) {
    throw new Error(
      attestation.message ?? 'Gateway did not return a mint attestation.',
    );
  }

  const mint = await client.createContractExecutionTransaction({
    walletId: destination.paymentWalletId,
    contractAddress: GATEWAY_CONTRACTS_TESTNET.minter,
    abiFunctionSignature: 'gatewayMint(bytes,bytes)',
    abiParameters: [attestation.attestation, attestation.signature],
    fee: {
      type: 'level',
      config: { feeLevel: 'MEDIUM' },
    },
  });

  if (!mint.data?.id) {
    throw new Error('Circle did not return a Gateway mint transaction ID.');
  }

  return {
    gatewayTransferId: attestation.id ?? null,
    mintTransactionId: mint.data.id,
  };
}