// DB
export { createDb, type Db } from './db/client.js';
export * as schema from './db/schema/pg.js';

// Repositories
export { DrizzleUserRepo } from './repositories/drizzle-user-repo.js';
export { DrizzleSessionStore } from './repositories/drizzle-session-store.js';
export { DrizzleCaseRepo } from './repositories/drizzle-case-repo.js';
export { DrizzleSubscriptionRepo } from './repositories/drizzle-subscription-repo.js';
export { DrizzleAuditLogRepo } from './repositories/drizzle-audit-log-repo.js';
export { DrizzleEntityRepo } from './repositories/drizzle-entity-repo.js';
export { DrizzleSourceRepo } from './repositories/drizzle-source-repo.js';
export { DrizzleClaimRepo } from './repositories/drizzle-claim-repo.js';
export { DrizzleEventRepo } from './repositories/drizzle-event-repo.js';
export { DrizzleRelationshipRepo } from './repositories/drizzle-relationship-repo.js';
export { DrizzleIngestActivityRepo } from './repositories/drizzle-ingest-activity-repo.js';

// Identity
export { GoogleOidcAdapter, type GoogleOidcConfig } from './identity/google-oidc-adapter.js';

// AI
export { GeminiAdapter } from './ai/gemini-adapter.js';
export { StubNotebookLMAdapter } from './ai/stub-notebooklm-adapter.js';
export { StubImageCardAdapter } from './ai/stub-image-card-adapter.js';

// Sources
export {
  sourceTierWhitelist,
  type PublisherDescriptor,
  type SourceTierWhitelist,
} from './sources/source-tier-whitelist.js';
export { InProcessRateLimiter } from './sources/in-process-rate-limiter.js';
export { HttpSourceFetcher } from './sources/http-source-fetcher.js';
export { WaybackArchiveAdapter } from './sources/wayback-archive-adapter.js';
