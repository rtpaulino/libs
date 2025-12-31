import { describe, it, expect } from 'vitest';
import { isPrimitive } from './type.js';

describe('isPrimitive', () => {
  it('should return true for null', () => {
    expect(isPrimitive(null)).toBe(true);
  });

  it('should return true for undefined', () => {
    expect(isPrimitive(undefined)).toBe(true);
  });

  it('should return true for boolean values', () => {
    expect(isPrimitive(true)).toBe(true);
    expect(isPrimitive(false)).toBe(true);
  });

  it('should return true for numbers', () => {
    expect(isPrimitive(0)).toBe(true);
    expect(isPrimitive(42)).toBe(true);
    expect(isPrimitive(-42)).toBe(true);
    expect(isPrimitive(3.14)).toBe(true);
    expect(isPrimitive(NaN)).toBe(true);
    expect(isPrimitive(Infinity)).toBe(true);
    expect(isPrimitive(-Infinity)).toBe(true);
  });

  it('should return true for strings', () => {
    expect(isPrimitive('')).toBe(true);
    expect(isPrimitive('hello')).toBe(true);
    expect(isPrimitive('123')).toBe(true);
  });

  it('should return true for bigint', () => {
    expect(isPrimitive(BigInt(123))).toBe(true);
    expect(isPrimitive(123n)).toBe(true);
  });

  it('should return true for symbols', () => {
    expect(isPrimitive(Symbol())).toBe(true);
    expect(isPrimitive(Symbol('test'))).toBe(true);
  });

  it('should return false for objects', () => {
    expect(isPrimitive({})).toBe(false);
    expect(isPrimitive({ key: 'value' })).toBe(false);
    expect(isPrimitive(new Object())).toBe(false);
  });

  it('should return false for arrays', () => {
    expect(isPrimitive([])).toBe(false);
    expect(isPrimitive([1, 2, 3])).toBe(false);
  });

  it('should return false for functions', () => {
    expect(isPrimitive(() => {})).toBe(false);
    expect(isPrimitive(function () {})).toBe(false);
    expect(isPrimitive(async () => {})).toBe(false);
  });

  it('should return false for dates', () => {
    expect(isPrimitive(new Date())).toBe(false);
  });

  it('should return false for regular expressions', () => {
    expect(isPrimitive(/test/)).toBe(false);
    expect(isPrimitive(new RegExp('test'))).toBe(false);
  });

  it('should return false for Map and Set', () => {
    expect(isPrimitive(new Map())).toBe(false);
    expect(isPrimitive(new Set())).toBe(false);
  });

  it('should return false for class instances', () => {
    class TestClass {}
    expect(isPrimitive(new TestClass())).toBe(false);
  });

  it('should return false for wrapped primitives', () => {
    expect(isPrimitive(new Number(42))).toBe(false);
    expect(isPrimitive(new String('test'))).toBe(false);
    expect(isPrimitive(new Boolean(true))).toBe(false);
  });
});
