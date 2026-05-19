import type { EntityDto, ListSourcesResponse, SourceDto } from '@kawal/contracts';
import { RightOfReplySlot } from '@kawal/ui';
import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from 'react';
import { api } from '../../api/client.js';
import { useKasusDetail } from './context.js';
import { useCaseSources } from './hooks.js';
import { NODE_TYPE_LABELS_BAHASA } from './labels.js';
import { Riwayat } from './riwayat.js';

export interface RightTrayHandle {
  openSource(sourceId: string): void;
}

interface RightTrayProps {
  readonly caseId: string;
  readonly onOpenGlossary?: (term: string) => void;
}

type MainTab = 'dosier' | 'sumber';
type ProfilTab = 'profil' | 'riwayat';

export const RightTray = forwardRef<RightTrayHandle, RightTrayProps>(
  function RightTray({ caseId, onOpenGlossary }, ref) {
    const { selectedEntityId, actions } = useKasusDetail();

    const [activeTab, setActiveTab] = useState<MainTab>('dosier');
    const [selectedItem, setSelectedItem] = useState<EntityDto | null>(null);
    const [selectedSource, setSelectedSource] = useState<SourceDto | null>(null);

    const [entities, setEntities] = useState<EntityDto[]>([]);
    const [entitiesLoading, setEntitiesLoading] = useState(true);

    const sourcesState = useCaseSources(caseId);

    // Used to avoid re-fetching the entity if we just selected it from the list
    const entityCacheRef = useRef<Map<string, EntityDto>>(new Map());

    useEffect(() => {
      let cancelled = false;
      setEntitiesLoading(true);
      api
        .listEntities(caseId)
        .then((res) => {
          if (cancelled) return;
          setEntities(res.entities);
          for (const e of res.entities) {
            entityCacheRef.current.set(e.id, e);
          }
          setEntitiesLoading(false);
        })
        .catch(() => {
          if (!cancelled) setEntitiesLoading(false);
        });
      return () => {
        cancelled = true;
      };
    }, [caseId]);

    // When selectedEntityId changes externally (e.g. node tap in graph),
    // switch to Dosier tab and open that entity's detail.
    useEffect(() => {
      if (!selectedEntityId) return;
      setActiveTab('dosier');
      const cached = entityCacheRef.current.get(selectedEntityId);
      if (cached) {
        setSelectedItem(cached);
        return;
      }
      let cancelled = false;
      api
        .getEntity(selectedEntityId)
        .then((data) => {
          if (cancelled) return;
          entityCacheRef.current.set(data.id, data);
          setSelectedItem(data);
        })
        .catch(() => undefined);
      return () => {
        cancelled = true;
      };
    }, [selectedEntityId]);

    useImperativeHandle(ref, () => ({
      openSource(sourceId: string) {
        setActiveTab('sumber');
        const sources = sourcesState.data?.sources ?? [];
        const found = sources.find((s) => s.id === sourceId) ?? null;
        setSelectedSource(found);
        // If not yet loaded, wait and resolve once data arrives — handled below
        if (!found) {
          pendingSourceIdRef.current = sourceId;
        }
      },
    }));

    const pendingSourceIdRef = useRef<string | null>(null);

    // Resolve pending openSource call once sources have loaded
    useEffect(() => {
      const pendingId = pendingSourceIdRef.current;
      if (!pendingId || !sourcesState.data) return;
      const found = sourcesState.data.sources.find((s) => s.id === pendingId) ?? null;
      if (found) {
        setSelectedSource(found);
        pendingSourceIdRef.current = null;
      }
    }, [sourcesState.data]);

    function handleEntityClick(entity: EntityDto) {
      actions.selectEntity(entity.id);
      setSelectedItem(entity);
    }

    function handleCloseEntityDetail() {
      actions.selectEntity(null);
      setSelectedItem(null);
    }

    function handleCloseSourceDetail() {
      setSelectedSource(null);
    }

    const listHeader = (
      <header className="sticky top-0 z-10 flex items-center gap-1 border-b border-rule bg-board px-2 py-1.5">
        <TabBtn active={activeTab === 'dosier'} onClick={() => setActiveTab('dosier')}>
          Dosier
        </TabBtn>
        <TabBtn active={activeTab === 'sumber'} onClick={() => setActiveTab('sumber')}>
          Sumber
        </TabBtn>
      </header>
    );

    const trayBody = ((): JSX.Element => {
      if (activeTab === 'dosier') {
        if (selectedItem === null) {
          return (
            <>
              {listHeader}
              <EntityList
                entities={entities}
                loading={entitiesLoading}
                selectedEntityId={selectedEntityId}
                onSelect={handleEntityClick}
              />
            </>
          );
        }
        return (
          <EntityDetail
            entity={selectedItem}
            onClose={handleCloseEntityDetail}
            onOpenGlossary={onOpenGlossary}
          />
        );
      }
      if (selectedSource === null) {
        return (
          <>
            {listHeader}
            <SourceList
              state={sourcesState}
              selectedSourceId={null}
              onSelect={setSelectedSource}
            />
          </>
        );
      }
      return <SourceDetail source={selectedSource} onClose={handleCloseSourceDetail} />;
    })();

    return (
      <div className="flex h-full flex-col border-l border-rule bg-board">
        <div className="flex-1 min-h-0 overflow-y-auto">
          {trayBody}
        </div>
      </div>
    );
  },
);

