import type { CaseDto } from '@kawal/contracts';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { api } from '../api/client.js';

/**
 * Spec: presentation-principles / "Beranda does not host the Kasus Detail sections".
 * Beranda's single primary verb is "brief the user".
 */
export function BerandaScreen(): JSX.Element {
  const { t } = useTranslation();
  const [cases, setCases] = useState<CaseDto[] | null>(null);
  const [newName, setNewName] = useState('');
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    void api.listCases().then((res) => setCases(res.cases));
  }, []);

  async function handleCreate() {
    if (!newName.trim()) return;
    setCreating(true);
    try {
      const created = await api.createCase({
        name: newName.trim(),
        jurisdiction: 'TBD',
        caseType: 'TBD',
      });
      setCases((prev) => (prev ? [created, ...prev] : [created]));
      setNewName('');
    } finally {
      setCreating(false);
    }
  }

  return (
    <main className="mx-auto max-w-3xl space-y-8 p-6">
      <header>
        <h1 className="font-headline text-3xl text-chalk">{t('beranda.title')}</h1>
      </header>

      <section aria-labelledby="briefing">
        <h2 id="briefing" className="text-sm font-medium uppercase tracking-wide text-chalk-muted">
          {t('beranda.briefingHeading')}
        </h2>
        <p className="prose-doc mt-2 text-chalk">{t('beranda.briefingEmpty')}</p>
      </section>

      <section aria-labelledby="what-changed">
        <h2 id="what-changed" className="text-sm font-medium uppercase tracking-wide text-chalk-muted">
          {t('beranda.whatChangedHeading')}
        </h2>
        <p className="mt-2 text-sm text-chalk-muted">{t('beranda.whatChangedEmpty')}</p>
      </section>

      <section aria-labelledby="library">
        <h2 id="library" className="text-sm font-medium uppercase tracking-wide text-chalk-muted">
          {t('beranda.libraryHeading')}
        </h2>
        <div className="mt-3">
          {cases === null ? (
            <p className="text-sm text-chalk-muted">{t('common.loading')}</p>
          ) : cases.length === 0 ? (
            <p className="text-sm text-chalk-muted">{t('beranda.libraryEmpty')}</p>
          ) : (
            <ul className="divide-y divide-rule">
              {cases.map((c) => (
                <li key={c.id} className="py-3">
                  <Link to={`/kasus/${c.id}`} className="text-chalk hover:underline">
                    {c.name}
                  </Link>
                  <span className="ml-2 text-xs text-chalk-muted">{c.jurisdiction}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="mt-4 flex gap-2">
          <input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder={t('beranda.newCase')}
            className="flex-1 rounded-md border border-rule bg-board px-3 py-2 text-sm"
          />
          <button
            type="button"
            disabled={creating || !newName.trim()}
            onClick={() => void handleCreate()}
            className="rounded-md bg-amber-pin px-4 py-2 text-sm text-board disabled:opacity-50"
          >
            {t('beranda.newCase')}
          </button>
        </div>
      </section>
    </main>
  );
}
