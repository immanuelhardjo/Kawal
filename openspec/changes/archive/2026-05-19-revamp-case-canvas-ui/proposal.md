## Why

The current Kasus Detail screen fragments the investigator's workflow across three disconnected panels — the Dosier (entity list), a ReactFlow timeline, and a relationship graph — with AI interactions buried in separate overlays and no persistent memory of analyst conversations. Restructuring the canvas into purpose-built zones (AI assistant left, temporal + relational canvas center, evidence right) and persisting conversation history server-side gives investigators a unified, recall-able workspace.

## What Changes

- **Header stripped** to case name only; back button, jurisdiction label, and status badge removed
- **Left panel** repurposed from entity Dosier → AI chat interface with full server-persisted conversation history per user per case
- **Center canvas** split 30/70 vertically: Garis Waktu (top, react-chrono horizontal L→R) over Peta Kasus (bottom, react-flow with draggable/rearrangeable nodes)
- **Right panel** becomes a dual-tab container (Dossier + Source) with an inline split-bottom detail view replacing the current `Profil` and `SourcePanel` overlays
- **Conversation history** persisted server-side (new DB table, new use cases, new route)
- `react-chrono` added as a new frontend dependency

## Capabilities

### New Capabilities

- `conversation-history`: Server-side persistence of AI Q&A threads scoped per user per case, including cited claim/event/source IDs in each answer
- `case-canvas-layout`: Three-panel canvas layout — AI chat (left), Garis Waktu + Peta Kasus stacked (center), tabbed Dossier/Source with split-bottom detail (right) — including responsive mobile tab-navigation

### Modified Capabilities

- `event-timeline`: Timeline must render as a horizontal left-to-right chronological flow (react-chrono HORIZONTAL mode); drag-to-scrub replaced by click-to-select-date
- `relationship-graph`: Entity nodes must be repositionable by drag; layout must persist within the session

## Impact

- `apps/frontend/src/screens/kasus-detail/` — major restructure: new `chat-panel.tsx`, `right-tray.tsx`; `dosier.tsx` relocated into right tray; `profil.tsx` and `source-panel.tsx` absorbed into right-tray split detail; `garis-waktu.tsx` rewritten with react-chrono
- `apps/frontend` — new dependency `react-chrono`
- `apps/backend/src/routes/ai.ts` — new `GET /ai/conversation-history` endpoint
- `packages/application/src/use-cases/` — `AskQuestion` modified to persist; new `GetConversationHistory` use case
- `packages/application/src/ports/` — new `ConversationHistoryRepo` port
- Database — new `conversation_messages` table with migration
