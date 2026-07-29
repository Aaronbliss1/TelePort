import type { Metadata } from 'next';
import './globals.css';
import Nav from '@/components/Nav';

export const metadata: Metadata = {
  title: 'TelePort Unified USDC',
  description: 'Managed multi-chain USDC payments, powered by Circle Gateway.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html lang="en"><body className="bg-ink-950 text-paper-100 font-body antialiased min-h-screen"><div className="flex min-h-screen"><Nav /><main className="flex-1 px-8 py-10 max-w-6xl mx-auto w-full">{children}</main></div></body></html>;
}
