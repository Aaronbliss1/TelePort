import Link from 'next/link';

const CHAINS = ['Arc', 'Ethereum', 'Arbitrum', 'Optimism', 'Avalanche', 'Base', 'Polygon'];

const PROBLEMS = [
  {
    title: 'Balances scatter across chains',
    body: "USDC on Base can't pay an invoice that expects Avalanche. Every chain is its own ledger, so teams end up tracking six wallets to know what they actually have.",
  },
  {
    title: 'Every chain wants its own gas',
    body: 'Sending a payment means holding ETH, AVAX, MATIC, or whatever that destination happens to charge — tokens with no purpose beyond the transaction fee.',
  },
  {
    title: 'Bridging is the workaround, not the fix',
    body: 'Moving funds chain to chain means a bridge, a wait, and a second asset to trust — friction that shows up on every payment, not just the first one.',
  },
];

const STEPS = [
  {
    n: '01',
    title: 'Deposit once',
    body: 'Send USDC from any of your wallets into Circle Gateway. It settles and finalizes on its source chain — no bridging step for you to manage.',
  },
  {
    n: '02',
    title: 'It becomes one balance',
    body: 'Every deposit, on any supported chain, rolls up into a single unified USDC balance you can see and spend from one place.',
  },
  {
    n: '03',
    title: 'Send anywhere, mint natively',
    body: 'Pick a destination chain and an amount. Gateway draws from your unified balance and mints real USDC directly on the chain your recipient uses.',
  },
];

export default function LandingPage() {
  return (
    <div>
      <header className="flex items-center justify-between py-6">
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-signal shadow-[0_0_8px_theme(colors.signal.DEFAULT)]" />
          <span className="font-display font-semibold tracking-tight text-lg">TelePort</span>
        </div>
        <Link
          href="/app"
          className="rounded-sm bg-signal px-4 py-2 text-sm font-medium text-ink-950"
        >
          Launch app
        </Link>
      </header>

      <div className="space-y-24 pb-16">
        <section className="pt-6 md:pt-10">
          <p className="font-mono text-xs text-signal mb-4">UNIFIED USDC</p>
          <h1 className="font-display text-4xl md:text-6xl font-semibold tracking-tight max-w-3xl">
            One USDC balance.
            <br />
            Every chain it needs to be on.
          </h1>
          <p className="text-paper-500 mt-6 max-w-xl text-lg">
            Stablecoin liquidity today is scattered across a growing number of blockchains.
            TelePort collapses it back into one balance, spendable anywhere, powered by Circle
            Gateway.
          </p>
          <div className="mt-8 flex items-center gap-4">
            <Link
              href="/app"
              className="rounded-sm bg-signal px-5 py-2.5 text-sm font-medium text-ink-950"
            >
              Launch app
            </Link>
          </div>

          <div className="mt-14 rounded-sm border border-ink-700 bg-ink-900 p-6 md:p-8">
            <div className="flex flex-wrap gap-3">
              {[
                ['Arc', '5.00'],
                ['Base', '0.00'],
                ['Avalanche', '5.00'],
                ['Ethereum', '0.00'],
                ['Arbitrum', '0.00'],
                ['Polygon', '0.00'],
              ].map(([chain, amt]) => (
                <div key={chain} className="border border-ink-700 rounded-sm px-3 py-2">
                  <p className="font-mono text-xs text-paper-500">{chain}</p>
                  <p className="text-sm font-medium mt-1">{amt} USDC</p>
                </div>
              ))}
            </div>
            <div className="mt-6 pt-6 border-t border-ink-700 flex items-end justify-between flex-wrap gap-4">
              <div>
                <p className="text-paper-500 text-sm">Available unified USDC</p>
                <p className="font-display text-4xl font-semibold tabular-nums">10.00 USDC</p>
              </div>
              <p className="text-xs text-paper-500 max-w-xs">
                Six chain balances, one number — this is what your dashboard actually looks like.
              </p>
            </div>
          </div>
        </section>

        <section>
          <p className="font-mono text-xs text-signal mb-2">THE PROBLEM</p>
          <h2 className="font-display text-2xl md:text-3xl font-semibold tracking-tight max-w-2xl">
            Multi-chain USDC shouldn't mean multi-chain busywork
          </h2>
          <div className="mt-8 grid gap-4 md:grid-cols-3">
            {PROBLEMS.map((p) => (
              <div key={p.title} className="rounded-sm border border-ink-700 bg-ink-900 p-5">
                <h3 className="font-medium text-paper-100">{p.title}</h3>
                <p className="text-sm text-paper-500 mt-2 leading-relaxed">{p.body}</p>
              </div>
            ))}
          </div>
        </section>

        <section>
          <p className="font-mono text-xs text-signal mb-2">HOW IT WORKS</p>
          <h2 className="font-display text-2xl md:text-3xl font-semibold tracking-tight max-w-2xl">
            Three steps. One balance.
          </h2>
          <div className="mt-8 space-y-4">
            {STEPS.map((s) => (
              <div
                key={s.n}
                className="rounded-sm border border-ink-700 bg-ink-900 p-5 flex gap-5 items-start"
              >
                <span className="font-mono text-xs text-signal pt-1">{s.n}</span>
                <div>
                  <h3 className="font-medium text-paper-100">{s.title}</h3>
                  <p className="text-sm text-paper-500 mt-1 leading-relaxed max-w-xl">{s.body}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section>
          <p className="font-mono text-xs text-signal mb-4">SUPPORTED CHAINS</p>
          <div className="flex flex-wrap gap-3">
            {CHAINS.map((chain) => (
              <span
                key={chain}
                className="font-mono text-xs text-paper-500 border border-ink-700 rounded-sm px-3 py-1.5"
              >
                {chain}
              </span>
            ))}
          </div>
        </section>

        <section className="rounded-sm border border-ink-700 bg-ink-900 p-8 md:p-10 text-center">
          <h2 className="font-display text-2xl md:text-3xl font-semibold tracking-tight">
            Stop tracking six wallets
          </h2>
          <p className="text-paper-500 mt-3 max-w-lg mx-auto">
            Create an account and deposit your first USDC into a single, unified balance.
          </p>
          <Link
            href="/app"
            className="inline-block mt-6 rounded-sm bg-signal px-6 py-2.5 text-sm font-medium text-ink-950"
          >
            Launch app
          </Link>
          <p className="text-xs text-paper-500 mt-6">
            TelePort runs on public testnets. USDC here has no real-world value.
          </p>
        </section>
      </div>
    </div>
  );
}