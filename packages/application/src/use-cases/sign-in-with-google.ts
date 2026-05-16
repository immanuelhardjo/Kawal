import { User } from '@kawal/domain';
import { ApplicationError } from '../errors.js';
import type { GoogleClaims, IdentityProviderPort } from '../ports/identity-provider-port.js';
import type { SessionStorePort } from '../ports/session-store-port.js';
import type { AuditLogRepo } from '../repositories/audit-log-repo.js';
import type { UserRepo } from '../repositories/user-repo.js';

export interface SignInWithGoogleDeps {
  readonly idp: IdentityProviderPort;
  readonly users: UserRepo;
  readonly sessions: SessionStorePort;
  readonly audit: AuditLogRepo;
  readonly newId: () => string;
  readonly now: () => Date;
}

export interface CompleteSignInInput {
  readonly code: string;
  readonly state: string;
  readonly expectedState: string;
  readonly expectedNonce: string;
  readonly codeVerifier: string;
  readonly ip: string | null;
  readonly userAgent: string | null;
}

export interface CompleteSignInResult {
  readonly user: User;
  readonly sessionId: string;
}

/**
 * Spec: user-management / "Google SSO is the sole credential",
 *                       / "User record keyed by Google subject",
 *                       / "Session cookie issuance and protection".
 */
export class SignInWithGoogle {
  constructor(private readonly deps: SignInWithGoogleDeps) {}

  async beginAuthorization() {
    return this.deps.idp.beginAuthorization();
  }

  async complete(input: CompleteSignInInput): Promise<CompleteSignInResult> {
    let claims: GoogleClaims;
    try {
      claims = await this.deps.idp.completeAuthorization({
        code: input.code,
        state: input.state,
        expectedState: input.expectedState,
        expectedNonce: input.expectedNonce,
        codeVerifier: input.codeVerifier,
      });
    } catch (cause) {
      await this.deps.audit.append({
        id: this.deps.newId(),
        kind: 'sign_in_failure',
        userId: null,
        aggregateType: null,
        aggregateId: null,
        revisionNo: null,
        ip: input.ip,
        userAgent: input.userAgent,
        reason: cause instanceof Error ? cause.message : 'unknown',
        at: this.deps.now(),
      });
      throw new ApplicationError(
        'sign_in_failure',
        'Google ID token validation failed',
        { cause: cause instanceof Error ? cause.message : String(cause) },
      );
    }

    if (!claims.emailVerified) {
      throw new ApplicationError('sign_in_failure', 'Google account email is not verified');
    }

    const existing = await this.deps.users.findByGoogleSub(claims.sub);
    const now = this.deps.now();
    const user = existing
      ? existing.recordSignIn({
          email: claims.email,
          displayName: claims.name,
          pictureUrl: claims.picture,
          now,
        })
      : User.create({
          id: this.deps.newId(),
          googleSub: claims.sub,
          email: claims.email,
          displayName: claims.name,
          pictureUrl: claims.picture,
          now,
        });
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
