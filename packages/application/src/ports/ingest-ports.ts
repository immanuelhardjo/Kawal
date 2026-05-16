/**
 * Spec: osint-ingestion.
 *
 * Three ports collaborate inside the IngestSource use case:
 *   - SourceFetcherPort  : route URL → publisher adapter → fetched body
 *   - ArchivePort        : capture a Wayback fallback URL
 *   - RateLimiterPort    : per-process, per-publisher politeness
 */

import type { SourceTier } from '@kawal/domain';

export interface FetchOutcome {
  readonly publisher: string;
  readonly tier: SourceTier;
  readonly status: number;
  readonly fetchedAt: Date;
  readonly bodyText: string;
  readonly bodyHash: string;
  readonly canonicalUrl: string;
}

export interface SourceFetcherPort {
  /** Throws if no adapter is registered for the URL's publisher. */
  resolvePublisher(url: string): { publisher: string; tier: SourceTier };
  fetch(url: string, signal: AbortSignal): Promise<FetchOutcome>;
}

export interface ArchivePort {
  capture(url: string, signal: AbortSignal): Promise<{ archiveUrl: string | null }>;
}

export interface RateLimiterPort {
  /** Awaits a permit for the publisher; honors AbortSignal. */
  acquire(publisher: string, signal: AbortSignal): Promise<void>;
}
