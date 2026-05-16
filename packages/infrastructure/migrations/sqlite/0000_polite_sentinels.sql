CREATE TABLE `audit_log` (
	`id` text PRIMARY KEY NOT NULL,
	`kind` text NOT NULL,
	`user_id` text,
	`aggregate_type` text,
	`aggregate_id` text,
	`revision_no` integer,
	`ip` text,
	`user_agent` text,
	`reason` text,
	`at` integer NOT NULL,
	`monotonic_id` integer,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `cases` (
	`id` text PRIMARY KEY NOT NULL,
	`owner_user_id` text NOT NULL,
	`name` text NOT NULL,
	`aliases` text DEFAULT  NOT NULL,
	`status` text NOT NULL,
	`started_at` integer NOT NULL,
	`closed_at` integer,
	`jurisdiction` text NOT NULL,
	`case_type` text NOT NULL,
	`summary` text DEFAULT '' NOT NULL,
	`current_revision_no` integer DEFAULT 1 NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`owner_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `cases_revisions` (
	`aggregate_id` text NOT NULL,
	`revision_no` integer NOT NULL,
	`valid_from` integer NOT NULL,
	`valid_to` integer,
	`actor_user_id` text NOT NULL,
	`change_kind` text NOT NULL,
	`payload` text NOT NULL,
	PRIMARY KEY(`aggregate_id`, `revision_no`),
	FOREIGN KEY (`aggregate_id`) REFERENCES `cases`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`actor_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `claims` (
	`id` text PRIMARY KEY NOT NULL,
	`owner_user_id` text NOT NULL,
	`case_id` text NOT NULL,
	`text` text NOT NULL,
	`certainty` text NOT NULL,
	`source_ids` text NOT NULL,
	`contradicted_by_claim_ids` text DEFAULT  NOT NULL,
	`current_revision_no` integer DEFAULT 1 NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`owner_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`case_id`) REFERENCES `cases`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `claims_revisions` (
	`aggregate_id` text NOT NULL,
	`revision_no` integer NOT NULL,
	`valid_from` integer NOT NULL,
	`valid_to` integer,
	`actor_user_id` text NOT NULL,
	`change_kind` text NOT NULL,
	`payload` text NOT NULL,
	PRIMARY KEY(`aggregate_id`, `revision_no`),
	FOREIGN KEY (`aggregate_id`) REFERENCES `claims`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`actor_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `entities` (
	`id` text PRIMARY KEY NOT NULL,
	`owner_user_id` text NOT NULL,
	`type` text NOT NULL,
	`canonical_name` text NOT NULL,
	`aliases` text DEFAULT  NOT NULL,
	`description` text DEFAULT '' NOT NULL,
	`public_figure` integer DEFAULT false NOT NULL,
	`profile` text NOT NULL,
	`current_revision_no` integer DEFAULT 1 NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`owner_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `entities_revisions` (
	`aggregate_id` text NOT NULL,
	`revision_no` integer NOT NULL,
	`valid_from` integer NOT NULL,
	`valid_to` integer,
	`actor_user_id` text NOT NULL,
	`change_kind` text NOT NULL,
	`payload` text NOT NULL,
	PRIMARY KEY(`aggregate_id`, `revision_no`),
	FOREIGN KEY (`aggregate_id`) REFERENCES `entities`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`actor_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `events` (
	`id` text PRIMARY KEY NOT NULL,
	`owner_user_id` text NOT NULL,
	`case_id` text NOT NULL,
	`type` text NOT NULL,
	`date` integer NOT NULL,
	`title` text NOT NULL,
	`summary` text NOT NULL,
	`certainty` text NOT NULL,
	`source_ids` text NOT NULL,
	`entity_ids` text NOT NULL,
	`current_revision_no` integer DEFAULT 1 NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`owner_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`case_id`) REFERENCES `cases`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `events_revisions` (
	`aggregate_id` text NOT NULL,
	`revision_no` integer NOT NULL,
	`valid_from` integer NOT NULL,
	`valid_to` integer,
	`actor_user_id` text NOT NULL,
	`change_kind` text NOT NULL,
	`payload` text NOT NULL,
	PRIMARY KEY(`aggregate_id`, `revision_no`),
	FOREIGN KEY (`aggregate_id`) REFERENCES `events`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`actor_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `ingest_activity` (
	`id` text PRIMARY KEY NOT NULL,
	`owner_user_id` text NOT NULL,
	`case_id` text NOT NULL,
	`url` text NOT NULL,
	`publisher` text,
	`phases_reached` text DEFAULT  NOT NULL,
	`status` text NOT NULL,
	`started_at` integer NOT NULL,
	`ended_at` integer,
	`records_created` integer DEFAULT 0 NOT NULL,
	`failure_reason` text,
	FOREIGN KEY (`owner_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`case_id`) REFERENCES `cases`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `relationships` (
	`id` text PRIMARY KEY NOT NULL,
	`owner_user_id` text NOT NULL,
	`from_entity_id` text NOT NULL,
	`to_entity_id` text NOT NULL,
	`type` text NOT NULL,
	`certainty` text NOT NULL,
	`source_ids` text NOT NULL,
	`active_from` integer NOT NULL,
	`active_to` integer,
	`description` text DEFAULT '' NOT NULL,
	`current_revision_no` integer DEFAULT 1 NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`owner_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`from_entity_id`) REFERENCES `entities`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`to_entity_id`) REFERENCES `entities`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `relationships_revisions` (
	`aggregate_id` text NOT NULL,
	`revision_no` integer NOT NULL,
	`valid_from` integer NOT NULL,
	`valid_to` integer,
	`actor_user_id` text NOT NULL,
	`change_kind` text NOT NULL,
	`payload` text NOT NULL,
	PRIMARY KEY(`aggregate_id`, `revision_no`),
	FOREIGN KEY (`aggregate_id`) REFERENCES `relationships`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`actor_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`created_at` integer NOT NULL,
	`last_seen_at` integer NOT NULL,
	`ip` text,
	`user_agent` text,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `sources` (
	`id` text PRIMARY KEY NOT NULL,
	`owner_user_id` text NOT NULL,
	`url` text NOT NULL,
	`publisher` text NOT NULL,
	`tier` text NOT NULL,
	`fetched_at` integer NOT NULL,
	`excerpt` text NOT NULL,
	`archive_url` text,
	`body_hash` text NOT NULL,
	`current_revision_no` integer DEFAULT 1 NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`owner_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `sources_revisions` (
	`aggregate_id` text NOT NULL,
	`revision_no` integer NOT NULL,
	`valid_from` integer NOT NULL,
	`valid_to` integer,
	`actor_user_id` text NOT NULL,
	`change_kind` text NOT NULL,
	`payload` text NOT NULL,
	PRIMARY KEY(`aggregate_id`, `revision_no`),
	FOREIGN KEY (`aggregate_id`) REFERENCES `sources`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`actor_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `user_case_subscriptions` (
	`id` text PRIMARY KEY NOT NULL,
	`owner_user_id` text NOT NULL,
	`case_id` text NOT NULL,
	`adopted_at` integer NOT NULL,
	`cadence` text NOT NULL,
	`last_viewed_at` integer,
	`alasan_saya` text,
	FOREIGN KEY (`owner_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`case_id`) REFERENCES `cases`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` text PRIMARY KEY NOT NULL,
	`google_sub` text NOT NULL,
	`email` text NOT NULL,
	`display_name` text NOT NULL,
	`picture_url` text,
	`created_at` integer NOT NULL,
	`last_signed_in_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `audit_log_user_idx` ON `audit_log` (`user_id`);--> statement-breakpoint
CREATE INDEX `audit_log_at_idx` ON `audit_log` (`at`);--> statement-breakpoint
CREATE INDEX `cases_owner_idx` ON `cases` (`owner_user_id`);--> statement-breakpoint
CREATE INDEX `cases_revisions_actor_idx` ON `cases_revisions` (`actor_user_id`);--> statement-breakpoint
CREATE INDEX `claims_owner_idx` ON `claims` (`owner_user_id`);--> statement-breakpoint
CREATE INDEX `claims_case_idx` ON `claims` (`case_id`);--> statement-breakpoint
CREATE INDEX `entities_owner_idx` ON `entities` (`owner_user_id`);--> statement-breakpoint
CREATE INDEX `events_owner_idx` ON `events` (`owner_user_id`);--> statement-breakpoint
CREATE INDEX `events_case_idx` ON `events` (`case_id`);--> statement-breakpoint
CREATE INDEX `events_date_idx` ON `events` (`date`);--> statement-breakpoint
CREATE INDEX `ingest_activity_owner_idx` ON `ingest_activity` (`owner_user_id`);--> statement-breakpoint
CREATE INDEX `ingest_activity_started_idx` ON `ingest_activity` (`started_at`);--> statement-breakpoint
CREATE INDEX `relationships_owner_idx` ON `relationships` (`owner_user_id`);--> statement-breakpoint
CREATE INDEX `relationships_from_idx` ON `relationships` (`from_entity_id`);--> statement-breakpoint
CREATE INDEX `relationships_to_idx` ON `relationships` (`to_entity_id`);--> statement-breakpoint
CREATE INDEX `sessions_user_id_idx` ON `sessions` (`user_id`);--> statement-breakpoint
CREATE INDEX `sessions_last_seen_idx` ON `sessions` (`last_seen_at`);--> statement-breakpoint
CREATE INDEX `sources_owner_idx` ON `sources` (`owner_user_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `sources_owner_url_idx` ON `sources` (`owner_user_id`,`url`);--> statement-breakpoint
CREATE UNIQUE INDEX `subs_owner_case_idx` ON `user_case_subscriptions` (`owner_user_id`,`case_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `users_google_sub_idx` ON `users` (`google_sub`);