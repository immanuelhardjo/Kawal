import { useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { pushCaseHistory } from '../../lib/case-history.js';
import { ChatPanel } from './chat-panel.js';
import { KasusDetailProvider, useKasusDetail } from './context.js';
import { GarisWaktu } from './garis-waktu.js';
import { GlosariumOverlay } from './glosarium-overlay.js';
import { useCase } from './hooks.js';
import { PetaKasus } from './peta-kasus.js';
import { RightTray, type RightTrayHandle } from './right-tray.js';

export function KasusDetailScreen(): JSX.Element {
  const { caseId } = useParams<{ caseId: string }>();
  if (!caseId) {
    return (
      <main className="p-6">
        <p className="text-sm text-chalk-muted">ID kasus tidak ditemukan.</p>
      </main>
    );
  }
  return (
    <KasusDetailProvider caseId={caseId}>
      <KasusDetailLayout />
    </KasusDetailProvider>
  );
}

type MobileTab = 'chat' | 'kanvas' | 'dossier';

function KasusDetailLayout(): JSX.Element {
  const { caseId } = useKasusDetail();
  const caseQ = useCase(caseId);
  const [glossaryTerm, setGlossaryTerm] = useState<string | null>(null);
  const [mobileTab, setMobileTab] = useState<MobileTab>('kanvas');
  const rightTrayRef = useRef<RightTrayHandle>(null);

  useEffect(() => {
    if (caseQ.data) {
      pushCaseHistory({ id: caseId, name: caseQ.data.name });
    }
  }, [caseId, caseQ.data]);

  return (
    <div className="flex h-screen flex-col bg-board">
      {/* ── Header ─────────────────────────────────────────────── */}
      <header className="border-b border-rule bg-board px-4 py-2">
        <h1 className="font-headline text-lg text-chalk">
          {caseQ.data?.name ?? 'Memuat…'}
        </h1>
      </header>

      {/* ── Desktop: three-column layout ──────────────────────── */}
      <div className="hidden flex-1 min-h-0 lg:flex">
        {/* Left: AI chat */}
        <div className="w-72 shrink-0 border-r border-rule">
          <ChatPanel
            caseId={caseId}
            onCitedSourceTap={(sourceId) => rightTrayRef.current?.openSource(sourceId)}
          />
        </div>

        {/* Centre: Kanvas */}
        <section className="flex flex-1 min-w-0 flex-col" aria-label="Kanvas">
          <header className="shrink-0 border-b border-rule px-3 py-2">
            <h2 className="text-sm font-medium uppercase tracking-wide text-chalk-muted">Kanvas</h2>
          </header>
          <div className="shrink-0 border-b border-rule">
            <GarisWaktu />
          </div>
          <div className="flex-1 min-h-0">
            <PetaKasus
              onEdgeTap={(rel) => rightTrayRef.current?.openSource(rel.sourceIds[0] ?? '')}
            />
          </div>
        </section>

        {/* Right: dossier + source tray */}
        <div className="w-80 shrink-0 border-l border-rule">
          <RightTray
            ref={rightTrayRef}
            caseId={caseId}
            onOpenGlossary={(term) => setGlossaryTerm(term)}
          />
        </div>
      </div>

      {/* ── Mobile: single panel + bottom tab bar ─────────────── */}
      <div className="flex flex-1 min-h-0 flex-col lg:hidden">
        <div className="flex-1 min-h-0 overflow-hidden">
          {mobileTab === 'chat' && (
            <ChatPanel
              caseId={caseId}
              onCitedSourceTap={(sourceId) => {
                rightTrayRef.current?.openSource(sourceId);
                setMobileTab('dossier');
              }}
            />
          )}
          {mobileTab === 'kanvas' && (
            <div className="flex h-full flex-col">
              <div className="shrink-0 border-b border-rule">
                <GarisWaktu />
              </div>
              <div className="flex-1 min-h-0">
                <PetaKasus
                  onEdgeTap={(rel) => {
                    rightTrayRef.current?.openSource(rel.sourceIds[0] ?? '');
                    setMobileTab('dossier');
                  }}
                />
              </div>
            </div>
          )}
          {mobileTab === 'dossier' && (
            <RightTray
              ref={rightTrayRef}
              caseId={caseId}
              onOpenGlossary={(term) => setGlossaryTerm(term)}
            />
          )}
        </div>

        {/* Bottom tab bar */}
        <nav className="flex border-t border-rule bg-board" aria-label="Navigasi panel">
          {(
            [
              { id: 'chat', label: 'Chat' },
              { id: 'kanvas', label: 'Kanvas' },
              { id: 'dossier', label: 'Dosier·Sumber' },
            ] as const
          ).map(({ id, label }) => (
            <button
              key={id}
              type="button"
              onClick={() => setMobileTab(id)}
              className={
                'flex-1 py-2 text-xs font-medium uppercase tracking-wide ' +
                (mobileTab === id ? 'text-chalk border-t-2 border-amber-pin -mt-px' : 'text-chalk-muted')
              }
              aria-current={mobileTab === id ? 'page' : undefined}
            >
              {label}
            </button>
          ))}
        </nav>
      </div>

      <GlosariumOverlay term={glossaryTerm} onClose={() => setGlossaryTerm(null)} />
    </div>
  );
}
