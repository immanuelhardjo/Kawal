import type { AIScope, CardImage, CardPort } from '@kawal/application';

/**
 * Imagen / Nano Banana wrapper. Stub for now; real wiring is a follow-up.
 */
export class StubImageCardAdapter implements CardPort {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async generate(_input: { scope: AIScope; snippetText: string }): Promise<CardImage> {
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    return {
      imageUrl: 'about:blank',
      expiresAt,
    };
  }
}
