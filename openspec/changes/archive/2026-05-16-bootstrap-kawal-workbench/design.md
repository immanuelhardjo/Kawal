## Context

Kawal is a multi-user OSINT workbench for following Indonesian public-interest cases. Authentication is Google SSO only. Every authenticated user maintains their *own private dossier* — the cases, entities, claims, events, relationships, and sources they have ingested. No data is shared between users. Every fact-bearing record is append-only with a full revision history, so a user can audit how a record in their dossier evolved as evidence accumulated.

The product's behavioral spine is "sumber dulu, opini belakangan": every fact-bearing record carries a certainty label and at least one source, and the UI surfaces those before any interpretation. The stack is fixed by the proposal — ReactJS frontend, ExpressJS backend, clean-architecture separation of concerns on both tiers — and the AI surface is intentionally narrow (Gemini and NotebookLM, scoped to the requesting user's dossier for the case at hand).

All code (identifiers, types, comments, log messages) is in English. All user-facing display strings are in Bahasa Indonesia. There is no English-language UI variant.

The greenfield nature means there is no legacy schema to migrate, no existing users to coordinate with, and no production deploy to protect. The hard constraints come from the *content* domain: source provenance must survive every transformation, certainty labels are first-class, the dossier is private to its owner, and the tone of the system must remain that of "a quiet research librarian" — calm, sourced, unhurried. The product must work well on mobile web (pinch-zoom and pan on the graph).

## Goals / Non-Goals

**Goals:**

- A deployable web app (browser-only, mobile-web optimized) that any Google-authenticated user can use to maintain their own private dossier against live Tier-1/2 Indonesian sources.
- Google SSO as the sole credential, with HTTP-only session cookies. Every authenticated user has the same authority: read and write their own dossier; nothing else.
- Clean-architecture layering on both frontend and backend such that the OSINT ingestion, the AI assistance, the relationship graph, and the UI shell can each be modified independently.
- A data model where every `Claim`, `Event`, and `Relationship` is anchored to one or more `Source` rows and owned by exactly one User; where every `Source` has a tier and an archive-URL fallback; and where every fact-bearing aggregate has a full revision history.
- A Kasus Detail screen that composes Peta Kasus (graph), Garis Waktu (timeline), Dosier (entity/document index), and Profil (entity panel) as linked sections of a single screen sharing one selection and one "as-of date" state — driven by the timeline.
- An AI integration boundary that prevents the model from "free associating" — every Gemini/NotebookLM call is constrained to retrieval over the requesting user's dossier for the case at hand.
- A presentation layer that enforces "certainty + source before interpretation" at the component level, not via reviewer discipline.

**Non-Goals:**

- Identity providers other than Google. No email/password, no other OAuth providers, no enterprise SAML.
- Any cross-user visibility into the dossier. There is no shared dossier, no public read, no operator or admin tier that can read other users' data. Each user's dossier is fully isolated.
- Scheduled background crawls or a long-running job worker. All ingest is initiated by a user request.
- An English-language UI variant. Code is English; display is Bahasa Indonesia only.
- Tracking each user's private opinions or beliefs as they evolve. No belief journal, no rating history, no drift detection.
- Public, unauthenticated read access to the dossier or any of its records.
- Native mobile apps. Mobile-web only.
- Becoming a news aggregator or a comment platform. There is no feed, no reactions, no follower graph.
- Re-hosting source documents (PDFs, video). We link to originals; we cache excerpts and archive URLs only.
- Extending the source whitelist via end-user input. The Tier-1/2 list is centrally maintained as configuration.
- Producing "engagement" — no countdown timers, no breaking-news banners, no push-style outrage UX.
- Replacing legal advice or journalism. The audio briefings, scenarios, and explainers are aids to a careful reader, never authoritative.

## Decisions

### D1. Monorepo with clean-architecture packages

**Choice:** A pnpm workspace monorepo with the following structure:

```
apps/
  web/                # React + Vite, the only frontend deliverable
  api/                # Express HTTP entrypoint, the only backend deliverable
packages/
  domain/             # Entities, value objects, domain services. No I/O. Pure TS.
  application/        # Use cases / orchestrators. Depends only on domain + ports.
  infrastructure/     # Concrete adapters: DB, Gemini, NotebookLM, source fetchers.
  ui/                 # Shared React primitives that enforce certainty/source UX rules.
  contracts/          # OpenAPI/Zod schemas shared between apps/api and apps/web.
```

