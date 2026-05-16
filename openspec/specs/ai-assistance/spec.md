# Capability: AI Assistance

## Purpose

Provides all AI-powered ports (Gemini and NotebookLM-backed) used within the Kawal workbench. Every port is scoped to a (user, case) pair and retrieves grounding context exclusively from the requesting user's dossier. Outputs are in Bahasa Indonesia and use a calm, sourced tone free of editorial phrasing.

## Requirements

### Requirement: (User, dossier)-scoped retrieval for every AI call

Every AI call (Gemini or NotebookLM) SHALL be issued through a port that requires the requesting `user_id` plus a `case_id` (or, where applicable, an `entity_id`) and retrieves grounding context exclusively from that user's dossier for that scope. The system SHALL reject AI calls lacking a (user, case) scope.

#### Scenario: Unscoped call rejected

- **WHEN** any caller invokes an AI port without a `user_id` and a `case_id` (or `entity_id`)
- **THEN** the application layer rejects the call before any external request is made

#### Scenario: Cross-user retrieval impossible

- **WHEN** an AI port is invoked with user A's `user_id` and a `case_id` owned by user B
- **THEN** the application layer rejects the call with a scope error before any retrieval occurs

### Requirement: User-facing output in Bahasa Indonesia

The system prompts that drive every AI port SHALL instruct the model to return user-facing text in Bahasa Indonesia. Code-side prompt templates remain in English (per design D8); only the model's user-facing output is Bahasa Indonesia.

#### Scenario: Output language

- **WHEN** any AI port returns text that will be rendered to the user
- **THEN** that text is in Bahasa Indonesia

### Requirement: Entity & claim extraction

The system SHALL provide an Extraction port (backed by Gemini with structured output) that, given a Tier-1 or Tier-2 document supplied during a user's ingest request, produces structured candidate records for Entities, Claims, Events, and Relationships, each carrying at least one Source id (the document, owned by the requesting user) and a candidate certainty label.

#### Scenario: Tier-3 input refused

- **WHEN** the Extraction port is called with a Tier-3 source as the input document
- **THEN** the port refuses to produce records and returns an explanatory error

#### Scenario: All outputs stamped with owner

- **WHEN** the Extraction port emits candidate records during a user's ingest
- **THEN** every record is staged with `owner_user_id` equal to the requesting user before being handed to the repository

### Requirement: Cross-document reconciliation

The system SHALL provide a Reconciliation port (NotebookLM-backed when available; a Gemini-backed fallback otherwise) that merges aliases for the same entity across documents within a single user's case and identifies conflicting claims for explicit review. Reconciliation SHALL operate strictly within (user, case) scope.

#### Scenario: Alias merge within one user's dossier

- **GIVEN** two entities owned by the same user in their case differing only by alias (e.g., "Ir. A" and "Ahmad A.")
- **WHEN** the reconciliation step runs as part of an ingest request
- **THEN** the entities are proposed as a merge candidate with the supporting evidence; merging requires explicit acceptance and records the prior aliases as revisions

### Requirement: On-demand audio briefings

The system SHALL produce an audio briefing for a case in the requesting user's dossier on explicit user request, via NotebookLM Audio Overviews, of approximately 90 seconds duration, summarizing what changed since the user's last view. If audio generation fails or is unavailable, the system SHALL fall back to a text briefing of equivalent scope returned in the same request.

#### Scenario: User requests a briefing

- **WHEN** an authenticated user invokes the briefing action on a case they own
- **THEN** the system generates a briefing scoped to that user's dossier for that case and returns it in the response
- **AND** no scheduled job runs to pre-generate briefings

#### Scenario: Audio unavailable

- **WHEN** the audio generation provider is unavailable at briefing time
- **THEN** the response is a text briefing labeled "Teks (audio tidak tersedia)"

### Requirement: Conversational Q&A ("Tanya Apa Saja")

The system SHALL provide a Conversation port that answers user questions about a case in their own dossier using Gemini, with retrieval restricted to that (user, case) dossier. Every answer SHALL cite the dossier records it draws on. Answers SHALL NOT introduce facts not grounded in the dossier.

