import {
  index,
  integer,
  primaryKey,
  sqliteTable,
  text,
  uniqueIndex,
} from 'drizzle-orm/sqlite-core';

// SQLite translation of the canonical pg schema.
// Table names and column names are identical — only column types differ.
// Enums become text columns (no DB-level enforcement; app layer validates).
// jsonb → text (mode:'json'), timestamp → integer (mode:'timestamp'),
// boolean → integer (mode:'boolean'), bigserial → integer.

// ---------- users ----------
export const users = sqliteTable(
  'users',
  {
    id: text('id').primaryKey(),
    googleSub: text('google_sub'),
    email: text('email').notNull(),
    displayName: text('display_name').notNull(),
    pictureUrl: text('picture_url'),
    passwordHash: text('password_hash'),
    createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
    lastSignedInAt: integer('last_signed_in_at', { mode: 'timestamp' }).notNull(),
  },
  (t) => ({
    googleSubIdx: uniqueIndex('users_google_sub_idx').on(t.googleSub),
    emailIdx: uniqueIndex('users_email_idx').on(t.email),
  }),
);

// ---------- sessions ----------
export const sessions = sqliteTable(
  'sessions',
  {
    id: text('id').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
    lastSeenAt: integer('last_seen_at', { mode: 'timestamp' }).notNull(),
    ip: text('ip'),
    userAgent: text('user_agent'),
  },
  (t) => ({
    userIdx: index('sessions_user_id_idx').on(t.userId),
    lastSeenIdx: index('sessions_last_seen_idx').on(t.lastSeenAt),
  }),
);

// ---------- cases ----------
export const cases = sqliteTable(
  'cases',
  {
    id: text('id').primaryKey(),
    ownerUserId: text('owner_user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    aliases: text('aliases', { mode: 'json' }).$type<string[]>().notNull().default([]),
    status: text('status').notNull(),
    startedAt: integer('started_at', { mode: 'timestamp' }).notNull(),
    closedAt: integer('closed_at', { mode: 'timestamp' }),
    jurisdiction: text('jurisdiction').notNull(),
    caseType: text('case_type').notNull(),
    summary: text('summary').notNull().default(''),
    currentRevisionNo: integer('current_revision_no').notNull().default(1),
    updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
  },
  (t) => ({
    ownerIdx: index('cases_owner_idx').on(t.ownerUserId),
  }),
);

export const casesRevisions = sqliteTable(
  'cases_revisions',
  {
    aggregateId: text('aggregate_id')
      .notNull()
      .references(() => cases.id, { onDelete: 'cascade' }),
    revisionNo: integer('revision_no').notNull(),
    validFrom: integer('valid_from', { mode: 'timestamp' }).notNull(),
    validTo: integer('valid_to', { mode: 'timestamp' }),
    actorUserId: text('actor_user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    changeKind: text('change_kind').notNull(),
    payload: text('payload', { mode: 'json' }).notNull(),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.aggregateId, t.revisionNo] }),
    actorIdx: index('cases_revisions_actor_idx').on(t.actorUserId),
  }),
);

// ---------- entities ----------
export const entities = sqliteTable(
  'entities',
  {
    id: text('id').primaryKey(),
    ownerUserId: text('owner_user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    type: text('type').notNull(),
    canonicalName: text('canonical_name').notNull(),
    aliases: text('aliases', { mode: 'json' }).$type<string[]>().notNull().default([]),
    description: text('description').notNull().default(''),
    publicFigure: integer('public_figure', { mode: 'boolean' }).notNull().default(false),
    profile: text('profile', { mode: 'json' }).notNull(),
    currentRevisionNo: integer('current_revision_no').notNull().default(1),
    updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
  },
  (t) => ({
    ownerIdx: index('entities_owner_idx').on(t.ownerUserId),
  }),
);

export const entitiesRevisions = sqliteTable(
  'entities_revisions',
  {
    aggregateId: text('aggregate_id')
      .notNull()
      .references(() => entities.id, { onDelete: 'cascade' }),
    revisionNo: integer('revision_no').notNull(),
    validFrom: integer('valid_from', { mode: 'timestamp' }).notNull(),
    validTo: integer('valid_to', { mode: 'timestamp' }),
    actorUserId: text('actor_user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    changeKind: text('change_kind').notNull(),
    payload: text('payload', { mode: 'json' }).notNull(),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.aggregateId, t.revisionNo] }),
  }),
);

