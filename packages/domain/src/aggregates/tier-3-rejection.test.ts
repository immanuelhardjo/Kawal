import { describe, expect, it } from 'vitest';
import { BahasaText } from '../value-objects/bahasa-text.js';
import { Excerpt } from '../value-objects/excerpt.js';
import { RightOfReply } from '../value-objects/right-of-reply.js';
import { InvariantViolation } from '../errors.js';
import { assertAnchoringSources } from './anchoring.js';
import { Claim } from './claim.js';
import { Entity } from './entity.js';
import { Event } from './event.js';
import { Relationship } from './relationship.js';
import { Source } from './source.js';

/**
 * Spec: evidence-ledger / "Tier-3 sources never anchor a fact",
 *       osint-ingestion / "Tier-3 signals never anchor a fact".
 *
 * Three guarantees verified at the domain boundary:
 *   1. Claim refuses tier-3-only sources.
 *   2. Event refuses tier-3-only sources.
 *   3. Relationship refuses tier-3-only sources.
 *
 * Mixed tier_1/tier_3 is accepted because at least one anchoring source is
 * citation-eligible — that matches the spec's "tier-3 cannot be the ONLY
 * or primary anchoring source" wording.
 */

const NOW = new Date('2025-01-01T00:00:00Z');
const userA = 'user_a';

function makeSource(tier: 'tier_1' | 'tier_2' | 'tier_3', id = 'src_1'): Source {
  return Source.create({
    id,
    ownerUserId: userA,
    url: `https://example.go.id/${id}`,
    publisher: 'example.go.id',
    tier,
    fetchedAt: NOW,
    excerpt: Excerpt.of('contoh kutipan'),
    archiveUrl: null,
    bodyHash: 'sha256:abc',
  });
}

function makeEntity(id: string): Entity {
  return Entity.create({
    id,
    ownerUserId: userA,
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

describe('Tier-3 anchor rejection (12.5)', () => {
  it('assertAnchoringSources rejects an array of only tier-3 sources', () => {
    expect(() =>
      assertAnchoringSources({
        ownerUserId: userA,
        sources: [makeSource('tier_3', 's1'), makeSource('tier_3', 's2')],
      }),
    ).toThrow(InvariantViolation);
  });

  it('assertAnchoringSources accepts mixed citation-eligible + tier_3', () => {
    expect(() =>
      assertAnchoringSources({
        ownerUserId: userA,
        sources: [makeSource('tier_1', 's1'), makeSource('tier_3', 's2')],
      }),
    ).not.toThrow();
  });

  it('Claim rejects tier-3-only anchoring', () => {
    expect(() =>
      Claim.create({
        id: 'claim_1',
        ownerUserId: userA,
        caseId: 'case_1',
        text: 'X attended the hearing on 2024-03-01',
        certainty: 'reported',
        sources: [makeSource('tier_3', 'src_tier3')],
      }),
    ).toThrow(InvariantViolation);
  });

  it('Event rejects tier-3-only anchoring', () => {
    expect(() =>
      Event.create({
        id: 'evt_1',
        ownerUserId: userA,
        caseId: 'case_1',
        type: 'hearing',
        date: new Date('2024-06-01'),
        title: 'Hearing',
        summary: BahasaText.of('Sidang'),
        certainty: 'reported',
        sources: [makeSource('tier_3', 'src_tier3')],
        entities: [],
      }),
    ).toThrow(InvariantViolation);
  });

  it('Relationship rejects tier-3-only anchoring', () => {
    const a = makeEntity('e_a');
    const b = makeEntity('e_b');
    expect(() =>
      Relationship.create({
        id: 'rel_1',
        ownerUserId: userA,
        fromEntity: a,
        toEntity: b,
        type: 'employed_by',
        certainty: 'reported',
        sources: [makeSource('tier_3', 'src_tier3')],
        activeFrom: NOW,
      }),
    ).toThrow(InvariantViolation);
  });
});
