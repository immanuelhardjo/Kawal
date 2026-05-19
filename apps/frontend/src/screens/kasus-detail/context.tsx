import type { CertaintyLabel, EntityTypeDto, EventTypeDto } from '@kawal/contracts';
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

/**
 * Spec: design D11 + relationship-graph "As-of-date driven by the linked
 * timeline section" + event-timeline "Timeline filters".
 *
 * The four Kasus Detail sub-sections (Peta Kasus, Garis Waktu, Dosier,
 * Profil) all read and write through this single context, so a selection
 * in any section is reflected in the others without prop-drilling.
 */
export interface KasusDetailState {
  readonly caseId: string;
  readonly selectedEntityId: string | null;
  readonly selectedEventId: string | null;
  readonly asOfDate: Date;
  readonly filters: {
    readonly entityIds: readonly string[];
    readonly certainties: readonly CertaintyLabel[];
    readonly eventTypes: readonly EventTypeDto[];
    readonly nodeTypes: readonly EntityTypeDto[];
  };
}

export interface KasusDetailActions {
  selectEntity(entityId: string | null): void;
  selectEvent(eventId: string | null): void;
  setAsOfDate(date: Date): void;
  toggleCertainty(label: CertaintyLabel): void;
  toggleEventType(type: EventTypeDto): void;
  toggleNodeType(type: EntityTypeDto): void;
  setEntityFilter(entityIds: readonly string[]): void;
  resetFilters(): void;
}

interface KasusDetailContextValue extends KasusDetailState {
  readonly actions: KasusDetailActions;
}

const KasusDetailContext = createContext<KasusDetailContextValue | null>(null);

export function useKasusDetail(): KasusDetailContextValue {
  const ctx = useContext(KasusDetailContext);
  if (!ctx) throw new Error('useKasusDetail must be used within KasusDetailProvider');
  return ctx;
}

interface KasusDetailProviderProps {
  readonly caseId: string;
  readonly children: ReactNode;
}

function toggleInList<T>(list: readonly T[], value: T): T[] {
  return list.includes(value) ? list.filter((v) => v !== value) : [...list, value];
}

export function KasusDetailProvider({ caseId, children }: KasusDetailProviderProps): JSX.Element {
  const [selectedEntityId, setSelectedEntityId] = useState<string | null>(null);
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [asOfDate, setAsOfDateState] = useState<Date>(() => new Date());
  const [certainties, setCertainties] = useState<readonly CertaintyLabel[]>([]);
  const [eventTypes, setEventTypes] = useState<readonly EventTypeDto[]>([]);
  const [nodeTypes, setNodeTypes] = useState<readonly EntityTypeDto[]>([]);
  const [entityIds, setEntityIds] = useState<readonly string[]>([]);

  const selectEntity = useCallback((id: string | null) => {
    setSelectedEntityId(id);
  }, []);

  // Tapping an event also sets the asOfDate to that event's date in the
  // host component (see GarisWaktu); here we only track the selection.
  const selectEvent = useCallback((id: string | null) => {
    setSelectedEventId(id);
  }, []);

  const setAsOfDate = useCallback((date: Date) => {
    setAsOfDateState(date);
  }, []);

  const toggleCertainty = useCallback((label: CertaintyLabel) => {
    setCertainties((prev) => toggleInList(prev, label));
  }, []);
  const toggleEventType = useCallback((type: EventTypeDto) => {
    setEventTypes((prev) => toggleInList(prev, type));
  }, []);
  const toggleNodeType = useCallback((type: EntityTypeDto) => {
    setNodeTypes((prev) => toggleInList(prev, type));
  }, []);
  const setEntityFilter = useCallback((ids: readonly string[]) => {
    setEntityIds(ids);
  }, []);
  const resetFilters = useCallback(() => {
    setCertainties([]);
    setEventTypes([]);
    setNodeTypes([]);
    setEntityIds([]);
  }, []);

  const value = useMemo<KasusDetailContextValue>(
    () => ({
      caseId,
      selectedEntityId,
      selectedEventId,
      asOfDate,
      filters: { entityIds, certainties, eventTypes, nodeTypes },
      actions: {
        selectEntity,
        selectEvent,
        setAsOfDate,
        toggleCertainty,
        toggleEventType,
        toggleNodeType,
        setEntityFilter,
        resetFilters,
      },
    }),
    [
      caseId,
      selectedEntityId,
      selectedEventId,
      asOfDate,
      entityIds,
      certainties,
      eventTypes,
      nodeTypes,
      selectEntity,
      selectEvent,
      setAsOfDate,
      toggleCertainty,
      toggleEventType,
      toggleNodeType,
      setEntityFilter,
      resetFilters,
    ],
  );

  return <KasusDetailContext.Provider value={value}>{children}</KasusDetailContext.Provider>;
}
