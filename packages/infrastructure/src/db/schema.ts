import {
  bigserial,
  boolean,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
} from 'drizzle-orm/pg-core';

/**
 * Spec: design D2 (per-aggregate revision tables) + D10 (Postgres sessions)
 *       + every dossier capability's ownership requirement.
 *
 * Schema conventions:
 *   - Every dossier table carries `owner_user_id` and `FOREIGN KEY` references
 *     `users.id` ON DELETE CASCADE so account-delete cascades cleanly.
 *   - Every dossier table has a `*_revisions` sibling that stores immutable
 *     JSON payloads keyed by aggregate id + revision_no.
 *   - Timestamps are `timestamp with time zone`.
 */

export const lifecycleStateEnum = pgEnum('case_lifecycle_state', [
  'open',
  'trial',
  'verdict',
  'appeal',
  'inkracht',
  'closed',
]);

export const certaintyLabelEnum = pgEnum('certainty_label', [
  'established',
  'alleged',
  'reported',
  'disputed',
  'unverified',
]);

export const sourceTierEnum = pgEnum('source_tier', ['tier_1', 'tier_2', 'tier_3']);

export const changeKindEnum = pgEnum('change_kind', ['created', 'updated', 'tombstoned']);

export const entityTypeEnum = pgEnum('entity_type', ['person', 'institution', 'company', 'document']);

export const auditKindEnum = pgEnum('audit_kind', [
  'sign_in_success',
  'sign_in_failure',
  'sign_out',
  'account_deleted',
  'dossier_export',
  'aggregate_created',
  'aggregate_updated',
  'aggregate_tombstoned',
]);

export const ingestStatusEnum = pgEnum('ingest_status', [
  'in_progress',
  'done',
  'failed',
  'timeout',
]);

// ---------- users ----------
export const users = pgTable(
  'users',
  {
    id: text('id').primaryKey(),
    googleSub: text('google_sub').notNull(),
    email: text('email').notNull(),
    displayName: text('display_name').notNull(),
    pictureUrl: text('picture_url'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull(),
    lastSignedInAt: timestamp('last_signed_in_at', { withTimezone: true }).notNull(),
  },
  (t) => ({
    googleSubIdx: uniqueIndex('users_google_sub_idx').on(t.googleSub),
  }),
);

// ---------- sessions ----------
export const sessions = pgTable(
  'sessions',
  {
    id: text('id').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull(),
    lastSeenAt: timestamp('last_seen_at', { withTimezone: true }).notNull(),
    ip: text('ip'),
    userAgent: text('user_agent'),
  },
  (t) => ({
    userIdx: index('sessions_user_id_idx').on(t.userId),
    lastSeenIdx: index('sessions_last_seen_idx').on(t.lastSeenAt),
  }),
);

// ---------- cases ----------
export const cases = pgTable(
  'cases',
  {
    id: text('id').primaryKey(),
    ownerUserId: text('owner_user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    aliases: jsonb('aliases').$type<string[]>().notNull().default([]),
    status: lifecycleStateEnum('status').notNull(),
    startedAt: timestamp('started_at', { withTimezone: true }).notNull(),
    closedAt: timestamp('closed_at', { withTimezone: true }),
    jurisdiction: text('jurisdiction').notNull(),
    caseType: text('case_type').notNull(),
    summary: text('summary').notNull().default(''),
    currentRevisionNo: integer('current_revision_no').notNull().default(1),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull(),
  },
  (t) => ({
    ownerIdx: index('cases_owner_idx').on(t.ownerUserId),
  }),
);

export const casesRevisions = pgTable(
  'cases_revisions',
  {
    aggregateId: text('aggregate_id')
      .notNull()
      .references(() => cases.id, { onDelete: 'cascade' }),
    revisionNo: integer('revision_no').notNull(),
    validFrom: timestamp('valid_from', { withTimezone: true }).notNull(),
    validTo: timestamp('valid_to', { withTimezone: true }),
    actorUserId: text('actor_user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    changeKind: changeKindEnum('change_kind').notNull(),
    payload: jsonb('payload').notNull(),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.aggregateId, t.revisionNo] }),
    actorIdx: index('cases_revisions_actor_idx').on(t.actorUserId),
  }),
);

