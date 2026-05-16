/**
 * Spec: ai-assistance.
 *
 * Every port carries a (user_id, case_id) scope; the application layer
 * refuses unscoped calls and the infrastructure adapter performs retrieval
 * only within that scope.
 */

import type { CertaintyLabel } from '@kawal/domain';

export interface AIScope {
  readonly userId: string;
  readonly caseId: string;
}

export interface ExtractedRecord {
  readonly kind: 'entity' | 'claim' | 'event' | 'relationship';
  readonly suggestedCertainty: CertaintyLabel | null;
  readonly payload: unknown;
}

export interface ExtractionPort {
  extract(input: {
    scope: AIScope;
    sourceId: string;
    sourceTier: 'tier_1' | 'tier_2';
    documentText: string;
  }): Promise<ExtractedRecord[]>;
}

export interface ReconciliationPort {
  reconcile(scope: AIScope): Promise<{ mergeProposals: unknown[]; conflictProposals: unknown[] }>;
}

export interface VerificationOutcome {
  readonly certainty: CertaintyLabel;
  readonly supportingSourceIds: readonly string[];
  readonly contradictingClaimIds: readonly string[];
  readonly rationaleBahasa: string;
}

export interface VerificationPort {
  verify(input: { scope: AIScope; claimText: string }): Promise<VerificationOutcome>;
}

export interface ConversationAnswer {
  readonly textBahasa: string;
  readonly citedClaimIds: readonly string[];
  readonly citedEventIds: readonly string[];
  readonly citedSourceIds: readonly string[];
}

export interface ConversationPort {
  ask(input: { scope: AIScope; question: string }): Promise<ConversationAnswer>;
}

export interface ProjectedScenario {
  readonly titleBahasa: string;
  readonly rationaleBahasa: string;
  readonly nextStepsBahasa: readonly string[];
}

export interface ScenarioPort {
  generate(scope: AIScope): Promise<readonly ProjectedScenario[]>;
}

export interface ClusterLabel {
  readonly signatureHash: string;
  readonly labelBahasa: string;
  readonly memberEntityIds: readonly string[];
}

export interface ClusterLabelPort {
  label(input: {
    scope: AIScope;
    clusters: readonly { signatureHash: string; memberEntityIds: readonly string[] }[];
  }): Promise<readonly ClusterLabel[]>;
}

export interface GlossaryAnswer {
  readonly term: string;
  readonly explainerBahasa: string;
  readonly statuteCitations: readonly string[];
  readonly caseExampleEventId: string | null;
}

export interface GlossaryPort {
  explain(input: { term: string; scope: AIScope | null }): Promise<GlossaryAnswer>;
}

export interface CardImage {
  readonly imageUrl: string;
  readonly expiresAt: Date;
}

export interface CardPort {
  generate(input: { scope: AIScope; snippetText: string }): Promise<CardImage>;
}

export interface AudioBriefing {
  readonly kind: 'audio' | 'text_fallback';
  readonly textBahasa: string;
  readonly audioUrl: string | null;
  readonly durationSeconds: number | null;
}

export interface BriefingPort {
  generate(scope: AIScope): Promise<AudioBriefing>;
}
