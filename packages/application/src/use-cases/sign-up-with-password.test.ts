import { describe, expect, it, vi } from 'vitest';
import { ApplicationError } from '../errors.js';
import type { PasswordHashPort } from '../ports/password-hash-port.js';
import type { SessionStorePort } from '../ports/session-store-port.js';
import type { AuditLogRepo } from '../repositories/audit-log-repo.js';
import type { UserRepo } from '../repositories/user-repo.js';
import { SignUpWithPassword } from './sign-up-with-password.js';

const NOW = new Date('2025-01-01T00:00:00Z');
let idSeq = 0;

function makeDeps(overrides: Partial<{
  findByEmail: UserRepo['findByEmail'];
  save: UserRepo['save'];
  hash: PasswordHashPort['hash'];
}> = {}) {
  const users: UserRepo = {
    findByEmail: overrides.findByEmail ?? vi.fn().mockResolvedValue(null),
    findByGoogleSub: vi.fn().mockResolvedValue(null),
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
  const passwordHash: PasswordHashPort = {
    hash: overrides.hash ?? vi.fn().mockResolvedValue('hashed_value'),
    verify: vi.fn().mockResolvedValue(true),
  };
  return new SignUpWithPassword({
    users,
    sessions,
    audit,
    passwordHash,
    newId: () => `id_${++idSeq}`,
    now: () => NOW,
  });
}

describe('SignUpWithPassword', () => {
  it('creates a user and session on valid input', async () => {
    const uc = makeDeps();
    const result = await uc.execute({ email: 'alice@example.com', password: 'Secret!1', ip: null, userAgent: null });
    expect(result.sessionId).toBe('sess_1');
    expect(result.user.email).toBe('alice@example.com');
  });

  it('throws email_already_registered when email is taken', async () => {
    const { User } = await import('@kawal/domain');
    const existing = User.restore({
      id: 'u_existing',
      googleSub: 'sub',
      email: 'alice@example.com',
      displayName: 'Alice',
      pictureUrl: null,
      passwordHash: null,
      createdAt: NOW,
      lastSignedInAt: NOW,
    });
    const uc = makeDeps({ findByEmail: vi.fn().mockResolvedValue(existing) });
    await expect(uc.execute({ email: 'alice@example.com', password: 'Secret!1', ip: null, userAgent: null }))
      .rejects.toMatchObject({ code: 'email_already_registered' });
  });

  it('throws password_policy_violation for a weak password', async () => {
    const uc = makeDeps();
    await expect(uc.execute({ email: 'alice@example.com', password: 'weak', ip: null, userAgent: null }))
      .rejects.toMatchObject({ code: 'password_policy_violation' });
  });
});
