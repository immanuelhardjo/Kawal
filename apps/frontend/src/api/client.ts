import type {
  AggregateTypeDto,
  AskQuestionResponse,
  CaseDto,
  CertaintyLabel,
  ConversationHistoryResponse,
  CreateCaseRequest,
  EntityDto,
  EntityTypeDto,
  EventTypeDto,
  GetTimelineResponse,
  ListCasesResponse,
  ListEntitiesResponse,
  ListRevisionsResponse,
  ListSourcesResponse,
  MeResponse,
  VisibleGraphResponse,
  WhatChangedResponse,
} from '@kawal/contracts';
import { env } from '../env.js';

class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
  ) {
    super(message);
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${env.VITE_API_BASE_URL}${path}`, {
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers ?? {}),
    },
    ...init,
  });
  if (res.status === 204) return undefined as T;
  const body = (await res.json().catch(() => ({}))) as { code?: string; message?: string };
  if (!res.ok) {
    throw new ApiError(res.status, body.code ?? 'unknown', body.message ?? 'Request failed');
  }
  return body as T;
}

function buildQuery(params: Record<string, string | string[] | undefined>): string {
  const parts: string[] = [];
  for (const [key, value] of Object.entries(params)) {
    if (value == null) continue;
    if (Array.isArray(value)) {
      if (value.length === 0) continue;
      parts.push(`${encodeURIComponent(key)}=${encodeURIComponent(value.join(','))}`);
    } else {
      parts.push(`${encodeURIComponent(key)}=${encodeURIComponent(value)}`);
    }
  }
  return parts.length ? `?${parts.join('&')}` : '';
}

export interface TimelineQuery {
  readonly entityIds?: readonly string[];
  readonly certainties?: readonly CertaintyLabel[];
  readonly eventTypes?: readonly EventTypeDto[];
}

export interface GraphQuery {
  readonly asOfDate?: Date;
  readonly certainties?: readonly CertaintyLabel[];
  readonly nodeTypes?: readonly EntityTypeDto[];
}

export const api = {
  // --- auth / account
  me: () => request<MeResponse>('/me'),
  signOut: () => request<void>('/auth/signout', { method: 'POST' }),
  deleteAccount: () => request<void>('/me', { method: 'DELETE' }),
  exportDossierUrl: `${env.VITE_API_BASE_URL}/me/export`,

  // --- cases
  listCases: () => request<ListCasesResponse>('/cases'),
  getCase: (caseId: string) => request<CaseDto>(`/cases/${encodeURIComponent(caseId)}`),
  createCase: (input: CreateCaseRequest) =>
    request<CaseDto>('/cases', { method: 'POST', body: JSON.stringify(input) }),
  whatChanged: (caseId: string) =>
    request<WhatChangedResponse>(`/cases/${encodeURIComponent(caseId)}/what-changed`),

  // --- entities
  listEntities: (caseId?: string) =>
    request<ListEntitiesResponse>(`/entities${buildQuery({ caseId })}`),
  getEntity: (entityId: string) => request<EntityDto>(`/entities/${encodeURIComponent(entityId)}`),

  // --- timeline
  getTimeline: (caseId: string, q: TimelineQuery = {}) =>
    request<GetTimelineResponse>(
      `/timeline/${encodeURIComponent(caseId)}${buildQuery({
        entityIds: q.entityIds ? [...q.entityIds] : undefined,
        certainties: q.certainties ? [...q.certainties] : undefined,
        eventTypes: q.eventTypes ? [...q.eventTypes] : undefined,
      })}`,
    ),

  // --- graph
  getGraph: (caseId: string, q: GraphQuery = {}) =>
    request<VisibleGraphResponse>(
      `/graph/${encodeURIComponent(caseId)}${buildQuery({
        asOfDate: q.asOfDate ? q.asOfDate.toISOString() : undefined,
        certainties: q.certainties ? [...q.certainties] : undefined,
        nodeTypes: q.nodeTypes ? [...q.nodeTypes] : undefined,
      })}`,
    ),

  // --- revisions
  listRevisions: (aggregateType: AggregateTypeDto, id: string) =>
    request<ListRevisionsResponse>(
      `/revisions/${encodeURIComponent(aggregateType)}/${encodeURIComponent(id)}`,
    ),

  // --- sources
  listCaseSources: (caseId: string) =>
    request<ListSourcesResponse>(`/cases/${encodeURIComponent(caseId)}/sources`),

  // --- ai / conversation
  getConversationHistory: (caseId: string) =>
    request<ConversationHistoryResponse>(`/ai/conversation-history${buildQuery({ caseId })}`),
  askQuestion: (caseId: string, question: string) =>
    request<AskQuestionResponse>('/ai/ask', {
      method: 'POST',
      body: JSON.stringify({ caseId, question }),
    }),

};

export { ApiError };
