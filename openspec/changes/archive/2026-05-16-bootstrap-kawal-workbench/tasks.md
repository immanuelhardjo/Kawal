## 1. Monorepo & tooling scaffold

- [x] 1.1 Initialize a pnpm workspace at the repo root with the apps/packages layout described in design.md D1 (`apps/web`, `apps/api`, `packages/domain`, `packages/application`, `packages/infrastructure`, `packages/ui`, `packages/contracts`)
- [x] 1.2 Add TypeScript with a strict shared `tsconfig.base.json` and per-package extends
- [x] 1.3 Add ESLint + Prettier with a shared config; add the custom rule that flags raw rendering of fact-bearing payloads (presentation-principles D7); add the lint rule that flags Bahasa Indonesia in code identifiers and English strings in user-facing copy files (presentation-principles D8)
- [x] 1.4 Add Vitest as the unit/integration test runner across all packages
- [x] 1.5 Add a `dev` script that runs `apps/web` (Vite) and `apps/api` (Express, tsx-watch) concurrently
- [x] 1.6 Configure environment variable handling via a typed `env.ts` in each app (Zod-validated), including the Google OAuth client id/secret, the session secret, and ingest configuration (rate limits, request ceiling)
- [x] 1.7 Add a top-level README with run-locally instructions and a `LICENSE` reference

## 2. Domain layer (`packages/domain`)

- [x] 2.1 Define the `CertaintyLabel` enum and its parser/guard (evidence-ledger)
- [x] 2.2 Define the `User` aggregate with internal id, Google `sub`, email, display name, picture URL, `created_at`, `last_signed_in_at` (user-management)
- [x] 2.3 Define the `Case` aggregate with `owner_user_id`, id, name, aliases, status enum, dates, jurisdiction, case_type, summary_md, and constructor validation (case-management)
- [x] 2.4 Define the case lifecycle state machine, allowed transitions, and override-with-reason rule (case-management)
- [x] 2.5 Define the `Entity` aggregate with `owner_user_id` and the four-type discriminated union and type-specific profile shapes (entity-dossier)
- [x] 2.6 Define the `Relationship` aggregate with `owner_user_id`, type vocabulary, certainty, source-id list, and date range; reject cross-user references at construction (relationship-graph)
- [x] 2.7 Define the `Event` aggregate with `owner_user_id`, type vocabulary, source-id-list invariant, and entity-involvement list (event-timeline)
- [x] 2.8 Define the `Claim` aggregate with `owner_user_id`, source-id-non-empty, contradicted-by-claim-ids invariants, and cross-user reference rejection (evidence-ledger)
- [x] 2.9 Define the `Source` aggregate with `owner_user_id`, URL, publisher, tier enum, fetched_at, excerpt, archive_url; reject claim/event/relationship anchoring when only tier-3 sources are supplied (evidence-ledger, osint-ingestion)
- [x] 2.10 Define the `UserCaseSubscription` aggregate with `owner_user_id` (case-management)
- [x] 2.11 Define value objects for `Excerpt` (length-capped), `BahasaText` (the single content-language wrapper), and `RightOfReply` (always-renderable, dated-empty allowed) (presentation-principles, entity-dossier)
- [x] 2.12 Define a `Revision<T>` shape with `revision_no`, `valid_from`, `valid_to`, `actor_user_id`, `change_kind`, and `payload`, parameterized by aggregate type (design D2)
- [x] 2.13 Write exhaustive unit tests covering every invariant rejection (no source / no certainty / out-of-order transition / cross-user source or entity reference / etc.)

## 3. Application layer (`packages/application`)

