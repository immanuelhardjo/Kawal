// Errors
export {
  ApplicationError,
  Forbidden,
  IngestFailed,
  IngestTimeout,
  NotFound,
  Unauthenticated,
} from './errors.js';

// Ports
export type {
  AuthorizationStart,
  GoogleClaims,
  IdentityProviderPort,
} from './ports/identity-provider-port.js';
export type { SessionContext, SessionStorePort } from './ports/session-store-port.js';
export type { PasswordHashPort } from './ports/password-hash-port.js';
export type {
  AIScope,
  AudioBriefing,
  BriefingPort,
  CardImage,
  CardPort,
  ClusterLabel,
  ClusterLabelPort,
  ConversationAnswer,
  ConversationPort,
  ExtractedRecord,
  ExtractionPort,
  GlossaryAnswer,
  GlossaryPort,
  ProjectedScenario,
  ReconciliationPort,
  ScenarioPort,
  VerificationOutcome,
  VerificationPort,
} from './ports/ai-ports.js';
export type {
  ConversationHistoryRepo,
  ConversationMessage,
} from './ports/conversation-history-port.js';
export type {
  ArchivePort,
  FetchOutcome,
  RateLimiterPort,
  SourceFetcherPort,
} from './ports/ingest-ports.js';

// Repositories
export type { UserRepo } from './repositories/user-repo.js';
export type { SessionRecord, SessionRepo } from './repositories/session-repo.js';
export type { CaseRepo, CaseRevisionPayload } from './repositories/case-repo.js';
export type {
  ClaimRepo,
  ClaimRevisionPayload,
  EntityRepo,
  EntityRevisionPayload,
  EventRepo,
  EventRevisionPayload,
  OwnerScoped,
  RelationshipRepo,
  RelationshipRevisionPayload,
  SourceRepo,
  SourceRevisionPayload,
  SubscriptionRepo,
} from './repositories/dossier-repos.js';
export type {
  IngestActivityRecord,
  IngestActivityRepo,
  IngestStatus,
} from './repositories/ingest-activity-repo.js';
export type { AuditEntry, AuditEventKind, AuditLogRepo } from './repositories/audit-log-repo.js';

// Use cases
export { SignInWithGoogle, type CompleteSignInInput, type CompleteSignInResult } from './use-cases/sign-in-with-google.js';
export { SignInWithPassword, type SignInWithPasswordDeps, type SignInWithPasswordInput, type SignInWithPasswordResult } from './use-cases/sign-in-with-password.js';
export { SignUpWithPassword, type SignUpWithPasswordDeps, type SignUpWithPasswordInput, type SignUpWithPasswordResult } from './use-cases/sign-up-with-password.js';
export { SignOut } from './use-cases/sign-out.js';
export { DeleteAccount } from './use-cases/delete-account.js';
export { CreateCase, type CreateCaseInput } from './use-cases/create-case.js';
export { AdvanceLifecycle, type AdvanceLifecycleInput } from './use-cases/advance-lifecycle.js';
export { SubscribeToCase } from './use-cases/subscribe-to-case.js';
export { ComputeWhatChanged, type WhatChangedItem } from './use-cases/compute-what-changed.js';
export {
  IngestSource,
  type IngestPhase,
  type IngestPhaseCallback,
  type IngestPhaseEvent,
  type IngestSourceDeps,
  type IngestSourceInput,
  type IngestSourceResult,
} from './use-cases/ingest-source.js';
export {
  GetTimeline,
  type GetTimelineDeps,
  type TimelineFilters,
} from './use-cases/get-timeline.js';
export {
  GetVisibleGraph,
  type GetVisibleGraphDeps,
  type GraphFilters,
  type VisibleGraph,
} from './use-cases/get-visible-graph.js';
export {
  ExportMyDossier,
  type DossierExport,
  type ExportMyDossierDeps,
} from './use-cases/export-my-dossier.js';
export {
  EDITORIAL_TONE_DENY_LIST,
  detectEditorialTone,
  stripEditorialTone,
  withEditorialToneGuard,
  type EditorialToneFilterResult,
} from './use-cases/editorial-tone-filter.js';
export { VerifyClaim, type VerifyClaimDeps } from './use-cases/verify-claim.js';
export { AskQuestion, type AskQuestionDeps } from './use-cases/ask-question.js';
export { GenerateBriefing, type GenerateBriefingDeps } from './use-cases/generate-briefing.js';
export { GenerateScenarios, type GenerateScenariosDeps } from './use-cases/generate-scenarios.js';
export { LabelClusters, type LabelClustersDeps } from './use-cases/label-clusters.js';
export { ExplainTerm, type ExplainTermDeps } from './use-cases/explain-term.js';
export { GetConversationHistory, type GetConversationHistoryDeps } from './use-cases/get-conversation-history.js';
export {
  ScanGlossaryBacklog,
  type GlossaryBacklogEntry,
  type ScanGlossaryBacklogDeps,
} from './use-cases/scan-glossary-backlog.js';
