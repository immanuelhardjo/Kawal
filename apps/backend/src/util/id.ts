import { randomBytes } from 'node:crypto';

/**
 * 22-char URL-safe base64 from 16 random bytes. Unique enough for our
 * volume and shorter than UUIDv4 in URLs.
 */
export function newId(): string {
  return randomBytes(16).toString('base64url');
}
