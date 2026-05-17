import { User } from '@kawal/domain';
import { describe, expect, it, vi } from 'vitest';
import type { PasswordHashPort } from '../ports/password-hash-port.js';
import type { SessionStorePort } from '../ports/session-store-port.js';
import type { AuditLogRepo } from '../repositories/audit-log-repo.js';
import type { UserRepo } from '../repositories/user-repo.js';
import { SignInWithPassword } from './sign-in-with-password.js';

const NOW = new Date('2025-01-01T00:00:00Z');
let idSeq = 0;

function userWithPassword(passwordHash: string | null = 'stored_hash') {
  return User.restore({
    id: 'u1',
    googleSub: null,
    email: 'alice@example.com',
    displayName: 'alice',
    pictureUrl: null,
    passwordHash,
    createdAt: NOW,
    lastSignedInAt: NOW,
  });
}

function makeDeps(overrides: Partial<{
  findByEmail: UserRepo['findByEmail'];
  verify: PasswordHashPort['verify'];
}> = {}) {
  const users: UserRepo = {
    findByEmail: overrides.findByEmail ?? vi.fn().mockResolvedValue(null),
    findByGoogleSub: vi.fn().mockResolvedValue(null),
    findById: vi.fn().mockResolvedValue(null),
    save: vi.fn().mockResolvedValue(undefined),
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
  const passwordHash: PasswordHashPort = {
    hash: vi.fn().mockResolvedValue('hashed'),
    verify: overrides.verify ?? vi.fn().mockResolvedValue(true),
  };
  return new SignInWithPassword({ users, sessions, audit, passwordHash, newId: () => `id_${++idSeq}`, now: () => NOW });
}

describe('SignInWithPassword', () => {
  it('returns a session on valid credentials', async () => {
    const uc = makeDeps({ findByEmail: vi.fn().mockResolvedValue(userWithPassword()) });
    const result = await uc.execute({ email: 'alice@example.com', password: 'Secret!1', ip: null, userAgent: null });
    expect(result.sessionId).toBe('sess_1');
  });

  it('throws invalid_credentials for unknown email', async () => {
    const uc = makeDeps({ findByEmail: vi.fn().mockResolvedValue(null) });
    await expect(uc.execute({ email: 'unknown@example.com', password: 'Secret!1', ip: null, userAgent: null }))
      .rejects.toMatchObject({ code: 'invalid_credentials' });
  });

  it('throws invalid_credentials for wrong password', async () => {
    const uc = makeDeps({
      findByEmail: vi.fn().mockResolvedValue(userWithPassword()),
      verify: vi.fn().mockResolvedValue(false),
    });
    await expect(uc.execute({ email: 'alice@example.com', password: 'Wrong!1', ip: null, userAgent: null }))
      .rejects.toMatchObject({ code: 'invalid_credentials' });
  });

  it('throws invalid_credentials when user has no password_hash', async () => {
    const uc = makeDeps({ findByEmail: vi.fn().mockResolvedValue(userWithPassword(null)) });
    await expect(uc.execute({ email: 'alice@example.com', password: 'Secret!1', ip: null, userAgent: null }))
      .rejects.toMatchObject({ code: 'invalid_credentials' });
  });
});
