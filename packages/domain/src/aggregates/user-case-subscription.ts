import { InvariantViolation } from '../errors.js';

/**
 * Spec: case-management / "Case subscription per user".
 */
export const SUBSCRIPTION_CADENCES = ['daily', 'weekly', 'on_change', 'manual'] as const;
export type SubscriptionCadence = (typeof SUBSCRIPTION_CADENCES)[number];

export interface UserCaseSubscriptionProps {
  readonly id: string;
  readonly ownerUserId: string;
  readonly caseId: string;
  readonly adoptedAt: Date;
  readonly cadence: SubscriptionCadence;
  readonly lastViewedAt: Date | null;
  readonly alasanSaya: string | null;
}

export class UserCaseSubscription {
  public readonly id: string;
  public readonly ownerUserId: string;
  public readonly caseId: string;
  public readonly adoptedAt: Date;
  public readonly cadence: SubscriptionCadence;
  public readonly lastViewedAt: Date | null;
  public readonly alasanSaya: string | null;

  private constructor(props: UserCaseSubscriptionProps) {
    this.id = props.id;
    this.ownerUserId = props.ownerUserId;
    this.caseId = props.caseId;
    this.adoptedAt = props.adoptedAt;
    this.cadence = props.cadence;
    this.lastViewedAt = props.lastViewedAt;
    this.alasanSaya = props.alasanSaya;
  }

  static create(input: {
    id: string;
    ownerUserId: string;
    caseId: string;
    cadence: SubscriptionCadence;
    now: Date;
    alasanSaya?: string | null;
  }): UserCaseSubscription {
    if (!input.id) throw new InvariantViolation('Subscription requires an id');
    if (!input.ownerUserId) throw new InvariantViolation('Subscription requires an ownerUserId');
    if (!input.caseId) throw new InvariantViolation('Subscription requires a caseId');
    return new UserCaseSubscription({
      id: input.id,
      ownerUserId: input.ownerUserId,
      caseId: input.caseId,
      adoptedAt: input.now,
      cadence: input.cadence,
      lastViewedAt: null,
      alasanSaya: input.alasanSaya ?? null,
    });
  }

  static restore(props: UserCaseSubscriptionProps): UserCaseSubscription {
    return new UserCaseSubscription(props);
  }

  markViewed(now: Date): UserCaseSubscription {
    return new UserCaseSubscription({
      ...this.toProps(),
      lastViewedAt: now,
    });
  }

  private toProps(): UserCaseSubscriptionProps {
    return {
      id: this.id,
      ownerUserId: this.ownerUserId,
      caseId: this.caseId,
      adoptedAt: this.adoptedAt,
      cadence: this.cadence,
      lastViewedAt: this.lastViewedAt,
      alasanSaya: this.alasanSaya,
    };
  }
}
