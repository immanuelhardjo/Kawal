/**
 * Per-aggregate repositories for the dossier. Each one mirrors the CaseRepo
 * pattern: owner-scoped reads, save-with-revision writes, owner-scoped
 * revision listings, and tombstone soft-delete.
 *
 * Only the shapes the tracer-bullet slice actually needs are detailed; the
 * others are typed stubs so the application layer compiles end-to-end.
 */

import type {
  Case,
  ChangeKind,
  Claim,
  Entity,
  Event,
  Relationship,
  Revision,
  Source,
  UserCaseSubscription,
} from '@kawal/domain';

export interface OwnerScoped<TAggregate, TRevisionPayload> {
  findByIdForOwner(id: string, ownerUserId: string): Promise<TAggregate | null>;
  save(input: {
    aggregate: TAggregate;
    change: ChangeKind;
    actorUserId: string;
    now: Date;
  }): Promise<void>;
  tombstone(input: { id: string; actorUserId: string; now: Date }): Promise<void>;
  listRevisionsForOwner(id: string, ownerUserId: string): Promise<Revision<TRevisionPayload>[]>;
}

// Lightweight payload shapes for revisions; the infrastructure layer
// serialises domain aggregates to these JSON-friendly forms.
export type EntityRevisionPayload = {
  type: string;
  canonicalName: string;
  aliases: readonly string[];
  description: string;
  publicFigure: boolean;
  profile: unknown;
};

export type SourceRevisionPayload = {
  url: string;
  publisher: string;
  tier: string;
  fetchedAt: string;
  excerpt: string;
  archiveUrl: string | null;
  bodyHash: string;
};

export type ClaimRevisionPayload = {
  caseId: string;
  text: string;
  certainty: string;
  sourceIds: readonly string[];
  contradictedByClaimIds: readonly string[];
};

export type EventRevisionPayload = {
  caseId: string;
  type: string;
  date: string;
  title: string;
  summary: string;
  certainty: string;
  sourceIds: readonly string[];
  entityIds: readonly string[];
};

export type RelationshipRevisionPayload = {
  fromEntityId: string;
  toEntityId: string;
  type: string;
  certainty: string;
  sourceIds: readonly string[];
  activeFrom: string;
  activeTo: string | null;
  description: string;
};

export type EntityRepo = OwnerScoped<Entity, EntityRevisionPayload> & {
  listForOwner(ownerUserId: string, caseId?: string): Promise<Entity[]>;
};
export type SourceRepo = OwnerScoped<Source, SourceRevisionPayload> & {
  findByUrlForOwner(url: string, ownerUserId: string): Promise<Source | null>;
};
export type ClaimRepo = OwnerScoped<Claim, ClaimRevisionPayload>;
export type EventRepo = OwnerScoped<Event, EventRevisionPayload> & {
  listForCase(caseId: string, ownerUserId: string): Promise<Event[]>;
};
export type RelationshipRepo = OwnerScoped<Relationship, RelationshipRevisionPayload> & {
  listForCase(caseId: string, ownerUserId: string): Promise<Relationship[]>;
};

export interface SubscriptionRepo {
  findForOwnerAndCase(ownerUserId: string, caseId: string): Promise<UserCaseSubscription | null>;
  listForOwner(ownerUserId: string): Promise<UserCaseSubscription[]>;
  save(subscription: UserCaseSubscription): Promise<void>;
  deleteById(id: string, ownerUserId: string): Promise<void>;
}

// Mirror the imports for type-check parity with consumers.
export type { Case };
