import { describe, it, expect } from 'vitest';
import { excludeNil } from './filters.js';

describe('excludeNil', () => {
  it('should return true for truthy values', () => {
    expect(excludeNil(1)).toBe(true);
    expect(excludeNil('string')).toBe(true);
    expect(excludeNil({})).toBe(true);
    expect(excludeNil([])).toBe(true);
    expect(excludeNil(true)).toBe(true);
  });

  it('should return false for null', () => {
    expect(excludeNil(null)).toBe(false);
  });

  it('should return false for undefined', () => {
    expect(excludeNil(undefined)).toBe(false);
  });

  it('should work as a type guard in filter', () => {
    const values: (string | null | undefined)[] = [
      'hello',
      null,
      'world',
      undefined,
      'test',
    ];

    const filtered = values.filter(excludeNil);
    expect(filtered).toEqual(['hello', 'world', 'test']);
    expect(filtered.length).toBe(3);
  });

  it('should work with zero and false', () => {
    expect(excludeNil(0)).toBe(false);
    expect(excludeNil(false)).toBe(false);
    expect(excludeNil('')).toBe(false);
  });
});
