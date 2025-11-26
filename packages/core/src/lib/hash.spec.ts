import { describe, it, expect } from 'vitest';
import { sha1 } from './hash';

describe('sha1', () => {
  it('should return a hex encoded string for a buffer', () => {
    const buffer = Buffer.from('hello');
    const result = sha1(buffer);
    expect(result).toBe('aaf4c61ddcc5e8a2dabede0f3b482cd9aea9434d');
  });

  it('should return a hex encoded string for an empty buffer', () => {
    const buffer = Buffer.from('');
    const result = sha1(buffer);
    expect(result).toBe('da39a3ee5e6b4b0d3255bfef95601890afd80709');
  });

  it('should return a hex encoded string for a buffer with multiple lines', () => {
    const buffer = Buffer.from('line1\nline2\nline3');
    const result = sha1(buffer);
    expect(result).toBe('0ab7283988e8f49022d126054947f222cbdf0a52');
  });

  it('should return consistent results for the same input', () => {
    const buffer = Buffer.from('test');
    const result1 = sha1(buffer);
    const result2 = sha1(buffer);
    expect(result1).toBe(result2);
  });

  it('should return different results for different inputs', () => {
    const buffer1 = Buffer.from('test1');
    const buffer2 = Buffer.from('test2');
    const result1 = sha1(buffer1);
    const result2 = sha1(buffer2);
    expect(result1).not.toBe(result2);
  });
});
