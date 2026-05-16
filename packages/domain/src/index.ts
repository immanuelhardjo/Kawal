// Errors
export {
  CrossUserReference,
  DomainError,
  IllegalTransition,
  InvariantViolation,
} from './errors.js';

// Value objects
export {
  CERTAINTY_LABELS,
  isCertaintyLabel,
  parseCertaintyLabel,
  type CertaintyLabel,
} from './value-objects/certainty-label.js';
export {
  SOURCE_TIERS,
  isCitationEligible,
  isSourceTier,
  parseSourceTier,
  type SourceTier,
} from './value-objects/source-tier.js';
export { DEFAULT_EXCERPT_MAX_CHARS, Excerpt } from './value-objects/excerpt.js';
export { BahasaText } from './value-objects/bahasa-text.js';
export {
  RightOfReply,
  type RightOfReplyStatement,
} from './value-objects/right-of-reply.js';

// Revisions
export {
  CHANGE_KINDS,
  newRevision,
  type ChangeKind,
  type Revision,
} from './revisions/revision.js';

// Aggregates
export { User, type UserProps } from './aggregates/user.js';
export {
  CASE_LIFECYCLE_STATES,
  Case,
  type CaseLifecycleState,
  type CaseProps,
} from './aggregates/case.js';
export {
  ENTITY_TYPES,
  Entity,
  type CompanyProfile,
  type DocumentProfile,
  type EntityProfile,
  type EntityProps,
  type EntityType,
  type InstitutionProfile,
  type PersonProfile,
} from './aggregates/entity.js';
export { Source, type SourceProps } from './aggregates/source.js';
export { assertAnchoringSources } from './aggregates/anchoring.js';
export { Claim, type ClaimProps } from './aggregates/claim.js';
export { EVENT_TYPES, Event, type EventProps, type EventType } from './aggregates/event.js';
export {
  RELATIONSHIP_TYPES,
  Relationship,
  type RelationshipProps,
  type RelationshipType,
} from './aggregates/relationship.js';
export {
  SUBSCRIPTION_CADENCES,
  UserCaseSubscription,
  type SubscriptionCadence,
  type UserCaseSubscriptionProps,
} from './aggregates/user-case-subscription.js';
