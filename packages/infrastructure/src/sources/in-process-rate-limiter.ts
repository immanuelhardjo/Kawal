import type { RateLimiterPort } from '@kawal/application';

/**
 * Spec: osint-ingestion / "Per-publisher rate limit and back-off in-process".
 *
 * Token-bucket per publisher, in-process. Cross-user fairness is FIFO via
 * promise chaining. If many users target the same publisher, all of them
 * back off; that is the desired publisher politeness behaviour.
 */
export class InProcessRateLimiter implements RateLimiterPort {
  private readonly intervals: Map<string, Promise<void>> = new Map();

  constructor(private readonly perPublisherPerSecond: number) {
    if (perPublisherPerSecond <= 0) {
      throw new Error('perPublisherPerSecond must be positive');
    }
  }

  acquire(publisher: string, signal: AbortSignal): Promise<void> {
    if (signal.aborted) return Promise.reject(new Error('aborted'));
    const tail = this.intervals.get(publisher) ?? Promise.resolve();
    const intervalMs = Math.ceil(1000 / this.perPublisherPerSecond);
    const next = tail.then(
      () =>
        new Promise<void>((resolve, reject) => {
          const timer = setTimeout(resolve, intervalMs);
          const onAbort = () => {
            clearTimeout(timer);
            signal.removeEventListener('abort', onAbort);
            reject(new Error('aborted'));
          };
          if (signal.aborted) {
            clearTimeout(timer);
            reject(new Error('aborted'));
            return;
          }
          signal.addEventListener('abort', onAbort, { once: true });
        }),
    );
    this.intervals.set(publisher, next.catch(() => undefined));
    return next;
  }
}
