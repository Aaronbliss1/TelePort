'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';

type Balance = { chainKey: string; amount: string };
type WalletBalance = {
  chainKey: string;
  chainLabel: string;
  address: string;
  usdcBalance: string;
};

async function fetchBalances() {
  const res = await fetch('/api/gateway/balances');
  const data = await res.json() as { balances?: Balance[]; error?: string };
  if (!res.ok) throw new Error(data.error ?? 'Failed to load balance.');
  return data.balances ?? [];
}

async function fetchWalletBalances() {
  const res = await fetch('/api/wallets/balances');
  const data = await res.json() as { wallets?: WalletBalance[]; error?: string };
  if (!res.ok) return [];
  return data.wallets ?? [];
}

const chainLabels: Record<string, string> = {
  ARC_TESTNET: 'Arc Testnet',
  ETH_SEPOLIA: 'Ethereum Sepolia',
  ARB_SEPOLIA: 'Arbitrum Sepolia',
  OP_SEPOLIA: 'Optimism Sepolia',
  AVAX_FUJI: 'Avalanche Fuji',
  BASE_SEPOLIA: 'Base Sepolia',
  MATIC_AMOY: 'Polygon Amoy',
};


export default function OverviewPage() {
  const [balances, setBalances] = useState<Balance[]>([]);
  const [walletBalances, setWalletBalances] = useState<WalletBalance[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [polling, setPolling] = useState(false);
  const pollRef = useRef<NodeJS.Timeout | null>(null);
  const prevTotalRef = useRef(0);

  function stopPolling() {
    if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
    setPolling(false);
  }

  async function load(silent = false) {
    if (!silent) setRefreshing(true);
    try {
      const [b, wb] = await Promise.all([fetchBalances(), fetchWalletBalances()]);
      const t = b.reduce((s, x) => s + Number(x.amount ?? 0), 0);
      setBalances(b);
      setTotal(t);
      setWalletBalances(wb);
      setError('');
      return t;
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load balance.');
      return null;
    } finally {
      if (!silent) setRefreshing(false);
      setLoading(false);
    }
  }

  function startPolling() {
    stopPolling();
    setPolling(true);
    let attempts = 0;
    pollRef.current = setInterval(async () => {
      attempts++;
      const t = await load(true);
      if (t === null) return;
      if (t !== prevTotalRef.current || attempts >= 20) {
        stopPolling();
        prevTotalRef.current = t;
      }
    }, 4000);
  }

  useEffect(() => {
    void load(false).then((t) => {
      if (t !== null) prevTotalRef.current = t;
      const lastDeposit = sessionStorage.getItem('teleport:lastDeposit');
      if (lastDeposit && Date.now() - Number(lastDeposit) < 120_000) {
        sessionStorage.removeItem('teleport:lastDeposit');
        startPolling();
      }
    });
    return () => stopPolling();
  }, []);

  return (
    <div className="space-y-8">
      <header>
        <h1 className="font-display text-3xl font-semibold tracking-tight">Your available balance</h1>
        <p className="text-paper-500 mt-2 max-w-xl">
          USDC deposited through Gateway is spendable across Arc, Ethereum, Arbitrum, Optimism, Avalanche, Base, and Polygon testnets.
        </p>
      </header>

      {/* Unified Gateway Balance */}
      <Card className="border-signal/30">
        <CardBody className="flex items-end justify-between gap-6 flex-wrap">
          <div>
            <p className="text-paper-500 text-sm">Available unified USDC</p>
            <p className="font-display text-5xl font-semibold tabular-nums">
              {loading ? '…' : `${total.toFixed(2)} USDC`}
            </p>
            {polling && (
              <p className="text-xs text-signal mt-2 animate-pulse">
                ⟳ Waiting for Gateway to finalize deposit…
              </p>
            )}
            {error && <p className="text-xs text-loss mt-2">{error}</p>}
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => { void load(false); startPolling(); }}
              disabled={refreshing || polling}
              className="rounded-sm border border-ink-600 px-4 py-2 text-sm font-medium text-paper-400 hover:text-paper-100 disabled:opacity-50 transition-colors"
            >
              {refreshing ? 'Refreshing…' : '↻ Refresh'}
            </button>
            <Link href="/transfers" className="rounded-sm bg-signal px-4 py-2 text-sm font-medium text-ink-950">
              Send USDC
            </Link>
          </div>
        </CardBody>
      </Card>

      {/* Gateway balance per chain */}
      {balances.length > 0 && (
        <Card>
          <CardHeader>
            <p className="text-sm font-medium">Gateway balance by chain</p>
            <p className="text-xs text-paper-500 mt-0.5">Finalized USDC available to spend via Gateway</p>
          </CardHeader>
          <CardBody>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {balances.map((b) => (
                <div key={b.chainKey} className="border border-ink-700 rounded-sm px-3 py-2">
                 <p className="font-mono text-xs text-paper-500">{chainLabels[b.chainKey] ?? b.chainKey.replace(/_/g, ' ')}</p>
                  <p className="text-sm font-medium mt-1">{Number(b.amount).toFixed(2)} USDC</p>
                </div>
              ))}
            </div>
          </CardBody>
        </Card>
      )}

      {/* Wallet USDC balance per chain */}
      {walletBalances.length > 0 && (
        <Card>
          <CardHeader>
            <p className="text-sm font-medium">Wallet balance by chain</p>
            <p className="text-xs text-paper-500 mt-0.5">USDC sitting in your deposit wallets</p>
          </CardHeader>
          <CardBody>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {walletBalances.map((w) => (
                <div key={w.chainKey} className="border border-ink-700 rounded-sm px-3 py-2">
                  <p className="font-mono text-xs text-paper-500">{w.chainLabel}</p>
                  <p className="text-sm font-medium mt-1">{Number(w.usdcBalance).toFixed(2)} USDC</p>
                  
                </div>
              ))}
            </div>
            <div className="mt-4 pt-3 border-t border-ink-700 flex items-center justify-between">
              <p className="text-xs text-paper-500">
                Total in wallets: <span className="text-paper-300 font-mono">
                  {walletBalances.reduce((s, w) => s + Number(w.usdcBalance), 0).toFixed(2)} USDC
                </span>
              </p>
              <Link href="/wallets" className="text-xs text-signal hover:underline">
                Deposit to Gateway
              </Link>
            </div>
          </CardBody>
        </Card>
      )}
    </div>
  );
}