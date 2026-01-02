import { describe, it, expect } from 'vitest';
import { findDuplicates } from './string.js';

describe('findDuplicates', () => {
  it('should return empty array for empty input', () => {
    const result = findDuplicates([]);
    expect(result).toEqual([]);
  });

  it('should return empty array when no duplicates exist', () => {
    const result = findDuplicates(['a', 'b', 'c', 'd']);
    expect(result).toEqual([]);
  });

  it('should find single duplicate', () => {
    const result = findDuplicates(['a', 'b', 'a']);
    expect(result).toEqual(['a']);
  });

  it('should find multiple duplicates', () => {
    const result = findDuplicates(['a', 'b', 'a', 'c', 'b', 'd']);
    expect(result).toContain('a');
    expect(result).toContain('b');
    expect(result).toHaveLength(2);
  });

  it('should find duplicates with multiple occurrences', () => {
    const result = findDuplicates(['a', 'a', 'a', 'b', 'b']);
    expect(result).toContain('a');
    expect(result).toContain('b');
    expect(result).toHaveLength(2);
  });

  it('should handle single element array', () => {
    const result = findDuplicates(['a']);
    expect(result).toEqual([]);
  });

  it('should handle array with all same elements', () => {
    const result = findDuplicates(['a', 'a', 'a', 'a']);
    expect(result).toEqual(['a']);
  });

  it('should handle strings with spaces', () => {
    const result = findDuplicates(['hello world', 'test', 'hello world']);
    expect(result).toEqual(['hello world']);
  });

  it('should handle empty strings', () => {
    const result = findDuplicates(['', 'a', '']);
    expect(result).toEqual(['']);
  });

  it('should be case sensitive', () => {
    const result = findDuplicates(['A', 'a', 'A']);
    expect(result).toEqual(['A']);
  });

  it('should maintain order of first duplicate occurrence', () => {
    const result = findDuplicates(['c', 'a', 'b', 'a', 'b', 'c']);
    // First duplicate found is 'a', then 'b', then 'c'
    expect(result).toEqual(['a', 'b', 'c']);
  });

  it('should handle special characters', () => {
    const result = findDuplicates(['@', '#', '$', '@', '#']);
    expect(result).toContain('@');
    expect(result).toContain('#');
    expect(result).toHaveLength(2);
  });

  it('should handle unicode characters', () => {
    const result = findDuplicates(['😀', '👍', '😀']);
    expect(result).toEqual(['😀']);
  });

  it('should handle large arrays efficiently', () => {
    const largeArray = Array(1000)
      .fill('a')
      .concat(Array(1000).fill('b'), ['a', 'b']);
    const result = findDuplicates(largeArray);
    expect(result).toContain('a');
    expect(result).toContain('b');
    expect(result).toHaveLength(2);
  });
});
