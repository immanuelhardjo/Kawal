export const MAX_HISTORY = 20;

const STORAGE_KEY = 'kawal_case_history';

export interface CaseHistoryEntry {
  readonly id: string;
  readonly name: string;
  readonly visitedAt: number;
}

export function getCaseHistory(): CaseHistoryEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed as CaseHistoryEntry[];
  } catch {
    return [];
  }
}

export function pushCaseHistory(entry: Omit<CaseHistoryEntry, 'visitedAt'>): void {
  try {
    const current = getCaseHistory();
    const deduped = current.filter((e) => e.id !== entry.id);
    const next: CaseHistoryEntry[] = [
      { ...entry, visitedAt: Date.now() },
      ...deduped,
    ].slice(0, MAX_HISTORY);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // Storage unavailable or quota exceeded — degrade silently.
  }
}
