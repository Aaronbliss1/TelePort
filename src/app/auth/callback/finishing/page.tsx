'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function FinishingPage() {
  const router = useRouter();
  const [message, setMessage] = useState('Confirming your account…');

  useEffect(() => {
    (async () => {
      setMessage('Setting up your wallets…');
      try {
        await fetch('/api/wallets/provision-for-me', { method: 'POST' });
      } catch {
        // Non-fatal — the dashboard can retry this if wallets are missing.
      }
      router.push('/app');
      router.refresh();
    })();
  }, [router]);

  return (
    <div className="min-h-screen bg-ink-950 flex items-center justify-center px-4">
      <div className="text-center">
        <span className="h-2 w-2 rounded-full bg-signal shadow-[0_0_8px_theme(colors.signal.DEFAULT)] inline-block mb-4" />
        <p className="text-paper-500 text-sm">{message}</p>
      </div>
    </div>
  );
}