// ---------- entities ----------
export const entities = pgTable(
  'entities',
  {
    id: text('id').primaryKey(),
    ownerUserId: text('owner_user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    type: entityTypeEnum('type').notNull(),
    canonicalName: text('canonical_name').notNull(),
    aliases: jsonb('aliases').$type<string[]>().notNull().default([]),
    description: text('description').notNull().default(''),
    publicFigure: boolean('public_figure').notNull().default(false),
    profile: jsonb('profile').notNull(),
    currentRevisionNo: integer('current_revision_no').notNull().default(1),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull(),
  },
  (t) => ({
    ownerIdx: index('entities_owner_idx').on(t.ownerUserId),
  }),
);

export const entitiesRevisions = pgTable(
  'entities_revisions',
  {
    aggregateId: text('aggregate_id')
      .notNull()
      .references(() => entities.id, { onDelete: 'cascade' }),
    revisionNo: integer('revision_no').notNull(),
    validFrom: timestamp('valid_from', { withTimezone: true }).notNull(),
    validTo: timestamp('valid_to', { withTimezone: true }),
    actorUserId: text('actor_user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    changeKind: changeKindEnum('change_kind').notNull(),
    payload: jsonb('payload').notNull(),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.aggregateId, t.revisionNo] }),
  }),
);

// ---------- sources ----------
export const sources = pgTable(
  'sources',
  {
    id: text('id').primaryKey(),
    ownerUserId: text('owner_user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    url: text('url').notNull(),
    publisher: text('publisher').notNull(),
    tier: sourceTierEnum('tier').notNull(),
    fetchedAt: timestamp('fetched_at', { withTimezone: true }).notNull(),
    excerpt: text('excerpt').notNull(),
    archiveUrl: text('archive_url'),
    bodyHash: text('body_hash').notNull(),
    currentRevisionNo: integer('current_revision_no').notNull().default(1),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull(),
  },
  (t) => ({
    ownerIdx: index('sources_owner_idx').on(t.ownerUserId),
    ownerUrlIdx: uniqueIndex('sources_owner_url_idx').on(t.ownerUserId, t.url),
  }),
);

export const sourcesRevisions = pgTable(
  'sources_revisions',
  {
    aggregateId: text('aggregate_id')
      .notNull()
      .references(() => sources.id, { onDelete: 'cascade' }),
    revisionNo: integer('revision_no').notNull(),
    validFrom: timestamp('valid_from', { withTimezone: true }).notNull(),
    validTo: timestamp('valid_to', { withTimezone: true }),
    actorUserId: text('actor_user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    changeKind: changeKindEnum('change_kind').notNull(),
    payload: jsonb('payload').notNull(),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.aggregateId, t.revisionNo] }),
  }),
);

// ---------- claims ----------
export const claims = pgTable(
  'claims',
  {
    id: text('id').primaryKey(),
    ownerUserId: text('owner_user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    caseId: text('case_id')
      .notNull()
      .references(() => cases.id, { onDelete: 'cascade' }),
    textValue: text('text').notNull(),
    certainty: certaintyLabelEnum('certainty').notNull(),
    sourceIds: jsonb('source_ids').$type<string[]>().notNull(),
    contradictedByClaimIds: jsonb('contradicted_by_claim_ids').$type<string[]>().notNull().default([]),
    currentRevisionNo: integer('current_revision_no').notNull().default(1),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull(),
  },
  (t) => ({
    ownerIdx: index('claims_owner_idx').on(t.ownerUserId),
    caseIdx: index('claims_case_idx').on(t.caseId),
  }),
);

export const claimsRevisions = pgTable(
  'claims_revisions',
  {
    aggregateId: text('aggregate_id')
      .notNull()
      .references(() => claims.id, { onDelete: 'cascade' }),
    revisionNo: integer('revision_no').notNull(),
    validFrom: timestamp('valid_from', { withTimezone: true }).notNull(),
    validTo: timestamp('valid_to', { withTimezone: true }),
    actorUserId: text('actor_user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    changeKind: changeKindEnum('change_kind').notNull(),
    payload: jsonb('payload').notNull(),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.aggregateId, t.revisionNo] }),
  }),
);

// ---------- events ----------
export const events = pgTable(
  'events',
  {
    id: text('id').primaryKey(),
    ownerUserId: text('owner_user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    caseId: text('case_id')
      .notNull()
      .references(() => cases.id, { onDelete: 'cascade' }),
    type: text('type').notNull(),
    date: timestamp('date', { withTimezone: true }).notNull(),
    title: text('title').notNull(),
    summary: text('summary').notNull(),
    certainty: certaintyLabelEnum('certainty').notNull(),
    sourceIds: jsonb('source_ids').$type<string[]>().notNull(),
    entityIds: jsonb('entity_ids').$type<string[]>().notNull(),
    currentRevisionNo: integer('current_revision_no').notNull().default(1),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull(),
  },
  (t) => ({
    ownerIdx: index('events_owner_idx').on(t.ownerUserId),
    caseIdx: index('events_case_idx').on(t.caseId),
    dateIdx: index('events_date_idx').on(t.date),
  }),
);

export const eventsRevisions = pgTable(
  'events_revisions',
  {
    aggregateId: text('aggregate_id')
      .notNull()
      .references(() => events.id, { onDelete: 'cascade' }),
    revisionNo: integer('revision_no').notNull(),
    validFrom: timestamp('valid_from', { withTimezone: true }).notNull(),
    validTo: timestamp('valid_to', { withTimezone: true }),
    actorUserId: text('actor_user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    changeKind: changeKindEnum('change_kind').notNull(),
    payload: jsonb('payload').notNull(),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.aggregateId, t.revisionNo] }),
  }),
);

