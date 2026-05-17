import type { User } from '@kawal/domain';
import { ApplicationError } from '../errors.js';
import type { PasswordHashPort } from '../ports/password-hash-port.js';
import type { SessionStorePort } from '../ports/session-store-port.js';
import type { AuditLogRepo } from '../repositories/audit-log-repo.js';
import type { UserRepo } from '../repositories/user-repo.js';

export interface SignInWithPasswordDeps {
  readonly users: UserRepo;
  readonly sessions: SessionStorePort;
  readonly audit: AuditLogRepo;
  readonly passwordHash: PasswordHashPort;
  readonly newId: () => string;
  readonly now: () => Date;
}

export interface SignInWithPasswordInput {
  readonly email: string;
  readonly password: string;
  readonly ip: string | null;
  readonly userAgent: string | null;
}

export interface SignInWithPasswordResult {
  readonly user: User;
  readonly sessionId: string;
}

const INVALID = new ApplicationError('invalid_credentials', 'Invalid email or password');

/**
 * Spec: password-auth / "Email/password sign-in".
 * Never reveals whether the failure was a bad email or bad password.
 */
export class SignInWithPassword {
  constructor(private readonly deps: SignInWithPasswordDeps) {}

  async execute(input: SignInWithPasswordInput): Promise<SignInWithPasswordResult> {
    const user = await this.deps.users.findByEmail(input.email);
    if (!user || !user.passwordHash) {
      await this.deps.audit.append({
        id: this.deps.newId(),
        kind: 'sign_in_failure',
        userId: null,
        aggregateType: null,
        aggregateId: null,
        revisionNo: null,
        ip: input.ip,
        userAgent: input.userAgent,
        reason: 'invalid_credentials',
        at: this.deps.now(),
      });
      throw INVALID;
    }

    const valid = await this.deps.passwordHash.verify(input.password, user.passwordHash);
    if (!valid) {
      await this.deps.audit.append({
        id: this.deps.newId(),
        kind: 'sign_in_failure',
        userId: user.id,
        aggregateType: null,
        aggregateId: null,
        revisionNo: null,
        ip: input.ip,
        userAgent: input.userAgent,
        reason: 'invalid_credentials',
        at: this.deps.now(),
      });
      throw INVALID;
    }

    const now = this.deps.now();
    const updated = user.recordSignIn({
      email: user.email,
      displayName: user.displayName,
      pictureUrl: user.pictureUrl,
      now,
    });
    await this.deps.users.save(updated);

    const { sessionId } = await this.deps.sessions.create({
      userId: updated.id,
      now,
      ip: input.ip,
      userAgent: input.userAgent,
    });

    await this.deps.audit.append({
      id: this.deps.newId(),
      kind: 'sign_in_success',
      userId: updated.id,
      aggregateType: null,
      aggregateId: null,
      revisionNo: null,
      ip: input.ip,
      userAgent: input.userAgent,
      reason: null,
      at: now,
    });

    return { user: updated, sessionId };
  }
}
