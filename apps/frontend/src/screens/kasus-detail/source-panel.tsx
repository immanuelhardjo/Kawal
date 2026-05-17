import type { RelationshipDto } from '@kawal/contracts';

/**
 * Spec: relationship-graph "Tap interactions and linked selection" → edge
 *       tap opens a side panel with the verbatim excerpt + URL + archive.
 *
 * For the tracer bullet we surface what the relationship row already
 * carries (type, certainty, source ids, date range). Fetching the full
 * Source aggregate for the excerpt + archive URL is the next refinement
 * once `/sources/:id` lands.
 */
interface SourcePanelProps {
  readonly relationship: RelationshipDto | null;
  readonly onClose: () => void;
}

const dateFmt = new Intl.DateTimeFormat('id-ID', {
  year: 'numeric',
  month: 'long',
  day: 'numeric',
});

export function SourcePanel({ relationship, onClose }: SourcePanelProps): JSX.Element | null {
  if (!relationship) return null;
  return (
    <aside
      className="fixed bottom-0 right-0 top-0 z-30 w-full max-w-md overflow-y-auto border-l border-rule bg-board p-4 shadow-lg"
      role="dialog"
      aria-modal="true"
      aria-label="Detail relasi"
    >
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-chalk">Relasi</h3>
        <button type="button" onClick={onClose} className="text-sm text-chalk-muted hover:text-chalk">
          Tutup
        </button>
      </div>
      <dl className="space-y-2 text-sm">
        <Row label="Jenis" value={relationship.type} />
        <Row label="Tingkat kepastian" value={relationship.certainty} />
        <Row
          label="Aktif sejak"
          value={dateFmt.format(new Date(relationship.activeFrom))}
        />
        <Row
          label="Aktif hingga"
          value={relationship.activeTo ? dateFmt.format(new Date(relationship.activeTo)) : '—'}
        />
        <Row
          label="Sumber tercatat"
          value={`${relationship.sourceIds.length} rujukan`}
        />
        {relationship.description ? (
          <Row label="Catatan" value={relationship.description} />
        ) : null}
      </dl>
    </aside>
  );
}

function Row({ label, value }: { label: string; value: string }): JSX.Element {
  return (
    <div className="flex flex-col">
      <dt className="text-xs uppercase tracking-wide text-chalk-muted">{label}</dt>
      <dd className="text-chalk">{value}</dd>
    </div>
  );
}
