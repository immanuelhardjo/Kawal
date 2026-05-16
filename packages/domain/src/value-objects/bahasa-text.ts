import { InvariantViolation } from '../errors.js';

/**
 * Spec: presentation-principles / "Display strings in Bahasa Indonesia only",
 *       design D8.
 *
 * The single content-language wrapper for user-facing long-form dossier text
 * (Case.summary_md, Event.summary_md, Entity.description_md, glossary entries).
 * Holds exactly one language: Bahasa Indonesia. If the original source is in
 * English, the ingest pipeline is responsible for translating before
 * persisting.
 */
export class BahasaText {
  public readonly value: string;

  private constructor(value: string) {
    this.value = value;
  }

  static of(value: string): BahasaText {
    if (typeof value !== 'string') {
      throw new InvariantViolation('BahasaText must be a string');
    }
    return new BahasaText(value);
  }

  isEmpty(): boolean {
    return this.value.trim().length === 0;
  }

  toString(): string {
    return this.value;
  }
}
