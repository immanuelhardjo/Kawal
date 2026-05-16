import { InvariantViolation } from '../errors.js';
import type { Source } from './source.js';

/**
 * Spec: evidence-ledger / "Tier-3 sources never anchor a fact",
 *       evidence-ledger / "Claim is atomic and sourced".
 *
 * Used by Claim, Event, and Relationship constructors to enforce:
 *   - at least one source
 *   - every referenced source is owned by the same user
 *   - at least one source is citation-eligible (tier_1 or tier_2)
 */
export function assertAnchoringSources(input: {
  ownerUserId: string;
  sources: readonly Source[];
}): void {
  if (input.sources.length === 0) {
    throw new InvariantViolation('At least one source is required to anchor this record');
  }
  for (const src of input.sources) {
    src.assertOwnedBy(input.ownerUserId);
  }
  const eligible = input.sources.some((s) => s.isCitationEligible());
  if (!eligible) {
    throw new InvariantViolation(
      'A tier-3 source cannot be the only or primary anchoring source on a Claim, Event, or Relationship',
      { sourceTiers: input.sources.map((s) => s.tier) },
    );
  }
}
