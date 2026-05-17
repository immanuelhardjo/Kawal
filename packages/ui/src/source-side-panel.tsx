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
      className="fixed inset-y-0 right-0 z-40 w-full max-w-md border-l border-rule bg-board p-4 shadow-lg"
      aria-label="Detail sumber"
    >
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-chalk">{source.publisher}</h3>
        <button type="button" onClick={onClose} className="text-sm text-chalk-muted hover:text-chalk">
          Tutup
        </button>
      </div>
      <p className="text-xs text-chalk-muted">Diambil {dateFmt.format(source.fetchedAt)}</p>
      <blockquote className="my-3 border-l-2 border-rule pl-3 text-sm italic text-chalk">
        {source.excerpt}
      </blockquote>
      <div className="space-y-1 text-xs">
        <a className="block text-amber-pin underline" href={source.url} target="_blank" rel="noreferrer">
          Tautan asli
        </a>
        {source.archiveUrl ? (
          <a
            className="block text-amber-pin underline"
            href={source.archiveUrl}
            target="_blank"
            rel="noreferrer"
          >
            Salinan arsip
          </a>
        ) : (
          <span className="block text-chalk-muted">Salinan arsip tidak tersedia.</span>
        )}
      </div>
    </aside>
  );
}
