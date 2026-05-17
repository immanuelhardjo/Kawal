import { SourceLink } from './source-link.js';

/**
 * Spec: entity-dossier / "Right-of-reply auto-population",
 *       presentation-principles / "Right-of-reply asymmetry never silently rendered".
 *
 * Always renders. When `statement` is null, displays the dated empty
 * fallback in Bahasa Indonesia. Never collapses to zero height.
 */
export interface RightOfReplyStatementView {
  readonly text: string;
  readonly sourceId: string;
  readonly publisher: string;
  readonly publishedAt: Date;
}

export interface RightOfReplySlotProps {
  readonly statement: RightOfReplyStatementView | null;
  readonly asOf: Date;
  readonly onSourceOpen?: (sourceId: string) => void;
}

const dateFmt = new Intl.DateTimeFormat('id-ID', { year: 'numeric', month: 'long', day: 'numeric' });

export function RightOfReplySlot({
  statement,
  asOf,
  onSourceOpen,
}: RightOfReplySlotProps): JSX.Element {
  return (
    <section
      className="min-h-[5rem] rounded-md border border-rule bg-board/60 p-3"
      aria-label="Hak jawab"
    >
      <h3 className="text-xs font-medium uppercase tracking-wide text-chalk-muted">Hak jawab</h3>
      {statement ? (
        <div className="mt-1.5">
          <div className="mb-1.5">
            <SourceLink
              sourceId={statement.sourceId}
              publisher={statement.publisher}
              onOpen={onSourceOpen}
            />
            <span className="ml-2 text-xs text-chalk-muted">
              {dateFmt.format(statement.publishedAt)}
            </span>
          </div>
          <p className="prose-doc text-chalk">{statement.text}</p>
        </div>
      ) : (
        <p className="mt-1.5 text-sm italic text-chalk-muted">
          Belum ada tanggapan publik tercatat per {dateFmt.format(asOf)}.
        </p>
      )}
    </section>
  );
}
