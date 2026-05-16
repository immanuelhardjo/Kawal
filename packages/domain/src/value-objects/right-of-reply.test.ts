import { describe, expect, it } from 'vitest';
import { InvariantViolation } from '../errors.js';
import { BahasaText } from './bahasa-text.js';
import { RightOfReply } from './right-of-reply.js';

describe('RightOfReply', () => {
  it('is empty by default', () => {
    const r = RightOfReply.empty();
    expect(r.isEmpty()).toBe(true);
    expect(r.statement).toBeNull();
  });

  it('carries a statement when populated', () => {
    const r = RightOfReply.withStatement({
      text: BahasaText.of('Saya membantah tuduhan tersebut.'),
      sourceId: 'src_1',
      publishedAt: new Date('2024-06-01'),
    });
    expect(r.isEmpty()).toBe(false);
    expect(r.statement?.sourceId).toBe('src_1');
  });

  it('rejects statement without sourceId', () => {
    expect(() =>
      RightOfReply.withStatement({
        text: BahasaText.of('x'),
        sourceId: '',
        publishedAt: new Date('2024-06-01'),
      }),
    ).toThrow(InvariantViolation);
  });
});
