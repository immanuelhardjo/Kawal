import { User } from '@kawal/domain';
import { ApplicationError } from '../errors.js';
import type { PasswordHashPort } from '../ports/password-hash-port.js';
import type { SessionStorePort } from '../ports/session-store-port.js';
import type { AuditLogRepo } from '../repositories/audit-log-repo.js';
import type { UserRepo } from '../repositories/user-repo.js';

export interface SignUpWithPasswordDeps {
  readonly users: UserRepo;
  readonly sessions: SessionStorePort;
  readonly audit: AuditLogRepo;
  readonly passwordHash: PasswordHashPort;
  readonly newId: () => string;
  readonly now: () => Date;
}

export interface SignUpWithPasswordInput {
  readonly email: string;
  readonly password: string;
  readonly ip: string | null;
  readonly userAgent: string | null;
}

export interface SignUpWithPasswordResult {
  readonly user: User;
  readonly sessionId: string;
}

/**
 * Spec: password-auth / "Email/password sign-up", "Password policy".
 */
export class SignUpWithPassword {
  constructor(private readonly deps: SignUpWithPasswordDeps) {}

  async execute(input: SignUpWithPasswordInput): Promise<SignUpWithPasswordResult> {
    const existing = await this.deps.users.findByEmail(input.email);
    if (existing) {
      throw new ApplicationError('email_already_registered', 'An account with this email already exists');
    }

    let hash: string;
    try {
      hash = await this.deps.passwordHash.hash(input.password);
    } catch (cause) {
      if (cause instanceof Error && cause.message === 'password_policy_violation') {
        throw new ApplicationError('password_policy_violation', cause.message);
      }
      throw cause;
    }

    const now = this.deps.now();
    let user: User;
    try {
      user = User.createWithPassword({
        id: this.deps.newId(),
        email: input.email,
        plainPassword: input.password,
        passwordHash: hash,
        now,
      });
    } catch (cause) {
      if (cause instanceof Error && cause.message === 'password_policy_violation') {
        throw new ApplicationError('password_policy_violation', 'Password does not meet requirements');
      }
      throw cause;
    }

    await this.deps.users.save(user);

    const { sessionId } = await this.deps.sessions.create({
      userId: user.id,
      now,
      ip: input.ip,
      userAgent: input.userAgent,
    });

    await this.deps.audit.append({
      id: this.deps.newId(),
      kind: 'sign_in_success',
      userId: user.id,
      aggregateType: null,
      aggregateId: null,
      revisionNo: null,
      ip: input.ip,
      userAgent: input.userAgent,
      reason: null,
      at: now,
    });

    return { user, sessionId };
  }
}
