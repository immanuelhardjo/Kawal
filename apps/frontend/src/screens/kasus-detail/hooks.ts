import type {
  CaseDto,
  EntityDto,
  GetTimelineResponse,
  VisibleGraphResponse,
} from '@kawal/contracts';
import { useEffect, useState } from 'react';
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

function stableKey(value: unknown): string {
  return JSON.stringify(value);
}

function messageFrom(err: unknown): string {
  return err instanceof Error ? err.message : 'unknown_error';
}
