/**
 * Inline pill that exposes the source URL + publisher. Tap opens the
 * verbatim excerpt side panel (wired by the consumer screen).
 */
export interface SourceLinkProps {
  readonly sourceId: string;
  readonly publisher: string;
  readonly onOpen?: (sourceId: string) => void;
}

export function SourceLink({ sourceId, publisher, onOpen }: SourceLinkProps): JSX.Element {
  return (
    <button
      type="button"
      onClick={() => onOpen?.(sourceId)}
      className="inline-flex items-center gap-1 rounded-md border border-rule px-2 py-0.5 text-xs text-chalk-muted hover:text-chalk hover:border-chalk/40"
      aria-label={`Lihat sumber: ${publisher}`}
    >
      <span aria-hidden>{'§'}</span>
      <span>{publisher}</span>
    </button>
  );
}