`apps/api` is a thin composition root that wires `infrastructure` adapters into `application` use cases and exposes them over HTTP. `apps/web` consumes typed clients generated from `packages/contracts`.

**Alternatives considered:**
- *Two-repo (separate frontend / backend repos):* rejected — the `contracts` package needs to evolve atomically with both, and version skew is the single biggest source of bugs in two-repo stacks.
- *Nest.js / a heavier framework:* rejected — Express plus our own ports/adapters keeps the dependency tree small and the clean-architecture boundaries visible.

### D2. Persistence: PostgreSQL via Drizzle ORM, with append-only revision tables per dossier aggregate

**Choice:** PostgreSQL is the system of record. Drizzle ORM is the typed query layer.

Every dossier aggregate (`Case`, `Entity`, `Relationship`, `Event`, `Claim`, `Source`) is stored in two tables:

- `<aggregate>` — the **current** row per id; this is what reads usually hit.
- `<aggregate>_revisions` — every prior version, appended on edit; the current row is also written here on each change. Each revision row carries `id`, `revision_no`, `valid_from`, `valid_to`, `actor_user_id`, the full payload, and a `change_kind` (`created` | `updated` | `tombstoned`).

Writes go through a repository that, in a single transaction, (a) inserts the new revision, (b) updates the `<aggregate>` row, and (c) records the actor (always the owning user — see D9). Soft-delete is a `tombstoned` revision; the current-table row is removed. The user can browse the revision history for any record they own.

**Rationale:** "Historical tracking" is a product requirement: the user wants to see how their understanding evolved. Audit trails are also a privacy expectation given each dossier is private. Per-aggregate revision tables are simpler than a single polymorphic audit log, give us indexed reads of one record's history, and let us evolve each aggregate's payload shape independently.

**Alternatives considered:**
- *Single polymorphic `revisions` table:* rejected — payload becomes a typeless JSON blob; queries for "show me the history of this Claim" require knowing which discriminator value to filter by; type evolution is harder.
- *Postgres temporal table extensions (e.g., `temporal_tables`):* close call — clean abstraction, but adds a non-trivial extension dependency. Roll our own pattern for clarity and portability.
- *Event sourcing:* over-engineered for the volume; we don't need to derive the current state from the event log.

### D3. Certainty labels are an enum, owned by the domain layer

**Choice:** A `CertaintyLabel` enum defined once in `packages/domain`:

```
established | alleged | reported | disputed | unverified
```

Every `Claim`, `Event`, and `Relationship` must carry one. Constructors in the domain layer refuse to build a fact-bearing record without it. The UI primitive `<FactRow>` in `packages/ui` refuses to render without a certainty prop and a source prop.

**Rationale:** Putting this at the type level means "fact without certainty" cannot exist in the codebase. The proposal's "sumber dulu, opini belakangan" becomes a compiler-checked invariant, not a style guideline.

### D4. AI calls are mediated through (user, dossier)-scoped ports

**Choice:** All Gemini and NotebookLM access goes through ports in `packages/application`:

```
ExtractionPort       // doc → structured records, given (user_id, case_id)
ReconciliationPort   // merge aliases / resolve conflicts within (user_id, case_id)
VerificationPort     // claim + user's dossier → certainty + supporting source ids
ConversationPort     // question + user's dossier → answer with citations
ScenarioPort         // case state (user-owned) → 2–4 labeled projections
ClusterLabelPort     // graph clusters (user-owned) → human-readable labels
GlossaryPort         // term + optional (user_id, case_id) → UU/KUHP explainer
CardPort             // user-owned dossier snippet → shareable image card
```

Each port's contract requires a `user_id` plus a `case_id` (or `entity_id`) and refuses to answer without retrieval context. The infrastructure adapter is the only place that touches the Gemini SDK or NotebookLM API; nothing else in the codebase knows their names.

**Rationale:** Two reasons. First, it keeps the AI surface narrow and auditable — the requesting user's dossier for the case at hand is the universe of facts available to the model, full stop, and no other user's data can leak in. Second, it lets us test the application layer with a stub AI adapter (deterministic fixtures) so feature work is not blocked on API quotas.

### D5. OSINT ingestion is request-time, per-user, with progress streaming

**Choice:** All source ingestion is initiated by an authenticated user's request and runs inside that request's lifecycle. There is no scheduled worker, no job queue, no cron. The flow is:

