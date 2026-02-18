import { describe, it, expect } from 'vitest';
import {
  deserializeNumber,
  deserializeNumberFromBigInt,
} from './primitive-deserializers.js';

describe('deserializeNumber', () => {
  it('should return the number as-is', () => {
    expect(deserializeNumber(42)).toBe(42);
    expect(deserializeNumber(0)).toBe(0);
    expect(deserializeNumber(-7.5)).toBe(-7.5);
  });

  it('should throw for non-number values', () => {
    expect(() => deserializeNumber('42')).toThrow();
    expect(() => deserializeNumber(42n)).toThrow();
    expect(() => deserializeNumber(null)).toThrow();
    expect(() => deserializeNumber(undefined)).toThrow();
    expect(() => deserializeNumber(true)).toThrow();
  });
});

describe('deserializeNumberFromBigInt', () => {
  describe('number input', () => {
    it('should return a number as-is', () => {
      expect(deserializeNumberFromBigInt(42)).toBe(42);
      expect(deserializeNumberFromBigInt(0)).toBe(0);
      expect(deserializeNumberFromBigInt(-99)).toBe(-99);
      expect(deserializeNumberFromBigInt(3.14)).toBe(3.14);
    });
  });

  describe('bigint input', () => {
    it('should convert a bigint to number', () => {
      expect(deserializeNumberFromBigInt(42n)).toBe(42);
      expect(deserializeNumberFromBigInt(0n)).toBe(0);
      expect(deserializeNumberFromBigInt(-100n)).toBe(-100);
    });

    it('should convert large safe-integer bigints correctly', () => {
      expect(deserializeNumberFromBigInt(BigInt(Number.MAX_SAFE_INTEGER))).toBe(
        Number.MAX_SAFE_INTEGER,
      );
      expect(deserializeNumberFromBigInt(BigInt(Number.MIN_SAFE_INTEGER))).toBe(
        Number.MIN_SAFE_INTEGER,
      );
    });

    it('should lose precision for bigints exceeding MAX_SAFE_INTEGER (expected lossy behaviour)', () => {
      const big = BigInt(Number.MAX_SAFE_INTEGER) + 1n;
      const result = deserializeNumberFromBigInt(big);
      // result is a number but may not be exactly representable
      expect(typeof result).toBe('number');
    });
  });

  describe('integer string input', () => {
    it('should parse a plain integer string', () => {
      expect(deserializeNumberFromBigInt('42')).toBe(42);
      expect(deserializeNumberFromBigInt('0')).toBe(0);
    });

    it('should parse a negative integer string', () => {
      expect(deserializeNumberFromBigInt('-100')).toBe(-100);
    });

    it('should parse a large integer string within safe range', () => {
      expect(deserializeNumberFromBigInt(String(Number.MAX_SAFE_INTEGER))).toBe(
        Number.MAX_SAFE_INTEGER,
      );
    });
  });

  describe('invalid input', () => {
    it('should throw for a non-integer string', () => {
      expect(() => deserializeNumberFromBigInt('3.14')).toThrow();
      expect(() => deserializeNumberFromBigInt('abc')).toThrow();
      expect(() => deserializeNumberFromBigInt('')).toThrow();
      expect(() => deserializeNumberFromBigInt('1e5')).toThrow();
      expect(() => deserializeNumberFromBigInt(' 42')).toThrow();
    });

    it('should throw for boolean', () => {
      expect(() => deserializeNumberFromBigInt(true)).toThrow();
      expect(() => deserializeNumberFromBigInt(false)).toThrow();
    });

    it('should throw for null', () => {
      expect(() => deserializeNumberFromBigInt(null)).toThrow();
    });

    it('should throw for undefined', () => {
      expect(() => deserializeNumberFromBigInt(undefined)).toThrow();
    });

    it('should throw for objects', () => {
      expect(() => deserializeNumberFromBigInt({})).toThrow();
      expect(() => deserializeNumberFromBigInt([])).toThrow();
    });
  });
});
