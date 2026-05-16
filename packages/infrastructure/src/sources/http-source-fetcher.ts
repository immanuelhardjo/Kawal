import type { FetchOutcome, SourceFetcherPort } from '@kawal/application';
import { type SourceTier } from '@kawal/domain';
import { createHash } from 'node:crypto';
import { sourceTierWhitelist } from './source-tier-whitelist.js';

/**
 * Per-publisher adapters live alongside this in `packages/infrastructure/src/sources/<host>/`
 * (Kejagung, MA, Tempo, ...). For the tracer bullet we provide a generic
 * HTTP fetcher that handles any whitelisted publisher uniformly: GET, follow
 * up to 3 redirects, read body as text, compute SHA-256 hash. Per-publisher
 * adapters that need site-specific parsing slot in later by extending this.
 */
export class HttpSourceFetcher implements SourceFetcherPort {
  resolvePublisher(url: string): { publisher: string; tier: SourceTier } {
    const match = sourceTierWhitelist.resolve(url);
    if (!match) {
      throw new Error(`publisher_not_whitelisted: ${new URL(url).hostname}`);
    }
    return { publisher: match.publisher, tier: match.tier };
  }

  async fetch(url: string, signal: AbortSignal): Promise<FetchOutcome> {
    const match = sourceTierWhitelist.resolve(url);
    if (!match) throw new Error(`publisher_not_whitelisted: ${new URL(url).hostname}`);
    const response = await fetch(url, {
      method: 'GET',
      redirect: 'follow',
      headers: { 'User-Agent': 'KawalBot/0.0 (+https://kawal.local)' },
      signal,
    });
    if (!response.ok) {
      throw new Error(`fetch_failed: ${response.status}`);
    }
    const bodyText = await response.text();
    const bodyHash = `sha256:${createHash('sha256').update(bodyText).digest('hex')}`;
    return {
      publisher: match.publisher,
      tier: match.tier,
      status: response.status,
      fetchedAt: new Date(),
      bodyText,
      bodyHash,
      canonicalUrl: response.url || url,
    };
  }
}
