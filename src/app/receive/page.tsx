'use client';

import { useEffect, useState } from 'react';
import { UNIFIED_CHAIN_KEYS } from '@/lib/circle/chains';
import Link from 'next/link';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';

interface Wallet {
  id: string;
  address: string;
  state: string;
  chainKey: string;
}

 
const labels: Record<string, string> = {
  ARC_TESTNET: 'Arc Testnet',
  ETH_SEPOLIA: 'Ethereum Sepolia',
  ARB_SEPOLIA: 'Arbitrum Sepolia',
  OP_SEPOLIA: 'Optimism Sepolia',
  AVAX_FUJI: 'Avalanche Fuji',
  BASE_SEPOLIA: 'Base Sepolia',
  MATIC_AMOY: 'Polygon Amoy',
};

export default function ReceivePage() {
  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [chainKey, setChainKey] = useState('');
  const [message, setMessage] = useState(
    'Loading your receiving addresses…',
  );
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    void load();
  }, []);

  async function load() {
    const response = await fetch('/api/wallets');
    const data = await response.json();
    const nextWallets = data.wallets ?? [];

    setWallets(nextWallets);
if (nextWallets.length > 0) {
  const arcWallet = nextWallets.find((w: Wallet) => w.chainKey === 'ARC_TESTNET');
  setChainKey(arcWallet ? arcWallet.chainKey : nextWallets[0].chainKey);
  setMessage('');
}
     else {
      setMessage(
        data.error ?? 'Set up your multi-chain wallets before receiving USDC.',
      );
    }
  }

  const wallet = wallets.find((item) => item.chainKey === chainKey);
const sortedWallets = [...wallets].sort(
  (a, b) => UNIFIED_CHAIN_KEYS.indexOf(a.chainKey as any) - UNIFIED_CHAIN_KEYS.indexOf(b.chainKey as any)
);
  async function copyAddress() {
    if (!wallet) return;

    await navigator.clipboard.writeText(wallet.address);
    setCopied(true);

    window.setTimeout(() => setCopied(false), 1800);
  }

  return (
    <div className="space-y-8">
      <header>
        <p className="font-mono text-xs text-signal mb-2">RECEIVE USDC</p>
        <h1 className="font-display text-3xl font-semibold tracking-tight">
          Receive on any supported chain
        </h1>
        <p className="text-paper-500 mt-2 max-w-xl">
          Choose the chain your sender is using, then share its matching
          address. Only send USDC on the selected testnet.
        </p>
      </header>

      {wallet ? (
        <>
          <Card>
            <CardHeader>
              <p className="text-sm font-medium">Receiving details</p>
            </CardHeader>

            <CardBody className="space-y-5 max-w-2xl">
              <label className="block">
                <span className="block text-xs text-paper-500 mb-1">
                  Network
                </span>

                <select
                  value={chainKey}
                  onChange={(event) => setChainKey(event.target.value)}
                  className="w-full rounded-sm border border-ink-600 bg-ink-800 px-3 py-2 text-sm"
                >
                 {sortedWallets.map((item) => (
  <option key={item.chainKey} value={item.chainKey}>
    {labels[item.chainKey] ?? item.chainKey}
  </option>
))}
                </select>
              </label>

              <div>
                <p className="text-xs text-paper-500 mb-1">
                  Your USDC receiving address
                </p>

                <div className="flex gap-2">
                  <p className="min-w-0 flex-1 break-all rounded-sm border border-ink-600 bg-ink-800 px-3 py-2 font-mono text-sm">
                    {wallet.address}
                  </p>

                  <button
                    onClick={copyAddress}
                    className="shrink-0 rounded-sm border border-signal px-3 py-2 text-sm text-signal"
                  >
                    {copied ? 'Copied' : 'Copy'}
                  </button>
              
                </div>
          
              </div>
              <a href="https://faucet.circle.com" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-xs text-signal hover:text-signal-glow transition-colors" > <FaucetIcon /> Get testnet USDC from Circle's faucet </a>
              
              <p className="rounded-sm border border-amber-500/30 bg-amber-500/5 px-3 py-2 text-xs text-paper-300">
                Send only USDC on {labels[chainKey] ?? chainKey}. Sending
                another asset or using a different network can result in loss
                of funds.
              </p>
            </CardBody>
          </Card>
          <Card>
            <CardHeader>
              <p className="text-sm font-medium">
                Make it spendable everywhere
              </p>
            </CardHeader>

            <CardBody>
              <p className="text-sm text-paper-500 max-w-2xl">
                Once your USDC arrives, deposit it into Gateway. After that
                chain’s finality period, it becomes part of your unified
                balance and can be sent to any supported destination chain.
              </p>

              <Link
                href="/wallets"
                className="inline-block mt-4 rounded-sm bg-signal px-4 py-2 text-sm font-medium text-ink-950"
              >
                Deposit to unified balance
              </Link>
            </CardBody>
          </Card>
        </>
      ) : (
        <Card>
          <CardBody className="space-y-4">
            <p className="text-paper-500 text-sm">{message}</p>

            <Link
              href="/wallets"
              className="inline-block rounded-sm bg-signal px-4 py-2 text-sm font-medium text-ink-950"
            >
              Set up wallets
            </Link>
          </CardBody>
        </Card>
      )}
    </div>
  );
}
function FaucetIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M12 2v6M12 2l4 4M12 2L8 6" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M5 10a7 7 0 0 0 14 0" strokeLinecap="round" />
      <path d="M5 10h14" strokeLinecap="round" />
      <circle cx="12" cy="17" r="4" strokeLinecap="round" />
    </svg>
  );
}

