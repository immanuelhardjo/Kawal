import { InvariantViolation } from '../errors.js';

/**
 * Spec: evidence-ledger / "Certainty label vocabulary".
 *
 * Exactly five labels; every fact-bearing record carries exactly one.
 */
export const CERTAINTY_LABELS = [
  'established',
  'alleged',
  'reported',
  'disputed',
  'unverified',
] as const;

export type CertaintyLabel = (typeof CERTAINTY_LABELS)[number];

const LOOKUP: ReadonlySet<string> = new Set(CERTAINTY_LABELS);

export function isCertaintyLabel(value: unknown): value is CertaintyLabel {
  return typeof value === 'string' && LOOKUP.has(value);
}

export function parseCertaintyLabel(value: unknown): CertaintyLabel {
  if (!isCertaintyLabel(value)) {
    throw new InvariantViolation(
      `Invalid certainty label: ${JSON.stringify(value)}. Allowed: ${CERTAINTY_LABELS.join(', ')}`,
      { value },
    );
  }
  return value;
}
