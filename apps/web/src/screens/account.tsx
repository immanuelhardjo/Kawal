import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { api } from '../api/client.js';
import { useAuthenticatedUser } from '../auth/auth-guard.js';

export function AccountScreen(): JSX.Element {
  const user = useAuthenticatedUser();
  const { t } = useTranslation();
  const [confirming, setConfirming] = useState(false);

  async function handleSignOut() {
    await api.signOut();
    window.location.href = '/sign-in';
  }

  async function handleDelete() {
    await api.deleteAccount();
    window.location.href = '/sign-in';
  }

  return (
    <main className="mx-auto max-w-2xl p-6">
      <h1 className="font-serif text-2xl text-ink">{t('account.title')}</h1>
      <dl className="mt-6 grid grid-cols-[max-content_1fr] gap-x-4 gap-y-3 text-sm">
        <dt className="text-muted">{t('account.displayName')}</dt>
        <dd className="text-ink">{user.displayName}</dd>
        <dt className="text-muted">{t('account.email')}</dt>
        <dd className="text-ink">{user.email}</dd>
      </dl>

      <div className="mt-8 flex flex-wrap gap-3">
        <a
          className="rounded-md border border-rule px-4 py-2 text-sm text-ink hover:border-ink/40"
          href={api.exportDossierUrl}
        >
          {t('account.export')}
        </a>
        <button
          type="button"
          className="rounded-md border border-rule px-4 py-2 text-sm text-ink hover:border-ink/40"
          onClick={() => void handleSignOut()}
        >
          {t('account.signOut')}
        </button>
        <button
          type="button"
          className="rounded-md border border-certainty-disputed/40 px-4 py-2 text-sm text-certainty-disputed hover:bg-certainty-disputed/5"
          onClick={() => setConfirming(true)}
        >
          {t('account.delete')}
        </button>
      </div>

      {confirming ? (
        <div className="mt-6 rounded-md border border-rule bg-paper p-4">
          <p className="text-sm text-ink">{t('account.deleteConfirm')}</p>
          <div className="mt-3 flex gap-3">
            <button
              type="button"
              className="rounded-md border border-rule px-3 py-1.5 text-sm"
              onClick={() => setConfirming(false)}
            >
              {t('common.cancel')}
            </button>
            <button
              type="button"
              className="rounded-md bg-certainty-disputed px-3 py-1.5 text-sm text-paper"
              onClick={() => void handleDelete()}
            >
              {t('common.confirm')}
            </button>
          </div>
        </div>
      ) : null}
    </main>
  );
}
