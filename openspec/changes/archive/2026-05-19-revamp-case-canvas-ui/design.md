## Context

The Kasus Detail screen currently composes three sibling panels: a Dosier (entity list, left), a GarisWaktu ReactFlow canvas (centre-left), and a PetaKasus ReactFlow canvas (centre-right). AI interactions happen through one-off overlays with no persistent memory. Two full-height fixed overlays (`Profil`, `SourcePanel`) compete with the main canvas for screen real estate on edge and entity tap.

The revamp replaces this with three purpose-built zones that share state through the existing `KasusDetailContext`, persists AI conversation history server-side, and absorbs both overlays into a contained right-tray detail view.

## Goals / Non-Goals

**Goals:**
- Three-column layout: AI chat (left), vertical 30/70 Garis Waktu + Peta Kasus (centre), tabbed Dossier/Source with split-bottom detail (right)
- Conversation history persisted per user per case; survives page refresh and navigation
- react-chrono HORIZONTAL timeline replaces the custom ReactFlow timeline layout
- Peta Kasus nodes draggable and rearrangeable within the session
- Right tray absorbs `Profil` and `SourcePanel` overlays; nothing renders outside the three-column frame
- Mobile: tab-navigation with one panel visible at a time

**Non-Goals:**
- Multi-user shared conversation threads (each user has their own thread per case)
- Streaming AI responses (request-response only for this change)
- Persisting Peta Kasus node positions across sessions (session-only layout memory)
- Conversation history search or export

## Decisions

### D1: Conversation history stored as append-only rows, not a session blob

Each Q&A exchange is a separate `conversation_messages` row (`id`, `case_id`, `user_id`, `question`, `answer_text`, `cited_claim_ids[]`, `cited_event_ids[]`, `cited_source_ids[]`, `created_at`). Ordered by `created_at ASC`.

**Why over a JSON blob per session**: individual rows are queryable, can be paginated, and don't require deserialising a growing blob on every load. The schema mirrors `ConversationAnswer` exactly, making the port-to-persistence mapping trivial.

**AskQuestion persistence**: after `ConversationPort.ask()` resolves, the use case persists the Q&A pair via a new `ConversationHistoryRepo.append()` before returning. The route is unchanged; persistence is a use-case concern, not a route concern.

**GetConversationHistory use case**: takes `{ userId, caseId }`, verifies ownership via `CaseRepo.findByIdForOwner`, then returns messages ordered by `created_at ASC`. No pagination in V1 (truncate display to last 50 in the UI).

### D2: react-chrono HORIZONTAL replaces the ReactFlow timeline

The current `garis-waktu.tsx` uses ReactFlow as a timeline, which requires a custom `buildTimelineLayout` function to position nodes manually. react-chrono's `HORIZONTAL` mode handles layout natively and is purpose-built for L→R chronological flows.

**Data mapping**: `EventDto[]` sorted by `date ASC` → react-chrono `TimelineItem[]` (`{ cardTitle: date, cardDetailedText: summary, title: type, cardSubtitle: certainty }`). The `onItemSelected` callback maps to `actions.selectEvent(id)`.

**Dropped: draggable timeline cursor scrubber**. react-chrono does not support a draggable cursor. The `asOfDate` is set by clicking an event card (already the primary interaction). The spec requirement for "Dragging the timeline cursor updates the graph continuously" is superseded — this is captured in the `event-timeline` delta spec.

**Theming**: react-chrono accepts a `theme` prop. Map to the existing design tokens: `primary: amber-pin (#D4A017)`, `secondary: chalk-muted (#9DB89A)`, `cardBgColor: board (#1C1C1E)`, `cardForeColor: chalk (#E8E0D0)`.

### D3: Right tray is a self-contained split-panel component

The right tray maintains its own internal state: `activeTab: 'dossier' | 'source'`, `selectedItem: EntityDto | RelationshipDto | null`, `detailOpen: boolean`.

```
RightTray
  ├── TabBar  [Dossier] [Source]
  ├── ListPane (flex-1, overflow-y-auto)
  │     Dossier tab → existing <Dosier> list content
  │     Source tab  → flat list of sources for the case
  └── DetailPane (fixed height ~45%, collapses when no item selected)
        Dossier → entity profile (contents of current <Profil>)
        Source  → relationship/source detail (contents of current <SourcePanel>)
```

`Profil` and `SourcePanel` are deleted. `KasusDetailContext` still owns `selectedEntityId`; the RightTray reads it to auto-open the Dossier detail when PetaKasus selects a node.

### D4: Cross-panel citation linking (chat → right tray)

When an AI answer arrives with `citedSourceIds`, the chat panel renders each cited source as a tappable chip. Tapping calls `rightTrayRef.openSource(sourceId)` via a `useImperativeHandle` ref exposed by the right tray. This switches the active tab to Source and opens that item's detail pane.

**Why ref over context**: citation linking is a point-to-point UI action, not shared application state. Adding it to `KasusDetailContext` would bloat the context with UI-only concerns. A ref keeps the wiring local to `index.tsx`.

### D5: Mobile layout — bottom tab bar, single active panel

Below `lg` breakpoint (< 1024px), the three columns collapse to a single full-height panel controlled by a bottom tab bar: `[Chat] [Kanvas] [Dosier/Sumber]`. The centre panel shows GarisWaktu (30%) + PetaKasus (70%) stacked. Tab state lives in the layout component.

### D6: IngestButton relocated to right tray header

The right tray header row holds the tab bar and the IngestButton (icon-only on narrow widths). Ingestion creates new Sources, so co-locating the trigger with the Source tab is semantically correct.

## Risks / Trade-offs

**[Risk] react-chrono version lock** → The library's `HORIZONTAL` layout has historically had breaking changes between major versions. Pin to a specific minor (`^2.x.x`) and snapshot-test the rendered output.

**[Risk] Conversation history grows unbounded per case** → Mitigate in V1 by fetching only the last 50 messages in `GetConversationHistory` and displaying a "load earlier" affordance in the UI (not implemented in V1, just the truncation guard).

**[Risk] Right tray detail height is fixed (~45%)** → On short viewports, the list pane shrinks heavily when detail opens. A CSS `min-height` guard on the list pane (e.g. `min-h-[120px]`) prevents it from disappearing entirely.

**[Trade-off] Session-only node positions** → Peta Kasus node positions reset on refresh. Persisting them requires a new `node_positions` table and a debounced save call on every drag. Deferred to a follow-up; the UX cost is low since investigators typically re-orient the graph anyway.

## Migration Plan

1. Database: run migration adding `conversation_messages` table (non-destructive, no existing rows affected).
2. Backend: deploy `GetConversationHistory` route and modified `AskQuestion` (append-only, old calls unaffected).
3. Frontend: deploy new layout. The `Profil` and `SourcePanel` overlays are replaced; no feature flags needed since they're unreachable once the layout ships.
4. Rollback: revert frontend deploy restores old layout; `conversation_messages` rows are inert if the old frontend doesn't read them.

## Open Questions

- **Source list for right tray Source tab**: the backend has `/sources` in the contracts but no frontend hook. Should the Source tab list all case sources, or only sources referenced in a selected relationship? (Proposed: all case sources, with relationship filter chip.)
- **react-chrono peer-dep React version**: confirm react-chrono `^2.x` supports React 18 before locking the version.