// ---------- sources ----------
export const sources = sqliteTable(
  'sources',
  {
    id: text('id').primaryKey(),
    ownerUserId: text('owner_user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    url: text('url').notNull(),
    publisher: text('publisher').notNull(),
    tier: text('tier').notNull(),
    fetchedAt: integer('fetched_at', { mode: 'timestamp' }).notNull(),
    excerpt: text('excerpt').notNull(),
    archiveUrl: text('archive_url'),
    bodyHash: text('body_hash').notNull(),
    currentRevisionNo: integer('current_revision_no').notNull().default(1),
    updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
  },
  (t) => ({
    ownerIdx: index('sources_owner_idx').on(t.ownerUserId),
    ownerUrlIdx: uniqueIndex('sources_owner_url_idx').on(t.ownerUserId, t.url),
  }),
);

export const sourcesRevisions = sqliteTable(
  'sources_revisions',
  {
    aggregateId: text('aggregate_id')
      .notNull()
      .references(() => sources.id, { onDelete: 'cascade' }),
    revisionNo: integer('revision_no').notNull(),
    validFrom: integer('valid_from', { mode: 'timestamp' }).notNull(),
    validTo: integer('valid_to', { mode: 'timestamp' }),
    actorUserId: text('actor_user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    changeKind: text('change_kind').notNull(),
    payload: text('payload', { mode: 'json' }).notNull(),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.aggregateId, t.revisionNo] }),
  }),
);

// ---------- claims ----------
export const claims = sqliteTable(
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
    certainty: text('certainty').notNull(),
    sourceIds: text('source_ids', { mode: 'json' }).$type<string[]>().notNull(),
    contradictedByClaimIds: text('contradicted_by_claim_ids', { mode: 'json' })
      .$type<string[]>()
      .notNull()
      .default([]),
    currentRevisionNo: integer('current_revision_no').notNull().default(1),
    updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
  },
  (t) => ({
    ownerIdx: index('claims_owner_idx').on(t.ownerUserId),
    caseIdx: index('claims_case_idx').on(t.caseId),
  }),
);

export const claimsRevisions = sqliteTable(
  'claims_revisions',
  {
    aggregateId: text('aggregate_id')
      .notNull()
      .references(() => claims.id, { onDelete: 'cascade' }),
    revisionNo: integer('revision_no').notNull(),
    validFrom: integer('valid_from', { mode: 'timestamp' }).notNull(),
    validTo: integer('valid_to', { mode: 'timestamp' }),
    actorUserId: text('actor_user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    changeKind: text('change_kind').notNull(),
    payload: text('payload', { mode: 'json' }).notNull(),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.aggregateId, t.revisionNo] }),
  }),
);

// ---------- events ----------
export const events = sqliteTable(
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
    date: integer('date', { mode: 'timestamp' }).notNull(),
    title: text('title').notNull(),
    summary: text('summary').notNull(),
    certainty: text('certainty').notNull(),
    sourceIds: text('source_ids', { mode: 'json' }).$type<string[]>().notNull(),
    entityIds: text('entity_ids', { mode: 'json' }).$type<string[]>().notNull(),
    currentRevisionNo: integer('current_revision_no').notNull().default(1),
    updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
  },
  (t) => ({
    ownerIdx: index('events_owner_idx').on(t.ownerUserId),
    caseIdx: index('events_case_idx').on(t.caseId),
    dateIdx: index('events_date_idx').on(t.date),
  }),
);

