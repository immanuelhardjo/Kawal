import { describe, expect, it } from 'vitest';
import { BahasaText } from '../value-objects/bahasa-text.js';
import { IllegalTransition, InvariantViolation } from '../errors.js';
import { Case } from './case.js';

const NOW = new Date('2025-01-01T00:00:00Z');
const baseInput = {
  id: 'case_1',
  ownerUserId: 'user_1',
  name: 'Kasus Korupsi PT X',
  jurisdiction: 'Jakarta Pusat',
  caseType: 'tipikor',
  now: NOW,
};

describe('Case', () => {
  it('creates with required fields and defaults to status=open', () => {
    const c = Case.create(baseInput);
    expect(c.status).toBe('open');
    expect(c.aliases).toEqual([]);
    expect(c.closedAt).toBeNull();
    expect(c.ownerUserId).toBe('user_1');
  });

  it('rejects creation without name', () => {
    expect(() => Case.create({ ...baseInput, name: '' })).toThrow(InvariantViolation);
  });

  it('rejects creation without jurisdiction', () => {
    expect(() => Case.create({ ...baseInput, jurisdiction: '' })).toThrow(InvariantViolation);
  });

  it('rejects creation without ownerUserId', () => {
    expect(() => Case.create({ ...baseInput, ownerUserId: '' })).toThrow(InvariantViolation);
  });

  it('advances along documented lifecycle order', () => {
    const c = Case.create(baseInput).advance('trial').advance('verdict');
    expect(c.status).toBe('verdict');
  });

  it('rejects out-of-order advance', () => {
    expect(() => Case.create(baseInput).advance('inkracht')).toThrow(IllegalTransition);
  });

  it('allows override with reason', () => {
    const c = Case.create(baseInput).overrideTransition('closed', 'administrative dismissal');
    expect(c.status).toBe('closed');
  });

  it('rejects override without reason', () => {
    expect(() => Case.create(baseInput).overrideTransition('closed', '')).toThrow(IllegalTransition);
  });

  it('rename preserves owner and id', () => {
    const c = Case.create(baseInput).rename('Kasus Korupsi PT Y');
    expect(c.name).toBe('Kasus Korupsi PT Y');
    expect(c.id).toBe('case_1');
    expect(c.ownerUserId).toBe('user_1');
  });

  it('rejects empty rename', () => {
    expect(() => Case.create(baseInput).rename('')).toThrow(InvariantViolation);
  });

  it('summary defaults to empty BahasaText', () => {
    const c = Case.create(baseInput);
    expect(c.summary).toBeInstanceOf(BahasaText);
    expect(c.summary.isEmpty()).toBe(true);
  });
});
