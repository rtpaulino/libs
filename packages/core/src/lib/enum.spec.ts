import { describe, it, expect } from 'vitest';
import { isEnumValue, toEnum } from './enum.js';

describe('enum utilities', () => {
  // Test enum for use in tests
  const TestEnum = {
    VALUE1: 'VALUE1',
    VALUE2: 'VALUE2',
    VALUE3: 'VALUE3',
  } as const;

  const StringEnum = {
    ACTIVE: 'active',
    INACTIVE: 'inactive',
    PENDING: 'pending',
  } as const;

  describe('isEnumValue', () => {
    it('should return true for valid enum values', () => {
      expect(isEnumValue(TestEnum, 'VALUE1')).toBe(true);
      expect(isEnumValue(TestEnum, 'VALUE2')).toBe(true);
      expect(isEnumValue(TestEnum, 'VALUE3')).toBe(true);
    });

    it('should return true for valid string enum values', () => {
      expect(isEnumValue(StringEnum, 'active')).toBe(true);
      expect(isEnumValue(StringEnum, 'inactive')).toBe(true);
      expect(isEnumValue(StringEnum, 'pending')).toBe(true);
    });

    it('should return false for invalid enum values', () => {
      expect(isEnumValue(TestEnum, 'INVALID')).toBe(false);
      expect(isEnumValue(TestEnum, 'value1')).toBe(false);
      expect(isEnumValue(TestEnum, '')).toBe(false);
    });

    it('should return false for null', () => {
      expect(isEnumValue(TestEnum, null)).toBe(false);
    });

    it('should return false for undefined', () => {
      expect(isEnumValue(TestEnum, undefined)).toBe(false);
    });

    it('should handle empty enum', () => {
      const EmptyEnum = {} as const;
      expect(isEnumValue(EmptyEnum, 'anything')).toBe(false);
    });

    it('should handle single value enum', () => {
      const SingleEnum = { ONLY: 'ONLY' } as const;
      expect(isEnumValue(SingleEnum, 'ONLY')).toBe(true);
      expect(isEnumValue(SingleEnum, 'OTHER')).toBe(false);
    });

    it('should be case-sensitive', () => {
      expect(isEnumValue(TestEnum, 'value1')).toBe(false);
      expect(isEnumValue(StringEnum, 'ACTIVE')).toBe(false);
      expect(isEnumValue(StringEnum, 'Active')).toBe(false);
    });

    it('should not match partial strings', () => {
      expect(isEnumValue(TestEnum, 'VALUE')).toBe(false);
      expect(isEnumValue(TestEnum, 'VALUE11')).toBe(false);
    });
  });

  describe('toEnum', () => {
    it('should return the value for valid enum values', () => {
      expect(toEnum(TestEnum, 'VALUE1')).toBe('VALUE1');
      expect(toEnum(TestEnum, 'VALUE2')).toBe('VALUE2');
      expect(toEnum(TestEnum, 'VALUE3')).toBe('VALUE3');
    });

    it('should return the value for valid string enum values', () => {
      expect(toEnum(StringEnum, 'active')).toBe('active');
      expect(toEnum(StringEnum, 'inactive')).toBe('inactive');
      expect(toEnum(StringEnum, 'pending')).toBe('pending');
    });

    it('should throw error for invalid enum values', () => {
      expect(() => toEnum(TestEnum, 'INVALID')).toThrow(
        'INVALID is not a valid enum value',
      );
      expect(() => toEnum(TestEnum, 'value1')).toThrow(
        'value1 is not a valid enum value',
      );
      expect(() => toEnum(TestEnum, '')).toThrow(' is not a valid enum value');
    });

    it('should throw error for null', () => {
      expect(() => toEnum(TestEnum, null)).toThrow(
        'null is not a valid enum value',
      );
    });

    it('should throw error for undefined', () => {
      expect(() => toEnum(TestEnum, undefined)).toThrow(
        'undefined is not a valid enum value',
      );
    });

    it('should throw error with empty enum', () => {
      const EmptyEnum = {} as const;
      expect(() => toEnum(EmptyEnum, 'anything')).toThrow(
        'anything is not a valid enum value',
      );
    });

    it('should work with single value enum', () => {
      const SingleEnum = { ONLY: 'ONLY' } as const;
      expect(toEnum(SingleEnum, 'ONLY')).toBe('ONLY');
      expect(() => toEnum(SingleEnum, 'OTHER')).toThrow(
        'OTHER is not a valid enum value',
      );
    });

    it('should be case-sensitive', () => {
      expect(() => toEnum(TestEnum, 'value1')).toThrow();
      expect(() => toEnum(StringEnum, 'ACTIVE')).toThrow();
      expect(() => toEnum(StringEnum, 'Active')).toThrow();
    });

    it('should not match partial strings', () => {
      expect(() => toEnum(TestEnum, 'VALUE')).toThrow();
      expect(() => toEnum(TestEnum, 'VALUE11')).toThrow();
    });
  });

  describe('integration tests', () => {
    it('should work together for validation and conversion', () => {
      const value = 'VALUE1';
      if (isEnumValue(TestEnum, value)) {
        const converted = toEnum(TestEnum, value);
        expect(converted).toBe('VALUE1');
      }
    });

    it('should work with different enum types', () => {
      const StatusEnum = {
        SUCCESS: 'success',
        ERROR: 'error',
        WARNING: 'warning',
      } as const;

      expect(isEnumValue(StatusEnum, 'success')).toBe(true);
      expect(toEnum(StatusEnum, 'success')).toBe('success');
      expect(isEnumValue(StatusEnum, 'invalid')).toBe(false);
      expect(() => toEnum(StatusEnum, 'invalid')).toThrow();
    });

    it('should handle enums with special characters', () => {
      const SpecialEnum = {
        'HYPHEN-VALUE': 'hyphen-value',
        UNDERSCORE_VALUE: 'underscore_value',
        'DOT.VALUE': 'dot.value',
      } as const;

      expect(isEnumValue(SpecialEnum, 'hyphen-value')).toBe(true);
      expect(toEnum(SpecialEnum, 'underscore_value')).toBe('underscore_value');
      expect(isEnumValue(SpecialEnum, 'dot.value')).toBe(true);
    });
  });
});
