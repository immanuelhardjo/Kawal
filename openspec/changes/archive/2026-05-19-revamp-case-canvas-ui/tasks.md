## 1. Database & Backend — Conversation History

- [x] 1.1 Write migration: create `conversation_messages` table (`id`, `case_id`, `user_id`, `question`, `answer_text`, `cited_claim_ids`, `cited_event_ids`, `cited_source_ids`, `created_at`)
- [x] 1.2 Define `ConversationHistoryRepo` port in `packages/application/src/ports/` with `append(message)` and `getHistory({ userId, caseId, limit }): ConversationMessage[]`
- [x] 1.3 Implement `ConversationHistoryRepo` Postgres adapter in `apps/backend/src/`
- [x] 1.4 Create `GetConversationHistory` use case in `packages/application/src/use-cases/` — verifies case ownership then delegates to port
- [x] 1.5 Modify `AskQuestion` use case to call `ConversationHistoryRepo.append()` after the AI port resolves
- [x] 1.6 Add `GET /ai/conversation-history?caseId=` route in `apps/backend/src/routes/ai.ts`
- [x] 1.7 Register `ConversationHistoryRepo` adapter and `GetConversationHistory` use case in `apps/backend/src/composition.ts`
- [x] 1.8 Add `ConversationMessage` DTO to `packages/contracts/src/` and export from the contracts index

## 2. Frontend — Dependencies & Hooks

- [x] 2.1 Add `react-chrono` to `apps/frontend/package.json`; verify React 18 peer dep compatibility
- [x] 2.2 Create `useConversationHistory(caseId)` hook in `apps/frontend/src/screens/kasus-detail/hooks.ts` — fetches `GET /ai/conversation-history` on mount, returns `{ messages, loading }`
- [x] 2.3 Create `useAskQuestion(caseId)` hook — posts to `POST /ai/ask`, appends response to local messages state optimistically

## 3. Frontend — Header Simplification

- [x] 3.1 Strip `← Beranda` link, jurisdiction `<span>`, and status badge from `KasusDetailLayout` header in `index.tsx`
- [x] 3.2 Retain `IngestButton` — relocate to right tray header (wired in task 5.1)

## 4. Frontend — Left Panel: AI Chat

- [x] 4.1 Create `apps/frontend/src/screens/kasus-detail/chat-panel.tsx` — renders conversation history list (oldest top, newest bottom, scroll-to-bottom on new message)
- [x] 4.2 Style user question bubbles and AI answer bubbles using existing chalk/board tokens
- [x] 4.3 Render cited source IDs in each answer as tappable chips; chips call `onCitedSourceTap(sourceId)` prop
- [x] 4.4 Add text input + send button at the bottom of the chat panel; disable send while loading
- [x] 4.5 Wire `useConversationHistory` and `useAskQuestion` into `ChatPanel`

## 5. Frontend — Right Tray: Tabs + Split-Bottom Detail

- [x] 5.1 Create `apps/frontend/src/screens/kasus-detail/right-tray.tsx` — tab bar (Dossier / Source), list pane, collapsible detail pane; expose `openSource(sourceId)` via `useImperativeHandle`
- [x] 5.2 Relocate entity list content from `dosier.tsx` into the Dossier tab of `RightTray`; entity selection still calls `actions.selectEntity(id)` from context
- [x] 5.3 Implement Source tab: fetch all case sources (`GET /cases/:id/sources` or equivalent), render flat list; selecting a source opens its detail in the bottom detail pane
- [x] 5.4 Implement detail pane — Dossier detail: render entity profile content (previously `Profil` component); Source detail: render relationship/source detail (previously `SourcePanel` component)
- [x] 5.5 Wire `selectedEntityId` from context to auto-switch to Dossier tab and open entity detail when a node is tapped in PetaKasus
- [x] 5.6 Move `IngestButton` into the right tray header row (icon-only at narrow widths)
- [x] 5.7 Delete `profil.tsx` and `source-panel.tsx` after content is absorbed into RightTray

## 6. Frontend — Centre Canvas: Garis Waktu (react-chrono)

- [x] 6.1 Rewrite `garis-waktu.tsx` — replace ReactFlow canvas with react-chrono `HORIZONTAL` mode; map `EventDto[]` sorted by `date ASC` to `TimelineItem[]`
- [x] 6.2 Apply react-chrono `theme` prop: `cardBgColor` → board token, `cardForeColor` → chalk token, `primary` → amber-pin token
- [x] 6.3 Wire `onItemSelected` callback to `actions.selectEvent(id)` and update `asOfDate` via context
- [x] 6.4 Render certainty chip and event type on each card, visible before summary text
- [x] 6.5 Preserve entity and certainty filter chips above the timeline (existing `FilterChip` components)

## 7. Frontend — Centre Canvas: Peta Kasus (draggable nodes)

- [x] 7.1 Enable `nodesDraggable` on the ReactFlow instance in `peta-kasus.tsx`
- [x] 7.2 Handle `onNodesChange` to persist repositioned node positions in local component state for the session lifetime
- [x] 7.3 Update edge tap handler to call right tray `openSource(relationship)` ref instead of the old `onEdgeTap` prop

## 8. Frontend — Layout Restructure

- [x] 8.1 Restructure `KasusDetailLayout` in `index.tsx` to three-column flex: `ChatPanel` (left, fixed width), centre column (30/70 vertical split), `RightTray` (right, fixed width)
- [x] 8.2 Wire `rightTrayRef.openSource(sourceId)` call from `ChatPanel`'s `onCitedSourceTap` prop through `index.tsx`
- [x] 8.3 Implement mobile tab-navigation layout below `lg` breakpoint: bottom tab bar with Chat / Kanvas / Dossier·Sumber tabs; active panel takes full height
- [x] 8.4 Remove `Profil` and `SourcePanel` usage from `index.tsx`; remove `tappedEdge` state

## 9. Verification

- [ ] 9.1 Confirm conversation history persists across page refresh (end-to-end: send question, reload, verify message appears)
- [ ] 9.2 Confirm react-chrono cards render in chronological L→R order with correct theme colours
- [ ] 9.3 Confirm tapping a timeline card updates Peta Kasus `asOfDate`
- [ ] 9.4 Confirm tapping a PetaKasus node opens Dossier detail in right tray (no overlay)
- [ ] 9.5 Confirm tapping a PetaKasus edge opens Source detail in right tray (no overlay)
- [ ] 9.6 Confirm tapping a cited source chip in chat switches right tray to Source tab and opens detail
- [ ] 9.7 Confirm node drag repositions node and edges follow; positions reset on refresh
- [ ] 9.8 Confirm mobile tab bar shows one panel at a time at viewport < 1024px
- [ ] 9.9 Confirm header shows only case name (no back button, jurisdiction, status badge)