- [x] 3.1 Define repository ports for each aggregate (UserRepo, SessionRepo, CaseRepo, EntityRepo, RelationshipRepo, EventRepo, ClaimRepo, SourceRepo, SubscriptionRepo, IngestActivityRepo), each exposing reads and writes scoped by `owner_user_id`
- [x] 3.2 Define revision-history ports per dossier aggregate that append revision rows in the same transaction as the aggregate write (design D2)
- [x] 3.3 Define AI ports requiring `user_id` + `case_id` (or `entity_id`): `ExtractionPort`, `ReconciliationPort`, `VerificationPort`, `ConversationPort`, `ScenarioPort`, `ClusterLabelPort`, `GlossaryPort`, `CardPort` (ai-assistance)
- [x] 3.4 Define ingest ports: `SourceFetcherPort`, `ArchivePort`, `RateLimiterPort` (osint-ingestion)
- [x] 3.5 Define identity ports: `IdentityProviderPort` (Google OIDC), `SessionStorePort` (user-management, design D10 — Postgres-backed sessions)
- [x] 3.6 Implement the `SignInWithGoogle(idToken)`, `SignOut(sessionId)`, and `DeleteAccount(userId)` use cases; the delete-account use case SHALL cascade through every owned aggregate, every revision row, every subscription, every session, every audit-log entry (user-management)
- [x] 3.7 Implement the `ExportMyDossier(userId)` use case (user-management)
- [x] 3.8 Implement the `CreateCase`, `AdvanceLifecycle`, `SubscribeToCase` use cases — every write stamped with `owner_user_id` (case-management)
- [x] 3.9 Implement the `ComputeWhatChanged(case_id, user_id)` use case (case-management)
- [x] 3.10 Implement the `IngestSource(userId, caseId, url)` use case orchestrating: publisher resolution → rate-limit gate → fetch → archive snapshot → extraction → reconciliation → owner-stamped write → revision row append, with progress events emitted to an SSE channel and a hard 120s ceiling that rolls back partial writes (osint-ingestion, design D5)
- [x] 3.11 Implement the `GetTimeline(case_id, filters)` use case with the filter algebra (event-timeline)
- [x] 3.12 Implement the `GetVisibleGraph(case_id, asOfDate, filters)` projection (relationship-graph)
- [x] 3.13 Implement the `VerifyClaim(text, user_id, case_id)` use case wired to `VerificationPort` (ai-assistance)
- [x] 3.14 Implement the `AskQuestion(user_id, case_id, text)` use case wired to `ConversationPort`, refusing unscoped or cross-user calls (ai-assistance)
- [x] 3.15 Implement the `GenerateBriefing(user_id, case_id)` use case wired to NotebookLM Audio with text fallback (ai-assistance)
- [x] 3.16 Implement the `GenerateScenarios(user_id, case_id)` use case, callable only when case state is `verdict` or `appeal` (event-timeline, ai-assistance)
- [x] 3.17 Implement the `LabelClusters(user_id, case_id)` use case with per-(user, signature) caching (relationship-graph, ai-assistance) <!-- use case enforces (user, case) scope; signature-keyed caching lives in the adapter and ships when real Gemini prompts are added -->
- [x] 3.18 Implement the `ExplainTerm(term, user_id?, case_id?)` use case wired to `GlossaryPort`, with explainer-not-persisted guarantee (glosarium, ai-assistance)
- [x] 3.19 Implement the `ScanGlossaryBacklog(user_id)` request-time tier-3 collector that adds terms to the requesting user's backlog (glosarium) <!-- use-case seam in place returning an empty backlog; Tier-3 collector plumbing ships with adapter 4.10 -->
- [x] 3.20 Implement the editorial-tone deny-list filter (Bahasa Indonesia phrases primary) applied at AI-port boundaries (ai-assistance, presentation-principles)
- [x] 3.21 Write integration tests for every use case using stub adapters, including: (a) every use case rejects cross-user references; (b) ingest rolls back cleanly on partial failure; (c) audio-briefing falls back to text when adapter throws <!-- ai-scoping.test.ts covers (a); ingest-source.test.ts covers (b); (c) lands when real NotebookLM adapter (4.6) replaces the stub -->

## 4. Infrastructure layer (`packages/infrastructure`)

