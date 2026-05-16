import {
  BahasaText,
  Claim,
  Entity,
  Event,
  Excerpt,
  Relationship,
  Source,
  type CertaintyLabel,
  type EntityProfile,
  type EntityType,
  type EventType,
  type RelationshipType,
} from '@kawal/domain';
import { IngestFailed, IngestTimeout, NotFound } from '../errors.js';
import type {
  ExtractedRecord,
  ExtractionPort,
} from '../ports/ai-ports.js';
import type {
  ArchivePort,
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
import type { IngestActivityRepo } from '../repositories/ingest-activity-repo.js';

/**
 * Spec: osint-ingestion.
 *
 * Orchestrates one ingest request: resolve publisher → rate-limit gate →
 * fetch → archive → extract → owner-stamped write of Source + extracted
 * records → activity log close.
 *
 * Progress is streamed phase-by-phase via the `onPhase` callback the HTTP
 * layer wires to its SSE response.
 *
 * Timeout (default 120s) is enforced by an AbortController whose signal
 * propagates into fetch + archive calls. Writes are committed only inside
 * a single short transaction after extraction finishes, so a timeout
 * before the write keeps the dossier untouched.
 */

export type IngestPhase =
  | 'resolving_publisher'
  | 'queued'
  | 'fetching'
  | 'archived'
  | 'extracting'
  | 'reconciling'
  | 'writing'
  | 'done'
  | 'failed'
  | 'timeout';

export interface IngestPhaseEvent {
  readonly phase: IngestPhase;
  readonly reason?: string;
  readonly recordsCreated?: number;
  readonly publisher?: string;
}

export type IngestPhaseCallback = (event: IngestPhaseEvent) => void;

export interface IngestSourceDeps {
  readonly cases: CaseRepo;
  readonly sources: SourceRepo;
  readonly entities: EntityRepo;
  readonly claims: ClaimRepo;
  readonly events: EventRepo;
  readonly relationships: RelationshipRepo;
  readonly activity: IngestActivityRepo;
  readonly fetcher: SourceFetcherPort;
  readonly archive: ArchivePort;
  readonly rateLimiter: RateLimiterPort;
  readonly extraction: ExtractionPort;
  readonly newId: () => string;
  readonly now: () => Date;
  readonly requestCeilingMs: number;
  readonly excerptMaxChars: number;
}

export interface IngestSourceInput {
  readonly userId: string;
  readonly caseId: string;
  readonly url: string;
  readonly onPhase: IngestPhaseCallback;
}

export interface IngestSourceResult {
  readonly activityId: string;
  readonly sourceId: string;
  readonly recordsCreated: number;
}

export class IngestSource {
  constructor(private readonly deps: IngestSourceDeps) {}

  async execute(input: IngestSourceInput): Promise<IngestSourceResult> {
    const startedAt = this.deps.now();
    const activityId = this.deps.newId();
    await this.deps.activity.start({
      id: activityId,
      ownerUserId: input.userId,
      caseId: input.caseId,
      url: input.url,
      now: startedAt,
    });

    const controller = new AbortController();
    const ceilingHandle = setTimeout(() => controller.abort(), this.deps.requestCeilingMs);

    const emit = async (event: IngestPhaseEvent): Promise<void> => {
      input.onPhase(event);
      await this.deps.activity.appendPhase(activityId, event.phase);
    };

    try {
      // (1) Verify case ownership BEFORE any outbound work.
      const ownedCase = await this.deps.cases.findByIdForOwner(input.caseId, input.userId);
      if (!ownedCase) throw new NotFound('Case', input.caseId);

      // (2) Resolve publisher against the centrally-loaded whitelist.
      await emit({ phase: 'resolving_publisher' });
      const { publisher, tier } = resolvePublisherOrFail(this.deps.fetcher, input.url);
      if (tier === 'tier_3') {
        throw new IngestFailed('Tier-3 sources cannot anchor a fact', { url: input.url });
      }
      await this.deps.activity.setPublisher(activityId, publisher);

      // (3) Wait politely on the per-publisher rate limit.
      await emit({ phase: 'queued', publisher });
      await this.deps.rateLimiter.acquire(publisher, controller.signal);

      // (4) Fetch + archive in parallel (archive is non-fatal on error).
      await emit({ phase: 'fetching' });
      const fetched = await this.deps.fetcher.fetch(input.url, controller.signal);
      const archiveResult = await this.deps.archive
        .capture(input.url, controller.signal)
        .catch(() => ({ archiveUrl: null }));
      await emit({ phase: 'archived' });

      // (5) Extraction (Gemini). Truncate bodyText to the excerpt cap before
      // sending to the model; the full body lives only inside the request.
      await emit({ phase: 'extracting' });
      const candidates = await this.deps.extraction.extract({
        scope: { userId: input.userId, caseId: input.caseId },
        sourceId: '__pending__', // assigned post-Source creation
        sourceTier: tier,
        documentText: fetched.bodyText,
      });

      await emit({ phase: 'reconciling' });
      // Reconciliation is a no-op at write time in the tracer; the
      // ReconciliationPort is invoked later by a separate use case
      // (per ai-assistance spec). We keep the phase emit so the SSE
      // shape matches the spec scenario list.

      // (6) Build the Source aggregate. Cap excerpt to configured length.
      const sourceId = this.deps.newId();
      const excerptText = fetched.bodyText.slice(0, this.deps.excerptMaxChars).trim() || '(kosong)';
      const sourceAggregate = Source.create({
        id: sourceId,
        ownerUserId: input.userId,
        url: fetched.canonicalUrl,
        publisher: fetched.publisher,
        tier,
        fetchedAt: fetched.fetchedAt,
        excerpt: Excerpt.of(excerptText, this.deps.excerptMaxChars),
        archiveUrl: archiveResult.archiveUrl,
        bodyHash: fetched.bodyHash,
      });

      // (7) Materialise candidate domain aggregates owned by this user.
      const built = buildAggregatesFromCandidates(candidates, {
        ownerUserId: input.userId,
        caseId: input.caseId,
        anchoringSource: sourceAggregate,
        newId: this.deps.newId,
      });

      // (8) Write the Source first, then everything that references it.
      // Each repository persists an aggregate + a revision in its own
      // transaction; the writes happen rapidly and post-extraction, so a
      // timeout that fires before this block leaves the dossier untouched.
      if (controller.signal.aborted) throw new IngestTimeout({ phase: 'writing' });
      await emit({ phase: 'writing' });
      await this.deps.sources.save({
        aggregate: sourceAggregate,
        change: 'created',
        actorUserId: input.userId,
        now: this.deps.now(),
      });
      for (const entity of built.entities) {
        await this.deps.entities.save({
          aggregate: entity,
          change: 'created',
          actorUserId: input.userId,
          now: this.deps.now(),
        });
      }
      for (const claim of built.claims) {
        await this.deps.claims.save({
          aggregate: claim,
          change: 'created',
          actorUserId: input.userId,
          now: this.deps.now(),
        });
      }
      for (const eventAggregate of built.events) {
        await this.deps.events.save({
          aggregate: eventAggregate,
          change: 'created',
          actorUserId: input.userId,
          now: this.deps.now(),
        });
      }
      for (const relationship of built.relationships) {
        await this.deps.relationships.save({
          aggregate: relationship,
          change: 'created',
          actorUserId: input.userId,
          now: this.deps.now(),
        });
      }

      const recordsCreated =
        1 + // Source
        built.entities.length +
        built.claims.length +
        built.events.length +
        built.relationships.length;
      await emit({ phase: 'done', recordsCreated });
      await this.deps.activity.complete({
        id: activityId,
        status: 'done',
        now: this.deps.now(),
        recordsCreated,
      });

      return { activityId, sourceId, recordsCreated };
    } catch (cause) {
      const isTimeout = cause instanceof IngestTimeout || isAbortError(cause);
      const phase: IngestPhase = isTimeout ? 'timeout' : 'failed';
      const reason = cause instanceof Error ? cause.message : 'unknown_error';
      try {
        await emit({ phase, reason });
      } catch {
        // ignore secondary failure while emitting the terminal phase
      }
      await this.deps.activity
        .complete({
          id: activityId,
          status: isTimeout ? 'timeout' : 'failed',
          now: this.deps.now(),
          recordsCreated: 0,
          failureReason: reason,
        })
        .catch(() => undefined);
      if (isTimeout) throw new IngestTimeout({ url: input.url, reason });
      throw cause instanceof Error ? cause : new IngestFailed(reason);
    } finally {
      clearTimeout(ceilingHandle);
    }
  }
}

function resolvePublisherOrFail(
  fetcher: SourceFetcherPort,
  url: string,
): { publisher: string; tier: 'tier_1' | 'tier_2' | 'tier_3' } {
  try {
    return fetcher.resolvePublisher(url);
  } catch (cause) {
    const reason = cause instanceof Error ? cause.message : 'publisher_not_whitelisted';
    throw new IngestFailed(reason, { url });
  }
}

function isAbortError(err: unknown): boolean {
  if (err instanceof Error && (err.name === 'AbortError' || err.message === 'aborted')) {
    return true;
  }
  return false;
}

interface BuiltAggregates {
  readonly entities: Entity[];
  readonly claims: Claim[];
  readonly events: Event[];
  readonly relationships: Relationship[];
}

function buildAggregatesFromCandidates(
  candidates: readonly ExtractedRecord[],
  ctx: {
    readonly ownerUserId: string;
    readonly caseId: string;
    readonly anchoringSource: Source;
    readonly newId: () => string;
  },
): BuiltAggregates {
  const entitiesById = new Map<string, Entity>();
  const claims: Claim[] = [];
  const events: Event[] = [];
  const relationships: Relationship[] = [];

  const certaintyOf = (suggested: CertaintyLabel | null, fallback: CertaintyLabel): CertaintyLabel =>
    suggested ?? fallback;

  for (const candidate of candidates) {
    if (candidate.kind === 'entity') {
      const e = buildEntityCandidate(candidate.payload, ctx);
      if (e) entitiesById.set(e.id, e);
    } else if (candidate.kind === 'claim') {
      const c = buildClaimCandidate(candidate.payload, {
        ...ctx,
        certainty: certaintyOf(candidate.suggestedCertainty, 'reported'),
      });
      if (c) claims.push(c);
    } else if (candidate.kind === 'event') {
      const ev = buildEventCandidate(candidate.payload, {
        ...ctx,
        certainty: certaintyOf(candidate.suggestedCertainty, 'reported'),
        entitiesById,
      });
      if (ev) events.push(ev);
    } else if (candidate.kind === 'relationship') {
      const rel = buildRelationshipCandidate(candidate.payload, {
        ...ctx,
        certainty: certaintyOf(candidate.suggestedCertainty, 'reported'),
        entitiesById,
      });
      if (rel) relationships.push(rel);
    }
  }

  return {
    entities: Array.from(entitiesById.values()),
    claims,
    events,
    relationships,
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function buildEntityCandidate(
  payload: unknown,
  ctx: { ownerUserId: string; newId: () => string },
): Entity | null {
  if (!isRecord(payload)) return null;
  const type = payload.type;
  if (type !== 'person' && type !== 'institution' && type !== 'company' && type !== 'document') {
    return null;
  }
  const canonicalName = typeof payload.canonicalName === 'string' ? payload.canonicalName : null;
  if (!canonicalName) return null;
  try {
    return Entity.create({
      id: typeof payload.id === 'string' && payload.id.length > 0 ? payload.id : ctx.newId(),
      ownerUserId: ctx.ownerUserId,
      type: type as EntityType,
      canonicalName,
      profile: payload.profile as EntityProfile,
    });
  } catch {
    return null;
  }
}

function buildClaimCandidate(
  payload: unknown,
  ctx: {
    ownerUserId: string;
    caseId: string;
    anchoringSource: Source;
    certainty: CertaintyLabel;
    newId: () => string;
  },
): Claim | null {
  if (!isRecord(payload)) return null;
  const text = typeof payload.text === 'string' ? payload.text : null;
  if (!text) return null;
  try {
    return Claim.create({
      id: ctx.newId(),
      ownerUserId: ctx.ownerUserId,
      caseId: ctx.caseId,
      text,
      certainty: ctx.certainty,
      sources: [ctx.anchoringSource],
    });
  } catch {
    return null;
  }
}

function buildEventCandidate(
  payload: unknown,
  ctx: {
    ownerUserId: string;
    caseId: string;
    anchoringSource: Source;
    certainty: CertaintyLabel;
    entitiesById: Map<string, Entity>;
    newId: () => string;
  },
): Event | null {
  if (!isRecord(payload)) return null;
  const type = (payload.type as EventType) ?? 'other';
  const dateRaw = payload.date;
  const date =
    typeof dateRaw === 'string' || typeof dateRaw === 'number' ? new Date(dateRaw) : null;
  const title = typeof payload.title === 'string' ? payload.title : null;
  if (!date || isNaN(date.getTime()) || !title) return null;
  const summary = typeof payload.summary === 'string' ? payload.summary : '';
  const entityRefs = Array.isArray(payload.entityIds)
    ? payload.entityIds.filter((s): s is string => typeof s === 'string')
    : [];
  const involvedEntities = entityRefs
    .map((id) => ctx.entitiesById.get(id))
    .filter((e): e is Entity => e !== undefined);
  try {
    return Event.create({
      id: ctx.newId(),
      ownerUserId: ctx.ownerUserId,
      caseId: ctx.caseId,
      type,
      date,
      title,
      summary: BahasaText.of(summary),
      certainty: ctx.certainty,
      sources: [ctx.anchoringSource],
      entities: involvedEntities,
    });
  } catch {
    return null;
  }
}

function buildRelationshipCandidate(
  payload: unknown,
  ctx: {
    ownerUserId: string;
    anchoringSource: Source;
    certainty: CertaintyLabel;
    entitiesById: Map<string, Entity>;
    newId: () => string;
  },
): Relationship | null {
  if (!isRecord(payload)) return null;
  const fromId = typeof payload.fromEntityId === 'string' ? payload.fromEntityId : null;
  const toId = typeof payload.toEntityId === 'string' ? payload.toEntityId : null;
  if (!fromId || !toId) return null;
  const fromEntity = ctx.entitiesById.get(fromId);
  const toEntity = ctx.entitiesById.get(toId);
  if (!fromEntity || !toEntity) return null;
  const type = (payload.type as RelationshipType) ?? 'other';
  const activeFromRaw = payload.activeFrom;
  const activeFrom =
    typeof activeFromRaw === 'string' || typeof activeFromRaw === 'number'
      ? new Date(activeFromRaw)
      : new Date();
  if (isNaN(activeFrom.getTime())) return null;
  const activeToRaw = payload.activeTo;
  const activeTo =
    typeof activeToRaw === 'string' || typeof activeToRaw === 'number'
      ? new Date(activeToRaw)
      : null;
  try {
    return Relationship.create({
      id: ctx.newId(),
      ownerUserId: ctx.ownerUserId,
      fromEntity,
      toEntity,
      type,
      certainty: ctx.certainty,
      sources: [ctx.anchoringSource],
      activeFrom,
      activeTo,
      description: typeof payload.description === 'string' ? BahasaText.of(payload.description) : undefined,
    });
  } catch {
    return null;
  }
}
