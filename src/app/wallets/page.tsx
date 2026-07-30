'use client';

import { useEffect, useState } from 'react';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';

type Wallet = {
  id: string;
  address: string;
  state: string;
  chainKey: string;
  blockchain: string;
  accountType: string;
};

type Provisioning = {
  status: 'PROVISIONING' | 'READY' | 'FAILED';
  last_error: string | null;
  updated_at: string;
};

type GatewayBalance = {
  chainKey: string;
  amount: string;
};

type PendingGatewayDeposit = {
  chainKey: string;
  transactionHash: string;
  amount: string;
  status: string;
  blockHeight: string | null;
  blockTimestamp: string | null;
};

const CHAIN_LABELS: Record<string, string> = {
  ARC_TESTNET: 'Arc Testnet',
  ETH_SEPOLIA: 'Ethereum Sepolia',
  ARB_SEPOLIA: 'Arbitrum Sepolia',
  OP_SEPOLIA: 'OP Sepolia',
  AVAX_FUJI: 'Avalanche Fuji',
  BASE_SEPOLIA: 'Base Sepolia',
  MATIC_AMOY: 'Polygon Amoy',
};

function chainLabel(chainKey: string) {
  return CHAIN_LABELS[chainKey] ?? chainKey;
}

function shortHash(value: string) {
  return `${value.slice(0, 10)}…${value.slice(-8)}`;
}

