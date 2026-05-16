DO $$ BEGIN
 CREATE TYPE "audit_kind" AS ENUM('sign_in_success', 'sign_in_failure', 'sign_out', 'account_deleted', 'dossier_export', 'aggregate_created', 'aggregate_updated', 'aggregate_tombstoned');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "certainty_label" AS ENUM('established', 'alleged', 'reported', 'disputed', 'unverified');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "change_kind" AS ENUM('created', 'updated', 'tombstoned');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "entity_type" AS ENUM('person', 'institution', 'company', 'document');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "ingest_status" AS ENUM('in_progress', 'done', 'failed', 'timeout');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "case_lifecycle_state" AS ENUM('open', 'trial', 'verdict', 'appeal', 'inkracht', 'closed');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "source_tier" AS ENUM('tier_1', 'tier_2', 'tier_3');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "audit_log" (
	"id" text PRIMARY KEY NOT NULL,
	"kind" "audit_kind" NOT NULL,
	"user_id" text,
	"aggregate_type" text,
	"aggregate_id" text,
	"revision_no" integer,
	"ip" text,
	"user_agent" text,
	"reason" text,
	"at" timestamp with time zone NOT NULL,
	"monotonic_id" bigserial NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "cases" (
	"id" text PRIMARY KEY NOT NULL,
	"owner_user_id" text NOT NULL,
	"name" text NOT NULL,
	"aliases" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"status" "case_lifecycle_state" NOT NULL,
	"started_at" timestamp with time zone NOT NULL,
	"closed_at" timestamp with time zone,
	"jurisdiction" text NOT NULL,
	"case_type" text NOT NULL,
	"summary" text DEFAULT '' NOT NULL,
	"current_revision_no" integer DEFAULT 1 NOT NULL,
	"updated_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "cases_revisions" (
	"aggregate_id" text NOT NULL,
	"revision_no" integer NOT NULL,
	"valid_from" timestamp with time zone NOT NULL,
	"valid_to" timestamp with time zone,
	"actor_user_id" text NOT NULL,
	"change_kind" "change_kind" NOT NULL,
	"payload" jsonb NOT NULL,
	CONSTRAINT "cases_revisions_aggregate_id_revision_no_pk" PRIMARY KEY("aggregate_id","revision_no")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "claims" (
	"id" text PRIMARY KEY NOT NULL,
	"owner_user_id" text NOT NULL,
	"case_id" text NOT NULL,
	"text" text NOT NULL,
	"certainty" "certainty_label" NOT NULL,
	"source_ids" jsonb NOT NULL,
	"contradicted_by_claim_ids" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"current_revision_no" integer DEFAULT 1 NOT NULL,
	"updated_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "claims_revisions" (
	"aggregate_id" text NOT NULL,
	"revision_no" integer NOT NULL,
	"valid_from" timestamp with time zone NOT NULL,
	"valid_to" timestamp with time zone,
	"actor_user_id" text NOT NULL,
	"change_kind" "change_kind" NOT NULL,
	"payload" jsonb NOT NULL,
	CONSTRAINT "claims_revisions_aggregate_id_revision_no_pk" PRIMARY KEY("aggregate_id","revision_no")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "entities" (
	"id" text PRIMARY KEY NOT NULL,
	"owner_user_id" text NOT NULL,
	"type" "entity_type" NOT NULL,
	"canonical_name" text NOT NULL,
	"aliases" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"public_figure" boolean DEFAULT false NOT NULL,
	"profile" jsonb NOT NULL,
	"current_revision_no" integer DEFAULT 1 NOT NULL,
	"updated_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "entities_revisions" (
	"aggregate_id" text NOT NULL,
	"revision_no" integer NOT NULL,
	"valid_from" timestamp with time zone NOT NULL,
	"valid_to" timestamp with time zone,
	"actor_user_id" text NOT NULL,
	"change_kind" "change_kind" NOT NULL,
	"payload" jsonb NOT NULL,
	CONSTRAINT "entities_revisions_aggregate_id_revision_no_pk" PRIMARY KEY("aggregate_id","revision_no")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "events" (
	"id" text PRIMARY KEY NOT NULL,
	"owner_user_id" text NOT NULL,
	"case_id" text NOT NULL,
	"type" text NOT NULL,
	"date" timestamp with time zone NOT NULL,
	"title" text NOT NULL,
	"summary" text NOT NULL,
	"certainty" "certainty_label" NOT NULL,
	"source_ids" jsonb NOT NULL,
	"entity_ids" jsonb NOT NULL,
	"current_revision_no" integer DEFAULT 1 NOT NULL,
	"updated_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "events_revisions" (
	"aggregate_id" text NOT NULL,
	"revision_no" integer NOT NULL,
	"valid_from" timestamp with time zone NOT NULL,
	"valid_to" timestamp with time zone,
	"actor_user_id" text NOT NULL,
	"change_kind" "change_kind" NOT NULL,
	"payload" jsonb NOT NULL,
	CONSTRAINT "events_revisions_aggregate_id_revision_no_pk" PRIMARY KEY("aggregate_id","revision_no")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "ingest_activity" (
	"id" text PRIMARY KEY NOT NULL,
	"owner_user_id" text NOT NULL,
	"case_id" text NOT NULL,
	"url" text NOT NULL,
	"publisher" text,
	"phases_reached" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"status" "ingest_status" NOT NULL,
	"started_at" timestamp with time zone NOT NULL,
	"ended_at" timestamp with time zone,
	"records_created" integer DEFAULT 0 NOT NULL,
	"failure_reason" text
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "relationships" (
	"id" text PRIMARY KEY NOT NULL,
	"owner_user_id" text NOT NULL,
	"from_entity_id" text NOT NULL,
	"to_entity_id" text NOT NULL,
	"type" text NOT NULL,
	"certainty" "certainty_label" NOT NULL,
	"source_ids" jsonb NOT NULL,
	"active_from" timestamp with time zone NOT NULL,
	"active_to" timestamp with time zone,
	"description" text DEFAULT '' NOT NULL,
	"current_revision_no" integer DEFAULT 1 NOT NULL,
	"updated_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "relationships_revisions" (
	"aggregate_id" text NOT NULL,
	"revision_no" integer NOT NULL,
	"valid_from" timestamp with time zone NOT NULL,
	"valid_to" timestamp with time zone,
	"actor_user_id" text NOT NULL,
	"change_kind" "change_kind" NOT NULL,
	"payload" jsonb NOT NULL,
	CONSTRAINT "relationships_revisions_aggregate_id_revision_no_pk" PRIMARY KEY("aggregate_id","revision_no")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "sessions" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	"last_seen_at" timestamp with time zone NOT NULL,
	"ip" text,
	"user_agent" text
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "sources" (
	"id" text PRIMARY KEY NOT NULL,
	"owner_user_id" text NOT NULL,
	"url" text NOT NULL,
	"publisher" text NOT NULL,
	"tier" "source_tier" NOT NULL,
	"fetched_at" timestamp with time zone NOT NULL,
	"excerpt" text NOT NULL,
	"archive_url" text,
	"body_hash" text NOT NULL,
	"current_revision_no" integer DEFAULT 1 NOT NULL,
	"updated_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "sources_revisions" (
	"aggregate_id" text NOT NULL,
	"revision_no" integer NOT NULL,
	"valid_from" timestamp with time zone NOT NULL,
	"valid_to" timestamp with time zone,
	"actor_user_id" text NOT NULL,
	"change_kind" "change_kind" NOT NULL,
	"payload" jsonb NOT NULL,
	CONSTRAINT "sources_revisions_aggregate_id_revision_no_pk" PRIMARY KEY("aggregate_id","revision_no")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "user_case_subscriptions" (
	"id" text PRIMARY KEY NOT NULL,
	"owner_user_id" text NOT NULL,
	"case_id" text NOT NULL,
	"adopted_at" timestamp with time zone NOT NULL,
	"cadence" text NOT NULL,
	"last_viewed_at" timestamp with time zone,
	"alasan_saya" text
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "users" (
	"id" text PRIMARY KEY NOT NULL,
	"google_sub" text NOT NULL,
	"email" text NOT NULL,
	"display_name" text NOT NULL,
	"picture_url" text,
	"created_at" timestamp with time zone NOT NULL,
	"last_signed_in_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "audit_log_user_idx" ON "audit_log" ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "audit_log_at_idx" ON "audit_log" ("at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "cases_owner_idx" ON "cases" ("owner_user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "cases_revisions_actor_idx" ON "cases_revisions" ("actor_user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "claims_owner_idx" ON "claims" ("owner_user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "claims_case_idx" ON "claims" ("case_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "entities_owner_idx" ON "entities" ("owner_user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "events_owner_idx" ON "events" ("owner_user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "events_case_idx" ON "events" ("case_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "events_date_idx" ON "events" ("date");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "ingest_activity_owner_idx" ON "ingest_activity" ("owner_user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "ingest_activity_started_idx" ON "ingest_activity" ("started_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "relationships_owner_idx" ON "relationships" ("owner_user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "relationships_from_idx" ON "relationships" ("from_entity_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "relationships_to_idx" ON "relationships" ("to_entity_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "sessions_user_id_idx" ON "sessions" ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "sessions_last_seen_idx" ON "sessions" ("last_seen_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "sources_owner_idx" ON "sources" ("owner_user_id");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "sources_owner_url_idx" ON "sources" ("owner_user_id","url");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "subs_owner_case_idx" ON "user_case_subscriptions" ("owner_user_id","case_id");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "users_google_sub_idx" ON "users" ("google_sub");--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "audit_log" ADD CONSTRAINT "audit_log_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "cases" ADD CONSTRAINT "cases_owner_user_id_users_id_fk" FOREIGN KEY ("owner_user_id") REFERENCES "users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "cases_revisions" ADD CONSTRAINT "cases_revisions_aggregate_id_cases_id_fk" FOREIGN KEY ("aggregate_id") REFERENCES "cases"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "cases_revisions" ADD CONSTRAINT "cases_revisions_actor_user_id_users_id_fk" FOREIGN KEY ("actor_user_id") REFERENCES "users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "claims" ADD CONSTRAINT "claims_owner_user_id_users_id_fk" FOREIGN KEY ("owner_user_id") REFERENCES "users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "claims" ADD CONSTRAINT "claims_case_id_cases_id_fk" FOREIGN KEY ("case_id") REFERENCES "cases"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "claims_revisions" ADD CONSTRAINT "claims_revisions_aggregate_id_claims_id_fk" FOREIGN KEY ("aggregate_id") REFERENCES "claims"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "claims_revisions" ADD CONSTRAINT "claims_revisions_actor_user_id_users_id_fk" FOREIGN KEY ("actor_user_id") REFERENCES "users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "entities" ADD CONSTRAINT "entities_owner_user_id_users_id_fk" FOREIGN KEY ("owner_user_id") REFERENCES "users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "entities_revisions" ADD CONSTRAINT "entities_revisions_aggregate_id_entities_id_fk" FOREIGN KEY ("aggregate_id") REFERENCES "entities"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "entities_revisions" ADD CONSTRAINT "entities_revisions_actor_user_id_users_id_fk" FOREIGN KEY ("actor_user_id") REFERENCES "users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "events" ADD CONSTRAINT "events_owner_user_id_users_id_fk" FOREIGN KEY ("owner_user_id") REFERENCES "users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "events" ADD CONSTRAINT "events_case_id_cases_id_fk" FOREIGN KEY ("case_id") REFERENCES "cases"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "events_revisions" ADD CONSTRAINT "events_revisions_aggregate_id_events_id_fk" FOREIGN KEY ("aggregate_id") REFERENCES "events"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "events_revisions" ADD CONSTRAINT "events_revisions_actor_user_id_users_id_fk" FOREIGN KEY ("actor_user_id") REFERENCES "users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "ingest_activity" ADD CONSTRAINT "ingest_activity_owner_user_id_users_id_fk" FOREIGN KEY ("owner_user_id") REFERENCES "users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "ingest_activity" ADD CONSTRAINT "ingest_activity_case_id_cases_id_fk" FOREIGN KEY ("case_id") REFERENCES "cases"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "relationships" ADD CONSTRAINT "relationships_owner_user_id_users_id_fk" FOREIGN KEY ("owner_user_id") REFERENCES "users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "relationships" ADD CONSTRAINT "relationships_from_entity_id_entities_id_fk" FOREIGN KEY ("from_entity_id") REFERENCES "entities"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "relationships" ADD CONSTRAINT "relationships_to_entity_id_entities_id_fk" FOREIGN KEY ("to_entity_id") REFERENCES "entities"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "relationships_revisions" ADD CONSTRAINT "relationships_revisions_aggregate_id_relationships_id_fk" FOREIGN KEY ("aggregate_id") REFERENCES "relationships"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "relationships_revisions" ADD CONSTRAINT "relationships_revisions_actor_user_id_users_id_fk" FOREIGN KEY ("actor_user_id") REFERENCES "users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "sources" ADD CONSTRAINT "sources_owner_user_id_users_id_fk" FOREIGN KEY ("owner_user_id") REFERENCES "users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "sources_revisions" ADD CONSTRAINT "sources_revisions_aggregate_id_sources_id_fk" FOREIGN KEY ("aggregate_id") REFERENCES "sources"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "sources_revisions" ADD CONSTRAINT "sources_revisions_actor_user_id_users_id_fk" FOREIGN KEY ("actor_user_id") REFERENCES "users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "user_case_subscriptions" ADD CONSTRAINT "user_case_subscriptions_owner_user_id_users_id_fk" FOREIGN KEY ("owner_user_id") REFERENCES "users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "user_case_subscriptions" ADD CONSTRAINT "user_case_subscriptions_case_id_cases_id_fk" FOREIGN KEY ("case_id") REFERENCES "cases"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
