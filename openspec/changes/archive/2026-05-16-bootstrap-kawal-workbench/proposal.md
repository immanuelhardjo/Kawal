## Why

There is no single workbench that lets a careful observer follow Indonesian public-interest cases at the level of detail a serious reader wants: structured by source tier, anchored in primary documents, presented in a calm voice, and honest about what is established vs. alleged. Existing options are either social-media feeds (loud, low-evidence, opinion-first) or paid newsroom tooling (not accessible to individuals, not in Bahasa). This change establishes Kawal — a multi-user OSINT workbench where each user, authenticated via Google SSO, maintains their own private dossier of cases. The dossier is the user's own working file: they ingest sources at their own pace, every fact-bearing record is anchored to a source, and the system keeps a full revision history so they can see how their understanding evolved.

## What Changes

- Introduce a ReactJS frontend and an ExpressJS backend organized under clean-architecture boundaries (domain / application / infrastructure / interface layers; the same separation on both tiers). All code identifiers, types, and comments are in English; all user-facing display text is in Bahasa Indonesia.
- Introduce the core domain model: `User`, `Case`, `Entity`, `Relationship`, `Event`, `Claim`, `Source`, `UserCaseSubscription`. Every fact-bearing record carries a certainty label, at least one source, and a user owner. Every fact-bearing record is append-only with full revision history per record.
- Introduce Google SSO as the sole authentication mechanism, with HTTP-only session cookies. Every authenticated user is equal — there is no operator role and no admin tier; each user can only read and write their own dossier.
- Introduce request-time OSINT ingestion: the user submits a source URL (or asks Kawal to refresh a case) from the UI and the backend fetches, extracts, and writes to that user's dossier within the request lifecycle, streaming progress back. There is no background worker and no scheduled crawl.
- Maintain a centrally-loaded source tier whitelist (config, not data): Tier-1 (authoritative) and Tier-2 (verified journalism) are citation-eligible; Tier-3 social signals are ingested only on explicit user request and never anchor a claim.
- Introduce AI-assisted enrichment: Gemini for entity/claim extraction, claim verification, glossary explainers, scenario generation, and cluster labeling; NotebookLM for cross-document reconciliation and on-demand audio briefings. Every AI call is scoped to the requesting user's dossier for the specific case.
- Introduce a React Flow-rendered relationship graph (Peta Kasus) with certainty filters, node-type filters, and tap-to-reveal source quotes on every edge.
- Introduce a React Flow-rendered living timeline (Garis Waktu) of dated case events. The timeline itself acts as the time-scrubber for the relationship graph: the timeline's selected point determines the graph's "active-at" date — there is no separate scrubber widget.
- Introduce structured dossier profiles (Profil) for Person / Institution / Company / Document, with right-of-reply slots auto-populated from press statements.
- Compose Peta Kasus, Garis Waktu, Dosier (searchable entity/document index), and Profil as linked sections of a single Kasus Detail screen so selection in any section drives state in the others (tap entity in Dosier → highlight in graph and timeline → open Profil panel).
- Introduce Glosarium — tap-any-legal-term explainers grounded in UU and KUHP.
- Establish presentation principles enforced across every screen: *sumber dulu, opini belakangan*; cool institutional tone; one verb per screen (where Kasus Detail's single verb is "understand this case"); display strings in Bahasa Indonesia only.

## Capabilities

### New Capabilities

- `user-management`: Google SSO authentication, session lifecycle, per-user isolation of every owned resource, and account deletion that cascades through the user's dossier.
- `case-management`: Lifecycle, metadata, subscription, "what changed" diffs, and append-only revision history for a Case as the unit of attention, scoped to the owning user.
- `entity-dossier`: User-owned Entities (person / institution / company / document) and their typed, certainty-labeled structured profiles with revision history.
- `evidence-ledger`: User-owned Claims and Sources — atomic factual assertions with provenance, certainty labels, source tiers, contradiction links, and revision history.
- `event-timeline`: User-owned dated case events, the Garis Waktu vertical timeline view, filtering, end-of-case Branch View scenarios, and timeline-driven scrubbing of the relationship graph.
- `relationship-graph`: Peta Kasus rendered with React Flow over user-owned entities and relationships, with certainty/type filters, cluster overlay, source-anchored edge taps, and a viewing date driven by the linked timeline section.
- `osint-ingestion`: Request-time fetch of a user-supplied source URL into that user's dossier — fetch + excerpt + archive-fallback + tier assignment + dossier write-back, all within the user's request.
- `ai-assistance`: Gemini and NotebookLM features scoped strictly to (requesting user, case) — extraction, reconciliation, Q&A ("Tanya Apa Saja"), claim verification ("Inbox Klaim"), scenario generation, cluster labeling, on-demand audio briefings.
- `glosarium`: Legal-term explainers grounded in the UU/KUHP corpus and contextualized to the current case dossier.
- `presentation-principles`: Cross-cutting UI/UX rules — certainty label and source link before interpretive text on every fact; cool institutional visual language; one primary verb per screen; display in Bahasa Indonesia only; no editorializing tone; Kasus Detail composes its sub-sections as linked siblings sharing state.

### Modified Capabilities

<!-- None — this is the initial change; no specs exist yet. -->

## Impact

- **New code**: full monorepo scaffold — `apps/web` (React), `apps/api` (Express), with `packages/domain`, `packages/application`, `packages/infrastructure` shared between server-side layers, and `packages/ui` for shared frontend primitives.
- **New dependencies**: React, Vite, TypeScript, Express, a persistence layer (PostgreSQL via Drizzle), React Flow for both Peta Kasus and Garis Waktu, a Google OAuth 2.0 / OpenID Connect client library and a session-store implementation, Gemini SDK, NotebookLM access (where available), an Imagen / Nano Banana client for shareable cards. No Redis, no BullMQ, no scheduled job runner.
- **External services**: Google Identity (OAuth 2.0 / OIDC), Gemini API, NotebookLM, Imagen, the Tier-1/2 source endpoints (read-only HTTP, fetched at user-request time), Wayback Machine for archive fallback.
- **Data**: brand-new schema — no migration from existing data; per-user dossier with append-only revision tables; the source-tier whitelist is the only configuration seed.
- **Out of scope for this change**: identity providers other than Google; any cross-user sharing, publishing, or visibility of dossier records (every user's dossier is fully private); operator/admin roles; scheduled background crawls; per-user belief tracking; English-language UI strings (UI is Bahasa-only); mobile-native apps (mobile-web only); monetization; moderation tooling.
