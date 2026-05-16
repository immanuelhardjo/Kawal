import { InvariantViolation } from '../errors.js';
import { parseCertaintyLabel, type CertaintyLabel } from '../value-objects/certainty-label.js';
import { assertAnchoringSources } from './anchoring.js';
import type { Source } from './source.js';

/**
 * Spec: evidence-ledger / "Claim is atomic, sourced, and owned".
 */
export interface ClaimProps {
  readonly id: string;
  readonly ownerUserId: string;
  readonly caseId: string;
  readonly text: string;
  readonly certainty: CertaintyLabel;
  readonly sourceIds: readonly string[];
  readonly contradictedByClaimIds: readonly string[];
}

export class Claim {
  public readonly id: string;
  public readonly ownerUserId: string;
  public readonly caseId: string;
  public readonly text: string;
  public readonly certainty: CertaintyLabel;
  public readonly sourceIds: readonly string[];
  public readonly contradictedByClaimIds: readonly string[];

  private constructor(props: ClaimProps) {
    this.id = props.id;
    this.ownerUserId = props.ownerUserId;
    this.caseId = props.caseId;
    this.text = props.text;
    this.certainty = props.certainty;
    this.sourceIds = props.sourceIds;
    this.contradictedByClaimIds = props.contradictedByClaimIds;
  }

  static create(input: {
    id: string;
    ownerUserId: string;
    caseId: string;
    text: string;
    certainty: CertaintyLabel | string;
    sources: readonly Source[];
    contradictedByClaimIds?: readonly string[];
  }): Claim {
    if (!input.id) throw new InvariantViolation('Claim requires an id');
    if (!input.ownerUserId) throw new InvariantViolation('Claim requires an ownerUserId');
    if (!input.caseId) throw new InvariantViolation('Claim requires a caseId');
    if (!input.text || input.text.trim().length === 0) {
      throw new InvariantViolation('Claim text cannot be empty');
    }
    const certainty = parseCertaintyLabel(input.certainty);
    assertAnchoringSources({ ownerUserId: input.ownerUserId, sources: input.sources });
    return new Claim({
      id: input.id,
      ownerUserId: input.ownerUserId,
      caseId: input.caseId,
      text: input.text.trim(),
      certainty,
      sourceIds: Object.freeze(input.sources.map((s) => s.id)),
      contradictedByClaimIds: Object.freeze([...(input.contradictedByClaimIds ?? [])]),
    });
  }

  static restore(props: ClaimProps): Claim {
    return new Claim(props);
  }
}
