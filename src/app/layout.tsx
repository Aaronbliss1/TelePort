import type { Metadata } from 'next';
import './globals.css';
import Nav from '@/components/Nav';
import ThemeToggle from '@/components/ThemeToggle';

export const metadata: Metadata = {
  title: 'TelePort Unified USDC',
  description: 'Managed multi-chain USDC payments, powered by Circle Gateway.',
};

const themeInitScript = `
(function () {
  try {
    var stored = localStorage.getItem('teleport:theme');
    if (stored === 'light') {
      document.documentElement.classList.add('light');
    }
  } catch (e) {}
})();
`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body className="bg-ink-950 text-paper-100 font-body antialiased min-h-screen">
        <div className="fixed top-4 right-4 z-50">
          <ThemeToggle />
        </div>
        <div className="flex min-h-screen">
          <Nav />
          <main className="flex-1 px-8 py-10 max-w-6xl mx-auto w-full">{children}</main>
        </div>
      </body>
    </html>
  );
}