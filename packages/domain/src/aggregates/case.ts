import { IllegalTransition, InvariantViolation } from '../errors.js';
import { BahasaText } from '../value-objects/bahasa-text.js';

/**
 * Spec: case-management.
 *
 * A Case is the unit of attention. Owned by exactly one user; carries an
 * append-only revision history (the revision rows live in repository-land,
 * but every state-changing method here is meant to be persisted as a new
 * revision by the application layer).
 */
export const CASE_LIFECYCLE_STATES = [
  'open',
  'trial',
  'verdict',
  'appeal',
  'inkracht',
  'closed',
] as const;
export type CaseLifecycleState = (typeof CASE_LIFECYCLE_STATES)[number];

const FORWARD_ORDER: Record<CaseLifecycleState, number> = {
  open: 0,
  trial: 1,
  verdict: 2,
  appeal: 3,
  inkracht: 4,
  closed: 5,
};

export interface CaseProps {
  readonly id: string;
  readonly ownerUserId: string;
  readonly name: string;
  readonly aliases: readonly string[];
  readonly status: CaseLifecycleState;
  readonly startedAt: Date;
  readonly closedAt: Date | null;
  readonly jurisdiction: string;
  readonly caseType: string;
  readonly summary: BahasaText;
}

export class Case {
  public readonly id: string;
  public readonly ownerUserId: string;
  public readonly name: string;
  public readonly aliases: readonly string[];
  public readonly status: CaseLifecycleState;
  public readonly startedAt: Date;
  public readonly closedAt: Date | null;
  public readonly jurisdiction: string;
  public readonly caseType: string;
  public readonly summary: BahasaText;

  private constructor(props: CaseProps) {
    this.id = props.id;
    this.ownerUserId = props.ownerUserId;
    this.name = props.name;
    this.aliases = props.aliases;
    this.status = props.status;
    this.startedAt = props.startedAt;
    this.closedAt = props.closedAt;
    this.jurisdiction = props.jurisdiction;
    this.caseType = props.caseType;
    this.summary = props.summary;
  }

  static create(input: {
    id: string;
    ownerUserId: string;
    name: string;
    jurisdiction: string;
    caseType: string;
    aliases?: readonly string[];
    summary?: BahasaText;
    now: Date;
  }): Case {
    const missing: string[] = [];
    if (!input.id) missing.push('id');
    if (!input.ownerUserId) missing.push('ownerUserId');
    if (!input.name) missing.push('name');
    if (!input.jurisdiction) missing.push('jurisdiction');
    if (!input.caseType) missing.push('caseType');
    if (missing.length > 0) {
      throw new InvariantViolation(`Missing required Case fields: ${missing.join(', ')}`, { missing });
    }
    return new Case({
      id: input.id,
      ownerUserId: input.ownerUserId,
      name: input.name,
      aliases: Object.freeze([...(input.aliases ?? [])]),
      status: 'open',
      startedAt: input.now,
      closedAt: null,
      jurisdiction: input.jurisdiction,
      caseType: input.caseType,
      summary: input.summary ?? BahasaText.of(''),
    });
  }

  static restore(props: CaseProps): Case {
    return new Case(props);
  }

  /**
   * Advance the lifecycle along the documented forward order. Throws unless
   * the transition is contiguous (e.g., trial → verdict). Out-of-order
   * transitions require `overrideWithReason`.
   */
  advance(target: CaseLifecycleState): Case {
    const current = FORWARD_ORDER[this.status];
    const next = FORWARD_ORDER[target];
    if (next !== current + 1) {
      throw new IllegalTransition(
        `Cannot advance from ${this.status} to ${target} without override reason`,
        { from: this.status, to: target },
      );
    }
    return this.withStatus(target);
  }

  /**
   * Out-of-order transition (e.g., closed → open). Reason is required.
   */
  overrideTransition(target: CaseLifecycleState, reason: string): Case {
    if (!reason || reason.trim().length === 0) {
      throw new IllegalTransition('Override transition requires a non-empty reason', {
        from: this.status,
        to: target,
      });
    }
    return this.withStatus(target);
  }

  rename(name: string): Case {
    if (!name || name.trim().length === 0) {
      throw new InvariantViolation('Case name cannot be empty');
    }
    return new Case({ ...this.toProps(), name });
  }

  withSummary(summary: BahasaText): Case {
    return new Case({ ...this.toProps(), summary });
  }

  withAliases(aliases: readonly string[]): Case {
    return new Case({ ...this.toProps(), aliases: Object.freeze([...aliases]) });
  }

  private withStatus(status: CaseLifecycleState): Case {
    const closedAt = status === 'closed' || status === 'inkracht' ? new Date() : this.closedAt;
    return new Case({ ...this.toProps(), status, closedAt });
  }

  toProps(): CaseProps {
    return {
      id: this.id,
      ownerUserId: this.ownerUserId,
      name: this.name,
      aliases: this.aliases,
      status: this.status,
      startedAt: this.startedAt,
      closedAt: this.closedAt,
      jurisdiction: this.jurisdiction,
      caseType: this.caseType,
      summary: this.summary,
    };
  }
}