// ---------------------------------------------------------------------------
// Tab button
// ---------------------------------------------------------------------------

function TabBtn({
  active,
  onClick,
  children,
}: {
  readonly active: boolean;
  readonly onClick: () => void;
  readonly children: React.ReactNode;
}): JSX.Element {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        '-mb-px border-b-2 px-3 py-1.5 text-xs uppercase tracking-wide ' +
        (active
          ? 'border-amber-pin text-chalk'
          : 'border-transparent text-chalk-muted hover:text-chalk')
      }
      aria-current={active ? 'page' : undefined}
    >
      {children}
    </button>
  );
}

// ---------------------------------------------------------------------------
// Entity list
// ---------------------------------------------------------------------------

function EntityList({
  entities,
  loading,
  selectedEntityId,
  onSelect,
}: {
  readonly entities: EntityDto[];
  readonly loading: boolean;
  readonly selectedEntityId: string | null;
  readonly onSelect: (entity: EntityDto) => void;
}): JSX.Element {
  if (loading) {
    return <p className="px-3 py-2 text-sm text-chalk-muted">Memuat…</p>;
  }
  if (entities.length === 0) {
    return (
      <p className="px-3 py-2 text-sm text-chalk-muted">Belum ada entitas dalam dossier ini.</p>
    );
  }
  return (
    <ul aria-label="Daftar entitas">
      {entities.map((entity) => (
        <li key={entity.id}>
          <button
            type="button"
            onClick={() => onSelect(entity)}
            className={
              'flex w-full items-baseline justify-between gap-2 border-b border-rule px-3 py-2 text-left text-sm ' +
              (entity.id === selectedEntityId
                ? 'bg-amber-pin/10 text-chalk'
                : 'text-chalk hover:bg-board/60')
            }
          >
            <span className="truncate">{entity.canonicalName}</span>
            <span className="shrink-0 text-xs text-chalk-muted">
              {NODE_TYPE_LABELS_BAHASA[entity.type]}
            </span>
          </button>
        </li>
      ))}
    </ul>
  );
}

// ---------------------------------------------------------------------------
// Entity detail
// ---------------------------------------------------------------------------

function EntityDetail({
  entity,
  onClose,
  onOpenGlossary,
}: {
  readonly entity: EntityDto;
  readonly onClose: () => void;
  readonly onOpenGlossary?: (term: string) => void;
}): JSX.Element {
  const [tab, setTab] = useState<ProfilTab>('profil');

  return (
    <div className="flex flex-col p-3">
      <header className="mb-2 flex items-start justify-between gap-2">
        <div>
          <p className="font-medium text-chalk">{entity.canonicalName}</p>
          <p className="text-xs uppercase tracking-wide text-chalk-muted">
            {NODE_TYPE_LABELS_BAHASA[entity.type]}
          </p>
          {entity.description ? (
            <p className="mt-1 text-xs text-chalk-muted">{entity.description}</p>
          ) : null}
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Tutup"
          className="shrink-0 rounded p-0.5 text-chalk-muted hover:text-chalk"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </header>

      <nav className="mb-3 flex gap-1 border-b border-rule" aria-label="Bagian detail entitas">
        <SubTabBtn active={tab === 'profil'} onClick={() => setTab('profil')}>
          Profil
        </SubTabBtn>
        <SubTabBtn active={tab === 'riwayat'} onClick={() => setTab('riwayat')}>
          Riwayat
        </SubTabBtn>
      </nav>

      {tab === 'profil' ? (
        <ProfilBody entity={entity} onOpenGlossary={onOpenGlossary} />
      ) : (
        <Riwayat aggregateType="entity" aggregateId={entity.id} />
      )}
    </div>
  );
}

