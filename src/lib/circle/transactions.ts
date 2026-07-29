import { randomUUID } from 'crypto';
import { getCircleClient } from './client';
import { getWalletBalance } from './wallets';

/**
 * All on-chain operations initiated through Developer-Controlled Wallets go
 * through the same async state machine:
 *
 *   INITIATED -> CLEARED -> QUEUED -> SENT -> CONFIRMED -> COMPLETE
 *
 * or a terminal FAILED / DENIED. Never assume a transfer is done just
 * because the create call returned 200 — poll getTransaction() until you
 * hit a terminal state.
 */
export const TERMINAL_STATES = new Set(['COMPLETE', 'FAILED', 'DENIED']);

/**
 * Finds the USDC token id for a wallet by looking at what it actually
 * holds — removes the need to hunt this up manually in the Circle Console.
 * Requires the wallet to already show a USDC balance entry (even a zero
 * one); Circle only lists tokens a wallet has interacted with or that are
 * monitored by default, so an entirely untouched wallet may need funding
 * first before this resolves.
 */
export async function findUsdcTokenId(walletId: string): Promise<string> {
  const balances = await getWalletBalance(walletId);
  const usdc = balances.find((b) => b.token?.symbol === 'USDC');

  if (!usdc?.token?.id) {
    throw new Error(
      'Could not find a USDC token entry for this wallet. Fund it from the Circle faucet first, then try again.',
    );
  }

  return usdc.token.id;
}

export interface CreateTransferParams {
  /** Source wallet id (Circle wallet, not the on-chain address). */
  walletId: string;
  /** Destination on-chain address. */
  destinationAddress: string;
  /** Token id for USDC on the source wallet's chain — see listTokenBalances. */
  tokenId: string;
  /** Human amount, e.g. "25.00" — the SDK handles decimal conversion. */
  amount: string;
}

export async function createTreasuryTransfer(params: CreateTransferParams) {
  const client = getCircleClient();

  const response = await client.createTransaction({
    walletId: params.walletId,
    destinationAddress: params.destinationAddress,
    tokenId: params.tokenId,
    amount: [params.amount],
    fee: {
      type: 'level',
      config: { feeLevel: 'MEDIUM' },
    },
    idempotencyKey: randomUUID(),
  });

  return response.data;
}

export async function getTransactionStatus(transactionId: string) {
  const client = getCircleClient();
  const response = await client.getTransaction({ id: transactionId });
  return response.data?.transaction;
}

/**
 * Convenience poller for the API routes / server actions that need a
 * synchronous-feeling result. Times out after ~60s so a slow chain doesn't
 * hang a request forever — the UI should fall back to polling
 * /api/transfers/[id] on the client if this returns 'PENDING_TIMEOUT'.
 */
export async function pollUntilTerminal(transactionId: string, timeoutMs = 60_000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const tx = await getTransactionStatus(transactionId);
    if (tx?.state && TERMINAL_STATES.has(tx.state)) {
      return tx;
    }
    await new Promise((resolve) => setTimeout(resolve, 3_000));
  }
  return { state: 'PENDING_TIMEOUT' as const, id: transactionId };
}