export const eventsRevisions = sqliteTable(
  'events_revisions',
  {
    aggregateId: text('aggregate_id')
      .notNull()
      .references(() => events.id, { onDelete: 'cascade' }),
    revisionNo: integer('revision_no').notNull(),
    validFrom: integer('valid_from', { mode: 'timestamp' }).notNull(),
    validTo: integer('valid_to', { mode: 'timestamp' }),
    actorUserId: text('actor_user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    changeKind: text('change_kind').notNull(),
    payload: text('payload', { mode: 'json' }).notNull(),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.aggregateId, t.revisionNo] }),
  }),
);

// ---------- relationships ----------
export const relationships = sqliteTable(
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
    certainty: text('certainty').notNull(),
    sourceIds: text('source_ids', { mode: 'json' }).$type<string[]>().notNull(),
    activeFrom: integer('active_from', { mode: 'timestamp' }).notNull(),
    activeTo: integer('active_to', { mode: 'timestamp' }),
    description: text('description').notNull().default(''),
    currentRevisionNo: integer('current_revision_no').notNull().default(1),
    updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
  },
  (t) => ({
    ownerIdx: index('relationships_owner_idx').on(t.ownerUserId),
    fromIdx: index('relationships_from_idx').on(t.fromEntityId),
    toIdx: index('relationships_to_idx').on(t.toEntityId),
  }),
);

export const relationshipsRevisions = sqliteTable(
  'relationships_revisions',
  {
    aggregateId: text('aggregate_id')
      .notNull()
      .references(() => relationships.id, { onDelete: 'cascade' }),
    revisionNo: integer('revision_no').notNull(),
    validFrom: integer('valid_from', { mode: 'timestamp' }).notNull(),
    validTo: integer('valid_to', { mode: 'timestamp' }),
    actorUserId: text('actor_user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    changeKind: text('change_kind').notNull(),
    payload: text('payload', { mode: 'json' }).notNull(),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.aggregateId, t.revisionNo] }),
  }),
);

// ---------- subscriptions ----------
export const userCaseSubscriptions = sqliteTable(
  'user_case_subscriptions',
  {
    id: text('id').primaryKey(),
    ownerUserId: text('owner_user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    caseId: text('case_id')
      .notNull()
      .references(() => cases.id, { onDelete: 'cascade' }),
    adoptedAt: integer('adopted_at', { mode: 'timestamp' }).notNull(),
    cadence: text('cadence').notNull(),
    lastViewedAt: integer('last_viewed_at', { mode: 'timestamp' }),
    alasanSaya: text('alasan_saya'),
  },
  (t) => ({
    ownerCaseIdx: uniqueIndex('subs_owner_case_idx').on(t.ownerUserId, t.caseId),
  }),
);

// ---------- ingest activity ----------
export const ingestActivity = sqliteTable(
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
    phasesReached: text('phases_reached', { mode: 'json' }).$type<string[]>().notNull().default([]),
    status: text('status').notNull(),
    startedAt: integer('started_at', { mode: 'timestamp' }).notNull(),
    endedAt: integer('ended_at', { mode: 'timestamp' }),
    recordsCreated: integer('records_created').notNull().default(0),
    failureReason: text('failure_reason'),
  },
  (t) => ({
    ownerIdx: index('ingest_activity_owner_idx').on(t.ownerUserId),
    startedIdx: index('ingest_activity_started_idx').on(t.startedAt),
  }),
);

// ---------- audit log ----------
export const auditLog = sqliteTable(
  'audit_log',
  {
    id: text('id').primaryKey(),
    kind: text('kind').notNull(),
    userId: text('user_id').references(() => users.id, { onDelete: 'cascade' }),
    aggregateType: text('aggregate_type'),
    aggregateId: text('aggregate_id'),
    revisionNo: integer('revision_no'),
    ip: text('ip'),
    userAgent: text('user_agent'),
    reason: text('reason'),
    at: integer('at', { mode: 'timestamp' }).notNull(),
    monotonicId: integer('monotonic_id'),
  },
  (t) => ({
    userIdx: index('audit_log_user_idx').on(t.userId),
    atIdx: index('audit_log_at_idx').on(t.at),
  }),
);
