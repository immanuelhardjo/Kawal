import { describe, expect, it } from 'vitest';
import { InvariantViolation } from '../errors.js';
import { DEFAULT_EXCERPT_MAX_CHARS, Excerpt } from './excerpt.js';

describe('Excerpt', () => {
  it('caps at the default max length', () => {
    expect(() => Excerpt.of('a'.repeat(DEFAULT_EXCERPT_MAX_CHARS + 1))).toThrow(InvariantViolation);
  });

  it('caps at a custom max length', () => {
    expect(() => Excerpt.of('hello world', 5)).toThrow(InvariantViolation);
  });

  it('rejects empty', () => {
    expect(() => Excerpt.of('   ')).toThrow(InvariantViolation);
  });

  it('trims whitespace', () => {
    expect(Excerpt.of('  some text  ').value).toBe('some text');
  });
});
