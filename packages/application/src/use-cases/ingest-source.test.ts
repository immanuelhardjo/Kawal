import { BahasaText, Case } from '@kawal/domain';
import { describe, expect, it, vi } from 'vitest';
import { IngestTimeout, NotFound } from '../errors.js';
import type {
  ExtractedRecord,
  ExtractionPort,
} from '../ports/ai-ports.js';
import type {
  ArchivePort,
  FetchOutcome,
  RateLimiterPort,
  SourceFetcherPort,
} from '../ports/ingest-ports.js';
import type { CaseRepo } from '../repositories/case-repo.js';
import type {
  ClaimRepo,
  EntityRepo,
  EventRepo,
  RelationshipRepo,
  SourceRepo,
} from '../repositories/dossier-repos.js';
import type {
  IngestActivityRecord,
  IngestActivityRepo,
} from '../repositories/ingest-activity-repo.js';
import { IngestSource, type IngestPhaseEvent } from './ingest-source.js';

/**
 * Spec: osint-ingestion / "Progress streaming during request-time ingest",
 *                       / "Hard request ceiling for ingest",
 *                       / "Ingestion is request-time and per-user",
 *                       / "Dossier write-back is sourced and owner-stamped".
 *
 * Application-layer test that exercises the IngestSource use case with
 * stub adapters (no Postgres). The test asserts the spec's three
 * load-bearing scenarios:
 *   1. SSE phase ordering on the happy path
 *   2. Ownership rejection when the case is not owned by the requester
 *   3. Timeout rollback — no rows are saved when the fetch aborts
 */

const NOW = new Date('2025-01-01T00:00:00Z');

function caseOwnedBy(userId: string): Case {
  return Case.create({
    id: `case_${userId}`,
    ownerUserId: userId,
    name: 'Test',
    jurisdiction: 'Jakarta',
    caseType: 'tipikor',
    summary: BahasaText.of(''),
    now: NOW,
  });
}

function makeStubs(overrides: {
  ownedCase?: Case | null;
  fetcher?: SourceFetcherPort;
  extraction?: ExtractionPort;
  archive?: ArchivePort;
  rateLimiter?: RateLimiterPort;
} = {}) {
  const ownedCase = overrides.ownedCase ?? caseOwnedBy('user_a');
  const cases: CaseRepo = {
    findByIdForOwner: vi.fn(async (caseId: string, ownerUserId: string) => {
      if (!ownedCase) return null;
      if (ownedCase.id === caseId && ownedCase.ownerUserId === ownerUserId) return ownedCase;
      return null;
    }),
    listForOwner: vi.fn(async () => []),
    findByAliasForOwner: vi.fn(async () => null),
    save: vi.fn(async () => undefined),
    tombstone: vi.fn(async () => undefined),
    listRevisionsForOwner: vi.fn(async () => []),
  };
  const sources: SourceRepo = {
    findByIdForOwner: vi.fn(async () => null),
    findByUrlForOwner: vi.fn(async () => null),
    save: vi.fn(async () => undefined),
    tombstone: vi.fn(async () => undefined),
    listRevisionsForOwner: vi.fn(async () => []),
  };
  const entities: EntityRepo = {
    findByIdForOwner: vi.fn(async () => null),
    listForOwner: vi.fn(async () => []),
    save: vi.fn(async () => undefined),
    tombstone: vi.fn(async () => undefined),
    listRevisionsForOwner: vi.fn(async () => []),
  };
  const claims: ClaimRepo = {
    findByIdForOwner: vi.fn(async () => null),
    save: vi.fn(async () => undefined),
    tombstone: vi.fn(async () => undefined),
    listRevisionsForOwner: vi.fn(async () => []),
  };
  const events: EventRepo = {
    findByIdForOwner: vi.fn(async () => null),
    listForCase: vi.fn(async () => []),
    save: vi.fn(async () => undefined),
    tombstone: vi.fn(async () => undefined),
    listRevisionsForOwner: vi.fn(async () => []),
  };
  const relationships: RelationshipRepo = {
    findByIdForOwner: vi.fn(async () => null),
    listForCase: vi.fn(async () => []),
    save: vi.fn(async () => undefined),
    tombstone: vi.fn(async () => undefined),
    listRevisionsForOwner: vi.fn(async () => []),
  };

  const activityLog: IngestActivityRecord[] = [];
  const activity: IngestActivityRepo = {
    start: vi.fn(async (input) => {
      const record: IngestActivityRecord = {
        id: input.id,
        ownerUserId: input.ownerUserId,
        caseId: input.caseId,
        url: input.url,
        publisher: null,
        phasesReached: [],
        status: 'in_progress',
        startedAt: input.now,
        endedAt: null,
        recordsCreated: 0,
        failureReason: null,
      };
      activityLog.push(record);
      return record;
    }),
    appendPhase: vi.fn(async () => undefined),
    setPublisher: vi.fn(async () => undefined),
    complete: vi.fn(async () => undefined),
    listForOwner: vi.fn(async () => activityLog),
  };

  const fetcher: SourceFetcherPort = overrides.fetcher ?? {
    resolvePublisher: () => ({ publisher: 'kejaksaan.go.id', tier: 'tier_1' }),
    fetch: vi.fn(
      async (): Promise<FetchOutcome> => ({
        publisher: 'kejaksaan.go.id',
        tier: 'tier_1',
        status: 200,
        fetchedAt: NOW,
        bodyText: 'isi dokumen contoh',
        bodyHash: 'sha256:abc',
        canonicalUrl: 'https://www.kejaksaan.go.id/doc/1',
      }),
    ),
  };
  const archive: ArchivePort = overrides.archive ?? {
    capture: vi.fn(async () => ({ archiveUrl: 'https://web.archive.org/snap' })),
  };
  const rateLimiter: RateLimiterPort =
    overrides.rateLimiter ?? { acquire: vi.fn(async () => undefined) };
  const extraction: ExtractionPort = overrides.extraction ?? {
    extract: vi.fn(async () => [] as ExtractedRecord[]),
  };

  let counter = 0;
  const newId = () => `id_${++counter}`;
  const now = () => NOW;

  const ingest = new IngestSource({
    cases,
    sources,
    entities,
    claims,
    events,
    relationships,
    activity,
    fetcher,
    archive,
    rateLimiter,
    extraction,
    newId,
    now,
    requestCeilingMs: 120_000,
    excerptMaxChars: 500,
  });

  return {
    ingest,
    repos: { cases, sources, entities, claims, events, relationships, activity },
    adapters: { fetcher, archive, rateLimiter, extraction },
  };
}

