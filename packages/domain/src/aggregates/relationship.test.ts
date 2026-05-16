import { describe, expect, it } from 'vitest';
import { CrossUserReference, InvariantViolation } from '../errors.js';
import { BahasaText } from '../value-objects/bahasa-text.js';
import { Excerpt } from '../value-objects/excerpt.js';
import { RightOfReply } from '../value-objects/right-of-reply.js';
import { Entity } from './entity.js';
import { Relationship } from './relationship.js';
import { Source } from './source.js';

const userA = 'user_a';
const userB = 'user_b';
const NOW = new Date('2024-01-01T00:00:00Z');

function makeEntity(userId: string, id: string): Entity {
  return Entity.create({
    id,
    ownerUserId: userId,
    type: 'person',
    canonicalName: id,
    profile: {
      type: 'person',
      currentPositions: [],
      priorPositions: [],
      lhkpnUrl: null,
      photoUrl: null,
      rightOfReply: RightOfReply.empty(),
    },
  });
}

function makeSource(userId: string, id = 'src_1'): Source {
  return Source.create({
    id,
    ownerUserId: userId,
    url: `https://example.go.id/${id}`,
    publisher: 'example.go.id',
    tier: 'tier_1',
    fetchedAt: NOW,
    excerpt: Excerpt.of('Excerpt'),
    archiveUrl: null,
    bodyHash: 'sha256:abc',
  });
}

describe('Relationship', () => {
  const a = makeEntity(userA, 'e_a');
  const b = makeEntity(userA, 'e_b');

  it('creates with valid inputs', () => {
    const r = Relationship.create({
      id: 'rel_1',
      ownerUserId: userA,
      fromEntity: a,
      toEntity: b,
      type: 'employed_by',
      certainty: 'reported',
      sources: [makeSource(userA)],
      activeFrom: new Date('2023-01-01'),
      activeTo: new Date('2024-01-01'),
      description: BahasaText.of('Hubungan kerja'),
    });
    expect(r.fromEntityId).toBe('e_a');
    expect(r.toEntityId).toBe('e_b');
  });

  it('rejects self-relationship', () => {
    expect(() =>
      Relationship.create({
        id: 'rel_1',
        ownerUserId: userA,
        fromEntity: a,
        toEntity: a,
        type: 'employed_by',
        certainty: 'reported',
        sources: [makeSource(userA)],
        activeFrom: NOW,
      }),
    ).toThrow(InvariantViolation);
  });

  it('rejects cross-user entity references', () => {
    const foreign = makeEntity(userB, 'e_foreign');
    expect(() =>
      Relationship.create({
        id: 'rel_1',
        ownerUserId: userA,
        fromEntity: a,
        toEntity: foreign,
        type: 'employed_by',
        certainty: 'reported',
        sources: [makeSource(userA)],
        activeFrom: NOW,
      }),
    ).toThrow(CrossUserReference);
  });

  it('rejects activeTo before activeFrom', () => {
    expect(() =>
      Relationship.create({
        id: 'rel_1',
        ownerUserId: userA,
        fromEntity: a,
        toEntity: b,
        type: 'employed_by',
        certainty: 'reported',
        sources: [makeSource(userA)],
        activeFrom: new Date('2024-01-01'),
        activeTo: new Date('2023-01-01'),
      }),
    ).toThrow(InvariantViolation);
  });

  it('isActiveOn respects both bounds', () => {
    const r = Relationship.create({
      id: 'rel_1',
      ownerUserId: userA,
      fromEntity: a,
      toEntity: b,
      type: 'employed_by',
      certainty: 'reported',
      sources: [makeSource(userA)],
      activeFrom: new Date('2023-01-01'),
      activeTo: new Date('2023-12-31'),
    });
    expect(r.isActiveOn(new Date('2023-06-01'))).toBe(true);
    expect(r.isActiveOn(new Date('2022-12-31'))).toBe(false);
    expect(r.isActiveOn(new Date('2024-06-01'))).toBe(false);
  });

  it('open-ended relationship stays active after activeFrom', () => {
    const r = Relationship.create({
      id: 'rel_1',
      ownerUserId: userA,
      fromEntity: a,
      toEntity: b,
      type: 'owned_by',
      certainty: 'established',
      sources: [makeSource(userA)],
      activeFrom: new Date('2020-01-01'),
      activeTo: null,
    });
    expect(r.isActiveOn(new Date('2099-01-01'))).toBe(true);
  });
});
