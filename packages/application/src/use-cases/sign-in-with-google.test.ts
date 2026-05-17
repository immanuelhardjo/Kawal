import { User } from '@kawal/domain';
import { describe, expect, it, vi } from 'vitest';
import type { GoogleClaims, IdentityProviderPort } from '../ports/identity-provider-port.js';
import type { SessionStorePort } from '../ports/session-store-port.js';
import type { AuditLogRepo } from '../repositories/audit-log-repo.js';
import type { UserRepo } from '../repositories/user-repo.js';
import { SignInWithGoogle } from './sign-in-with-google.js';

const NOW = new Date('2025-01-01T00:00:00Z');
let idSeq = 0;

const fakeClaims: GoogleClaims = {
  sub: 'google-sub-abc',
  email: 'alice@example.com',
  name: 'Alice',
  picture: null,
  emailVerified: true,
};

function makeDeps(overrides: Partial<{
  findByGoogleSub: UserRepo['findByGoogleSub'];
  findByEmail: UserRepo['findByEmail'];
  save: UserRepo['save'];
}> = {}) {
  const idp: IdentityProviderPort = {
    beginAuthorization: vi.fn(),
    completeAuthorization: vi.fn().mockResolvedValue(fakeClaims),
  };
  const users: UserRepo = {
    findByGoogleSub: overrides.findByGoogleSub ?? vi.fn().mockResolvedValue(null),
    findByEmail: overrides.findByEmail ?? vi.fn().mockResolvedValue(null),
    findById: vi.fn().mockResolvedValue(null),
    save: overrides.save ?? vi.fn().mockResolvedValue(undefined),
    deleteCascade: vi.fn().mockResolvedValue(undefined),
  };
  const sessions: SessionStorePort = {
    create: vi.fn().mockResolvedValue({ sessionId: 'sess_1' }),
    hydrate: vi.fn().mockResolvedValue(null),
    invalidate: vi.fn().mockResolvedValue(undefined),
    invalidateAllForUser: vi.fn().mockResolvedValue(undefined),
  };
  const audit: AuditLogRepo = {
    append: vi.fn().mockResolvedValue(undefined),
    deleteByUserId: vi.fn().mockResolvedValue(undefined),
  };
  return { uc: new SignInWithGoogle({ idp, users, sessions, audit, newId: () => `id_${++idSeq}`, now: () => NOW }), users };
}

const completeInput = {
  code: 'code',
  state: 'state',
  expectedState: 'state',
  expectedNonce: 'nonce',
  codeVerifier: 'verifier',
  ip: null,
  userAgent: null,
};

describe('SignInWithGoogle silent linking', () => {
  it('patches google_sub onto an existing password-auth user with the same email', async () => {
    const existingUser = User.restore({
      id: 'u_existing',
      googleSub: null,
      email: 'alice@example.com',
      displayName: 'alice',
      pictureUrl: null,
      passwordHash: 'some_hash',
      createdAt: NOW,
      lastSignedInAt: NOW,
    });
    const saveSpy = vi.fn().mockResolvedValue(undefined);
    const { uc } = makeDeps({
      findByGoogleSub: vi.fn().mockResolvedValue(null),
      findByEmail: vi.fn().mockResolvedValue(existingUser),
      save: saveSpy,
    });
    const result = await uc.complete(completeInput);
    expect(result.user.googleSub).toBe('google-sub-abc');
    expect(result.user.id).toBe('u_existing');
    expect(saveSpy).toHaveBeenCalledWith(expect.objectContaining({ googleSub: 'google-sub-abc' }));
  });

  it('proceeds normally for a user already linked via google_sub', async () => {
    const linkedUser = User.restore({
      id: 'u_linked',
      googleSub: 'google-sub-abc',
      email: 'alice@example.com',
      displayName: 'Alice',
      pictureUrl: null,
      passwordHash: null,
      createdAt: NOW,
      lastSignedInAt: new Date('2024-12-01'),
    });
    const { uc, users } = makeDeps({
      findByGoogleSub: vi.fn().mockResolvedValue(linkedUser),
    });
    const result = await uc.complete(completeInput);
    expect(result.user.id).toBe('u_linked');
    expect(users.findByEmail).not.toHaveBeenCalled();
  });
});
