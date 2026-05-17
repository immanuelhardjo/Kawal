import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate } from 'react-router-dom';
import { env } from '../env.js';

export function SignInScreen(): JSX.Element {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch(`${env.VITE_API_BASE_URL}/auth/signin`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const body = (await res.json().catch(() => ({}))) as { code?: string; message?: string };
      if (!res.ok) {
        if (body.code === 'invalid_credentials') {
          setError(t('signin.errorInvalidCredentials'));
        } else {
          setError(t('signin.errorUnknown'));
        }
        return;
      }
      navigate('/', { replace: true });
    } catch {
      setError(t('signin.errorUnknown'));
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center px-6">
      <h1 className="font-headline text-3xl text-chalk">{t('signin.title')}</h1>
      <p className="prose-doc mt-4 text-center text-chalk-muted">{t('signin.description')}</p>
      <a
        className="mt-8 inline-flex w-full items-center justify-center rounded-md bg-amber-pin px-6 py-3 text-sm font-medium text-board hover:bg-amber-pin/90"
        href={`${env.VITE_API_BASE_URL}/auth/google/start`}
      >
        {t('signin.googleButton')}
      </a>
      <div className="mt-6 flex w-full items-center gap-3">
        <hr className="flex-1 border-rule" />
        <span className="text-xs text-chalk-muted">{t('signin.orDivider')}</span>
        <hr className="flex-1 border-rule" />
      </div>
      <form onSubmit={handleSubmit} className="mt-6 w-full space-y-4">
        <div className="flex flex-col gap-1">
          <label className="text-sm text-chalk" htmlFor="email">{t('signin.emailLabel')}</label>
          <input
            id="email"
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="rounded-md border border-rule bg-board px-3 py-2 text-sm text-chalk focus:outline-none focus:ring-2 focus:ring-amber-pin"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-sm text-chalk" htmlFor="password">{t('signin.passwordLabel')}</label>
          <input
            id="password"
            type="password"
            required
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="rounded-md border border-rule bg-board px-3 py-2 text-sm text-chalk focus:outline-none focus:ring-2 focus:ring-amber-pin"
          />
        </div>
        {error && <p className="text-sm text-stamp-disputed">{error}</p>}
        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-md bg-amber-pin px-6 py-3 text-sm font-medium text-board hover:bg-amber-pin/90 disabled:opacity-50"
        >
          {loading ? '…' : t('signin.submitButton')}
        </button>
      </form>
      <p className="mt-6 text-sm text-chalk-muted">
        <Link to="/sign-up" className="underline hover:text-chalk">{t('signin.signupLink')}</Link>
      </p>
    </main>
  );
}
