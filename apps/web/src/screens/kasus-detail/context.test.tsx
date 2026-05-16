import { act, renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { KasusDetailProvider, useKasusDetail } from './context.js';

/**
 * Spec: design D11 + relationship-graph "As-of-date driven by the linked
 * timeline section" + event-timeline "Timeline drives the relationship-graph
 * as-of-date".
 *
 * The four Kasus Detail sub-sections share one state. We verify the
 * load-bearing linkages:
 *   - selecting an entity sets the entity filter (drives Garis Waktu and
 *     highlights the Dosier row);
 *   - selecting an event lets the host bind asOfDate to that event's date
 *     (drives Peta Kasus's visible-at-date set);
 *   - certainty / event-type / node-type filters round-trip through the
 *     toggle actions;
 *   - resetFilters clears every axis at once.
 */

function wrap(caseId: string) {
  return ({ children }: { children: React.ReactNode }) => (
    <KasusDetailProvider caseId={caseId}>{children}</KasusDetailProvider>
  );
}

describe('KasusDetailProvider (12.11)', () => {
  it('exposes caseId and starts with empty filters', () => {
    const { result } = renderHook(() => useKasusDetail(), { wrapper: wrap('case_1') });
    expect(result.current.caseId).toBe('case_1');
    expect(result.current.selectedEntityId).toBeNull();
    expect(result.current.selectedEventId).toBeNull();
    expect(result.current.filters.certainties).toEqual([]);
    expect(result.current.filters.entityIds).toEqual([]);
    expect(result.current.filters.eventTypes).toEqual([]);
    expect(result.current.filters.nodeTypes).toEqual([]);
  });

  it('selectEntity also sets the entity filter (drives Garis Waktu)', () => {
    const { result } = renderHook(() => useKasusDetail(), { wrapper: wrap('case_1') });
    act(() => result.current.actions.selectEntity('ent_A'));
    expect(result.current.selectedEntityId).toBe('ent_A');
    expect(result.current.filters.entityIds).toEqual(['ent_A']);
  });

  it('selectEntity(null) clears the entity filter', () => {
    const { result } = renderHook(() => useKasusDetail(), { wrapper: wrap('case_1') });
    act(() => result.current.actions.selectEntity('ent_A'));
    act(() => result.current.actions.selectEntity(null));
    expect(result.current.selectedEntityId).toBeNull();
    expect(result.current.filters.entityIds).toEqual([]);
  });

  it('setAsOfDate updates the screen-level as-of-date used by Peta Kasus', () => {
    const { result } = renderHook(() => useKasusDetail(), { wrapper: wrap('case_1') });
    const target = new Date('2024-06-15T00:00:00Z');
    act(() => result.current.actions.setAsOfDate(target));
    expect(result.current.asOfDate.toISOString()).toBe(target.toISOString());
  });

  it('toggleCertainty / toggleEventType / toggleNodeType each round-trip', () => {
    const { result } = renderHook(() => useKasusDetail(), { wrapper: wrap('case_1') });
    act(() => result.current.actions.toggleCertainty('alleged'));
    expect(result.current.filters.certainties).toEqual(['alleged']);
    act(() => result.current.actions.toggleCertainty('alleged'));
    expect(result.current.filters.certainties).toEqual([]);

    act(() => result.current.actions.toggleEventType('hearing'));
    expect(result.current.filters.eventTypes).toEqual(['hearing']);

    act(() => result.current.actions.toggleNodeType('person'));
    expect(result.current.filters.nodeTypes).toEqual(['person']);
  });

  it('resetFilters clears every axis', () => {
    const { result } = renderHook(() => useKasusDetail(), { wrapper: wrap('case_1') });
    act(() => {
      result.current.actions.selectEntity('ent_A');
      result.current.actions.toggleCertainty('alleged');
      result.current.actions.toggleEventType('hearing');
      result.current.actions.toggleNodeType('company');
    });
    act(() => result.current.actions.resetFilters());
    expect(result.current.filters.entityIds).toEqual([]);
    expect(result.current.filters.certainties).toEqual([]);
    expect(result.current.filters.eventTypes).toEqual([]);
    expect(result.current.filters.nodeTypes).toEqual([]);
  });
});
