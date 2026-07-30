'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';

const LINKS = [
  { href: '/', label: 'Overview', glyph: '01' },
  { href: '/receive', label: 'Receive', glyph: '02' },
  { href: '/transfers', label: 'Send', glyph: '03' },
  { href: '/wallets', label: 'Wallets', glyph: '04' },
];

export default function Nav() {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = getSupabaseBrowserClient();
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setEmail(data.user?.email ?? null));
  }, [supabase]);

  async function signOut() {
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  }

  if (pathname === '/login') return null;

  return (
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

      <div className="text-xs text-paper-500 font-mono leading-relaxed space-y-3">
        <div>
          <p>Arc Testnet hub</p>
          <p className="text-signal">● connected</p>
        </div>
        {email && (
          <div className="border-t border-ink-700 pt-3">
            <p className="truncate" title={email}>
              {email}
            </p>
            <button onClick={signOut} className="text-loss hover:underline mt-1">
              Sign out
            </button>
          </div>
        )}
      </div>
    </aside>
  );
}
