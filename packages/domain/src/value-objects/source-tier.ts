import { InvariantViolation } from '../errors.js';

/**
 * Spec: evidence-ledger / "Source carries tier and archive fallback".
 *
 * Tier-1: authoritative (citation-eligible, default trust).
 * Tier-2: verified journalism (citation-eligible).
 * Tier-3: signal-only (never citation-eligible).
 */
export const SOURCE_TIERS = ['tier_1', 'tier_2', 'tier_3'] as const;

export type SourceTier = (typeof SOURCE_TIERS)[number];

const LOOKUP: ReadonlySet<string> = new Set(SOURCE_TIERS);

export function isSourceTier(value: unknown): value is SourceTier {
  return typeof value === 'string' && LOOKUP.has(value);
}

export function parseSourceTier(value: unknown): SourceTier {
  if (!isSourceTier(value)) {
    throw new InvariantViolation(`Invalid source tier: ${JSON.stringify(value)}`, { value });
  }
  return value;
}

export function isCitationEligible(tier: SourceTier): boolean {
  return tier === 'tier_1' || tier === 'tier_2';
}
