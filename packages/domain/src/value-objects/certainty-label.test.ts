import { describe, expect, it } from 'vitest';
import { InvariantViolation } from '../errors.js';
import { CERTAINTY_LABELS, isCertaintyLabel, parseCertaintyLabel } from './certainty-label.js';

describe('CertaintyLabel', () => {
  it('accepts every label in the documented vocabulary', () => {
    for (const label of CERTAINTY_LABELS) {
      expect(parseCertaintyLabel(label)).toBe(label);
      expect(isCertaintyLabel(label)).toBe(true);
    }
  });

  it('rejects values outside the vocabulary', () => {
    expect(() => parseCertaintyLabel('certain')).toThrow(InvariantViolation);
    expect(() => parseCertaintyLabel('')).toThrow(InvariantViolation);
    expect(() => parseCertaintyLabel(null)).toThrow(InvariantViolation);
    expect(isCertaintyLabel('certain')).toBe(false);
  });
});