1. The user submits a source URL (or selects a case-refresh action) from the UI.
2. The API resolves the publisher against the source-tier whitelist; rejects unknown publishers immediately.
3. The API issues a polite outbound fetch (per-process rate-limit per publisher, exponential back-off on transient errors).
4. The API runs extraction (Gemini) and reconciliation (NotebookLM / Gemini fallback) inline against the requesting user's dossier for the named case.
5. The API writes dossier records (Source + any extracted Claims / Events / Relationships / Entities) into that user's tables, creating revisions per D2.
6. The API streams progress to the browser via Server-Sent Events on the same request: fetched → extracted → reconciled → wrote N records.

Long-running ingest (large documents, slow upstreams) holds the HTTP connection up to a hard ceiling (default 120s); the UI shows a spinner with the streamed phase. Failures are surfaced inline in the user's "ingest activity" panel; no silent retry.

**Rationale:** The product is a working file the user actively curates, not an aggregator that needs to crawl on a schedule. Removing the worker tier removes (a) a class of "user owns no data they didn't ask for" surprises that come with scheduled crawls, (b) a whole infrastructure stack (Redis + BullMQ + a long-running process), and (c) the question of "whose dossier do scheduled jobs write into when there are many users?" Doing the work in-request, streamed, makes provenance and consent immediate and visible.

**Alternatives considered:**
- *BullMQ + Redis worker on a cron schedule:* rejected — the worker would need to know which user to credit, and "the user is asleep" is not a good moment to discover a fetch failed.
- *Background queue, but user-initiated jobs only:* deferred — feasible later if a single ingest grows beyond what an HTTP request should hold; for now the streaming-SSE pattern handles the realistic upper-bound documents.

### D6. React Flow for both Peta Kasus (graph) and Garis Waktu (timeline)

**Choice:** Render both the Peta Kasus relationship graph and the Garis Waktu timeline using React Flow. React Flow's node-and-edge model maps directly to the graph; for the timeline, we render Event nodes laid out by date on a horizontal/vertical track using React Flow's custom node types and a deterministic layout function (rather than its physics-based default).

Both views are projections from the same canonical store: `getVisibleSet(user_id, case_id, asOfDate, filters)` returns nodes and edges, and the same hook feeds both. The shared `asOfDate` is owned by the Kasus Detail screen (D11) and driven by the user's selection within the timeline view.

**Rationale:** Using one rendering library for both views reduces cognitive overhead and makes the linked-section behaviour (selecting an event in the timeline highlights nodes in the graph; selecting a node in the graph highlights its events in the timeline) cheap to implement because both views speak React Flow's selection API. React Flow's React-first state model is easier to bind to our app state than the imperative `vis-network` API.

**Alternatives considered:**
- *vis-network for the graph + a custom timeline:* rejected after the redesign — two state models, two selection APIs, more glue.
- *D3 directly:* rejected — too much hand-rolling for the integrated experience.
- *Cytoscape.js:* not React-first; selection bridging would still need glue.

### D7. Certainty-first UI primitives, enforced

**Choice:** `packages/ui` exposes a `<Fact>` component family — `<Fact.Claim>`, `<Fact.Event>`, `<Fact.RelationshipEdge>` — each of which requires `certainty` and `source` props at the type level. Pages never render a fact-bearing string directly; they pass through `<Fact.*>`. An ESLint rule flags raw `<p>` / `<span>` usage that embeds claim/event payloads without going through the primitive.

**Rationale:** This translates "no opinion before sourcing" from a tone guideline into a build-time check. Reviewers cannot accidentally merge a screen that skips a certainty chip.

### D8. Display is Bahasa Indonesia only; code is English

**Choice:** All user-facing display strings (button labels, headings, prompts, certainty chip labels, error messages, system-generated copy from AI ports) are rendered in Bahasa Indonesia. There is no English UI toggle. All code (identifiers, types, function names, file names, comments, log fields, telemetry tags) is in English.

Display strings live in a single i18next bundle keyed by namespace; the bundle has one locale (`id-ID`). Dossier content (Case summary, Event summary, Entity description, glossary entries) is stored as a single Bahasa-Indonesian markdown field. AI ports are prompted in English and instructed to return user-facing text in Bahasa Indonesia.

