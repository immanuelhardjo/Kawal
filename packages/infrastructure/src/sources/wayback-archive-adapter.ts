import type { ArchivePort } from '@kawal/application';

/**
 * Spec: osint-ingestion / "Archive-URL fallback".
 *
 * Captures via the Wayback "save" endpoint and returns the resulting
 * snapshot URL. Failures are non-fatal — the ingest pipeline records null.
 */
export class WaybackArchiveAdapter implements ArchivePort {
  async capture(url: string, signal: AbortSignal): Promise<{ archiveUrl: string | null }> {
    try {
      const saveUrl = `https://web.archive.org/save/${url}`;
      const response = await fetch(saveUrl, {
        method: 'GET',
        signal,
        headers: { 'User-Agent': 'KawalBot/0.0 (+https://kawal.local)' },
      });
      if (!response.ok) return { archiveUrl: null };
      const location = response.headers.get('content-location');
      if (location) return { archiveUrl: `https://web.archive.org${location}` };
      return { archiveUrl: response.url || null };
    } catch {
      return { archiveUrl: null };
    }
  }
}