#### Scenario: Question with no dossier grounding

- **WHEN** a user asks a question for which their dossier has no relevant records
- **THEN** the answer indicates that the dossier does not contain information on that point, rather than producing an ungrounded answer

#### Scenario: Citations rendered with the answer

- **WHEN** the Conversation port returns an answer
- **THEN** the rendered response includes inline references to the specific Claim, Event, or Source records it drew on (all owned by the requesting user), tappable to those records

### Requirement: Claim verification ("Inbox Klaim")

The system SHALL provide a Verification port that, given a user-pasted claim and a (user, case) scope, classifies it against the requesting user's dossier with one of the five certainty labels and lists the supporting and contradicting Source ids it relied on. The output SHALL NOT modify the dossier.

#### Scenario: Claim contradicted by dossier

- **GIVEN** a user's dossier containing an `established` claim that "X did not attend the hearing on Y date"
- **WHEN** that user submits the claim "X attended the hearing on Y date" for verification
- **THEN** the response labels the user's claim as `disputed`, cites the contradicting record from the user's dossier, and writes nothing to the dossier

### Requirement: Glossary explanations

The system SHALL provide a Glossary port that, given a legal term and an optional (user, case) scope, returns a Bahasa-Indonesia 30-second-readable explainer grounded in the UU/KUHP corpus, with examples drawn from the requesting user's case dossier when provided. Glossary outputs SHALL NOT be persisted as Claims.

#### Scenario: Term explanation

- **WHEN** the user taps a term in any rendered text
- **THEN** the system returns an explainer in Bahasa Indonesia, the relevant UU/KUHP reference, and (if a case scope is set) an example drawn from that user's case dossier

### Requirement: Scenario generation

The system SHALL provide a Scenario port that, given a case in `verdict` or `appeal` state in the requesting user's dossier, returns 2–4 plausible forward scenarios with next likely steps. Every output element SHALL be labeled "Proyeksi (bukan prediksi)" and SHALL NOT be persisted as a fact.

#### Scenario: Scenario output labeled and ephemeral

- **WHEN** the Scenario port is invoked for an eligible case in the user's dossier
- **THEN** the response returns between 2 and 4 scenarios, each labeled as projection
- **AND** no write occurs to any dossier table or revision table as a result

### Requirement: Cluster labeling

The system SHALL provide a Cluster-label port that, given a structural cluster computed on the user's case graph, returns a human-readable Bahasa-Indonesia label (e.g., "Kelompok PT X — 4 entitas"). The label SHALL be cached per (user, cluster signature).

#### Scenario: Stable label for stable cluster

- **GIVEN** the same cluster signature in the same user's case is recomputed across two graph refreshes with no membership change
- **WHEN** the cluster-label port is consulted for both
- **THEN** the same cached label is returned without a new external call

### Requirement: Shareable cards via image model

The system SHALL provide a Card port that renders shareable image cards ("Kartu Hari Ini") via Imagen / Nano Banana from a (user, case)-scoped dossier snippet. The card SHALL include the source URL and the date generated. Cards are images only — they SHALL NOT be persisted as facts and SHALL be tied to the requesting user.

#### Scenario: Card carries provenance

- **WHEN** a card is generated
- **THEN** the rendered image contains the source URL or short DOI-style reference and the generation date visibly within the image

### Requirement: AI never adopts the editorializing voice

The system prompts that drive every port SHALL instruct the model to use a calm, sourced, unhurried tone and SHALL forbid phrases such as "mengejutkan", "sudah diduga", "menghebohkan", "fantastis", or equivalent. Outputs from any port detected by a configured filter to contain such phrases SHALL be regenerated once and, on repeat, returned with the offending phrase stripped.

#### Scenario: Filter catches editorial phrasing

- **WHEN** an AI output contains a phrase on the editorial-tone deny-list
- **THEN** the output is regenerated once; if the regenerated output still contains a deny-list phrase, the phrase is removed before the output is returned
