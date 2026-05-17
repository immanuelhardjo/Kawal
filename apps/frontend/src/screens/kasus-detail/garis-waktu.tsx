import type { CaseDto, EventDto } from '@kawal/contracts';
import { CertaintyChip } from '@kawal/ui';
import { useMemo } from 'react';
import 'reactflow/dist/style.css';
import ReactFlow, {
  Background,
  type Edge,
  type Node,
} from 'reactflow';
import { useKasusDetail } from './context.js';
import { FilterChip } from './filter-chip.js';
import { useTimeline } from './hooks.js';
import {
  ALL_CERTAINTIES,
  ALL_EVENT_TYPES,
  CERTAINTY_LABELS_BAHASA,
  EVENT_TYPE_LABELS_BAHASA,
} from './labels.js';

const dateFmt = new Intl.DateTimeFormat('id-ID', {
  year: 'numeric',
  month: 'short',
  day: 'numeric',
});

/**
 * Spec: event-timeline "Garis Waktu rendered as a React Flow timeline",
 *                      "Timeline drives the relationship-graph as-of-date",
 *                      "Timeline filters",
 *                      "Branch View near case end".
 *
 * Tapping (or selecting via React Flow) an Event node sets the screen's
 * `asOfDate` to that event's date. There is no separate scrubber widget.
 */
interface GarisWaktuProps {
  readonly caseDto: CaseDto | null;
}

export function GarisWaktu({ caseDto }: GarisWaktuProps): JSX.Element {
  const { selectedEventId, asOfDate, filters, actions } = useKasusDetail();
  const timeline = useTimeline();

  const events = timeline.data?.events ?? [];
  const layout = useMemo(() => buildTimelineLayout(events), [events]);

  const flowNodes = useMemo<Node[]>(
    () =>
      events.map((event) => {
        const pos = layout.get(event.id) ?? { x: 0, y: 0 };
        return {
          id: event.id,
          position: pos,
          data: { event },
          type: 'eventNode',
          selected: event.id === selectedEventId,
        };
      }),
    [events, layout, selectedEventId],
  );

  const flowEdges: Edge[] = [];

  const branchViewVisible =
    caseDto?.status === 'verdict' || caseDto?.status === 'appeal';

  return (
    <section className="flex h-full flex-col" aria-labelledby="garis-waktu-heading">
      <header className="flex flex-wrap items-center gap-2 border-b border-rule px-3 py-2">
        <h2
          id="garis-waktu-heading"
          className="text-sm font-medium uppercase tracking-wide text-chalk-muted"
        >
          Garis Waktu
        </h2>
        <span className="text-xs text-chalk-muted">
          Tanggal aktif: {dateFmt.format(asOfDate)}
        </span>
        <div className="ml-auto flex flex-wrap items-center gap-1">
          <span className="text-xs text-chalk-muted">Kepastian:</span>
          {ALL_CERTAINTIES.map((c) => (
            <FilterChip
              key={c}
              label={CERTAINTY_LABELS_BAHASA[c]}
              active={filters.certainties.includes(c)}
              onToggle={() => actions.toggleCertainty(c)}
            />
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-1">
          <span className="text-xs text-chalk-muted">Jenis peristiwa:</span>
          {ALL_EVENT_TYPES.map((t) => (
            <FilterChip
              key={t}
              label={EVENT_TYPE_LABELS_BAHASA[t]}
              active={filters.eventTypes.includes(t)}
              onToggle={() => actions.toggleEventType(t)}
            />
          ))}
        </div>
      </header>
      <div className="relative flex-1">
        {timeline.loading ? (
          <p className="absolute inset-0 grid place-items-center text-sm text-chalk-muted">Memuat…</p>
        ) : timeline.error ? (
          <p className="absolute inset-0 grid place-items-center text-sm text-chalk-muted">
            Tidak dapat memuat timeline: {timeline.error}
          </p>
        ) : events.length === 0 ? (
          <p className="absolute inset-0 grid place-items-center text-center text-sm text-chalk-muted">
            Belum ada peristiwa tercatat untuk kasus ini.
          </p>
        ) : (
          <ReactFlow
            nodes={flowNodes}
            edges={flowEdges}
            nodeTypes={NODE_TYPES}
            onNodeClick={(_, node) => {
              const ev = (node.data as { event: EventDto }).event;
              actions.selectEvent(ev.id);
              actions.setAsOfDate(new Date(ev.date));
            }}
            onPaneClick={() => actions.selectEvent(null)}
            fitView
            panOnScroll
            zoomOnScroll={false}
            attributionPosition="bottom-left"
            proOptions={{ hideAttribution: true }}
          >
            <Background gap={24} size={1} color="#e5e7eb" />
          </ReactFlow>
        )}
      </div>
      {branchViewVisible ? <BranchViewPlaceholder /> : null}
    </section>
  );
}

const NODE_TYPES = {
  eventNode: EventNode,
} as const;

interface EventNodeData {
  readonly event: EventDto;
}

function EventNode({ data, selected }: { data: EventNodeData; selected: boolean }): JSX.Element {
  const event = data.event;
  return (
    <article
      className={
        'w-56 rounded-md border bg-board p-2 shadow-sm ' +
        (selected ? 'border-amber-pin' : 'border-rule')
      }
    >
      <header className="mb-1 flex items-center gap-2 text-xs text-chalk-muted">
        <time dateTime={event.date}>{dateFmt.format(new Date(event.date))}</time>
      </header>
      <div className="mb-1 flex flex-wrap items-center gap-2">
        <CertaintyChip certainty={event.certainty} />
        {event.sourceIds.length > 0 ? (
          <span className="text-xs text-chalk-muted">{event.sourceIds.length} sumber</span>
        ) : null}
      </div>
      <p className="text-sm text-chalk">{event.title}</p>
    </article>
  );
}

function buildTimelineLayout(events: readonly EventDto[]): Map<string, { x: number; y: number }> {
  const layout = new Map<string, { x: number; y: number }>();
  if (events.length === 0) return layout;
  const sorted = [...events].sort((a, b) => +new Date(a.date) - +new Date(b.date));
  const dates = sorted.map((e) => +new Date(e.date));
  const min = dates[0] ?? 0;
  const max = dates[dates.length - 1] ?? min;
  const range = Math.max(max - min, 1);
  const trackWidth = Math.max(720, sorted.length * 220);
  sorted.forEach((event, index) => {
    const t = (+new Date(event.date) - min) / range;
    layout.set(event.id, {
      x: t * trackWidth,
      y: 60 + (index % 2 === 0 ? 0 : 100), // stagger vertically to reduce overlap
    });
  });
  return layout;
}

function BranchViewPlaceholder(): JSX.Element {
  return (
    <aside
      className="border-t border-rule bg-board/80 px-3 py-2 text-xs text-chalk-muted"
      aria-label="Skenario proyeksi"
    >
      Proyeksi (bukan prediksi) — skenario otomatis tersedia setelah modul AI scenario diaktifkan.
    </aside>
  );
}
