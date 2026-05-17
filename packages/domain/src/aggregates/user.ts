import { InvariantViolation } from '../errors.js';

/**
 * Spec: user-management / "User record keyed by email",
 *       password-auth / "Password policy".
 *
 * The User is the only identity in the system. Email is the unifying key
 * across credential types. googleSub and passwordHash are both nullable;
 * every user has at least one of the two set.
 */
export interface UserProps {
  readonly id: string;
  readonly googleSub: string | null;
  readonly email: string;
  readonly displayName: string;
  readonly pictureUrl: string | null;
  readonly passwordHash: string | null;
  readonly createdAt: Date;
  readonly lastSignedInAt: Date;
}

export class User {
  public readonly id: string;
  public readonly googleSub: string | null;
  public readonly email: string;
  public readonly displayName: string;
  public readonly pictureUrl: string | null;
  public readonly passwordHash: string | null;
  public readonly createdAt: Date;
  public readonly lastSignedInAt: Date;

  private constructor(props: UserProps) {
    this.id = props.id;
    this.googleSub = props.googleSub;
    this.email = props.email;
    this.displayName = props.displayName;
    this.pictureUrl = props.pictureUrl;
    this.passwordHash = props.passwordHash;
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
      passwordHash: null,
      createdAt: input.now,
      lastSignedInAt: input.now,
    });
  }

  static createWithPassword(input: {
    id: string;
    email: string;
    plainPassword: string;
    passwordHash: string;
    now: Date;
  }): User {
    if (!input.id) throw new InvariantViolation('User requires an id');
    if (!isEmail(input.email)) {
      throw new InvariantViolation('User requires a syntactically valid email', { email: input.email });
    }
    validatePasswordPolicy(input.plainPassword);
    const displayName = input.email.split('@')[0] ?? input.email;
    return new User({
      id: input.id,
      googleSub: null,
      email: input.email,
      displayName,
      pictureUrl: null,
      passwordHash: input.passwordHash,
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
      passwordHash: this.passwordHash,
      createdAt: this.createdAt,
      lastSignedInAt: input.now,
    });
  }

  linkGoogleSub(input: { googleSub: string; email: string; displayName: string; pictureUrl: string | null; now: Date }): User {
    return new User({
      id: this.id,
      googleSub: input.googleSub,
      email: input.email,
      displayName: input.displayName,
      pictureUrl: input.pictureUrl,
      passwordHash: this.passwordHash,
      createdAt: this.createdAt,
      lastSignedInAt: input.now,
    });
  }
}

function isEmail(value: unknown): value is string {
  return typeof value === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function validatePasswordPolicy(password: string): void {
  if (password.length < 8) {
    throw new InvariantViolation('password_policy_violation', { reason: 'minimum 8 characters required' });
  }
  if (!/[A-Z]/.test(password)) {
    throw new InvariantViolation('password_policy_violation', { reason: 'at least one uppercase letter required' });
  }
  if (!/[^a-zA-Z0-9]/.test(password)) {
    throw new InvariantViolation('password_policy_violation', { reason: 'at least one symbol character required' });
  }
}
