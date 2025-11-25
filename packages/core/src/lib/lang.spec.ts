import { describe, it, expect } from 'vitest';
import { plural, join } from './lang';

describe('lang', () => {
  describe('plural', () => {
    it('should return empty string for 1', () => {
      expect(plural(1)).toBe('');
    });

    it('should return "s" for 0', () => {
      expect(plural(0)).toBe('s');
    });

    it('should return "s" for 2', () => {
      expect(plural(2)).toBe('s');
    });

    it('should return "s" for positive numbers greater than 1', () => {
      expect(plural(5)).toBe('s');
      expect(plural(100)).toBe('s');
      expect(plural(999)).toBe('s');
    });

    it('should return empty string for -1', () => {
      expect(plural(-1)).toBe('');
    });

    it('should return "s" for negative numbers other than -1', () => {
      expect(plural(-2)).toBe('s');
      expect(plural(-100)).toBe('s');
      expect(plural(-999)).toBe('s');
    });

    it('should handle decimal numbers by truncating them', () => {
      expect(plural(1.9)).toBe('');
      expect(plural(1.1)).toBe('');
      expect(plural(2.9)).toBe('s');
      expect(plural(-1.9)).toBe('');
      expect(plural(-2.1)).toBe('s');
    });

    it('should handle very large numbers', () => {
      expect(plural(1e10)).toBe('s');
      expect(plural(1e10 + 1)).toBe('s');
    });

    it('should work with negative decimals', () => {
      expect(plural(-1.5)).toBe('');
      expect(plural(-2.5)).toBe('s');
    });
  });

  describe('join', () => {
    it('should return empty string for empty array', () => {
      expect(join([])).toBe('');
    });

    it('should return the single element for array with one element', () => {
      expect(join(['apple'])).toBe('apple');
    });

    it('should return elements joined with "and" for array with two elements', () => {
      expect(join(['apple', 'banana'])).toBe('apple and banana');
    });

    it('should return elements joined with commas and "and" for array with three elements', () => {
      expect(join(['apple', 'banana', 'cherry'])).toBe(
        'apple, banana and cherry',
      );
    });

    it('should return elements joined with commas and "and" for array with many elements', () => {
      expect(join(['apple', 'banana', 'cherry', 'date', 'elderberry'])).toBe(
        'apple, banana, cherry, date and elderberry',
      );
    });

    it('should preserve the exact string values', () => {
      expect(join(['Hello', 'World'])).toBe('Hello and World');
    });

    it('should work with numeric strings', () => {
      expect(join(['1', '2', '3'])).toBe('1, 2 and 3');
    });

    it('should work with special characters in strings', () => {
      expect(join(['a-b', 'c/d', 'e_f'])).toBe('a-b, c/d and e_f');
    });

    it('should work with empty strings in the array', () => {
      expect(join(['', 'b', 'c'])).toBe(', b and c');
    });

    it('should work with whitespace in strings', () => {
      expect(join(['hello world', 'foo bar'])).toBe('hello world and foo bar');
      expect(join(['a', 'b c', 'd'])).toBe('a, b c and d');
    });
  });
});