export default function WalletsPage() {
  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [provisioning, setProvisioning] = useState<Provisioning | null>(null);
  const [balances, setBalances] = useState<GatewayBalance[]>([]);
  const [pendingDeposits, setPendingDeposits] = useState<
    PendingGatewayDeposit[]
  >([]);
  const [chainKey, setChainKey] = useState('ARC_TESTNET');
  const [amount, setAmount] = useState('');
  const [message, setMessage] = useState(
    'Loading your Arc Testnet wallet…',
  );
  const [submitting, setSubmitting] = useState(false);
  const [provisioningWallets, setProvisioningWallets] = useState(false);

  async function loadWallets() {
    const response = await fetch('/api/wallets');
    const data = await response.json();

    if (!response.ok) {
      setMessage(data.error ?? 'Could not load wallets.');
      return;
    }

    const nextWallets = (data.wallets ?? []) as Wallet[];
    setWallets(nextWallets);
    setProvisioning(data.provisioning ?? null);

    const firstWallet = nextWallets[0];

if (firstWallet) {
  const arcWallet = nextWallets.find(
    (wallet) => wallet.chainKey === 'ARC_TESTNET',
  );

  setChainKey(arcWallet?.chainKey ?? firstWallet.chainKey);
  setMessage('');
}
  }

  async function refreshGatewayStatus() {
    const response = await fetch('/api/gateway/balances');
    const data = await response.json();

    if (!response.ok) {
      return;
    }

    setBalances(data.balances ?? []);
    setPendingDeposits(data.pendingDeposits ?? []);
  }

  useEffect(() => {
    void loadWallets();
  }, []);

  useEffect(() => {
    if (wallets.length === 0) {
      return;
    }

    void refreshGatewayStatus();

    const interval = window.setInterval(() => {
      void refreshGatewayStatus();
    }, 3_000);

    return () => window.clearInterval(interval);
  }, [wallets.length]);

  async function provision() {
    setProvisioningWallets(true);
    setMessage('Setting up your SCA wallets and Gateway signing delegates…');

    try {
      const response = await fetch('/api/wallets/provision-for-me', {
        method: 'POST',
      });
      const data = await response.json();

      if (!response.ok && response.status !== 202) {
        throw new Error(data.error ?? 'Wallet setup failed.');
      }

      setMessage(
        data.message ??
          'Wallet setup started. This page will refresh automatically.',
      );

      await loadWallets();
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : 'Wallet setup failed.',
      );
    } finally {
      setProvisioningWallets(false);
    }
  }

  async function deposit(event: React.FormEvent) {
    event.preventDefault();

    setSubmitting(true);
    setMessage(`Submitting ${chainLabel(chainKey)} Gateway deposit…`);

    try {
      const response = await fetch('/api/gateway/deposit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chainKey, amount }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error ?? 'Gateway deposit failed.');
      }

      const transactionHash = data.deposit?.depositTransactionHash;

      setMessage(
        transactionHash
          ? `Deposit confirmed on-chain. Waiting for Gateway finality: ${shortHash(transactionHash)}`
          : data.message ??
              'Deposit submitted. Waiting for Gateway finality.',
      );

      setAmount('');
      await refreshGatewayStatus();
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : 'Gateway deposit failed.',
      );
    } finally {
      setSubmitting(false);
    }
  }

  const selectedBalance =
    balances.find((balance) => balance.chainKey === chainKey)?.amount ?? '0';

  const arcWallet = wallets.find(
    (wallet) => wallet.chainKey === 'ARC_TESTNET',
  );

  return (
    <div className="space-y-8">
      <header>
        <h1 className="font-display text-3xl font-semibold tracking-tight">
          Fund your unified balance
        </h1>
        <p className="mt-2 max-w-xl text-paper-500">
          Deposit USDC from your wallet into your unified balance. Send across
          supported chains without worrying about native gas fees.
        </p>
      </header>

      <Card className="border-signal/30">
        <CardBody>
          {arcWallet ? (
            <div className="space-y-2">
              <p className="text-xs text-paper-500">
                Your wallet address
              </p>
              <p className="break-all font-mono text-sm">{arcWallet.address}</p>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-paper-500">
                {provisioning?.status === 'FAILED'
                  ? provisioning.last_error ?? 'Wallet provisioning failed.'
                  : provisioning?.status === 'PROVISIONING'
                    ? 'Wallet provisioning is in progress.'
                    : 'Create your managed SCA wallet to start using Gateway.'}
              </p>

              <button
                type="button"
                onClick={provision}
                disabled={provisioningWallets}
                className="rounded-sm bg-signal px-4 py-2 text-sm font-medium text-ink-950 disabled:opacity-40"
              >
                {provisioningWallets
                  ? 'Setting up wallet…'
                  : 'Set up Arc wallet'}
              </button>
            </div>
          )}
        </CardBody>
      </Card>

      {wallets.length > 0 && (
        <>
          
          <Card>
            <CardHeader>
              <p className="text-sm font-medium">Deposit USDC into Gateway</p>
            </CardHeader>
            <CardBody>
              <form onSubmit={deposit} className="max-w-lg space-y-4">
                <label className="block">
                  <span className="mb-1 block text-xs text-paper-500">
                    Source chain
                  </span>
                  <select
                    value={chainKey}
                    onChange={(event) => setChainKey(event.target.value)}
                    className="w-full rounded-sm border border-ink-600 bg-ink-800 px-3 py-2 text-sm"
                  >
                    {wallets.map((wallet) => (
                      <option key={wallet.chainKey} value={wallet.chainKey}>
                        {chainLabel(wallet.chainKey)}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="block">
                  <span className="mb-1 block text-xs text-paper-500">
                    USDC amount
                  </span>
                  <input
                    required
                    inputMode="decimal"
                    value={amount}
                    onChange={(event) => setAmount(event.target.value)}
                    placeholder="25.00"
                    className="w-full rounded-sm border border-ink-600 bg-ink-800 px-3 py-2 font-mono text-sm"
                  />
                </label>

                <button
                  type="submit"
                  disabled={submitting}
                  className="rounded-sm bg-signal px-4 py-2 text-sm font-medium text-ink-950 disabled:opacity-40"
                >
                  {submitting
                    ? 'Submitting deposit…'
                    : 'Deposit to unified balance'}
                </button>

                {message && (
                  <p className="text-sm text-paper-500">{message}</p>
                )}
              </form>
            </CardBody>
          </Card>

          
        </>
      )}
    </div>
  );
}
