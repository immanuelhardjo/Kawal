/**
 * Spec: glosarium "Tap-any-term explainer".
 *
 * Tracer-bullet placeholder. Real wiring lands when the `ExplainTerm` use
 * case (3.18) and `GET /glosarium/:term` endpoint are added.
 */
interface GlosariumOverlayProps {
  readonly term: string | null;
  readonly onClose: () => void;
}

export function GlosariumOverlay({ term, onClose }: GlosariumOverlayProps): JSX.Element | null {
  if (!term) return null;
  return (
    <div
      className="fixed inset-0 z-40 grid place-items-center bg-board-shadow/80 p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Glosarium"
    >
      <div className="w-full max-w-md rounded-md bg-board p-4 shadow-xl">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="font-headline text-lg text-chalk">{term}</h2>
          <button type="button" onClick={onClose} className="text-sm text-chalk-muted hover:text-chalk">
            Tutup
          </button>
        </div>
        <p className="text-sm text-chalk-muted">
          Penjelasan dari Glosarium tersedia setelah modul AI glosarium diaktifkan. Untuk sekarang,
          rujuk teks asli UU/KUHP terkait istilah ini.
        </p>
      </div>
    </div>
  );
}
