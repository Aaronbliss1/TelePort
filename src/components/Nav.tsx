'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import ThemeToggle from '@/components/ThemeToggle';
const LINKS = [
  { href: '/app', label: 'Overview' },
  { href: '/receive', label: 'Receive' },
  { href: '/transfers', label: 'Send' },
  { href: '/wallets', label: 'Wallets' },
];

export default function Nav() {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = getSupabaseBrowserClient();
  const [email, setEmail] = useState<string | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setEmail(data.user?.email ?? null));
  }, [supabase]);

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  async function signOut() {
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  }

  if (pathname === '/login' || pathname === '/') return null;

  const settingsBlock = (
    <div className="text-xs text-paper-500 font-mono leading-relaxed space-y-3">
      <div>
        <p className="text-signal">● Live on Arc Testnet</p>
      </div>
      <div className="border-t border-ink-700 pt-3">
        <button
          onClick={() => setSettingsOpen((open) => !open)}
          className="text-paper-500 hover:text-paper-100 transition-colors"
        >
          Settings
        </button>
        {settingsOpen && email && (
          <div className="mt-2">
            <p className="truncate" title={email}>
              Email: {email}
            </p>
            <button onClick={signOut} className="text-loss hover:underline mt-1">
              Sign out
            </button>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="w-60 shrink-0 border-r border-ink-700 px-6 py-10 hidden md:flex md:flex-col md:justify-between">
        <div>
          <Link href="/" className="flex items-center gap-2 mb-12">
            <span className="h-2 w-2 rounded-full bg-signal shadow-[0_0_8px_theme(colors.signal.DEFAULT)]" />
            <span className="font-display font-semibold tracking-tight text-lg">TelePort</span>
          </Link>

          <nav className="space-y-1">
            {LINKS.map((link) => {
              const active = pathname === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`flex items-center gap-3 rounded-sm px-3 py-2 text-sm transition-colors ${
                    active
                      ? 'bg-ink-800 text-paper-100'
                      : 'text-paper-500 hover:text-paper-100 hover:bg-ink-900'
                  }`}
                >
                  {link.label}
                </Link>
              );
            })}
          </nav>
        </div>
        {settingsBlock}
      </aside>

      {/* Mobile top bar */}
      <div className="md:hidden sticky top-0 z-40 border-b border-ink-700 bg-ink-950 relative">
        <div className="flex items-center justify-between px-4 py-4">
          <Link href="/app" className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-signal shadow-[0_0_8px_theme(colors.signal.DEFAULT)]" />
            <span className="font-display font-semibold tracking-tight text-lg">TelePort</span>
          </Link>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <button
              onClick={() => setMobileOpen((open) => !open)}
              aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
              className="flex h-9 w-9 items-center justify-center rounded-sm border border-ink-600 text-paper-300"
            >
            {mobileOpen ? (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            ) : (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="3" y1="6" x2="21" y2="6" />
                <line x1="3" y1="12" x2="21" y2="12" />
                <line x1="3" y1="18" x2="21" y2="18" />
              </svg>
           )}
            </button>
          </div>
        </div>

        {mobileOpen && (
     <div className="absolute top-full left-0 right-0 border-t border-ink-700 bg-ink-950 px-4 py-4 space-y-4 shadow-lg">
            <nav className="space-y-1">
              {LINKS.map((link) => {
                const active = pathname === link.href;
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={`block rounded-sm px-3 py-2 text-sm transition-colors ${
                      active
                        ? 'bg-ink-800 text-paper-100'
                        : 'text-paper-500 hover:text-paper-100 hover:bg-ink-900'
                    }`}
                  >
                    {link.label}
                  </Link>
                );
              })}
            </nav>
            {settingsBlock}
          </div>
        )}
      </div>
    </>
  );
}