**Rationale:** A single display language eliminates a class of translation drift, halves the i18n keys to maintain, and matches the product's core audience. English in code is a working-with-the-stack choice — the npm/React/Express ecosystem is English-named, and mixing Bahasa identifiers with English library APIs hurts readability. The split is enforceable with a lint rule that flags Bahasa words in `.ts`/`.tsx` outside string-literal contexts marked as user-facing copy.

**Alternatives considered:**
- *Bilingual UI with toggle and bilingual content storage:* rejected after the redesign — the original two-axis design was justified for a wider audience; for this scope it added complexity without proven demand.

### D9. Authentication via Google SSO with HTTP-only sessions; no operator role

**Choice:** Google OAuth 2.0 / OpenID Connect is the sole credential. The Express API runs the Authorization Code flow against Google, validates the returned ID token, upserts a `User` row keyed by the Google `sub` claim, and issues an HTTP-only `Secure` `SameSite=Lax` session cookie backed by a server-side session store. The session middleware attaches `req.user` to every authenticated handler; unauthenticated requests on protected routes return 401.

Every authenticated user has identical authority over their own dossier: they can create cases, advance lifecycle states, trigger ingest, append revisions, and delete their own records. They have *no* visibility into any other user's dossier or session. There is no operator role, no admin tier, no "act as another user", and no support-staff back-channel.

The Google Cloud OAuth client is locked to a deployment's authorized redirect URIs. Localhost is allowed only in development.

**Rationale:** The product's threat model after the per-user-dossier decision is simple — a user reads and writes their own data, full stop. An operator/admin role would create an asymmetric access path that the data model now has no need for; removing it removes a class of "could an admin see X" questions and shrinks the audit surface.

**Alternatives considered:**
- *Email magic-link*: rejected — outbound email dependency, no security advantage.
- *JWT bearer tokens*: rejected — server-side sessions give immediate revocation on sign-out, which we want.
- *Operator role for moderation / support:* rejected — no shared data means no moderation surface; support, if needed, can be email-only and consensual.

### D10. Session store reuses Postgres (no Redis)

**Choice:** Sessions are stored in a `sessions` table in the same Postgres instance as the dossier. With no worker tier and no BullMQ, Redis was the only remaining justification for an additional store, and the session-volume-per-user is low enough that Postgres handles it without measurable cost.

**Rationale:** One persistence engine in the stack is meaningfully simpler to operate (one backup story, one restore drill, one connection pool). The trade-off is that session lookups are slightly slower than a Redis hash GET; for our load profile that is a non-issue.

**Alternatives considered:**
- *Redis sessions:* rejected — pulls Redis back in just for sessions.
- *Signed JWT in cookie (no server store):* rejected — gives up immediate revocation on sign-out / account-delete.

### D11. Kasus Detail is one screen with linked sections sharing one selection and one as-of-date

**Choice:** Beneath the global app shell sits the **Kasus Detail screen**. It composes four sub-sections that share a single Kasus-Detail state:

