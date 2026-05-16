import { CrossUserReference, InvariantViolation } from '../errors.js';
import { BahasaText } from '../value-objects/bahasa-text.js';
import { RightOfReply } from '../value-objects/right-of-reply.js';

/**
 * Spec: entity-dossier.
 *
 * Four entity types share an aggregate identity and an owner; the
 * type-specific profile lives in a discriminated union.
 */
export const ENTITY_TYPES = ['person', 'institution', 'company', 'document'] as const;
export type EntityType = (typeof ENTITY_TYPES)[number];

export interface PersonProfile {
  readonly type: 'person';
  readonly currentPositions: readonly string[];
  readonly priorPositions: readonly string[];
  readonly lhkpnUrl: string | null;
  readonly photoUrl: string | null;
  readonly rightOfReply: RightOfReply;
}

export interface InstitutionProfile {
  readonly type: 'institution';
  readonly mandate: BahasaText;
  readonly leadership: readonly string[];
  readonly rightOfReply: RightOfReply;
}

export interface CompanyProfile {
  readonly type: 'company';
  readonly beneficialOwners: readonly string[];
  readonly rightOfReply: RightOfReply;
}

export interface DocumentProfile {
  readonly type: 'document';
  readonly originalPdfUrl: string;
}

export type EntityProfile =
  | PersonProfile
  | InstitutionProfile
  | CompanyProfile
  | DocumentProfile;

export interface EntityProps {
  readonly id: string;
  readonly ownerUserId: string;
  readonly type: EntityType;
  readonly canonicalName: string;
  readonly aliases: readonly string[];
  readonly description: BahasaText;
  readonly publicFigure: boolean;
  readonly profile: EntityProfile;
}

export class Entity {
  public readonly id: string;
  public readonly ownerUserId: string;
  public readonly type: EntityType;
  public readonly canonicalName: string;
  public readonly aliases: readonly string[];
  public readonly description: BahasaText;
  public readonly publicFigure: boolean;
  public readonly profile: EntityProfile;

  private constructor(props: EntityProps) {
    this.id = props.id;
    this.ownerUserId = props.ownerUserId;
    this.type = props.type;
    this.canonicalName = props.canonicalName;
    this.aliases = props.aliases;
    this.description = props.description;
    this.publicFigure = props.publicFigure;
    this.profile = props.profile;
  }

  static create(input: {
    id: string;
    ownerUserId: string;
    type: EntityType;
    canonicalName: string;
    aliases?: readonly string[];
    description?: BahasaText;
    publicFigure?: boolean;
    profile: EntityProfile;
  }): Entity {
    if (!input.id) throw new InvariantViolation('Entity requires an id');
    if (!input.ownerUserId) throw new InvariantViolation('Entity requires an ownerUserId');
    if (!input.canonicalName || input.canonicalName.trim().length === 0) {
      throw new InvariantViolation('Entity canonicalName cannot be empty');
    }
    if (input.profile.type !== input.type) {
      throw new InvariantViolation(
        `Entity type "${input.type}" does not match profile.type "${input.profile.type}"`,
      );
    }
    if (input.type === 'document') {
      const doc = input.profile as DocumentProfile;
      if (!isHttpUrl(doc.originalPdfUrl)) {
        throw new InvariantViolation('Document profile requires a valid originalPdfUrl');
      }
    }
    return new Entity({
      id: input.id,
      ownerUserId: input.ownerUserId,
      type: input.type,
      canonicalName: input.canonicalName.trim(),
      aliases: Object.freeze([...(input.aliases ?? [])]),
      description: input.description ?? BahasaText.of(''),
      publicFigure: input.publicFigure ?? false,
      profile: input.profile,
    });
  }

  static restore(props: EntityProps): Entity {
    return new Entity(props);
  }

  /**
   * Guard helper for use cases: confirm the entity belongs to a given user.
   * Throws CrossUserReference on mismatch.
   */
  assertOwnedBy(userId: string): void {
    if (this.ownerUserId !== userId) {
      throw new CrossUserReference(
        `Entity ${this.id} is owned by ${this.ownerUserId}, not ${userId}`,
        { entityId: this.id, ownerUserId: this.ownerUserId, attemptedUserId: userId },
      );
    }
  }
}

function isHttpUrl(value: unknown): value is string {
  if (typeof value !== 'string') return false;
  try {
    const u = new URL(value);
    return u.protocol === 'http:' || u.protocol === 'https:';
  } catch {
    return false;
  }
}