// ---------- relationships ----------
export const relationships = pgTable(
  'relationships',
  {
    id: text('id').primaryKey(),
    ownerUserId: text('owner_user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    fromEntityId: text('from_entity_id')
      .notNull()
      .references(() => entities.id, { onDelete: 'cascade' }),
    toEntityId: text('to_entity_id')
      .notNull()
      .references(() => entities.id, { onDelete: 'cascade' }),
    type: text('type').notNull(),
    certainty: certaintyLabelEnum('certainty').notNull(),
    sourceIds: jsonb('source_ids').$type<string[]>().notNull(),
    activeFrom: timestamp('active_from', { withTimezone: true }).notNull(),
    activeTo: timestamp('active_to', { withTimezone: true }),
    description: text('description').notNull().default(''),
    currentRevisionNo: integer('current_revision_no').notNull().default(1),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull(),
  },
  (t) => ({
    ownerIdx: index('relationships_owner_idx').on(t.ownerUserId),
    fromIdx: index('relationships_from_idx').on(t.fromEntityId),
    toIdx: index('relationships_to_idx').on(t.toEntityId),
  }),
);

export const relationshipsRevisions = pgTable(
  'relationships_revisions',
  {
    aggregateId: text('aggregate_id')
      .notNull()
      .references(() => relationships.id, { onDelete: 'cascade' }),
    revisionNo: integer('revision_no').notNull(),
    validFrom: timestamp('valid_from', { withTimezone: true }).notNull(),
    validTo: timestamp('valid_to', { withTimezone: true }),
    actorUserId: text('actor_user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    changeKind: changeKindEnum('change_kind').notNull(),
    payload: jsonb('payload').notNull(),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.aggregateId, t.revisionNo] }),
  }),
);

// ---------- subscriptions ----------
export const userCaseSubscriptions = pgTable(
  'user_case_subscriptions',
  {
    id: text('id').primaryKey(),
    ownerUserId: text('owner_user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    caseId: text('case_id')
      .notNull()
      .references(() => cases.id, { onDelete: 'cascade' }),
    adoptedAt: timestamp('adopted_at', { withTimezone: true }).notNull(),
    cadence: text('cadence').notNull(),
    lastViewedAt: timestamp('last_viewed_at', { withTimezone: true }),
    alasanSaya: text('alasan_saya'),
  },
  (t) => ({
    ownerCaseIdx: uniqueIndex('subs_owner_case_idx').on(t.ownerUserId, t.caseId),
  }),
);

// ---------- ingest activity ----------
export const ingestActivity = pgTable(
  'ingest_activity',
  {
    id: text('id').primaryKey(),
    ownerUserId: text('owner_user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    caseId: text('case_id')
      .notNull()
      .references(() => cases.id, { onDelete: 'cascade' }),
    url: text('url').notNull(),
    publisher: text('publisher'),
    phasesReached: jsonb('phases_reached').$type<string[]>().notNull().default([]),
    status: ingestStatusEnum('status').notNull(),
    startedAt: timestamp('started_at', { withTimezone: true }).notNull(),
    endedAt: timestamp('ended_at', { withTimezone: true }),
    recordsCreated: integer('records_created').notNull().default(0),
    failureReason: text('failure_reason'),
  },
  (t) => ({
    ownerIdx: index('ingest_activity_owner_idx').on(t.ownerUserId),
    startedIdx: index('ingest_activity_started_idx').on(t.startedAt),
  }),
);

// ---------- audit log ----------
export const auditLog = pgTable(
  'audit_log',
  {
    id: text('id').primaryKey(),
    kind: auditKindEnum('kind').notNull(),
    userId: text('user_id').references(() => users.id, { onDelete: 'cascade' }),
    aggregateType: text('aggregate_type'),
    aggregateId: text('aggregate_id'),
    revisionNo: integer('revision_no'),
    ip: text('ip'),
    userAgent: text('user_agent'),
    reason: text('reason'),
    at: timestamp('at', { withTimezone: true }).notNull(),
    monotonicId: bigserial('monotonic_id', { mode: 'number' }),
  },
  (t) => ({
    userIdx: index('audit_log_user_idx').on(t.userId),
    atIdx: index('audit_log_at_idx').on(t.at),
  }),
);
