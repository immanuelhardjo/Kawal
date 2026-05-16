import type { EntityDto, RelationshipDto } from '@kawal/contracts';
import 'reactflow/dist/style.css';
import ReactFlow, {
  Background,
  Controls,
  type Edge,
  type Node,
} from 'reactflow';
import { useMemo, useState } from 'react';
import { useKasusDetail } from './context.js';
import { FilterChip } from './filter-chip.js';
import { useVisibleGraph } from './hooks.js';
import {
  ALL_CERTAINTIES,
  ALL_NODE_TYPES,
  CERTAINTY_LABELS_BAHASA,
  NODE_TYPE_LABELS_BAHASA,
} from './labels.js';

/**
 * Spec: relationship-graph "Peta Kasus rendered with React Flow",
 *                          "Certainty filter", "Node-type filter",
 *                          "Tap interactions and linked selection",
 *                          "Cluster detection overlay" (basic toggle).
 */
interface PetaKasusProps {
  readonly clusterThreshold?: number;
  readonly onEdgeTap: (relationship: RelationshipDto) => void;
}

export function PetaKasus({
  clusterThreshold = 12,
  onEdgeTap,
}: PetaKasusProps): JSX.Element {
  const { selectedEntityId, filters, actions } = useKasusDetail();
  const graph = useVisibleGraph();
  const [collapsedClusters, setCollapsedClusters] = useState(false);

  const layout = useMemo(() => buildLayout(graph.data?.nodes ?? []), [graph.data?.nodes]);

  const flowNodes = useMemo<Node[]>(() => {
    const nodes = graph.data?.nodes ?? [];
    return nodes.map((entity) => {
      const pos = layout.get(entity.id) ?? { x: 0, y: 0 };
      return {
        id: entity.id,
        position: pos,
        data: { label: entity.canonicalName, entity },
        style: {
          background: nodeBg(entity),
          color: '#1f1f1f',
          border:
            entity.id === selectedEntityId ? '2px solid #1f1f1f' : '1px solid #e5e7eb',
          padding: 8,
          borderRadius: 8,
          width: 160,
          fontSize: 12,
        },
        type: 'default',
      } satisfies Node;
    });
  }, [graph.data?.nodes, layout, selectedEntityId]);

  const flowEdges = useMemo<Edge[]>(() => {
    const edges = graph.data?.edges ?? [];
    return edges.map((edge) => ({
      id: edge.id,
      source: edge.fromEntityId,
      target: edge.toEntityId,
      label: edge.type,
      data: { edge },
      style: { stroke: edgeStroke(edge), strokeWidth: 1.5 },
      labelStyle: { fontSize: 10, fill: '#6b7280' },
      labelBgStyle: { fill: '#fafaf9' },
    }));
  }, [graph.data?.edges]);

  const nodeCount = graph.data?.nodes.length ?? 0;
  const overThreshold = nodeCount > clusterThreshold;

  return (
    <section className="flex h-full flex-col" aria-labelledby="peta-kasus-heading">
      <header className="flex flex-wrap items-center gap-2 border-b border-rule px-3 py-2">
        <h2 id="peta-kasus-heading" className="text-sm font-medium uppercase tracking-wide text-muted">
          Peta Kasus
        </h2>
        <span className="text-xs text-muted">{nodeCount} entitas</span>
        <div className="ml-auto flex flex-wrap items-center gap-1">
          <span className="text-xs text-muted">Tingkat kepastian:</span>
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
          <span className="text-xs text-muted">Tipe simpul:</span>
          {ALL_NODE_TYPES.map((t) => (
            <FilterChip
              key={t}
              label={NODE_TYPE_LABELS_BAHASA[t]}
              active={filters.nodeTypes.includes(t)}
              onToggle={() => actions.toggleNodeType(t)}
            />
          ))}
        </div>
        {overThreshold ? (
          <button
            type="button"
            className="rounded-md border border-rule px-2 py-0.5 text-xs text-muted hover:text-ink"
            onClick={() => setCollapsedClusters((v) => !v)}
            aria-pressed={collapsedClusters}
          >
            {collapsedClusters ? 'Buka klaster' : 'Tutup klaster'}
          </button>
        ) : null}
      </header>
      <div className="relative flex-1">
        {graph.loading ? (
          <p className="absolute inset-0 grid place-items-center text-sm text-muted">Memuat…</p>
        ) : graph.error ? (
          <p className="absolute inset-0 grid place-items-center text-sm text-muted">
            Tidak dapat memuat peta: {graph.error}
          </p>
        ) : flowNodes.length === 0 ? (
          <p className="absolute inset-0 grid place-items-center text-center text-sm text-muted">
            Belum ada simpul. Tarik sumber ke dossier kasus ini untuk mulai membangun peta.
          </p>
        ) : (
          <ReactFlow
            nodes={flowNodes}
            edges={flowEdges}
            onNodeClick={(_, node) => {
              const entity = (node.data as { entity: EntityDto }).entity;
              actions.selectEntity(entity.id);
            }}
            onPaneClick={() => actions.selectEntity(null)}
            onEdgeClick={(_, edge) => {
              const rel = (edge.data as { edge: RelationshipDto }).edge;
              onEdgeTap(rel);
            }}
            fitView
            attributionPosition="bottom-left"
            proOptions={{ hideAttribution: true }}
          >
            <Background gap={24} size={1} color="#e5e7eb" />
            <Controls showInteractive={false} />
          </ReactFlow>
        )}
      </div>
    </section>
  );
}

function buildLayout(nodes: readonly EntityDto[]): Map<string, { x: number; y: number }> {
  // Tracer-bullet layout: place every node on a circle. Production swaps
  // in dagre or elkjs for force-directed positioning.
  const layout = new Map<string, { x: number; y: number }>();
  const radius = Math.max(180, nodes.length * 18);
  const cx = 0;
  const cy = 0;
  nodes.forEach((node, index) => {
    const angle = (2 * Math.PI * index) / Math.max(1, nodes.length);
    layout.set(node.id, {
      x: cx + radius * Math.cos(angle),
      y: cy + radius * Math.sin(angle),
    });
  });
  return layout;
}

function nodeBg(entity: EntityDto): string {
  switch (entity.type) {
    case 'person':
      return '#f5f5f4';
    case 'institution':
      return '#eef2ff';
    case 'company':
      return '#fdf6e3';
    case 'document':
      return '#ecfeff';
  }
}

function edgeStroke(edge: RelationshipDto): string {
  switch (edge.certainty) {
    case 'established':
      return '#1f4f3a';
    case 'alleged':
      return '#7a4f1a';
    case 'reported':
      return '#37526b';
    case 'disputed':
      return '#7a2f3a';
    case 'unverified':
      return '#9ca3af';
  }
}
