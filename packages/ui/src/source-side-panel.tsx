/**
 * Side panel that reveals a verbatim source excerpt + live URL + archive URL.
 * Implementation here is presentational only; the host app provides the
 * source data via props or via a fetch hook.
 */
export interface SourceSidePanelProps {
  readonly open: boolean;
  readonly source: {
    readonly publisher: string;
    readonly url: string;
    readonly archiveUrl: string | null;
    readonly excerpt: string;
    readonly fetchedAt: Date;
  } | null;
  readonly onClose: () => void;
}

const dateFmt = new Intl.DateTimeFormat('id-ID', {
  year: 'numeric',
  month: 'long',
  day: 'numeric',
});

export function SourceSidePanel({ open, source, onClose }: SourceSidePanelProps): JSX.Element | null {
  if (!open || !source) return null;
  return (
    <aside
      className="fixed inset-y-0 right-0 z-40 w-full max-w-md border-l border-rule bg-paper p-4 shadow-lg"
      role="dialog"
      aria-modal="true"
      aria-label="Detail sumber"
    >
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-ink">{source.publisher}</h3>
        <button type="button" onClick={onClose} className="text-sm text-muted hover:text-ink">
          Tutup
        </button>
      </div>
      <p className="text-xs text-muted">Diambil {dateFmt.format(source.fetchedAt)}</p>
      <blockquote className="my-3 border-l-2 border-rule pl-3 text-sm italic text-ink">
        {source.excerpt}
      </blockquote>
      <div className="space-y-1 text-xs">
        <a className="block text-accent underline" href={source.url} target="_blank" rel="noreferrer">
          Tautan asli
        </a>
        {source.archiveUrl ? (
          <a
            className="block text-accent underline"
            href={source.archiveUrl}
            target="_blank"
            rel="noreferrer"
          >
            Salinan arsip
          </a>
        ) : (
          <span className="block text-muted">Salinan arsip tidak tersedia.</span>
        )}
      </div>
    </aside>
  );
}
