import type { EntityDto } from '@kawal/contracts';
import { RightOfReplySlot } from '@kawal/ui';
import { useEffect, useState } from 'react';
import { api } from '../../api/client.js';
import { NODE_TYPE_LABELS_BAHASA } from './labels.js';
import { Riwayat } from './riwayat.js';

/**
 * Spec: entity-dossier (per-type profile contents) + design D11 + D12.
 *
 * Side / bottom-sheet panel. When `entityId` is null the panel is closed.
 * Right-of-reply slot is always rendered when applicable, per
 * presentation-principles.
 */
interface ProfilProps {
  readonly entityId: string | null;
  readonly onClose: () => void;
  readonly onOpenGlossary?: (term: string) => void;
}

type Tab = 'profil' | 'riwayat';

export function Profil({ entityId, onClose, onOpenGlossary }: ProfilProps): JSX.Element | null {
  const [entity, setEntity] = useState<EntityDto | null>(null);
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState<Tab>('profil');

  useEffect(() => {
    if (!entityId) {
      setEntity(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setTab('profil');
    api
      .getEntity(entityId)
      .then((data) => !cancelled && setEntity(data))
      .catch(() => !cancelled && setEntity(null))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [entityId]);

  if (!entityId) return null;

  return (
    <aside
      className="fixed inset-x-0 bottom-0 z-30 max-h-[70vh] overflow-y-auto rounded-t-xl border-t border-rule bg-paper p-4 shadow-lg sm:inset-y-0 sm:right-0 sm:left-auto sm:w-[420px] sm:max-h-none sm:rounded-none sm:border-l sm:border-t-0"
      role="complementary"
      aria-label="Profil entitas"
    >
      <header className="mb-3 flex items-start justify-between gap-3">
        <div>
          <h2 className="font-serif text-lg text-ink">{entity?.canonicalName ?? 'Memuat…'}</h2>
          {entity ? (
            <p className="text-xs uppercase tracking-wide text-muted">
              {NODE_TYPE_LABELS_BAHASA[entity.type]}
            </p>
          ) : null}
        </div>
        <button
          type="button"
          onClick={onClose}
          className="text-sm text-muted hover:text-ink"
        >
          Tutup
        </button>
      </header>

      <nav className="mb-3 flex gap-1 border-b border-rule" aria-label="Bagian profil">
        <TabButton active={tab === 'profil'} onClick={() => setTab('profil')}>
          Profil
        </TabButton>
        <TabButton active={tab === 'riwayat'} onClick={() => setTab('riwayat')}>
          Riwayat
        </TabButton>
      </nav>

      <ProfilContent
        entity={entity}
        loading={loading}
        tab={tab}
        onOpenGlossary={onOpenGlossary}
      />
    </aside>
  );
}

function ProfilContent({
  entity,
  loading,
  tab,
  onOpenGlossary,
}: {
  readonly entity: EntityDto | null;
  readonly loading: boolean;
  readonly tab: Tab;
  readonly onOpenGlossary?: (term: string) => void;
}): JSX.Element {
  if (loading || !entity) {
    return <p className="text-sm text-muted">Memuat…</p>;
  }
  if (tab === 'profil') {
    return <ProfilBody entity={entity} onOpenGlossary={onOpenGlossary} />;
  }
  return <Riwayat aggregateType="entity" aggregateId={entity.id} />;
}

interface TabButtonProps {
  readonly active: boolean;
  readonly onClick: () => void;
  readonly children: React.ReactNode;
}

function TabButton({ active, onClick, children }: TabButtonProps): JSX.Element {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        '-mb-px border-b-2 px-3 py-1.5 text-xs uppercase tracking-wide ' +
        (active
          ? 'border-ink text-ink'
          : 'border-transparent text-muted hover:text-ink')
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
  entity: EntityDto;
  onOpenGlossary?: (term: string) => void;
}): JSX.Element {
  const profile = entity.profile;
  if (entity.type === 'person') {
    return (
      <div className="space-y-4">
        <Section title="Jabatan saat ini">
          <List items={getStringArray(profile, 'currentPositions')} />
        </Section>
        <Section title="Jabatan sebelumnya">
          <List items={getStringArray(profile, 'priorPositions')} />
        </Section>
        {getString(profile, 'lhkpnUrl') ? (
          <Section title="LHKPN">
            <a
              className="text-sm text-accent underline"
              href={getString(profile, 'lhkpnUrl') ?? '#'}
              target="_blank"
              rel="noreferrer"
            >
              Buka rekam harta di LHKPN
            </a>
          </Section>
        ) : null}
        <RightOfReplySlot statement={null} asOf={new Date()} />
        <GlossaryHint term="Tersangka" onOpen={onOpenGlossary} />
      </div>
    );
  }
  if (entity.type === 'institution') {
    return (
      <div className="space-y-4">
        <Section title="Mandat">
          <p className="text-sm text-ink">
            {getStringObject(profile, 'mandate', 'value') ?? '—'}
          </p>
        </Section>
        <Section title="Kepemimpinan">
          <List items={getStringArray(profile, 'leadership')} />
        </Section>
        <RightOfReplySlot statement={null} asOf={new Date()} />
      </div>
    );
  }
  if (entity.type === 'company') {
    return (
      <div className="space-y-4">
        <Section title="Pemilik manfaat">
          <List items={getStringArray(profile, 'beneficialOwners')} />
        </Section>
        <RightOfReplySlot statement={null} asOf={new Date()} />
      </div>
    );
  }
  // document
  return (
    <div className="space-y-4">
      <Section title="Tautan dokumen asli">
        {getString(profile, 'originalPdfUrl') ? (
          <a
            className="text-sm text-accent underline"
            href={getString(profile, 'originalPdfUrl') ?? '#'}
            target="_blank"
            rel="noreferrer"
          >
            Buka PDF asli
          </a>
        ) : (
          <p className="text-sm text-muted">URL dokumen belum tersedia.</p>
        )}
      </Section>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }): JSX.Element {
  return (
    <section>
      <h3 className="mb-1 text-xs font-medium uppercase tracking-wide text-muted">{title}</h3>
      {children}
    </section>
  );
}

function List({ items }: { items: readonly string[] }): JSX.Element {
  if (items.length === 0) {
    return <p className="text-sm text-muted">—</p>;
  }
  return (
    <ul className="list-disc pl-5 text-sm text-ink">
      {items.map((item) => (
        <li key={item}>{item}</li>
      ))}
    </ul>
  );
}

function GlossaryHint({
  term,
  onOpen,
}: {
  term: string;
  onOpen?: (term: string) => void;
}): JSX.Element {
  return (
    <p className="text-xs text-muted">
      Tap istilah hukum untuk penjelasan singkat —{' '}
      <button type="button" className="underline" onClick={() => onOpen?.(term)}>
        {term}
      </button>
    </p>
  );
}

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