describe('IngestSource (12.8)', () => {
  it('emits the documented phase sequence on the happy path', async () => {
    const { ingest } = makeStubs();
    const phases: IngestPhaseEvent[] = [];
    await ingest.execute({
      userId: 'user_a',
      caseId: 'case_user_a',
      url: 'https://www.kejaksaan.go.id/doc/1',
      onPhase: (e) => phases.push(e),
    });
    expect(phases.map((p) => p.phase)).toEqual([
      'resolving_publisher',
      'queued',
      'fetching',
      'archived',
      'extracting',
      'reconciling',
      'writing',
      'done',
    ]);
  });

  it('refuses when the case is not owned by the requesting user', async () => {
    const { ingest, repos } = makeStubs();
    await expect(
      ingest.execute({
        userId: 'user_b',
        caseId: 'case_user_a',
        url: 'https://www.kejaksaan.go.id/doc/1',
        onPhase: () => undefined,
      }),
    ).rejects.toBeInstanceOf(NotFound);
    expect(repos.sources.save).not.toHaveBeenCalled();
    expect(repos.entities.save).not.toHaveBeenCalled();
  });

  it('rolls back cleanly when the fetch aborts (no dossier writes)', async () => {
    const aborting: SourceFetcherPort = {
      resolvePublisher: () => ({ publisher: 'kejaksaan.go.id', tier: 'tier_1' }),
      fetch: vi.fn(async (_url, signal) => {
        // Simulate a timeout-induced abort during the fetch.
        const aborted = new Error('aborted');
        aborted.name = 'AbortError';
        if (signal.aborted) throw aborted;
        return new Promise<FetchOutcome>((_resolve, reject) => {
          signal.addEventListener('abort', () => reject(aborted), { once: true });
        });
      }),
    };
    // Manually fire abort by passing in a rate limiter whose `acquire` aborts.
    const rateLimiter: RateLimiterPort = {
      acquire: vi.fn(async (_publisher: string, signal: AbortSignal) => {
        // Trigger AbortError synthetically.
        const aborted = new Error('aborted');
        aborted.name = 'AbortError';
        if (!signal.aborted) {
          signal.dispatchEvent?.(new Event('abort'));
        }
        throw aborted;
      }),
    };
    const { ingest, repos } = makeStubs({ fetcher: aborting, rateLimiter });
    const phases: IngestPhaseEvent[] = [];
    await expect(
      ingest.execute({
        userId: 'user_a',
        caseId: 'case_user_a',
        url: 'https://www.kejaksaan.go.id/doc/1',
        onPhase: (e) => phases.push(e),
      }),
    ).rejects.toBeInstanceOf(IngestTimeout);
    const terminal = phases.at(-1);
    expect(terminal?.phase).toBe('timeout');
    expect(repos.sources.save).not.toHaveBeenCalled();
    expect(repos.entities.save).not.toHaveBeenCalled();
    expect(repos.claims.save).not.toHaveBeenCalled();
    expect(repos.events.save).not.toHaveBeenCalled();
    expect(repos.relationships.save).not.toHaveBeenCalled();
  });
});

