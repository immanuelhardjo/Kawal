import { CrossUserReference, InvariantViolation } from '../errors.js';
import { Excerpt } from '../value-objects/excerpt.js';
import { type SourceTier, isCitationEligible } from '../value-objects/source-tier.js';

/**
 * Spec: evidence-ledger / "Source carries tier and archive fallback",
 *       osint-ingestion / "Archive-URL fallback".
 *
 * A Source is the citable artifact: a URL + verbatim excerpt + tier +
 * Wayback fallback. Tier-3 sources are non-citation-eligible — invariants
 * elsewhere (Claim, Event, Relationship constructors) reject Tier-3-only
 * anchoring.
 */
export interface SourceProps {
  readonly id: string;
  readonly ownerUserId: string;
  readonly url: string;
  readonly publisher: string;
  readonly tier: SourceTier;
  readonly fetchedAt: Date;
  readonly excerpt: Excerpt;
  readonly archiveUrl: string | null;
  readonly bodyHash: string;
}

export class Source {
  public readonly id: string;
  public readonly ownerUserId: string;
  public readonly url: string;
  public readonly publisher: string;
  public readonly tier: SourceTier;
  public readonly fetchedAt: Date;
  public readonly excerpt: Excerpt;
  public readonly archiveUrl: string | null;
  public readonly bodyHash: string;

  private constructor(props: SourceProps) {
    this.id = props.id;
    this.ownerUserId = props.ownerUserId;
    this.url = props.url;
    this.publisher = props.publisher;
    this.tier = props.tier;
    this.fetchedAt = props.fetchedAt;
    this.excerpt = props.excerpt;
    this.archiveUrl = props.archiveUrl;
    this.bodyHash = props.bodyHash;
  }

  static create(input: SourceProps): Source {
    if (!input.id) throw new InvariantViolation('Source requires an id');
    if (!input.ownerUserId) throw new InvariantViolation('Source requires an ownerUserId');
    if (!isHttpUrl(input.url)) {
      throw new InvariantViolation('Source URL must be http(s)', { url: input.url });
    }
    if (!input.publisher) throw new InvariantViolation('Source requires a publisher');
    if (input.archiveUrl !== null && !isHttpUrl(input.archiveUrl)) {
      throw new InvariantViolation('Source archiveUrl must be http(s) when present');
    }
    if (!input.bodyHash) throw new InvariantViolation('Source requires a bodyHash');
    return new Source(input);
  }

  static restore(props: SourceProps): Source {
    return new Source(props);
  }

  isCitationEligible(): boolean {
    return isCitationEligible(this.tier);
  }

  assertOwnedBy(userId: string): void {
    if (this.ownerUserId !== userId) {
      throw new CrossUserReference(
        `Source ${this.id} is owned by ${this.ownerUserId}, not ${userId}`,
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
