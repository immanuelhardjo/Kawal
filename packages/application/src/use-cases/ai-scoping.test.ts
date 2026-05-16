import { BahasaText, Case } from '@kawal/domain';
import { describe, expect, it, vi } from 'vitest';
import { NotFound } from '../errors.js';
import type {
  ClusterLabelPort,
  ConversationPort,
  GlossaryPort,
  ScenarioPort,
  VerificationPort,
} from '../ports/ai-ports.js';
import type { BriefingPort } from '../ports/ai-ports.js';
import type { CaseRepo } from '../repositories/case-repo.js';
import { AskQuestion } from './ask-question.js';
import { ExplainTerm } from './explain-term.js';
import { GenerateBriefing } from './generate-briefing.js';
import { GenerateScenarios } from './generate-scenarios.js';
import { LabelClusters } from './label-clusters.js';
import { VerifyClaim } from './verify-claim.js';

/**
 * Spec: ai-assistance / "(User, dossier)-scoped retrieval for every AI call",
 *       user-management / "Per-user isolation across the entire dossier".
 *
 * Every AI use case MUST refuse a (user, case) call where the case is not
 * owned by that user. The use case calls `CaseRepo.findByIdForOwner(...)`
 * which returns null on owner mismatch; the use case then throws NotFound
 * and the port is never invoked.
 *
 * The HTTP layer's Zod schemas guarantee that a `case_id` is always present,
 * so an unscoped call never reaches the use case. This test focuses on the
 * cross-user case — the path where a valid id is passed but it belongs to
 * a different user.
 */

const NOW = new Date('2025-01-01T00:00:00Z');
const userA = 'user_a';
const userB = 'user_b';

function caseOwnedBy(userId: string, status: Case['status'] = 'open'): Case {
  const base = Case.create({
    id: `case_${userId}`,
    ownerUserId: userId,
    name: 'Test',
    jurisdiction: 'Jakarta',
    caseType: 'tipikor',
    summary: BahasaText.of(''),
    now: NOW,
  });
  if (status === 'open') return base;
  return base.advance('trial').advance(status === 'trial' ? 'trial' : 'verdict');
}

function makeCaseRepo(): CaseRepo {
  return {
    findByIdForOwner: vi.fn(async (caseId: string, ownerUserId: string) => {
      // userA owns case_user_a; userB owns case_user_b.
      if (caseId === `case_${ownerUserId}`) return caseOwnedBy(ownerUserId);
      return null;
    }),
    listForOwner: vi.fn(async () => []),
    findByAliasForOwner: vi.fn(async () => null),
    save: vi.fn(async () => undefined),
    tombstone: vi.fn(async () => undefined),
    listRevisionsForOwner: vi.fn(async () => []),
  };
}

describe('AI use cases — cross-user / unscoped rejection (12.4)', () => {
  it('VerifyClaim refuses when case is not owned by the requesting user', async () => {
    const verifier: VerificationPort = { verify: vi.fn(async () => ({ certainty: 'reported', supportingSourceIds: [], contradictingClaimIds: [], rationaleBahasa: '' })) };
    const useCase = new VerifyClaim({ cases: makeCaseRepo(), verifier });
    await expect(
      useCase.execute({ userId: userA, caseId: `case_${userB}`, text: 'x' }),
    ).rejects.toBeInstanceOf(NotFound);
    expect(verifier.verify).not.toHaveBeenCalled();
  });

  it('AskQuestion refuses when case is not owned by the requesting user', async () => {
    const conversation: ConversationPort = { ask: vi.fn(async () => ({ textBahasa: '', citedClaimIds: [], citedEventIds: [], citedSourceIds: [] })) };
    const useCase = new AskQuestion({ cases: makeCaseRepo(), conversation });
    await expect(
      useCase.execute({ userId: userA, caseId: `case_${userB}`, question: 'x' }),
    ).rejects.toBeInstanceOf(NotFound);
    expect(conversation.ask).not.toHaveBeenCalled();
  });

  it('GenerateBriefing refuses when case is not owned by the requesting user', async () => {
    const briefer: BriefingPort = {
      generate: vi.fn(async () => ({
        kind: 'text_fallback' as const,
        textBahasa: '',
        audioUrl: null,
        durationSeconds: null,
      })),
    };
    const useCase = new GenerateBriefing({ cases: makeCaseRepo(), briefer });
    await expect(
      useCase.execute({ userId: userA, caseId: `case_${userB}` }),
    ).rejects.toBeInstanceOf(NotFound);
    expect(briefer.generate).not.toHaveBeenCalled();
  });

  it('GenerateScenarios refuses when case is not owned by the requesting user', async () => {
    const scenarios: ScenarioPort = { generate: vi.fn(async () => []) };
    const useCase = new GenerateScenarios({ cases: makeCaseRepo(), scenarios });
    await expect(
      useCase.execute({ userId: userA, caseId: `case_${userB}` }),
    ).rejects.toBeInstanceOf(NotFound);
    expect(scenarios.generate).not.toHaveBeenCalled();
  });

  it('LabelClusters refuses when case is not owned by the requesting user', async () => {
    const clusterLabeler: ClusterLabelPort = { label: vi.fn(async () => []) };
    const useCase = new LabelClusters({ cases: makeCaseRepo(), clusterLabeler });
    await expect(
      useCase.execute({ userId: userA, caseId: `case_${userB}`, clusters: [] }),
    ).rejects.toBeInstanceOf(NotFound);
    expect(clusterLabeler.label).not.toHaveBeenCalled();
  });

  it('ExplainTerm refuses when case is provided but not owned by the requesting user', async () => {
    const glossary: GlossaryPort = {
      explain: vi.fn(async () => ({
        term: 'inkracht',
        explainerBahasa: '',
        statuteCitations: [],
        caseExampleEventId: null,
      })),
    };
    const useCase = new ExplainTerm({ cases: makeCaseRepo(), glossary });
    await expect(
      useCase.execute({ term: 'inkracht', userId: userA, caseId: `case_${userB}` }),
    ).rejects.toBeInstanceOf(NotFound);
    expect(glossary.explain).not.toHaveBeenCalled();
  });

  it('ExplainTerm without a (user, case) scope returns a corpus-only explainer', async () => {
    const glossary: GlossaryPort = {
      explain: vi.fn(async () => ({
        term: 'inkracht',
        explainerBahasa: 'Putusan yang sudah berkekuatan hukum tetap.',
        statuteCitations: ['UU No. 48 Tahun 2009'],
        caseExampleEventId: null,
      })),
    };
    const useCase = new ExplainTerm({ cases: makeCaseRepo(), glossary });
    const out = await useCase.execute({ term: 'inkracht' });
    expect(out.term).toBe('inkracht');
    expect(glossary.explain).toHaveBeenCalledWith({ term: 'inkracht', scope: null });
  });
});
