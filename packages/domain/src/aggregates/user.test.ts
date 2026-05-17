import { describe, expect, it } from 'vitest';
import { InvariantViolation } from '../errors.js';
import { User } from './user.js';

const NOW = new Date('2025-01-01T00:00:00Z');

describe('User.createWithPassword', () => {
  it('creates a user with a compliant password', () => {
    const user = User.createWithPassword({
      id: 'u1',
      email: 'alice@example.com',
      plainPassword: 'Secret!1',
      passwordHash: 'hashed',
      now: NOW,
    });
    expect(user.id).toBe('u1');
    expect(user.email).toBe('alice@example.com');
    expect(user.displayName).toBe('alice');
    expect(user.passwordHash).toBe('hashed');
    expect(user.googleSub).toBeNull();
  });

  it('rejects a password shorter than 8 characters', () => {
    expect(() =>
      User.createWithPassword({ id: 'u1', email: 'a@b.com', plainPassword: 'Ab!1234', passwordHash: 'h', now: NOW }),
    ).toThrow(InvariantViolation);
  });

  it('rejects a password with no uppercase letter', () => {
    expect(() =>
      User.createWithPassword({ id: 'u1', email: 'a@b.com', plainPassword: 'secret!1', passwordHash: 'h', now: NOW }),
    ).toThrow(InvariantViolation);
  });

  it('rejects a password with no symbol', () => {
    expect(() =>
      User.createWithPassword({ id: 'u1', email: 'a@b.com', plainPassword: 'SecretAA', passwordHash: 'h', now: NOW }),
    ).toThrow(InvariantViolation);
  });

  it('derives display name from email local-part', () => {
    const user = User.createWithPassword({
      id: 'u1',
      email: 'john.doe@example.com',
      plainPassword: 'Secret!1',
      passwordHash: 'h',
      now: NOW,
    });
    expect(user.displayName).toBe('john.doe');
  });
});

describe('User.create (Google path)', () => {
  it('sets googleSub and null passwordHash', () => {
    const user = User.create({
      id: 'u1',
      googleSub: 'google-sub-123',
      email: 'alice@example.com',
      displayName: 'Alice',
      now: NOW,
    });
    expect(user.googleSub).toBe('google-sub-123');
    expect(user.passwordHash).toBeNull();
  });
});