function SubTabBtn({
  active,
  onClick,
  children,
}: {
  readonly active: boolean;
  readonly onClick: () => void;
  readonly children: React.ReactNode;
}): JSX.Element {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        '-mb-px border-b-2 px-3 py-1 text-xs uppercase tracking-wide ' +
        (active
          ? 'border-amber-pin text-chalk'
          : 'border-transparent text-chalk-muted hover:text-chalk')
      }
      aria-current={active ? 'page' : undefined}
    >
      {children}
    </button>
  );
}

function ProfilBody({
  entity,
  onOpenGlossary,
}: {
  readonly entity: EntityDto;
  readonly onOpenGlossary?: (term: string) => void;
}): JSX.Element {
  const profile = entity.profile;

  if (entity.type === 'person') {
    return (
      <div className="space-y-3">
        <ProfileSection title="Jabatan saat ini">
          <StringList items={getStringArray(profile, 'currentPositions')} />
        </ProfileSection>
        <ProfileSection title="Jabatan sebelumnya">
          <StringList items={getStringArray(profile, 'priorPositions')} />
        </ProfileSection>
        {getString(profile, 'lhkpnUrl') ? (
          <ProfileSection title="LHKPN">
            <a
              className="text-sm text-amber-pin underline"
              href={getString(profile, 'lhkpnUrl') ?? '#'}
              target="_blank"
              rel="noreferrer"
            >
              Buka rekam harta di LHKPN
            </a>
          </ProfileSection>
        ) : null}
        <RightOfReplySlot statement={null} asOf={new Date()} />
        {onOpenGlossary ? (
          <p className="text-xs text-chalk-muted">
            <button
              type="button"
              className="underline"
              onClick={() => onOpenGlossary('Tersangka')}
            >
              Tersangka
            </button>
          </p>
        ) : null}
      </div>
    );
  }

  if (entity.type === 'institution') {
    return (
      <div className="space-y-3">
        <ProfileSection title="Mandat">
          <p className="text-sm text-chalk">
            {getStringObject(profile, 'mandate', 'value') ?? '—'}
          </p>
        </ProfileSection>
        <ProfileSection title="Kepemimpinan">
          <StringList items={getStringArray(profile, 'leadership')} />
        </ProfileSection>
        <RightOfReplySlot statement={null} asOf={new Date()} />
      </div>
    );
  }

  if (entity.type === 'company') {
    return (
      <div className="space-y-3">
        <ProfileSection title="Pemilik manfaat">
          <StringList items={getStringArray(profile, 'beneficialOwners')} />
        </ProfileSection>
        <RightOfReplySlot statement={null} asOf={new Date()} />
      </div>
    );
  }

  // document
  return (
    <div className="space-y-3">
      <ProfileSection title="Tautan dokumen asli">
        {getString(profile, 'originalPdfUrl') ? (
          <a
            className="text-sm text-amber-pin underline"
            href={getString(profile, 'originalPdfUrl') ?? '#'}
            target="_blank"
            rel="noreferrer"
          >
            Buka PDF asli
          </a>
        ) : (
          <p className="text-sm text-chalk-muted">URL dokumen belum tersedia.</p>
        )}
      </ProfileSection>
    </div>
  );
}

function ProfileSection({
  title,
  children,
}: {
  readonly title: string;
  readonly children: React.ReactNode;
}): JSX.Element {
  return (
    <section>
      <h3 className="mb-1 text-xs font-medium uppercase tracking-wide text-chalk-muted">{title}</h3>
      {children}
    </section>
  );
}

function StringList({ items }: { readonly items: readonly string[] }): JSX.Element {
  if (items.length === 0) {
    return <p className="text-sm text-chalk-muted">—</p>;
  }
  return (
    <ul className="list-disc pl-5 text-sm text-chalk">
      {items.map((item) => (
        <li key={item}>{item}</li>
      ))}
    </ul>
  );
}

// ---------------------------------------------------------------------------
// Source list
// ---------------------------------------------------------------------------

