import { useTranslation } from 'react-i18next';
import { env } from '../env.js';

/**
 * Spec: user-management / "Google SSO is the sole credential".
 * Single primary button. No alternative provider, no email form.
 */
export function SignInScreen(): JSX.Element {
  const { t } = useTranslation();
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center px-6">
      <h1 className="font-serif text-3xl text-ink">{t('signin.title')}</h1>
      <p className="prose-doc mt-4 text-center text-muted">{t('signin.description')}</p>
      <a
        className="mt-8 inline-flex items-center justify-center rounded-md bg-ink px-6 py-3 text-sm font-medium text-paper hover:bg-accent"
        href={`${env.VITE_API_BASE_URL}/auth/google/start`}
      >
        {t('signin.googleButton')}
      </a>
    </main>
  );
}
