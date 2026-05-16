import { CrossUserReference, InvariantViolation } from '../errors.js';
import { BahasaText } from '../value-objects/bahasa-text.js';
import { parseCertaintyLabel, type CertaintyLabel } from '../value-objects/certainty-label.js';
import { assertAnchoringSources } from './anchoring.js';
import type { Entity } from './entity.js';
import type { Source } from './source.js';

/**
 * Spec: relationship-graph / "Relationship record, owned".
 */
export const RELATIONSHIP_TYPES = [
  'employed_by',
  'allegedly_paid',
  'testified_for',
  'prosecuted_by',
  'ruled_on',
  'owned_by',
  'other',
] as const;
export type RelationshipType = (typeof RELATIONSHIP_TYPES)[number];

export interface RelationshipProps {
  readonly id: string;
  readonly ownerUserId: string;
  readonly fromEntityId: string;
  readonly toEntityId: string;
  readonly type: RelationshipType;
  readonly certainty: CertaintyLabel;
  readonly sourceIds: readonly string[];
  readonly activeFrom: Date;
  readonly activeTo: Date | null;
  readonly description: BahasaText;
}

export class Relationship {
  public readonly id: string;
  public readonly ownerUserId: string;
  public readonly fromEntityId: string;
  public readonly toEntityId: string;
  public readonly type: RelationshipType;
  public readonly certainty: CertaintyLabel;
  public readonly sourceIds: readonly string[];
  public readonly activeFrom: Date;
  public readonly activeTo: Date | null;
  public readonly description: BahasaText;

  private constructor(props: RelationshipProps) {
    this.id = props.id;
    this.ownerUserId = props.ownerUserId;
    this.fromEntityId = props.fromEntityId;
    this.toEntityId = props.toEntityId;
    this.type = props.type;
    this.certainty = props.certainty;
    this.sourceIds = props.sourceIds;
    this.activeFrom = props.activeFrom;
    this.activeTo = props.activeTo;
    this.description = props.description;
  }

  static create(input: {
    id: string;
    ownerUserId: string;
    fromEntity: Entity;
    toEntity: Entity;
    type: RelationshipType;
    certainty: CertaintyLabel | string;
    sources: readonly Source[];
    activeFrom: Date;
    activeTo?: Date | null;
    description?: BahasaText;
  }): Relationship {
    if (!input.id) throw new InvariantViolation('Relationship requires an id');
    if (!input.ownerUserId) throw new InvariantViolation('Relationship requires an ownerUserId');
    if (input.fromEntity.id === input.toEntity.id) {
      throw new InvariantViolation('Relationship cannot be self-referential');
    }
    for (const entity of [input.fromEntity, input.toEntity]) {
      if (entity.ownerUserId !== input.ownerUserId) {
        throw new CrossUserReference(
          `Relationship references entity ${entity.id} owned by ${entity.ownerUserId}, not ${input.ownerUserId}`,
        );
      }
    }
    if (!(input.activeFrom instanceof Date) || isNaN(input.activeFrom.getTime())) {
      throw new InvariantViolation('Relationship requires a valid activeFrom date');
    }
    if (input.activeTo != null) {
      if (!(input.activeTo instanceof Date) || isNaN(input.activeTo.getTime())) {
        throw new InvariantViolation('Relationship activeTo must be a valid date when present');
      }
      if (input.activeTo.getTime() < input.activeFrom.getTime()) {
        throw new InvariantViolation('Relationship activeTo cannot precede activeFrom');
      }
    }
    const certainty = parseCertaintyLabel(input.certainty);
    assertAnchoringSources({ ownerUserId: input.ownerUserId, sources: input.sources });
    return new Relationship({
      id: input.id,
      ownerUserId: input.ownerUserId,
      fromEntityId: input.fromEntity.id,
      toEntityId: input.toEntity.id,
      type: input.type,
      certainty,
      sourceIds: Object.freeze(input.sources.map((s) => s.id)),
      activeFrom: input.activeFrom,
      activeTo: input.activeTo ?? null,
      description: input.description ?? BahasaText.of(''),
    });
  }

  static restore(props: RelationshipProps): Relationship {
    return new Relationship(props);
  }

  /**
   * Spec: relationship-graph / "As-of-date driven by the linked timeline".
   * True iff the relationship is active on the supplied date.
   */
  isActiveOn(asOfDate: Date): boolean {
    if (asOfDate.getTime() < this.activeFrom.getTime()) return false;
    if (this.activeTo !== null && asOfDate.getTime() > this.activeTo.getTime()) return false;
    return true;
  }
}
