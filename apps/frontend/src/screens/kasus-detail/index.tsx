import type { RelationshipDto } from '@kawal/contracts';
import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { pushCaseHistory } from '../../lib/case-history.js';
import { KasusDetailProvider, useKasusDetail } from './context.js';
import { Dosier } from './dosier.js';
import { GarisWaktu } from './garis-waktu.js';
import { GlosariumOverlay } from './glosarium-overlay.js';
import { useCase, useEntities } from './hooks.js';
import { IngestButton } from './ingest-button.js';
import { PetaKasus } from './peta-kasus.js';
import { Profil } from './profil.js';
import { SourcePanel } from './source-panel.js';

/**
 * Spec: design D11 + presentation-principles "One screen, one job (with
 * Kasus Detail composing linked sections)".
 *
 * The route component reads the caseId from the URL and wraps the rest of
 * the screen in the KasusDetailProvider so every section reads and writes
 * through one shared state.
 */
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

function KasusDetailLayout(): JSX.Element {
  const { caseId, selectedEntityId, actions } = useKasusDetail();
  const caseQ = useCase(caseId);
  const entitiesQ = useEntities(caseId);
  const [tappedEdge, setTappedEdge] = useState<RelationshipDto | null>(null);
  const [glossaryTerm, setGlossaryTerm] = useState<string | null>(null);
  const [refreshTick, setRefreshTick] = useState(0); // bump to force-refetch
  void refreshTick;

  useEffect(() => {
    if (caseQ.data) {
      pushCaseHistory({ id: caseId, name: caseQ.data.name });
    }
  }, [caseId, caseQ.data]);

  return (
    <div className="flex h-screen flex-col bg-board">
      <header className="flex flex-wrap items-center gap-3 border-b border-rule bg-board px-4 py-2">
        <Link to="/" className="text-xs text-chalk-muted hover:text-chalk">
          ← Beranda
        </Link>
        <h1 className="font-headline text-lg text-chalk">
          {caseQ.data?.name ?? 'Memuat…'}
        </h1>
        {caseQ.data ? (
          <>
            <span className="text-xs text-chalk-muted">{caseQ.data.jurisdiction}</span>
            <span className="rounded-md border border-rule px-2 py-0.5 text-xs text-chalk-muted">
              {caseQ.data.status}
            </span>
          </>
        ) : null}
        <div className="ml-auto">
          <IngestButton onCompleted={() => setRefreshTick((v) => v + 1)} />
        </div>
      </header>

      {/* Desktop / tablet layout — three columns + Profil overlay.
          Phone width stacks into a single column with sticky Garis Waktu. */}
      <div className="flex flex-1 min-h-0 flex-col lg:flex-row">
        {/* On phone, Garis Waktu is sticky at the top. */}
        <div className="order-1 h-64 shrink-0 border-b border-rule lg:order-2 lg:h-auto lg:min-h-0 lg:flex-1 lg:border-b-0">
          <GarisWaktu caseDto={caseQ.data} />
        </div>
        {/* Peta Kasus */}
        <div className="order-2 h-72 min-h-[18rem] border-b border-rule lg:order-3 lg:h-auto lg:min-h-0 lg:w-[40%] lg:border-b-0 lg:border-l">
          <PetaKasus onEdgeTap={setTappedEdge} />
        </div>
        {/* Dosier — collapsed by default on phone */}
        <details className="order-3 border-b border-rule lg:order-1 lg:h-auto lg:min-h-0 lg:w-72 lg:shrink-0 lg:border-b-0" open>
          <summary className="cursor-pointer px-3 py-2 text-sm font-medium uppercase tracking-wide text-chalk-muted lg:hidden">
            Dosier
          </summary>
          <div className="h-72 lg:h-full">
            <Dosier entities={entitiesQ.data ?? []} loading={entitiesQ.loading} />
          </div>
        </details>
      </div>

      {/* Profil bottom-sheet (phone) / right sidebar (desktop) */}
      <Profil
        entityId={selectedEntityId}
        onClose={() => actions.selectEntity(null)}
        onOpenGlossary={(term) => setGlossaryTerm(term)}
      />
      <SourcePanel
        relationship={tappedEdge}
        onClose={() => setTappedEdge(null)}
      />
      <GlosariumOverlay term={glossaryTerm} onClose={() => setGlossaryTerm(null)} />
    </div>
  );
}
