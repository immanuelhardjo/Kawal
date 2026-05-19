import type { EntityDto, RelationshipDto } from '@kawal/contracts';
import 'reactflow/dist/style.css';
import ReactFlow, {
  Background,
  BaseEdge,
  Controls,
  type Edge,
  EdgeLabelRenderer,
  getBezierPath,
  type EdgeProps,
  type Node,
  type NodeChange,
  type Position,
} from 'reactflow';
import { useMemo, useState } from 'react';
import { useKasusDetail } from './context.js';
import { useVisibleGraph } from './hooks.js';

interface PetaKasusProps {
  readonly onEdgeTap?: (relationship: RelationshipDto) => void;
}

// --- Node helpers -----------------------------------------------------------

function typeAccentColor(entity: EntityDto): string {
  switch (entity.type) {
    case 'person':      return '#9DB89A'; // chalk-muted
    case 'institution': return '#3498DB'; // stamp-reported
    case 'company':     return '#3498DB'; // stamp-reported
    case 'document':    return '#D4A017'; // amber-pin
  }
}

// --- Edge helpers ------------------------------------------------------------

function edgeStroke(edge: RelationshipDto): string {
  switch (edge.certainty) {
    case 'established': return '#C0392B';
    case 'alleged':     return '#D4A017';
    case 'reported':    return '#3498DB';
    case 'disputed':    return '#8E44AD';
    case 'unverified':  return '#9DB89A';
  }
}

function edgeWidth(edge: RelationshipDto): number {
  switch (edge.certainty) {
    case 'established': return 2.5;
    case 'reported':    return 1.5;
    case 'alleged':     return 1.5;
    case 'disputed':    return 1;
    case 'unverified':  return 0.75;
  }
}

function edgeDash(edge: RelationshipDto): string | undefined {
  switch (edge.certainty) {
    case 'established': return undefined;
    case 'reported':    return undefined;
    case 'alleged':     return '8 4';
    case 'disputed':    return '3 4';
    case 'unverified':  return '2 4';
  }
}

function edgeCurvature(edge: RelationshipDto): number {
  switch (edge.certainty) {
    case 'established': return 0.1;
    case 'reported':    return 0.2;
    case 'alleged':     return 0.35;
    case 'disputed':    return 0.45;
    case 'unverified':  return 0.5;
  }
}

function edgeZIndex(edge: RelationshipDto): number {
  switch (edge.certainty) {
    case 'established': return 5;
    case 'reported':    return 4;
    case 'alleged':     return 3;
    case 'disputed':    return 2;
    case 'unverified':  return 1;
  }
}

function knotMarkerId(edge: RelationshipDto): string {
  switch (edge.certainty) {
    case 'established': return 'url(#knot-red)';
    case 'alleged':     return 'url(#knot-gold)';
    case 'reported':    return 'url(#knot-blue)';
    case 'disputed':    return 'url(#knot-purple)';
    case 'unverified':  return 'url(#knot-grey)';
  }
}

// --- Custom established edge (thread texture + tag label) -------------------

const REDUCED_MOTION =
  globalThis.window !== undefined &&
  globalThis.matchMedia('(prefers-reduced-motion: reduce)').matches;

function CustomEstablishedEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  style,
  markerStart,
  markerEnd,
  label,
}: EdgeProps): JSX.Element {
  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition: sourcePosition as Position,
    targetX,
    targetY,
    targetPosition: targetPosition as Position,
    curvature: 0.1,
  });

  const filterId = `thread-${id}`;

  return (
    <>
      {!REDUCED_MOTION && (
        <defs>
          <filter id={filterId} x="-20%" y="-20%" width="140%" height="140%">
            <feTurbulence
              type="fractalNoise"
              baseFrequency="0.9"
              numOctaves="2"
              result="noise"
            />
            <feDisplacementMap
              in="SourceGraphic"
              in2="noise"
              scale="0.8"
              xChannelSelector="R"
              yChannelSelector="G"
            />
          </filter>
        </defs>
      )}
      <BaseEdge
        id={id}
        path={edgePath}
        style={{
          ...style,
          filter: REDUCED_MOTION ? undefined : `url(#${filterId})`,
        }}
        markerStart={markerStart}
        markerEnd={markerEnd}
      />
      {label ? (
        <EdgeLabelRenderer>
          <div
            style={{
              position: 'absolute',
              transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
              pointerEvents: 'all',
              fontFamily: "'Special Elite', monospace",
              fontSize: 9,
              color: '#1F3529',
              background: '#EDE8D0',
              border: '1px solid #2D5040',
              padding: '2px 6px',
              borderRadius: 0,
              whiteSpace: 'nowrap',
            }}
            className="nodrag nopan"
          >
            {label as string}
          </div>
        </EdgeLabelRenderer>
      ) : null}
    </>
  );
}

const EDGE_TYPES = { established: CustomEstablishedEdge };

// --- Label tag style for standard (non-established) edges -------------------

const TAG_LABEL_STYLE = {
  fontFamily: "'Special Elite', monospace",
  fontSize: 9,
  fill: '#1F3529',
} as const;

const TAG_BG_STYLE = {
  fill: '#EDE8D0',
  stroke: '#2D5040',
  strokeWidth: 1,
} as const;

// --- Component --------------------------------------------------------------

