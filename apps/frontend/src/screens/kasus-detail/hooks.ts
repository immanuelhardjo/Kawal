import type {
  CaseDto,
  ConversationMessageDto,
  EntityDto,
  GetTimelineResponse,
  ListSourcesResponse,
  VisibleGraphResponse,
} from '@kawal/contracts';
import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from '../../api/client.js';
import { useKasusDetail } from './context.js';

export interface AsyncState<T> {
  readonly data: T | null;
  readonly loading: boolean;
  readonly error: string | null;
}

const initialState = <T,>(): AsyncState<T> => ({ data: null, loading: true, error: null });

export function useCase(caseId: string): AsyncState<CaseDto> {
  const [state, setState] = useState<AsyncState<CaseDto>>(initialState);
  useEffect(() => {
    let cancelled = false;
    setState(initialState);
    api
      .getCase(caseId)
      .then((data) => !cancelled && setState({ data, loading: false, error: null }))
      .catch((err) => !cancelled && setState({ data: null, loading: false, error: messageFrom(err) }));
    return () => {
      cancelled = true;
    };
  }, [caseId]);
  return state;
}

export function useEntities(caseId: string): AsyncState<EntityDto[]> {
  const [state, setState] = useState<AsyncState<EntityDto[]>>(initialState);
  useEffect(() => {
    let cancelled = false;
    setState(initialState);
    api
      .listEntities(caseId)
      .then((res) => !cancelled && setState({ data: res.entities, loading: false, error: null }))
      .catch((err) => !cancelled && setState({ data: null, loading: false, error: messageFrom(err) }));
    return () => {
      cancelled = true;
    };
  }, [caseId]);
  return state;
}

export function useTimeline(): AsyncState<GetTimelineResponse> {
  const { caseId, filters } = useKasusDetail();
  const [state, setState] = useState<AsyncState<GetTimelineResponse>>(initialState);
  const filterKey = stableKey({
    entityIds: filters.entityIds,
    certainties: filters.certainties,
    eventTypes: filters.eventTypes,
  });
  useEffect(() => {
    let cancelled = false;
    setState((prev) => ({ ...prev, loading: true, error: null }));
    api
      .getTimeline(caseId, {
        entityIds: filters.entityIds.length > 0 ? filters.entityIds : undefined,
        certainties: filters.certainties.length > 0 ? filters.certainties : undefined,
        eventTypes: filters.eventTypes.length > 0 ? filters.eventTypes : undefined,
      })
      .then((data) => !cancelled && setState({ data, loading: false, error: null }))
      .catch((err) => !cancelled && setState({ data: null, loading: false, error: messageFrom(err) }));
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [caseId, filterKey]);
  return state;
}

export function useVisibleGraph(): AsyncState<VisibleGraphResponse> {
  const { caseId, asOfDate, filters } = useKasusDetail();
  const [state, setState] = useState<AsyncState<VisibleGraphResponse>>(initialState);
  const asOfKey = asOfDate.toISOString();
  const filterKey = stableKey({
    certainties: filters.certainties,
    nodeTypes: filters.nodeTypes,
  });
  useEffect(() => {
    let cancelled = false;
    setState((prev) => ({ ...prev, loading: true, error: null }));
    api
      .getGraph(caseId, {
        asOfDate,
        certainties: filters.certainties.length > 0 ? filters.certainties : undefined,
        nodeTypes: filters.nodeTypes.length > 0 ? filters.nodeTypes : undefined,
      })
      .then((data) => !cancelled && setState({ data, loading: false, error: null }))
      .catch((err) => !cancelled && setState({ data: null, loading: false, error: messageFrom(err) }));
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [caseId, asOfKey, filterKey]);
  return state;
}

export interface ChatMessage {
  readonly id: string;
  readonly question: string;
  readonly answerText: string;
  readonly citedClaimIds: readonly string[];
  readonly citedEventIds: readonly string[];
  readonly citedSourceIds: readonly string[];
  readonly createdAt: string;
  readonly pending?: boolean;
}

export function useConversationHistory(caseId: string): {
  messages: ChatMessage[];
  loading: boolean;
  sendQuestion: (question: string) => Promise<void>;
  sending: boolean;
} {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const pendingIdRef = useRef<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    api
      .getConversationHistory(caseId)
      .then((res) => {
        if (cancelled) return;
        setMessages(
          res.messages.map((m: ConversationMessageDto) => ({
            id: m.id,
            question: m.question,
            answerText: m.answerText,
            citedClaimIds: m.citedClaimIds,
            citedEventIds: m.citedEventIds,
            citedSourceIds: m.citedSourceIds,
            createdAt: m.createdAt,
          })),
        );
        setLoading(false);
      })
      .catch(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [caseId]);

  const sendQuestion = useCallback(
    async (question: string) => {
      const tempId = `pending-${Date.now()}`;
      pendingIdRef.current = tempId;
      const optimistic: ChatMessage = {
        id: tempId,
        question,
        answerText: '',
        citedClaimIds: [],
        citedEventIds: [],
        citedSourceIds: [],
        createdAt: new Date().toISOString(),
        pending: true,
      };
      setMessages((prev) => [...prev, optimistic]);
      setSending(true);
      try {
        const answer = await api.askQuestion(caseId, question);
        setMessages((prev) =>
          prev.map((m) =>
            m.id === tempId
              ? {
                  id: tempId,
                  question,
                  answerText: answer.textBahasa,
                  citedClaimIds: answer.citedClaimIds,
                  citedEventIds: answer.citedEventIds,
                  citedSourceIds: answer.citedSourceIds,
                  createdAt: new Date().toISOString(),
                  pending: false,
                }
              : m,
          ),
        );
      } catch {
        setMessages((prev) => prev.filter((m) => m.id !== tempId));
      } finally {
        setSending(false);
        pendingIdRef.current = null;
      }
    },
    [caseId],
  );

  return { messages, loading, sendQuestion, sending };
}

export function useCaseSources(caseId: string): AsyncState<ListSourcesResponse> {
  const [state, setState] = useState<AsyncState<ListSourcesResponse>>(initialState);
  useEffect(() => {
    let cancelled = false;
    setState(initialState);
    api
      .listCaseSources(caseId)
      .then((data) => !cancelled && setState({ data, loading: false, error: null }))
      .catch((err) => !cancelled && setState({ data: null, loading: false, error: messageFrom(err) }));
    return () => { cancelled = true; };
  }, [caseId]);
  return state;
}

function stableKey(value: unknown): string {
  return JSON.stringify(value);
}

function messageFrom(err: unknown): string {
  return err instanceof Error ? err.message : 'unknown_error';
}