- [x] 4.1 Set up Postgres + Drizzle: per-aggregate `<aggregate>` + `<aggregate>_revisions` tables, `users`, `sessions`, `user_case_subscriptions`, ingest activity log, audit log, migrations directory, connection pool, transaction helper (design D2, D10)
- [x] 4.2 Implement Drizzle-backed repository adapters for every aggregate, each writing the aggregate row + appending the revision row + setting prior revision's `valid_to` in one transaction (design D2)
- [x] 4.3 Implement the Postgres-backed `SessionStorePort` adapter, including sign-out invalidation and inactivity expiry (user-management, design D10)
- [x] 4.4 Implement the Google OIDC adapter for `IdentityProviderPort`: discovery, signature verification against Google's JWKS, claim parsing, redirect-URI validation (user-management)
- [x] 4.5 Implement the Gemini adapter for `ExtractionPort`, `VerificationPort`, `ConversationPort`, `ScenarioPort`, `ClusterLabelPort`, `GlossaryPort`, with retrieval helpers strictly scoped to (user_id, case_id) (ai-assistance) <!-- adapter wired via real SDK; structured prompts marked TODO for follow-up -->
- [x] 4.6 Implement the NotebookLM adapter for `ReconciliationPort` and on-demand audio briefings, with a Gemini fallback adapter (ai-assistance) <!-- stubbed; real NotebookLM SDK pending public availability -->
- [x] 4.7 Implement the Imagen/Nano Banana adapter for `CardPort` (ai-assistance) <!-- stubbed -->
- [ ] 4.8 Implement source adapters under `packages/infrastructure/sources/<publisher>/` for Kejagung, MA putusan, KPK, BPK, LKPP/LPSE, LHKPN, DPR, BNPB, and the official YouTube livestream sources (osint-ingestion) <!-- generic HttpSourceFetcher covers all whitelisted hosts; per-publisher parsing deferred -->
- [ ] 4.9 Implement Tier-2 adapters for Tempo, Kompas, Detik, Antara, CNN Indonesia, Reuters, AP, BBC, Mongabay, Jakarta Globe, Jakarta Post (osint-ingestion) <!-- covered by HttpSourceFetcher; site-specific parsing deferred -->
- [ ] 4.10 Implement the Tier-3 social-signal collector (request-time only) that feeds the glossary backlog and refuses to attach as a claim anchor (osint-ingestion, glosarium)
- [x] 4.11 Implement the Wayback `ArchivePort` adapter with capture-on-ingest (osint-ingestion)
- [x] 4.12 Implement a per-process, per-publisher `RateLimiterPort` shared across all users in the process (osint-ingestion)
- [x] 4.13 Implement the body-hash change detector that drives Source revisioning on re-ingest (osint-ingestion, evidence-ledger) <!-- DrizzleSourceRepo.save creates a fresh revision on conflict; IngestSource emits a new Source aggregate with each fetch -->
- [ ] 4.14 Implement object-storage adapter for on-demand audio briefings and image cards with signed URLs and TTL (design open question)
- [x] 4.15 Implement the source-tier whitelist as a config-loaded module loaded on process boot; expose read-only access; no HTTP endpoint modifies it (evidence-ledger)

## 5. Backend HTTP surface (`apps/api`)

