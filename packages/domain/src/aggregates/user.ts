import { InvariantViolation } from '../errors.js';

/**
 * Spec: user-management / "User record keyed by Google subject".
 *
 * The User is the only identity in the system. Authoritative identity is the
 * Google `sub` claim; everything else is refreshed on each sign-in.
 */
export interface UserProps {
  readonly id: string;
  readonly googleSub: string;
  readonly email: string;
  readonly displayName: string;
  readonly pictureUrl: string | null;
  readonly createdAt: Date;
  readonly lastSignedInAt: Date;
}

export class User {
  public readonly id: string;
  public readonly googleSub: string;
  public readonly email: string;
  public readonly displayName: string;
  public readonly pictureUrl: string | null;
  public readonly createdAt: Date;
  public readonly lastSignedInAt: Date;

  private constructor(props: UserProps) {
    this.id = props.id;
    this.googleSub = props.googleSub;
    this.email = props.email;
    this.displayName = props.displayName;
    this.pictureUrl = props.pictureUrl;
    this.createdAt = props.createdAt;
    this.lastSignedInAt = props.lastSignedInAt;
  }

  static create(input: {
    id: string;
    googleSub: string;
    email: string;
    displayName: string;
    pictureUrl?: string | null;
    now: Date;
  }): User {
    if (!input.id) throw new InvariantViolation('User requires an id');
    if (!input.googleSub) throw new InvariantViolation('User requires a Google sub claim');
    if (!isEmail(input.email)) {
      throw new InvariantViolation('User requires a syntactically valid email', { email: input.email });
    }
    if (!input.displayName) throw new InvariantViolation('User requires a displayName');
    return new User({
      id: input.id,
      googleSub: input.googleSub,
      email: input.email,
      displayName: input.displayName,
      pictureUrl: input.pictureUrl ?? null,
      createdAt: input.now,
      lastSignedInAt: input.now,
    });
  }

  static restore(props: UserProps): User {
    return new User(props);
  }

  recordSignIn(input: { email: string; displayName: string; pictureUrl: string | null; now: Date }): User {
    return new User({
      id: this.id,
      googleSub: this.googleSub,
      email: input.email,
      displayName: input.displayName,
      pictureUrl: input.pictureUrl,
      createdAt: this.createdAt,
      lastSignedInAt: input.now,
    });
  }
}

function isEmail(value: unknown): value is string {
  return typeof value === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}
