import { CrossUserReference, InvariantViolation } from '../errors.js';
import { BahasaText } from '../value-objects/bahasa-text.js';
import { parseCertaintyLabel, type CertaintyLabel } from '../value-objects/certainty-label.js';
import { assertAnchoringSources } from './anchoring.js';
import type { Entity } from './entity.js';
import type { Source } from './source.js';

/**
 * Spec: event-timeline / "Event record, owned".
 */
export const EVENT_TYPES = [
  'hearing',
  'indictment',
  'verdict',
  'asset_seizure',
  'public_statement',
  'other',
] as const;
export type EventType = (typeof EVENT_TYPES)[number];

export interface EventProps {
  readonly id: string;
  readonly ownerUserId: string;
  readonly caseId: string;
  readonly type: EventType;
  readonly date: Date;
  readonly title: string;
  readonly summary: BahasaText;
  readonly certainty: CertaintyLabel;
  readonly sourceIds: readonly string[];
  readonly entityIds: readonly string[];
}

export class Event {
  public readonly id: string;
  public readonly ownerUserId: string;
  public readonly caseId: string;
  public readonly type: EventType;
  public readonly date: Date;
  public readonly title: string;
  public readonly summary: BahasaText;
  public readonly certainty: CertaintyLabel;
  public readonly sourceIds: readonly string[];
  public readonly entityIds: readonly string[];

  private constructor(props: EventProps) {
    this.id = props.id;
    this.ownerUserId = props.ownerUserId;
    this.caseId = props.caseId;
    this.type = props.type;
    this.date = props.date;
    this.title = props.title;
    this.summary = props.summary;
    this.certainty = props.certainty;
    this.sourceIds = props.sourceIds;
    this.entityIds = props.entityIds;
  }

  static create(input: {
    id: string;
    ownerUserId: string;
    caseId: string;
    type: EventType;
    date: Date;
    title: string;
    summary: BahasaText;
    certainty: CertaintyLabel | string;
    sources: readonly Source[];
    entities: readonly Entity[];
  }): Event {
    if (!input.id) throw new InvariantViolation('Event requires an id');
    if (!input.ownerUserId) throw new InvariantViolation('Event requires an ownerUserId');
    if (!input.caseId) throw new InvariantViolation('Event requires a caseId');
    if (!input.title || input.title.trim().length === 0) {
      throw new InvariantViolation('Event title cannot be empty');
    }
    if (!(input.date instanceof Date) || isNaN(input.date.getTime())) {
      throw new InvariantViolation('Event requires a valid date');
    }
    const certainty = parseCertaintyLabel(input.certainty);
    assertAnchoringSources({ ownerUserId: input.ownerUserId, sources: input.sources });
    for (const entity of input.entities) {
      if (entity.ownerUserId !== input.ownerUserId) {
        throw new CrossUserReference(
          `Event references entity ${entity.id} owned by ${entity.ownerUserId}, not ${input.ownerUserId}`,
        );
      }
    }
    return new Event({
      id: input.id,
      ownerUserId: input.ownerUserId,
      caseId: input.caseId,
      type: input.type,
      date: input.date,
      title: input.title.trim(),
      summary: input.summary,
      certainty,
      sourceIds: Object.freeze(input.sources.map((s) => s.id)),
      entityIds: Object.freeze(input.entities.map((e) => e.id)),
    });
  }

  static restore(props: EventProps): Event {
    return new Event(props);
  }
}
