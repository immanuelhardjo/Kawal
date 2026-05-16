import { InvariantViolation } from '../errors.js';
import { BahasaText } from './bahasa-text.js';

/**
 * Spec: entity-dossier / "Right-of-reply auto-population",
 *       presentation-principles / "Right-of-reply asymmetry never silently rendered",
 *       design D12.
 *
 * A right-of-reply slot is *always* renderable. When no press statement has
 * been ingested for the entity, `statement` is null and the UI renders the
 * dated-empty fallback. This is deliberate: the slot is never collapsed to
 * zero height, ensuring allegations and replies retain visual symmetry.
 */
export interface RightOfReplyStatement {
  readonly text: BahasaText;
  readonly sourceId: string;
  readonly publishedAt: Date;
}

export class RightOfReply {
  public readonly statement: RightOfReplyStatement | null;

  private constructor(statement: RightOfReplyStatement | null) {
    this.statement = statement;
  }

  static empty(): RightOfReply {
    return new RightOfReply(null);
  }

  static withStatement(statement: RightOfReplyStatement): RightOfReply {
    if (!statement.sourceId) {
      throw new InvariantViolation('Right-of-reply statement requires a source id');
    }
    if (!(statement.publishedAt instanceof Date) || isNaN(statement.publishedAt.getTime())) {
      throw new InvariantViolation('Right-of-reply statement requires a valid publishedAt date');
    }
    return new RightOfReply(statement);
  }

  isEmpty(): boolean {
    return this.statement === null;
  }
}
