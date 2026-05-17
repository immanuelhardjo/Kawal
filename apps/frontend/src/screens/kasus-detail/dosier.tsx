import type { EntityDto } from '@kawal/contracts';
import { useMemo, useState } from 'react';
import { useKasusDetail } from './context.js';
import { NODE_TYPE_LABELS_BAHASA } from './labels.js';

interface DosierProps {
  readonly entities: readonly EntityDto[];
  readonly loading: boolean;
}

/**
 * Spec: entity-dossier "Entity types and canonical identity, scoped to one
 * owner" + design D11 (Dosier as a linked section).
 *
 * Tapping an entity selects it in the shared Kasus Detail state, which
 * highlights the matching node in Peta Kasus, filters Garis Waktu, and
 * opens the Profil panel.
 */
export function Dosier({ entities, loading }: DosierProps): JSX.Element {
  const { selectedEntityId, actions } = useKasusDetail();
  const [query, setQuery] = useState('');

  const matched = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return entities;
    return entities.filter((e) => {
      if (e.canonicalName.toLowerCase().includes(q)) return true;
      return e.aliases.some((alias) => alias.toLowerCase().includes(q));
    });
  }, [entities, query]);

  return (
    <section
      className="flex h-full flex-col border-r border-rule bg-board"
      aria-labelledby="dosier-heading"
    >
      <header className="border-b border-rule px-3 py-2">
        <h2 id="dosier-heading" className="text-sm font-medium uppercase tracking-wide text-chalk-muted">
          Dosier
        </h2>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Cari entitas atau dokumen…"
          className="mt-2 w-full rounded-md border border-rule bg-board px-2 py-1 text-sm"
        />
      </header>
      <ul className="flex-1 overflow-y-auto" role="listbox" aria-label="Daftar entitas">
        {loading ? (
          <li className="px-3 py-2 text-sm text-chalk-muted">Memuat…</li>
        ) : matched.length === 0 ? (
          <li className="px-3 py-2 text-sm text-chalk-muted">
            {query ? 'Tidak ada entitas yang cocok.' : 'Belum ada entitas dalam dossier ini.'}
          </li>
        ) : (
          matched.map((entity) => (
            <li key={entity.id}>
              <button
                type="button"
                className={
                  'flex w-full items-baseline justify-between gap-2 border-b border-rule px-3 py-2 text-left text-sm ' +
                  (entity.id === selectedEntityId
                    ? 'bg-amber-pin/10 text-chalk'
                    : 'text-chalk hover:bg-board/60')
                }
                onClick={() => actions.selectEntity(entity.id)}
                aria-selected={entity.id === selectedEntityId}
              >
                <span className="truncate">{entity.canonicalName}</span>
                <span className="text-xs text-chalk-muted">{NODE_TYPE_LABELS_BAHASA[entity.type]}</span>
              </button>
            </li>
          ))
        )}
      </ul>
    </section>
  );
}
