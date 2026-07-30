'use client';

import { useEffect, useRef, useState } from 'react';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';

const CHAINS = [
  ['ARC_TESTNET', 'Arc Testnet'], ['ETH_SEPOLIA', 'Ethereum Sepolia'], ['ARB_SEPOLIA', 'Arbitrum Sepolia'], ['OP_SEPOLIA', 'Optimism Sepolia'],
  ['AVAX_FUJI', 'Avalanche Fuji'], ['BASE_SEPOLIA', 'Base Sepolia'], ['MATIC_AMOY', 'Polygon Amoy'],
] as const;

export default function TransfersPage() {
  const [recipient, setRecipient] = useState('');
  const [amount, setAmount] = useState('');
  const [destinationChainKey, setDestinationChainKey] = useState<(typeof CHAINS)[number][0]>('BASE_SEPOLIA');
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [quote, setQuote] = useState<{ fee: string; total: string } | null>(null);
  const key = useRef(crypto.randomUUID());
  useEffect(() => {
    if (!amount) { setQuote(null); return; }
    const timer = setTimeout(() => fetch(`/api/gateway/transfer?amount=${encodeURIComponent(amount)}`).then((response) => response.json()).then((data) => setQuote(data.quote ?? null)).catch(() => setQuote(null)), 250);
    return () => clearTimeout(timer);
  }, [amount]);
  async function submit(event: React.FormEvent) {
    event.preventDefault(); setSubmitting(true); setError(null); setMessage(null);
    try {
      const response = await fetch('/api/gateway/transfer', { method: 'POST', headers: { 'Content-Type': 'application/json', 'Idempotency-Key': key.current }, body: JSON.stringify({ recipientAddress: recipient.trim(), amount, destinationChainKey }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? 'Payment could not be submitted.');
      setMessage(`Payment submitted to ${CHAINS.find(([key]) => key === destinationChainKey)?.[1]}. ${data.quote?.total ?? amount} USDC was allocated from your unified balance.`);
      setAmount(''); key.current = crypto.randomUUID();
    } catch (err) { setError(err instanceof Error ? err.message : 'Payment failed.'); }
    finally { setSubmitting(false); }
  }
  return <div className="space-y-8"><header><p className="font-mono text-xs text-signal mb-2"></p><h1 className="font-display text-3xl font-semibold tracking-tight">Send USDC Anywhere</h1><p className="text-paper-500 mt-2 max-w-xl">Gateway automatically draws from your finalized balances across supported chains and mints USDC on the destination chain.</p></header>
    <Card><CardHeader><p className="text-sm font-medium">New payment</p></CardHeader><CardBody><form onSubmit={submit} className="space-y-4 max-w-lg">
      <label className="block"><span className="block text-xs text-paper-500 mb-1">Recipient EVM address</span><input value={recipient} onChange={(event) => setRecipient(event.target.value)} required placeholder="0x…" className="w-full rounded-sm border border-ink-600 bg-ink-800 px-3 py-2 text-sm font-mono" /></label>
      <label className="block"><span className="block text-xs text-paper-500 mb-1">Destination chain</span><select value={destinationChainKey} onChange={(event) => setDestinationChainKey(event.target.value as typeof destinationChainKey)} className="w-full rounded-sm border border-ink-600 bg-ink-800 px-3 py-2 text-sm">{CHAINS.map(([key, label]) => <option value={key} key={key}>{label}</option>)}</select></label>
      <label className="block"><span className="block text-xs text-paper-500 mb-1">Amount (USDC)</span><input value={amount} onChange={(event) => setAmount(event.target.value)} required inputMode="decimal" placeholder="25.00" className="w-full rounded-sm border border-ink-600 bg-ink-800 px-3 py-2 text-sm font-mono" /></label>
      {quote && <p className="text-xs text-paper-500">Platform fee: <span className="font-mono text-paper-300">{quote.fee} USDC</span> · Total debit: <span className="font-mono text-paper-300">{quote.total} USDC</span></p>}
      <button type="submit" disabled={submitting} className="rounded-sm bg-signal px-4 py-2 text-sm font-medium text-ink-950 disabled:opacity-40">{submitting ? 'Submitting…' : 'Send from unified balance'}</button>
      {message && <p className="text-gain text-sm">{message}</p>}{error && <p className="text-loss text-sm">{error}</p>}
    </form></CardBody></Card></div>;
}
