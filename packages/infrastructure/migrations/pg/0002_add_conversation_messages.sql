CREATE TABLE "conversation_messages" (
  "id" text PRIMARY KEY NOT NULL,
  "user_id" text NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "case_id" text NOT NULL REFERENCES "cases"("id") ON DELETE CASCADE,
  "question" text NOT NULL,
  "answer_text" text NOT NULL,
  "cited_claim_ids" jsonb DEFAULT '[]'::jsonb NOT NULL,
  "cited_event_ids" jsonb DEFAULT '[]'::jsonb NOT NULL,
  "cited_source_ids" jsonb DEFAULT '[]'::jsonb NOT NULL,
  "created_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE INDEX "conv_msgs_user_case_idx" ON "conversation_messages" ("user_id", "case_id");
--> statement-breakpoint
CREATE INDEX "conv_msgs_created_at_idx" ON "conversation_messages" ("created_at");
