import { afterEach, describe, expect, it, vi } from 'vitest';
import { getCaseHistory, MAX_HISTORY, pushCaseHistory } from './case-history.js';

const STORAGE_KEY = 'kawal_case_history';

afterEach(() => {
  localStorage.clear();
  vi.restoreAllMocks();
});

describe('pushCaseHistory', () => {
  it('adds a new entry to an empty history', () => {
    pushCaseHistory({ id: 'a', name: 'Kasus A' });
    const history = getCaseHistory();
    expect(history).toHaveLength(1);
    expect(history[0].id).toBe('a');
    expect(history[0].name).toBe('Kasus A');
  });

  it('moves an existing entry to the top on revisit (no duplicate)', () => {
    pushCaseHistory({ id: 'a', name: 'Kasus A' });
    pushCaseHistory({ id: 'b', name: 'Kasus B' });
    pushCaseHistory({ id: 'a', name: 'Kasus A' });
    const history = getCaseHistory();
    expect(history).toHaveLength(2);
    expect(history[0].id).toBe('a');
    expect(history[1].id).toBe('b');
  });

  it('caps history at MAX_HISTORY entries', () => {
    for (let i = 0; i < MAX_HISTORY + 5; i++) {
      pushCaseHistory({ id: String(i), name: `Kasus ${i}` });
    }
    expect(getCaseHistory()).toHaveLength(MAX_HISTORY);
  });

  it('degrades silently when localStorage.setItem throws', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('QuotaExceededError');
    });
    expect(() => pushCaseHistory({ id: 'x', name: 'Kasus X' })).not.toThrow();
  });

  it('returns empty array when localStorage.getItem throws', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('SecurityError');
    });
    expect(getCaseHistory()).toEqual([]);
  });

  it('returns empty array when stored value is malformed JSON', () => {
    localStorage.setItem(STORAGE_KEY, 'not-json{{');
    expect(getCaseHistory()).toEqual([]);
  });
});
