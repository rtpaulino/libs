import { describe, it, expect } from 'vitest';
import {
  findDuplicates,
  truncateWithEllipsis,
  extractBetween,
} from './string.js';

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

describe('truncateWithEllipsis', () => {
  it('should return text as-is when shorter than maxLength', () => {
    const result = truncateWithEllipsis('Hello World', 20);
    expect(result).toBe('Hello World');
  });

  it('should return text as-is when equal to maxLength', () => {
    const result = truncateWithEllipsis('Hello World', 11);
    expect(result).toBe('Hello World');
  });

  it('should truncate text longer than maxLength', () => {
    const result = truncateWithEllipsis('Hello World this is a long text', 20);
    expect(result).toBe('Hello World this ...');
    expect(result).toHaveLength(20);
  });

  it('should use default maxLength of 80 when not specified', () => {
    const longText = 'a'.repeat(100);
    const result = truncateWithEllipsis(longText);
    expect(result).toHaveLength(80);
    expect(result.endsWith('...')).toBe(true);
  });

  it('should replace newlines with spaces', () => {
    const result = truncateWithEllipsis('Hello\nWorld\nTest', 50);
    expect(result).toBe('Hello World Test');
    expect(result).not.toContain('\n');
  });

  it('should remove newlines and truncate when text is too long', () => {
    const text = 'Line 1\nLine 2\nLine 3\nLine 4\nLine 5';
    const result = truncateWithEllipsis(text, 20);
    expect(result).toBe('Line 1 Line 2 Lin...');
    expect(result).not.toContain('\n');
  });

  it('should trim whitespace from cleaned text', () => {
    const result = truncateWithEllipsis('  Hello World  ', 50);
    expect(result).toBe('Hello World');
  });

  it('should handle empty string', () => {
    const result = truncateWithEllipsis('', 20);
    expect(result).toBe('');
  });

  it('should handle string with only whitespace', () => {
    const result = truncateWithEllipsis('   \n  \n  ', 20);
    expect(result).toBe('');
  });

  it('should handle very small maxLength', () => {
    const result = truncateWithEllipsis('Hello', 3);
    expect(result).toBe('...');
  });

  it('should handle maxLength of 4', () => {
    const result = truncateWithEllipsis('Hello World', 4);
    expect(result).toBe('H...');
  });

  it('should handle text with multiple consecutive newlines', () => {
    const result = truncateWithEllipsis('Hello\n\n\nWorld', 50);
    expect(result).toBe('Hello   World');
  });

  it('should handle text with tabs and newlines', () => {
    const result = truncateWithEllipsis('Hello\t\nWorld', 50);
    expect(result).toBe('Hello\t World');
  });

  it('should handle unicode characters', () => {
    const result = truncateWithEllipsis('Hello 😀 World 👍', 20);
    expect(result).toBe('Hello 😀 World 👍');
  });

  it('should truncate unicode text correctly', () => {
    const text = 'A'.repeat(40) + '😀'.repeat(40);
    const result = truncateWithEllipsis(text, 50);
    expect(result).toHaveLength(50);
    expect(result.endsWith('...')).toBe(true);
  });
});

describe('extractBetween', () => {
  it('should extract content between two strings', () => {
    const input = 'Hello [START]content[END] World';
    const result = extractBetween(input, '[START]', '[END]');
    expect(result).toBe('[START]content[END]');
  });

  it('should include start and end strings in result', () => {
    const input = 'prefix<<<data>>>suffix';
    const result = extractBetween(input, '<<<', '>>>');
    expect(result).toBe('<<<data>>>');
  });

  it('should work with multiline content', () => {
    const input =
      'Line 1\n<start>\nContent Line 1\nContent Line 2\n</start>\nLine 2';
    const result = extractBetween(input, '<start>', '</start>');
    expect(result).toBe('<start>\nContent Line 1\nContent Line 2\n</start>');
  });

  it('should work when start and end are on same line', () => {
    const input = 'Before {content} After';
    const result = extractBetween(input, '{', '}');
    expect(result).toBe('{content}');
  });

  it('should find first occurrence when multiple matches exist', () => {
    const input = 'First [A]data1[B] Second [A]data2[B]';
    const result = extractBetween(input, '[A]', '[B]');
    expect(result).toBe('[A]data1[B]');
  });

  it('should throw error when start string not found', () => {
    const input = 'Hello World';
    expect(() => extractBetween(input, '[START]', '[END]')).toThrow(
      'Start string "[START]" not found in input',
    );
  });

  it('should throw error when end string not found', () => {
    const input = 'Hello [START] World';
    expect(() => extractBetween(input, '[START]', '[END]')).toThrow(
      'End string "[END]" not found in input after start string',
    );
  });

  it('should throw error when start string is empty', () => {
    const input = 'Hello World';
    expect(() => extractBetween(input, '', '[END]')).toThrow(
      'Start string "" not found in input',
    );
  });

  it('should throw error when end string is empty', () => {
    const input = 'Hello [START] World';
    expect(() => extractBetween(input, '[START]', '')).toThrow(
      'End string "" not found in input after start string',
    );
  });

  it('should handle empty content between markers', () => {
    const input = 'Before ()After';
    const result = extractBetween(input, '(', ')');
    expect(result).toBe('()');
  });

  it('should work with single character markers', () => {
    const input = 'Text <content> more';
    const result = extractBetween(input, '<', '>');
    expect(result).toBe('<content>');
  });

  it('should work with same start and end strings when they appear twice', () => {
    const input = 'Before | content | After';
    const result = extractBetween(input, '| ', ' |');
    expect(result).toBe('| content |');
  });

  it('should handle special characters in markers', () => {
    const input = 'Start $$$data$$$ End';
    const result = extractBetween(input, '$$$', '$$$');
    expect(result).toBe('$$$data$$$');
  });

  it('should extract content at the beginning of string', () => {
    const input = '[START]content[END] remaining text';
    const result = extractBetween(input, '[START]', '[END]');
    expect(result).toBe('[START]content[END]');
  });

  it('should extract content at the end of string', () => {
    const input = 'prefix [START]content[END]';
    const result = extractBetween(input, '[START]', '[END]');
    expect(result).toBe('[START]content[END]');
  });

  it('should handle long multiline content', () => {
    const input = [
      '# Header',
      '```typescript',
      'const code = "example";',
      'function test() {',
      '  return true;',
      '}',
      '```',
      '# Footer',
    ].join('\n');
    const result = extractBetween(input, '```typescript', '```');
    expect(result).toContain('const code = "example";');
    expect(result).toContain('```typescript');
    expect(result.endsWith('```')).toBe(true);
  });

  it('should handle adjacent markers', () => {
    const input = 'prefix[]suffix';
    const result = extractBetween(input, '[', ']');
    expect(result).toBe('[]');
  });

  it('should not be greedy - stops at first end marker', () => {
    const input = 'Start [A] content [A] more [A] end';
    const result = extractBetween(input, '[A]', '[A]');
    expect(result).toBe('[A] content [A]');
  });

  it('should handle unicode in markers', () => {
    const input = 'Before 【content】 After';
    const result = extractBetween(input, '【', '】');
    expect(result).toBe('【content】');
  });

  it('should handle unicode in content', () => {
    const input = 'Start <😀🎉👍> End';
    const result = extractBetween(input, '<', '>');
    expect(result).toBe('<😀🎉👍>');
  });
});
