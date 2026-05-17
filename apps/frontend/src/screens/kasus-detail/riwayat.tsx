import type { AggregateTypeDto, ListRevisionsResponse } from '@kawal/contracts';
import { useEffect, useState } from 'react';
import { api } from '../../api/client.js';

/**
 * Spec: design D2 + every dossier capability "Append-only revision history".
 *
 * Per-record panel that fetches `/revisions/:type/:id` and renders entries
 * in `revision_no` order with `change_kind`, actor, valid_from/valid_to,
 * and a compact diff hint (currently the keys whose values changed since
 * the prior revision).
 */
interface RiwayatProps {
  readonly aggregateType: AggregateTypeDto;
  readonly aggregateId: string;
}

const dateFmt = new Intl.DateTimeFormat('id-ID', {
  year: 'numeric',
  month: 'short',
  day: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
});

const CHANGE_LABELS: Record<'created' | 'updated' | 'tombstoned', string> = {
  created: 'Dibuat',
  updated: 'Diperbarui',
  tombstoned: 'Dihapus',
};

export function Riwayat({ aggregateType, aggregateId }: RiwayatProps): JSX.Element {
  const [state, setState] = useState<{
    data: ListRevisionsResponse | null;
    loading: boolean;
    error: string | null;
  }>({ data: null, loading: true, error: null });

  useEffect(() => {
    let cancelled = false;
    setState({ data: null, loading: true, error: null });
    api
      .listRevisions(aggregateType, aggregateId)
      .then((data) => !cancelled && setState({ data, loading: false, error: null }))
      .catch((err) =>
        !cancelled &&
        setState({
          data: null,
          loading: false,
          error: err instanceof Error ? err.message : 'unknown_error',
        }),
      );
    return () => {
      cancelled = true;
    };
  }, [aggregateType, aggregateId]);

  if (state.loading) {
    return <p className="text-sm text-chalk-muted">Memuat riwayat…</p>;
  }
  if (state.error) {
    return <p className="text-sm text-chalk-muted">Tidak dapat memuat riwayat: {state.error}</p>;
  }
  const revisions = state.data?.revisions ?? [];
  if (revisions.length === 0) {
    return <p className="text-sm text-chalk-muted">Belum ada riwayat tercatat.</p>;
  }
  return (
    <ol className="space-y-3">
      {revisions.map((r, index) => {
        const prior = index > 0 ? revisions[index - 1] : undefined;
        const changedKeys = prior ? diffKeys(prior.payload, r.payload) : [];
        return (
          <li key={`${r.revisionNo}`} className="rounded-md border border-rule p-2 text-sm">
            <header className="mb-1 flex flex-wrap items-center justify-between gap-2 text-xs">
              <span className="font-medium text-chalk">Revisi #{r.revisionNo}</span>
              <span className="text-chalk-muted">{CHANGE_LABELS[r.changeKind]}</span>
              <span className="text-chalk-muted">{dateFmt.format(new Date(r.validFrom))}</span>
            </header>
            {changedKeys.length > 0 ? (
              <p className="text-xs text-chalk-muted">
                Berubah: <span className="text-chalk">{changedKeys.join(', ')}</span>
              </p>
            ) : null}
          </li>
        );
      })}
    </ol>
  );
}

function diffKeys(prior: unknown, next: unknown): string[] {
  if (!isRecord(prior) || !isRecord(next)) return [];
  const keys = new Set<string>([...Object.keys(prior), ...Object.keys(next)]);
  const changed: string[] = [];
  for (const key of keys) {
    if (!shallowEqual(prior[key], next[key])) changed.push(key);
  }
  return changed;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function shallowEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (typeof a !== typeof b) return false;
  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) return false;
    return a.every((v, i) => v === b[i]);
  }
  // Records and other objects: stringify (cheap diff for the small payloads we
  // serialize in revisions). Production swaps in a proper deep-equal.
  if (typeof a === 'object' && typeof b === 'object') {
    return JSON.stringify(a) === JSON.stringify(b);
  }
  return false;
}