export function PetaKasus({ onEdgeTap }: PetaKasusProps): JSX.Element {
  const { selectedEntityId, actions } = useKasusDetail();
  const graph = useVisibleGraph();
  const [sessionPositions, setSessionPositions] = useState<Map<string, { x: number; y: number }>>(
    new Map(),
  );

  const layout = useMemo(() => buildLayout(graph.data?.nodes ?? []), [graph.data?.nodes]);

  const handleNodesChange = (changes: NodeChange[]) => {
    setSessionPositions((prev) => {
      const next = new Map(prev);
      for (const change of changes) {
        if (change.type === 'position' && change.position) {
          next.set(change.id, change.position);
        }
      }
      return next;
    });
  };

  const flowNodes = useMemo<Node[]>(() => {
    const nodes = graph.data?.nodes ?? [];
    return nodes.map((entity) => {
      const pos = sessionPositions.get(entity.id) ?? layout.get(entity.id) ?? { x: 0, y: 0 };
      const selected = entity.id === selectedEntityId;
      const accent = typeAccentColor(entity);
      return {
        id: entity.id,
        position: pos,
        data: { label: entity.canonicalName, entity },
        style: {
          // Parchment base + amber-pin mark at top-left (radial-gradient dot)
          background: `#EDE8D0 radial-gradient(circle at 10px 10px, #D4A017 3px, transparent 3px)`,
          color: '#1F3529',
          border: selected ? '2px solid #D4A017' : '1px solid #2D5040',
          // Entity-type accent bar on the left edge
          borderLeft: `4px solid ${accent}`,
          // Elevation shadow; amber glow when selected
          boxShadow: selected
            ? '3px 6px 16px rgba(0,0,0,0.45), 0 0 12px rgba(212,160,23,0.35)'
            : '3px 6px 16px rgba(0,0,0,0.45)',
          padding: 8,
          borderRadius: 4,
          width: 160,
          fontSize: 12,
        },
        type: 'default',
      } satisfies Node;
    });
  }, [graph.data?.nodes, layout, selectedEntityId]);

  const flowEdges = useMemo<Edge[]>(() => {
    const edges = graph.data?.edges ?? [];
    return edges.map((edge) => {
      const color = edgeStroke(edge);
      const knot = knotMarkerId(edge);
      const isEstablished = edge.certainty === 'established';
      return {
        id: edge.id,
        source: edge.fromEntityId,
        target: edge.toEntityId,
        type: isEstablished ? 'established' : 'default',
        label: edge.type,
        data: { edge },
        zIndex: edgeZIndex(edge),
        markerStart: knot,
        markerEnd: knot,
        style: {
          stroke: color,
          strokeWidth: edgeWidth(edge),
          strokeDasharray: edgeDash(edge),
          strokeLinecap: 'round',
        },
        // curvature for standard bezier edges (established controls its own)
        pathOptions: isEstablished ? undefined : { curvature: edgeCurvature(edge) },
        // Tag label styling for standard edges
        labelStyle: TAG_LABEL_STYLE,
        labelBgStyle: TAG_BG_STYLE,
        labelBgBorderRadius: 0,
        labelBgPadding: [2, 6] as [number, number],
      } satisfies Edge;
    });
  }, [graph.data?.edges]);

  let graphContent: JSX.Element;
  if (graph.loading) {
    graphContent = (
      <p className="absolute inset-0 grid place-items-center text-sm text-chalk-muted">Memuat…</p>
    );
  } else if (graph.error) {
    graphContent = (
      <p className="absolute inset-0 grid place-items-center text-sm text-chalk-muted">
        Tidak dapat memuat peta: {graph.error}
      </p>
    );
  } else if (flowNodes.length === 0) {
    graphContent = (
      <p className="absolute inset-0 grid place-items-center text-center text-sm text-chalk-muted">
        Belum ada simpul. Tarik sumber ke dossier kasus ini untuk mulai membangun peta.
      </p>
    );
  } else {
    graphContent = (
      <ReactFlow
        nodes={flowNodes}
        edges={flowEdges}
        edgeTypes={EDGE_TYPES}
        nodesDraggable
        onNodesChange={handleNodesChange}
        onNodeClick={(_, node) => {
          const entity = (node.data as { entity: EntityDto }).entity;
          actions.selectEntity(entity.id);
        }}
        onPaneClick={() => actions.selectEntity(null)}
        onEdgeClick={(_, edge) => {
          const rel = (edge.data as { edge: RelationshipDto }).edge;
          onEdgeTap?.(rel);
        }}
        fitView
        attributionPosition="bottom-left"
        proOptions={{ hideAttribution: true }}
      >
        <Background gap={24} size={1} color="#2D5040" />
        <Controls showInteractive={false} />
      </ReactFlow>
    );
  }

  return (
    <div className="relative h-full">
      <svg style={{ position: 'absolute', width: 0, height: 0, overflow: 'hidden' }} aria-hidden="true">
        <defs>
          {[
            ['knot-red',    '#C0392B'],
            ['knot-gold',   '#D4A017'],
            ['knot-blue',   '#3498DB'],
            ['knot-purple', '#8E44AD'],
            ['knot-grey',   '#9DB89A'],
          ].map(([id, fill]) => (
            <marker key={id} id={id} markerWidth="6" markerHeight="6" refX="3" refY="3">
              <circle cx="3" cy="3" r="3" fill={fill} />
            </marker>
          ))}
        </defs>
      </svg>

      {graphContent}
    </div>
  );
}

function buildLayout(nodes: readonly EntityDto[]): Map<string, { x: number; y: number }> {
  const layout = new Map<string, { x: number; y: number }>();
  const radius = Math.max(180, nodes.length * 18);
  nodes.forEach((node, index) => {
    const angle = (2 * Math.PI * index) / Math.max(1, nodes.length);
    layout.set(node.id, {
      x: radius * Math.cos(angle),
      y: radius * Math.sin(angle),
    });
  });
  return layout;
}
