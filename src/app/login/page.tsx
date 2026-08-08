'use client';

import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';

type PasswordAction = 'sign-in' | 'sign-up';

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-ink-950" />}>
      <LoginForm />
    </Suspense>
  );
}

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get('redirectTo') ?? '/app';

  const [action, setAction] = useState<PasswordAction>('sign-in');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ text: string; kind: 'error' | 'success' } | null>(null);

  const supabase = getSupabaseBrowserClient();

  function switchAction(next: PasswordAction) {
    setAction(next);
    setMessage(null);
    setConfirmPassword('');
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);

    if (action === 'sign-up' && password !== confirmPassword) {
      setMessage({ text: 'Passwords do not match.', kind: 'error' });
      return;
    }

    setLoading(true);

    const { error } =
      action === 'sign-in'
        ? await supabase.auth.signInWithPassword({ email, password })
        : await supabase.auth.signUp({
            email,
            password,
            options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
          });

    if (error) {
      setLoading(false);
      setMessage({ text: error.message, kind: 'error' });
      return;
    }

    if (action === 'sign-up') {
      setLoading(false);
      setMessage({
        text: 'Check your email to confirm your account, then sign in.',
        kind: 'success',
      });
      switchAction('sign-in');
      return;
    }

    // Auto-provision wallets right after a successful sign-in. This is
    // idempotent server-side, so it's harmless to call every time — the
    // first login creates the wallets, every login after that is a no-op.
    setMessage({ text: 'Setting up your wallets…', kind: 'success' });
    try {
      await fetch('/api/wallets/provision-for-me', { method: 'POST' });
    } catch {
      // Non-fatal — the dashboard can retry this if wallets are missing.
    }

    setLoading(false);
    router.push(redirectTo);
    router.refresh();
  }

  return (
    <div className="min-h-screen bg-ink-950 flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="flex items-center gap-2 mb-10 justify-center">
          <span className="h-2 w-2 rounded-full bg-signal shadow-[0_0_8px_theme(colors.signal.DEFAULT)]" />
          <span className="font-display font-semibold tracking-tight text-lg text-paper-100">
            TelePort
          </span>
        </div>

        <div className="rounded-sm border border-ink-700 bg-ink-900 p-6">
          <h1 className="font-display text-lg font-medium mb-6 text-center">
            {action === 'sign-in' ? 'Sign in' : 'Create your account'}
          </h1>

          <form onSubmit={handleSubmit} className="space-y-4">
            <Field label="Email" type="email" value={email} onChange={setEmail} />

            <PasswordField
              label="Password"
              value={password}
              onChange={setPassword}
              visible={showPassword}
              onToggleVisible={() => setShowPassword((v) => !v)}
            />

            {action === 'sign-up' && (
              <PasswordField
                label="Confirm password"
                value={confirmPassword}
                onChange={setConfirmPassword}
                visible={showPassword}
                onToggleVisible={() => setShowPassword((v) => !v)}
              />
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-sm bg-signal px-4 py-2 text-sm font-medium text-ink-950 hover:bg-signal-glow transition-colors disabled:opacity-40"
            >
              {loading ? 'Please wait…' : action === 'sign-in' ? 'Sign in' : 'Create account'}
            </button>

            <button
              type="button"
              onClick={() => switchAction(action === 'sign-in' ? 'sign-up' : 'sign-in')}
              className="w-full text-center text-xs text-paper-500 hover:text-paper-100"
            >
              {action === 'sign-in'
                ? "Don't have an account? Sign up"
                : 'Already have an account? Sign in'}
            </button>
          </form>

          {message && (
            <p className={`mt-4 text-sm ${message.kind === 'error' ? 'text-loss' : 'text-gain'}`}>
              {message.text}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

function Field({
  label,
  type,
  value,
  onChange,
}: {
  label: string;
  type: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <label className="block">
      <span className="block text-xs text-paper-500 mb-1">{label}</span>
      <input
        type={type}
        required
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-sm border border-ink-600 bg-ink-800 px-3 py-2 text-sm text-paper-100 focus:border-signal outline-none"
      />
    </label>
  );
}

function PasswordField({
  label,
  value,
  onChange,
  visible,
  onToggleVisible,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  visible: boolean;
  onToggleVisible: () => void;
}) {
  return (
    <label className="block">
      <span className="block text-xs text-paper-500 mb-1">{label}</span>
      <div className="relative">
        <input
          type={visible ? 'text' : 'password'}
          required
          minLength={6}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full rounded-sm border border-ink-600 bg-ink-800 px-3 py-2 pr-10 text-sm text-paper-100 focus:border-signal outline-none"
        />
        <button
          type="button"
          onClick={onToggleVisible}
          tabIndex={-1}
          aria-label={visible ? 'Hide password' : 'Show password'}
          className="absolute right-0 top-0 h-full px-3 text-paper-500 hover:text-paper-100 transition-colors"
        >
          {visible ? <EyeOffIcon /> : <EyeIcon />}
        </button>
      </div>
    </label>
  );
}

function EyeIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function EyeOffIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path
        d="M17.94 17.94A10.94 10.94 0 0 1 12 20c-7 0-11-8-11-8a18.6 18.6 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.6 18.6 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M1 1l22 22" strokeLinecap="round" />
    </svg>
  );
}
