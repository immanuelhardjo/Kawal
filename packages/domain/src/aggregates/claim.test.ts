import { describe, expect, it } from 'vitest';
import { CrossUserReference, InvariantViolation } from '../errors.js';
import { Excerpt } from '../value-objects/excerpt.js';
import { Claim } from './claim.js';
import { Source } from './source.js';

const NOW = new Date('2025-01-01T00:00:00Z');
const userA = 'user_a';
const userB = 'user_b';

function sourceFor(userId: string, tier: 'tier_1' | 'tier_2' | 'tier_3', id = 'src_1') {
  return Source.create({
    id,
    ownerUserId: userId,
    url: `https://example.go.id/${id}`,
    publisher: 'example.go.id',
    tier,
    fetchedAt: NOW,
    excerpt: Excerpt.of('Some passage from the source'),
    archiveUrl: null,
    bodyHash: 'sha256:abc',
  });
}

const baseInput = {
  id: 'claim_1',
  ownerUserId: userA,
  caseId: 'case_1',
  text: 'X attended the hearing on 2024-03-01',
  certainty: 'established' as const,
};

describe('Claim', () => {
  it('creates with at least one citation-eligible source', () => {
    const c = Claim.create({ ...baseInput, sources: [sourceFor(userA, 'tier_1')] });
    expect(c.sourceIds).toEqual(['src_1']);
    expect(c.certainty).toBe('established');
  });

  it('rejects creation with no sources', () => {
    expect(() => Claim.create({ ...baseInput, sources: [] })).toThrow(InvariantViolation);
  });

  it('rejects creation with tier-3 only sources', () => {
    expect(() => Claim.create({ ...baseInput, sources: [sourceFor(userA, 'tier_3')] })).toThrow(
      InvariantViolation,
    );
  });

  it('accepts mixed tier_2 and tier_3 if at least one is citation-eligible', () => {
    const c = Claim.create({
      ...baseInput,
      sources: [sourceFor(userA, 'tier_2', 's1'), sourceFor(userA, 'tier_3', 's2')],
    });
    expect(c.sourceIds).toEqual(['s1', 's2']);
  });

  it('rejects sources owned by another user', () => {
    expect(() =>
      Claim.create({ ...baseInput, sources: [sourceFor(userB, 'tier_1')] }),
    ).toThrow(CrossUserReference);
  });

  it('rejects unknown certainty label', () => {
    expect(() =>
      Claim.create({
        ...baseInput,
        certainty: 'super_established' as never,
        sources: [sourceFor(userA, 'tier_1')],
      }),
    ).toThrow(InvariantViolation);
  });

  it('rejects empty text', () => {
    expect(() =>
      Claim.create({ ...baseInput, text: '   ', sources: [sourceFor(userA, 'tier_1')] }),
    ).toThrow(InvariantViolation);
  });
});