- **Peta Kasus** (React Flow graph of entities and relationships, filtered to active-at the current `asOfDate`).
- **Garis Waktu** (React Flow timeline of dated events). The user's selection within Garis Waktu *is* the `asOfDate`; there is no separate scrubber widget. Tapping an event sets `asOfDate` to that event's date; dragging the timeline cursor smoothly updates `asOfDate`.
- **Dosier** (searchable list of the entities and documents in this user's case).
- **Profil** (panel/drawer showing the structured profile for the currently selected entity).

Selection is shared across all four sections: selecting an event in Garis Waktu highlights the entities it touches in Peta Kasus and Dosier; tapping a node in Peta Kasus opens the matching Profil panel and filters Garis Waktu to events involving that entity; tapping an entity in Dosier highlights its node and filters the timeline.

**Rationale:** The original spec separated these as tabs, which forces context loss on every switch. Putting them on one screen with a single Kasus-Detail state turns "investigate this case" into one coherent verb. The timeline-as-scrubber removes a redundant UI control and makes the cross-section linkage obvious: the timeline is *what time is* in this view.

**Trade-off:** This is one denser screen rather than four simpler ones. We accept the density on the desktop/tablet width; on phone widths we degrade by stacking sections vertically with a sticky timeline at the top — the timeline still drives the graph and dossier views below.

### D12. Right-of-reply: structured, auto-populated, never silently empty

**Choice:** Every Person/Institution/Company profile renders a Right-of-Reply slot. If no press statement has been ingested into this user's dossier for the entity, the slot still renders, with text equivalent to "Belum ada tanggapan publik tercatat per [tanggal]." The slot is not optional in the component contract.

**Rationale:** The asymmetry where allegations render rich and replies render absent is the exact failure mode the product is built to avoid. Making the slot non-removable in the UI means a screen always carries the asymmetry honestly even when ingestion is behind.

## Risks / Trade-offs

- **Request-time ingestion ties up the HTTP connection** — a large source can blow past a sensible ceiling → Mitigation: per-publisher fetch caps, document-size limits at the extraction step, SSE progress so the user sees movement, a hard request ceiling (default 120s) with a clear "the source is large — try a smaller excerpt URL" message. If we routinely hit the ceiling we revisit by adding a per-user, in-process queue (D5 alternative).
- **AI hallucination on Bahasa legal text** → Mitigation: every AI output that becomes a `Claim` / `Event` / `Relationship` must carry source IDs from the user's dossier; the application layer rejects writes without them. Glosarium answers are rendered as model output (clearly labeled), never persisted as facts.
- **Source-site DOM/API drift** (Kejagung, MA, BPK pages restructure regularly) → Mitigation: each source adapter is a small isolated module under `packages/infrastructure/sources/<site>/`; an adapter failing returns a clean error to the user's request rather than corrupting the dossier; archive-URL fallback is a first-class field in `Source`.
- **React Flow performance with hundreds of nodes** on mid-range mobile → Mitigation: cluster overlay is on by default for cases above a node threshold; the timeline-driven `asOfDate` is debounced; we render only the visible-at-date subset.
- **Per-user dossier multiplies storage** — every user duplicates data they ingest → Mitigation: accepted by design; storage is cheap and content de-dup at the dossier layer would compromise the privacy story. We do, however, share the Source-tier whitelist as code, not per-user data.
- **Tone drift** as features land → Mitigation: presentation-principles is its own spec (not buried in design notes), and `<Fact.*>` primitives have no "urgency" prop and no animation.
- **NotebookLM API availability** is uneven → Mitigation: the `ReconciliationPort` interface is the contract; the adapter can fall back to a Gemini-based implementation, at the cost of quality. Audio briefings degrade to text-only briefings if the audio API is unavailable.
- **Google SSO single-provider risk** — if a user's Google account is locked, they lose access to their entire dossier → Mitigation: per-user-export action exposes the user's dossier as a JSON dump on demand so they can keep an off-Kawal copy; document this as a known limitation in the README.
- **Sumber dulu enforcement is brittle** if devs route around `<Fact.*>` → Mitigation: D7's lint rule plus a runtime warning in dev mode; PR checklist item; sentinel strings in tests so regressions are noisy.
- **Single Kasus Detail screen risks feature creep** as more sub-sections want to live there → Mitigation: D11 is explicit about what's on the screen (Peta Kasus, Garis Waktu, Dosier, Profil); adding a fifth section requires an openspec change.

## Migration Plan

This is the initial bootstrap; there is no prior state. Rollback strategy is "stop the API, drop the database, redeploy" until real user data exists. Once any user has subscribed to a case, the rollback story upgrades to "restore from last nightly backup", which is owed as a follow-up change.

## Open Questions

- **OAuth client per environment**: do we register one Google OAuth client for prod and another for staging/local, or a single client with multiple authorized redirect URIs? Default assumption: one client per deployment environment.
- **Hosted-domain restriction**: do we restrict accepted Google accounts to a specific Workspace domain via the `hd` claim, or accept any Google account? Default assumption: accept any Google account.
- **Per-user dossier export format**: JSON-only or also a printable PDF? Default assumption: JSON for round-trip, deferred PDF.
- **Storage for excerpts**: are excerpts capped (e.g., 500 chars) to stay safely within fair-use, or do we store full fetched bodies and surface only excerpts in the UI? Default assumption: cap stored excerpts; persist a hash of the full body for change detection only.
- **Audio briefings**: where do generated audio files live? Default assumption: object storage with signed URLs, 30-day TTL, regenerable on demand.
- **Phone-width fallback for Kasus Detail**: confirm the stacking order — does timeline-on-top with graph-below-and-dossier-third match the way users actually read on a phone, or should the order differ? Default assumption: timeline sticky at top, graph next, dossier collapsed by default, profil opens as a sheet.