function SourceList({
  state,
  selectedSourceId,
  onSelect,
}: {
  readonly state: { data: ListSourcesResponse | null; loading: boolean; error: string | null };
  readonly selectedSourceId: string | null;
  readonly onSelect: (source: SourceDto) => void;
}): JSX.Element {
  if (state.loading) {
    return <p className="px-3 py-2 text-sm text-chalk-muted">Memuat sumber…</p>;
  }
  if (state.error) {
    return (
      <p className="px-3 py-2 text-sm text-chalk-muted">
        Tidak dapat memuat sumber: {state.error}
      </p>
    );
  }
  const sources = state.data?.sources ?? [];
  if (sources.length === 0) {
    return <p className="px-3 py-2 text-sm text-chalk-muted">Belum ada sumber tercatat.</p>;
  }
  return (
    <ul aria-label="Daftar sumber">
      {sources.map((source) => (
        <li key={source.id}>
          <button
            type="button"
            onClick={() => onSelect(source)}
            className={
              'flex w-full flex-col gap-0.5 border-b border-rule px-3 py-2 text-left ' +
              (source.id === selectedSourceId
                ? 'bg-amber-pin/10'
                : 'hover:bg-board/60')
            }
          >
            <div className="flex items-center justify-between gap-2">
              <span className="truncate text-sm text-chalk">{source.publisher}</span>
              <TierBadge tier={source.tier} />
            </div>
            <span className="truncate text-xs text-chalk-muted">{source.url}</span>
          </button>
        </li>
      ))}
    </ul>
  );
}

// ---------------------------------------------------------------------------
// Source detail
// ---------------------------------------------------------------------------

function SourceDetail({
  source,
  onClose,
}: {
  readonly source: SourceDto;
  readonly onClose: () => void;
}): JSX.Element {
  return (
    <div className="flex flex-col gap-2 p-3">
      <header className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <p className="font-medium text-chalk">{source.publisher}</p>
          <TierBadge tier={source.tier} />
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Tutup"
          className="shrink-0 rounded p-0.5 text-chalk-muted hover:text-chalk"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </header>

      <a
        href={source.url}
        target="_blank"
        rel="noreferrer"
        className="break-all text-xs text-amber-pin underline"
      >
        {source.url}
      </a>

      {source.excerpt ? (
        <p className="text-sm text-chalk">{source.excerpt}</p>
      ) : null}

      {source.archiveUrl ? (
        <a
          href={source.archiveUrl}
          target="_blank"
          rel="noreferrer"
          className="text-xs text-chalk-muted underline"
        >
          Arsip Wayback
        </a>
      ) : null}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Tier badge
// ---------------------------------------------------------------------------

const TIER_CLS: Record<NonNullable<SourceDto['tier']>, string> = {
  tier_1: 'bg-green-500/15 text-green-400',
  tier_2: 'bg-amber-pin/15 text-amber-pin',
  tier_3: 'bg-chalk-muted/10 text-chalk-muted',
};
const TIER_LABEL: Record<NonNullable<SourceDto['tier']>, string> = {
  tier_1: 'T1',
  tier_2: 'T2',
  tier_3: 'T3',
};

function TierBadge({ tier }: { readonly tier: SourceDto['tier'] }): JSX.Element {
  const cls = tier ? TIER_CLS[tier] : 'bg-chalk-muted/10 text-chalk-muted';
  const label = tier ? TIER_LABEL[tier] : '—';
  return (
    <span className={`shrink-0 rounded px-1.5 py-0.5 text-xs font-medium ${cls}`}>{label}</span>
  );
}

// ---------------------------------------------------------------------------
// Profile helpers (same as profil.tsx — kept local to avoid coupling)
// ---------------------------------------------------------------------------

function getString(profile: Record<string, unknown>, key: string): string | null {
  const v = profile[key];
  return typeof v === 'string' && v.length > 0 ? v : null;
}

function getStringArray(profile: Record<string, unknown>, key: string): readonly string[] {
  const v = profile[key];
  if (!Array.isArray(v)) return [];
  return v.filter((s): s is string => typeof s === 'string');
}

function getStringObject(
  profile: Record<string, unknown>,
  key: string,
  innerKey: string,
): string | null {
  const v = profile[key];
  if (typeof v === 'string') return v.length > 0 ? v : null;
  if (typeof v === 'object' && v !== null && innerKey in v) {
    const inner = (v as Record<string, unknown>)[innerKey];
    return typeof inner === 'string' && inner.length > 0 ? inner : null;
  }
  return null;
}