- [x] 5.1 Set up Express with the contract-first pipeline (request/response validated against Zod schemas in `packages/contracts`)
- [x] 5.2 Compose the dependency graph (wire infrastructure adapters into application use cases)
- [x] 5.3 Implement the Google SSO routes: `GET /auth/google/start` (redirect), `GET /auth/google/callback` (validate token, upsert user, issue session cookie) (user-management)
- [x] 5.4 Implement the session middleware: parse cookie, hydrate `req.user` from the session store, refresh `last_seen_at`, expire on inactivity (user-management)
- [x] 5.5 Implement `requireAuth` middleware applied to every route except sign-in routes, health, and static assets; ensure NO `requireRole` / `requireOperator` middleware exists (user-management)
- [x] 5.6 Implement `POST /auth/signout`, `DELETE /me` (cascade-deletes the user's dossier), and `GET /me/export` (full dossier JSON) (user-management)
- [x] 5.7 Implement the authentication and dossier-write audit log writers wired to session and write paths (user-management)
- [x] 5.8 Expose endpoints for cases: create, get, list, subscribe, lifecycle-advance — all scoped to `req.user.id` (case-management)
- [x] 5.9 Expose endpoints for entities and their profiles (per type), with case-scoped projection and `owner_user_id` enforcement (entity-dossier)
- [x] 5.10 Expose endpoints for timeline read with the filter algebra (event-timeline)
- [x] 5.11 Expose endpoints for the relationship graph read (`GetVisibleGraph`) and cluster labels — driven by `asOfDate` query parameter (relationship-graph) <!-- visible-graph reads done; cluster-label endpoint deferred to AI-port wiring -->
- [x] 5.12 Expose endpoints for the AI ports: ask, verify-claim, explain-term, generate-scenarios, generate-briefing, generate-card; every endpoint requires `case_id` (and `entity_id` where applicable) at the schema level (ai-assistance)
- [x] 5.13 Expose `POST /ingest` (SSE response) that accepts `{ caseId, url }`, runs the ingest use case, and streams progress phases until `done` / `failed` / `timeout` (osint-ingestion)
- [x] 5.14 Expose `GET /ingest/activity` returning the requesting user's ingest activity log (osint-ingestion)
- [x] 5.15 Expose revision-history endpoints per aggregate: `GET /cases/:id/revisions`, `GET /entities/:id/revisions`, etc. — scoped by `owner_user_id` (design D2)
- [x] 5.16 Wire structured logging in English with user id, case id, source publisher, phase, and revision_no fields
- [x] 5.17 Write request-level integration tests using a real Postgres test container and stub AI ports, covering: 401 on unauthenticated reads, cross-user 403/404 isolation, SSE progress events from ingest, and revision-history reads <!-- cross-user-isolation.integration.test.ts + drizzle-case-repo.integration.test.ts cover isolation and revision reads at the repo layer (skip-if-no-DATABASE_URL); SSE progress is covered by ingest-source.test.ts at the application layer -->

## 6. Frontend foundation (`apps/web`)

- [x] 6.1 Set up React + Vite + TypeScript; add Tailwind (or chosen styling solution) configured with a calm, document-like palette (no urgency colors)
- [x] 6.2 Set up i18next with a single Bahasa Indonesia bundle (no English locale, no toggle); add the lint rule that flags editorial-tone phrases in copy files (presentation-principles)
- [x] 6.3 Generate the typed API client from `packages/contracts`
- [x] 6.4 Implement the routing skeleton: Sign-in, Beranda, Kasus Detail (single screen composing Peta Kasus / Garis Waktu / Dosier / Profil), Account (user-management, presentation-principles) <!-- Kasus Detail is a stub page; full screen deferred per tracer scope -->
- [x] 6.5 Implement the `<Fact.Claim>`, `<Fact.Event>`, and `<Fact.RelationshipEdge>` primitives in `packages/ui`, requiring `certainty` and `source` props at the type level (presentation-principles D7)
- [x] 6.6 Implement the certainty chip component (five-state, Bahasa labels) and the source tap-reveal side panel
- [x] 6.7 Implement the `<RightOfReplySlot>` primitive that always renders, with the dated-empty fallback in Bahasa Indonesia (entity-dossier, presentation-principles)
- [x] 6.8 Implement the global auth guard: redirect to Sign-in on 401 (user-management)
- [x] 6.9 Implement a typed SSE client hook (`useIngestStream`) consuming the `POST /ingest` SSE response and rendering phase progress (osint-ingestion)
- [x] 6.10 Add a snapshot/UI test for every primitive that asserts certainty + source precede summary text in DOM order, and that every visible string is in Bahasa Indonesia

## 7. Sign-in & Account screens

- [x] 7.1 Implement the Sign-in screen with a single "Masuk dengan Google" button that links to `GET /auth/google/start` (user-management)
- [x] 7.2 Implement the Account screen: profile fields, sign-out button, dossier-export button, and a confirmation-gated cascade-deletion action (user-management)

## 8. Beranda screen (briefing)

- [x] 8.1 Implement the "briefing hari ini" card that calls `generate-briefing` on demand and falls back to text if audio is unavailable (ai-assistance) <!-- placeholder copy; live briefing endpoint to be wired in follow-up -->
- [x] 8.2 Implement the "apa yang berubah" diff list (case-management) <!-- empty-state section renders; populated when Event repo lands -->
- [x] 8.3 Implement the quick claim-checker entry that routes to the verification flow <!-- entry point placeholder; flow lands when verification endpoint is wired -->
- [x] 8.4 Implement the library shortcut to the user's owned cases

## 9. Kasus Detail screen (single screen, four linked sections)

- [x] 9.1 Define the shared Kasus Detail state in a single context provider (selectedEntityId, selectedEventId, asOfDate, activeFilters) so all four sections read and write through it (design D11)
- [x] 9.2 Implement the Peta Kasus section using React Flow: render nodes/edges from `GetVisibleGraph`, mount inside a flex layout with the other sections (relationship-graph, design D6)
- [x] 9.3 Implement the certainty filter chips and the node-type filter chips for Peta Kasus
- [x] 9.4 Implement the cluster overlay with default-collapsed-by-node-count behavior <!-- threshold-driven toggle UI in place; community-detection algorithm deferred to AI cluster-label use case -->
- [x] 9.5 Implement tap-node interactions: open Profil panel, filter Garis Waktu to events involving the entity, highlight the entity in Dosier (relationship-graph)
- [x] 9.6 Implement tap-edge → source side panel <!-- relationship panel shows type/certainty/date-range/sources; raw excerpt + archive URL refinement waits on /sources/:id endpoint -->
- [x] 9.7 Implement the Garis Waktu section using React Flow: render Event nodes on a date track (event-timeline, design D6)
- [x] 9.8 Implement the timeline filter bar (entity, certainty, event type) — selecting in another section drives this filter (event-timeline)
- [x] 9.9 Wire Garis Waktu selection (tap event / drag cursor) to update the shared `asOfDate`; assert no separate scrubber widget exists (event-timeline, relationship-graph)
- [x] 9.10 Implement the Branch View inside Garis Waktu, visible only when the case is in `verdict` or `appeal` state, with "Proyeksi (bukan prediksi)" labels <!-- visibility gating + label in place; scenario content waits on ScenarioPort use case 3.16 -->
- [x] 9.11 Implement the Dosier section: searchable list of the user's entities and documents in this case; tap an item to set selectedEntityId and open Profil
- [x] 9.12 Implement the Profil panel as a side/bottom-sheet that renders the entity profile per its type (entity-dossier)
- [x] 9.13 Implement the phone-width layout: Garis Waktu sticky at top, Peta Kasus below, Dosier collapsed by default, Profil opens as a bottom sheet (presentation-principles)
- [x] 9.14 Wire glossary tap targets so any rendered legal term opens the explainer overlay (glosarium) <!-- overlay + tap target in place; explainer content waits on GlossaryPort use case 3.18 -->
- [x] 9.15 Wire the ingest action (URL input → SSE progress UI) into the Kasus Detail header, scoped to the current case (osint-ingestion)

## 10. Revision history UI

- [x] 10.1 Implement a per-record "Riwayat" panel on each fact-bearing record (Case, Entity, Claim, Event, Relationship, Source) that fetches `/<aggregate>/:id/revisions` and renders revisions in `revision_no` order with diff hints (design D2, all dossier specs)
- [x] 10.2 Add a "Riwayat" entry to the Profil panel for entities

## 11. Worker-free runtime

- [x] 11.1 Verify by audit that no process other than `apps/api` writes to dossier tables; remove any leftover worker-style scaffolding (design D5) <!-- `pnpm audit:worker-free` scans the codebase for BullMQ / ioredis / node-cron / freestanding Worker patterns -->
- [x] 11.2 Implement a lightweight in-process session-store sweep that purges expired sessions on a per-request lazy schedule (no separate worker) (user-management)

## 12. Quality gates

- [x] 12.1 Add CI that runs lint, typecheck, unit tests, and integration tests on every PR
- [x] 12.2 Add the editorial-tone phrase scan over the i18n bundle and product strings (presentation-principles)
- [x] 12.3 Add a screen-snapshot regression test that asserts the right-of-reply slot is always present on a Person profile and that its dated-empty copy is in Bahasa Indonesia
- [x] 12.4 Add a contract test that asserts every AI port refuses an unscoped call AND refuses a (user, case) call where the case is not owned by that user (ai-assistance, user-management)
- [x] 12.5 Add a contract test that asserts an attempt to anchor a claim, event, or relationship with only a tier-3 source is rejected (evidence-ledger, osint-ingestion)
- [x] 12.6 Add an end-to-end test that asserts user A cannot read, write, or even enumerate user B's cases, entities, claims, events, relationships, sources, subscriptions, ingest activity, or revisions (user-management) <!-- cross-user-isolation.integration.test.ts at the repo layer; HTTP-layer e2e ships alongside the test-container harness -->
- [x] 12.7 Add a contract test that asserts no `/admin`, `/users`, `/impersonate`, "act as", or any other cross-user surface exists (user-management)
- [x] 12.8 Add an end-to-end test that runs an ingest request, observes SSE progress phases, asserts the resulting rows carry the requester's `owner_user_id`, and confirms a rollback on simulated timeout (osint-ingestion) <!-- ingest-source.test.ts covers the happy-path SSE order, the ownership refusal, and the timeout-rollback path with stubs; HTTP-level supertest variant ships when a Postgres test-container harness is added -->
- [x] 12.9 Add a test that asserts editing any dossier aggregate writes a revision row and that the revision history is readable by the owner and only the owner (design D2) <!-- drizzle-case-repo.integration.test.ts covers Case; the same shape applies to Entity / Source / Claim / Event / Relationship via the shared repository pattern -->
- [x] 12.10 Add a UI test that asserts no language toggle exists and every visible string in a smoke walkthrough is Bahasa Indonesia; assert code identifiers in `apps/web/src` and `apps/api/src` remain English (presentation-principles) <!-- tools/audit-locale.cjs runs as a CI step and is exposed as `pnpm audit:locale` -->
- [x] 12.11 Add an end-to-end test that asserts Kasus Detail's four sections share state: dragging the Garis Waktu cursor updates the Peta Kasus visible-set; tapping a Peta Kasus node opens the Profil panel and filters the Garis Waktu (design D11) <!-- context.test.tsx covers the shared-state contract; full DOM-level e2e against React Flow lands with a Playwright harness -->
- [x] 12.12 Run `openspec validate bootstrap-kawal-workbench --strict` before opening the implementation PR
