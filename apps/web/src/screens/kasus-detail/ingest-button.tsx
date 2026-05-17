import { useState } from 'react';
import { useIngestStream } from '../../api/use-ingest-stream.js';
import { useKasusDetail } from './context.js';

const PHASE_LABELS: Record<string, string> = {
  resolving_publisher: 'Memetakan penerbit…',
  queued: 'Menunggu giliran (politeness)…',
  fetching: 'Mengambil sumber…',
  archived: 'Arsip Wayback ditangkap',
  extracting: 'Ekstraksi terstruktur…',
  reconciling: 'Rekonsiliasi…',
  writing: 'Menulis ke dossier…',
  done: 'Selesai',
  failed: 'Gagal',
  timeout: 'Waktu habis',
};

/**
 * Spec: osint-ingestion + design D5. Header ingest action — paste a URL,
 * watch SSE phases land, and let the dossier hooks refresh as the writes
 * complete.
 */
export function IngestButton({
  onCompleted,
}: {
  onCompleted?: () => void;
}): JSX.Element {
  const { caseId } = useKasusDetail();
  const [url, setUrl] = useState('');
  const [open, setOpen] = useState(false);
  const stream = useIngestStream();

  async function handleSubmit() {
    if (!url.trim()) return;
    await stream.start({ caseId, url: url.trim() });
    onCompleted?.();
  }

  const latest = stream.phases.at(-1);

  return (
    <div className="relative">
      <button
        type="button"
        className="rounded-md border border-rule px-3 py-1.5 text-sm text-chalk hover:border-chalk/40"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
      >
        Tarik sumber
      </button>
      {open ? (
        <div className="absolute right-0 top-full z-20 mt-2 w-[22rem] rounded-md border border-rule bg-board p-3 shadow-md">
          <label className="block text-xs uppercase tracking-wide text-chalk-muted">URL sumber</label>
          <input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://www.kejaksaan.go.id/…"
            className="mt-1 w-full rounded-md border border-rule bg-board px-2 py-1 text-sm"
          />
          <div className="mt-2 flex justify-end gap-2">
            <button
              type="button"
              className="rounded-md border border-rule px-2 py-1 text-xs text-chalk-muted"
              onClick={() => setOpen(false)}
            >
              Tutup
            </button>
            <button
              type="button"
              className="rounded-md bg-amber-pin px-2 py-1 text-xs text-board disabled:opacity-50"
              onClick={() => void handleSubmit()}
              disabled={stream.running || !url.trim()}
            >
              {stream.running ? 'Memproses…' : 'Mulai'}
            </button>
          </div>
          {stream.phases.length > 0 ? (
            <ol className="mt-3 space-y-1 text-xs">
              {stream.phases.map((p, i) => (
                <li key={`${p.phase}-${i}`} className="flex items-center gap-2 text-chalk-muted">
                  <span aria-hidden>•</span>
                  <span>{PHASE_LABELS[p.phase] ?? p.phase}</span>
                  {p.reason ? <span className="text-stamp-disputed">— {p.reason}</span> : null}
                </li>
              ))}
            </ol>
          ) : null}
          {stream.error ? (
            <p className="mt-2 text-xs text-stamp-disputed">{stream.error}</p>
          ) : null}
          {latest?.phase === 'done' ? (
            <p className="mt-2 text-xs text-stamp-verified">
              Dossier diperbarui. Tutup panel ini untuk melihat perubahan.
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
