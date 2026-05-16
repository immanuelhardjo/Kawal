import { InvariantViolation } from '../errors.js';

/**
 * Spec: evidence-ledger / "Excerpt anchoring", osint-ingestion / "Excerpt cap".
 *
 * Length-capped, immutable verbatim quote from a source. Default cap is 500
 * characters; the API layer may override with the env-configured value.
 */
export const DEFAULT_EXCERPT_MAX_CHARS = 500;

export class Excerpt {
  public readonly value: string;

  private constructor(value: string) {
    this.value = value;
  }

  static of(value: string, maxChars: number = DEFAULT_EXCERPT_MAX_CHARS): Excerpt {
    if (typeof value !== 'string') {
      throw new InvariantViolation('Excerpt must be a string');
    }
    const trimmed = value.trim();
    if (trimmed.length === 0) {
      throw new InvariantViolation('Excerpt cannot be empty');
    }
    if (trimmed.length > maxChars) {
      throw new InvariantViolation(
        `Excerpt exceeds maximum length of ${maxChars} characters (got ${trimmed.length})`,
        { length: trimmed.length, maxChars },
      );
    }
    return new Excerpt(trimmed);
  }

  toString(): string {
    return this.value;
  }
}
