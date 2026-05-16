import { describe, expect, it } from 'vitest';
import { CrossUserReference, InvariantViolation } from '../errors.js';
import { Excerpt } from '../value-objects/excerpt.js';
import { Source } from './source.js';

const NOW = new Date('2025-01-01T00:00:00Z');
const baseProps = {
  id: 'src_1',
  ownerUserId: 'user_1',
  url: 'https://www.kejaksaan.go.id/release/1',
  publisher: 'kejaksaan.go.id',
  tier: 'tier_1' as const,
  fetchedAt: NOW,
  excerpt: Excerpt.of('Jaksa menetapkan tersangka pada tanggal...'),
  archiveUrl: 'https://web.archive.org/web/2025/https://www.kejaksaan.go.id/release/1',
  bodyHash: 'sha256:abc',
};

describe('Source', () => {
  it('creates with all fields valid', () => {
    const s = Source.create(baseProps);
    expect(s.isCitationEligible()).toBe(true);
  });

  it('tier_3 is not citation-eligible', () => {
    const s = Source.create({ ...baseProps, tier: 'tier_3' });
    expect(s.isCitationEligible()).toBe(false);
  });

  it('rejects non-http URL', () => {
    expect(() => Source.create({ ...baseProps, url: 'file:///etc/passwd' })).toThrow(InvariantViolation);
  });

  it('rejects missing publisher', () => {
    expect(() => Source.create({ ...baseProps, publisher: '' })).toThrow(InvariantViolation);
  });

  it('rejects missing bodyHash', () => {
    expect(() => Source.create({ ...baseProps, bodyHash: '' })).toThrow(InvariantViolation);
  });

  it('assertOwnedBy throws CrossUserReference on mismatch', () => {
    const s = Source.create(baseProps);
    expect(() => s.assertOwnedBy('user_2')).toThrow(CrossUserReference);
    expect(() => s.assertOwnedBy('user_1')).not.toThrow();
  });
});
