import { useCallback, useState } from 'react';
import { env } from '../env.js';

/**
 * Spec: osint-ingestion / "Progress streaming during request-time ingest".
 *
 * Posts to POST /ingest and reads the SSE stream phase-by-phase. The hook
 * is intentionally minimal — it pushes each phase into local state and
 * returns the latest one along with the cumulative list.
 */
export interface IngestPhaseEvent {
  readonly phase: string;
  readonly reason?: string;
}

export interface UseIngestStreamResult {
  readonly start: (input: { caseId: string; url: string }) => Promise<void>;
  readonly phases: readonly IngestPhaseEvent[];
  readonly running: boolean;
  readonly error: string | null;
}

export function useIngestStream(): UseIngestStreamResult {
  const [phases, setPhases] = useState<IngestPhaseEvent[]>([]);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const start = useCallback(async (input: { caseId: string; url: string }) => {
    setPhases([]);
    setError(null);
    setRunning(true);
    try {
      const response = await fetch(`${env.VITE_API_BASE_URL}/ingest`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json', Accept: 'text/event-stream' },
        body: JSON.stringify(input),
      });
      if (!response.ok || !response.body) {
        throw new Error(`Ingest failed with status ${response.status}`);
      }
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const events = buffer.split('\n\n');
        buffer = events.pop() ?? '';
        for (const block of events) {
          const dataLine = block.split('\n').find((l) => l.startsWith('data:'));
          if (!dataLine) continue;
          try {
            const parsed = JSON.parse(dataLine.slice(5).trim()) as IngestPhaseEvent;
            setPhases((prev) => [...prev, parsed]);
          } catch {
            // ignore malformed event
          }
        }
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'unknown_error');
    } finally {
      setRunning(false);
    }
  }, []);

  return { start, phases, running, error };
}
