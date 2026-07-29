import { CHAINS, type ChainKey } from '@/lib/circle/chains';

export default function ChainBadge({ chainKey }: { chainKey: ChainKey | string }) {
  const chain = CHAINS[chainKey as ChainKey];

  return (
    <span className="inline-flex items-center gap-1.5 rounded-sm border border-ink-600 bg-ink-800 px-2 py-0.5 text-xs font-mono text-paper-300">
      <span className={`h-1.5 w-1.5 rounded-full ${chain ? 'bg-signal' : 'bg-paper-500'}`} />
      {chain?.label ?? chainKey}
    </span>
  );
}
