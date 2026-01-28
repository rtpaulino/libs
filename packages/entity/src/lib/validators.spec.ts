import { describe, it, expect } from 'vitest';
import {
  enumValidator,
  intValidator,
  minLengthValidator,
  maxLengthValidator,
  patternValidator,
  minValidator,
  maxValidator,
  arrayMinLengthValidator,
  arrayMaxLengthValidator,
} from './validators.js';
import type { Problem } from './problem.js';

describe('validators', () => {
  describe('enumValidator', () => {
    enum Status {
      Active = 'active',
      Inactive = 'inactive',
      Pending = 'pending',
    }

    enum Priority {
      Low = 'low',
      Medium = 'medium',
      High = 'high',
    }

    it('should return empty array for valid enum value', () => {
      const validator = enumValidator(Status);
      const result = validator({ value: 'active' });
      expect(result).toEqual([]);
    });

    it('should return empty array for all valid enum values', () => {
      const validator = enumValidator(Status);
      expect(validator({ value: 'active' })).toEqual([]);
      expect(validator({ value: 'inactive' })).toEqual([]);
      expect(validator({ value: 'pending' })).toEqual([]);
    });

    it('should return problem for invalid enum value', () => {
      const validator = enumValidator(Status);
      const result = validator({ value: 'invalid' }) as Problem[];
      expect(result).toHaveLength(1);
      expect(result[0].property).toBe('');
      expect(result[0].message).toContain('Expected one of');
      expect(result[0].message).toContain('active, inactive, pending');
      expect(result[0].message).toContain('invalid');
    });

    it('should work with different enum types', () => {
      const statusValidator = enumValidator(Status);
      const priorityValidator = enumValidator(Priority);

      expect(statusValidator({ value: 'active' })).toEqual([]);
      expect(statusValidator({ value: 'low' })).toHaveLength(1);

      expect(priorityValidator({ value: 'low' })).toEqual([]);
      expect(priorityValidator({ value: 'active' })).toHaveLength(1);
    });

    it('should be case-sensitive', () => {
      const validator = enumValidator(Status);
      const result = validator({ value: 'Active' }) as Problem[];
      expect(result).toHaveLength(1);
      expect(result[0].message).toContain('Active');
    });

    it('should list all valid values in error message', () => {
      const validator = enumValidator(Priority);
      const result = validator({ value: 'invalid' }) as Problem[];
      expect(result[0].message).toContain('low');
      expect(result[0].message).toContain('medium');
      expect(result[0].message).toContain('high');
    });
  });

  describe('intValidator', () => {
    it('should return empty array for positive integer', () => {
      const validator = intValidator();
      const result = validator({ value: 42 });
      expect(result).toEqual([]);
    });

    it('should return empty array for zero', () => {
      const validator = intValidator();
      const result = validator({ value: 0 });
      expect(result).toEqual([]);
    });

    it('should return empty array for negative integer', () => {
      const validator = intValidator();
      const result = validator({ value: -10 });
      expect(result).toEqual([]);
    });

    it('should return empty array for large integer', () => {
      const validator = intValidator();
      const result = validator({ value: 999999 });
      expect(result).toEqual([]);
    });

    it('should return problem for decimal number', () => {
      const validator = intValidator();
      const result = validator({ value: 42.5 }) as Problem[];
      expect(result).toHaveLength(1);
      expect(result[0].property).toBe('');
      expect(result[0].message).toContain('Expected an integer');
      expect(result[0].message).toContain('42.5');
    });

    it('should return problem for small decimal', () => {
      const validator = intValidator();
      const result = validator({ value: 42.1 }) as Problem[];
      expect(result).toHaveLength(1);
      expect(result[0].message).toContain('42.1');
    });

    it('should return problem for negative decimal', () => {
      const validator = intValidator();
      const result = validator({ value: -5.5 }) as Problem[];
      expect(result).toHaveLength(1);
      expect(result[0].message).toContain('-5.5');
    });

    it('should return problem for NaN', () => {
      const validator = intValidator();
      const result = validator({ value: NaN }) as Problem[];
      expect(result).toHaveLength(1);
      expect(result[0].message).toContain('Expected an integer');
    });

    it('should return problem for Infinity', () => {
      const validator = intValidator();
      const result = validator({ value: Infinity }) as Problem[];
      expect(result).toHaveLength(1);
      expect(result[0].message).toContain('Expected an integer');
    });

    it('should return problem for negative Infinity', () => {
      const validator = intValidator();
      const result = validator({ value: -Infinity }) as Problem[];
      expect(result).toHaveLength(1);
      expect(result[0].message).toContain('Expected an integer');
    });

    it('should accept Number.MAX_SAFE_INTEGER', () => {
      const validator = intValidator();
      const result = validator({ value: Number.MAX_SAFE_INTEGER });
      expect(result).toEqual([]);
    });

    it('should accept Number.MIN_SAFE_INTEGER', () => {
      const validator = intValidator();
      const result = validator({ value: Number.MIN_SAFE_INTEGER });
      expect(result).toEqual([]);
    });

    it('should be reusable across multiple validations', () => {
      const validator = intValidator();
      expect(validator({ value: 1 })).toEqual([]);
      expect(validator({ value: 2 })).toEqual([]);
      expect(validator({ value: 3.5 })).toHaveLength(1);
      expect(validator({ value: 4 })).toEqual([]);
    });
  });

  describe('minLengthValidator', () => {
    it('should return empty array for string meeting minimum length', () => {
      const validator = minLengthValidator(3);
      expect(validator({ value: 'abc' })).toEqual([]);
      expect(validator({ value: 'abcd' })).toEqual([]);
    });

    it('should return problem for string below minimum length', () => {
      const validator = minLengthValidator(5);
      const result = validator({ value: 'abc' }) as Problem[];
      expect(result).toHaveLength(1);
      expect(result[0].property).toBe('');
      expect(result[0].message).toContain('Expected minimum length 5');
      expect(result[0].message).toContain('received length 3');
    });

    it('should work with empty strings', () => {
      const validator = minLengthValidator(1);
      const result = validator({ value: '' }) as Problem[];
      expect(result).toHaveLength(1);
      expect(result[0].message).toContain('Expected minimum length 1');
      expect(result[0].message).toContain('received length 0');
    });

    it('should allow empty strings when minLength is 0', () => {
      const validator = minLengthValidator(0);
      expect(validator({ value: '' })).toEqual([]);
    });
  });

  describe('maxLengthValidator', () => {
    it('should return empty array for string within maximum length', () => {
      const validator = maxLengthValidator(5);
      expect(validator({ value: 'abc' })).toEqual([]);
      expect(validator({ value: 'abcde' })).toEqual([]);
    });

    it('should return problem for string exceeding maximum length', () => {
      const validator = maxLengthValidator(5);
      const result = validator({ value: 'abcdefgh' }) as Problem[];
      expect(result).toHaveLength(1);
      expect(result[0].property).toBe('');
      expect(result[0].message).toContain('Expected maximum length 5');
      expect(result[0].message).toContain('received length 8');
    });

    it('should work with empty strings', () => {
      const validator = maxLengthValidator(5);
      expect(validator({ value: '' })).toEqual([]);
    });
  });

  describe('patternValidator', () => {
    it('should return empty array for matching pattern', () => {
      const validator = patternValidator(/^[a-z]+$/);
      expect(validator({ value: 'abc' })).toEqual([]);
      expect(validator({ value: 'hello' })).toEqual([]);
    });

    it('should return problem for non-matching pattern', () => {
      const validator = patternValidator(/^[a-z]+$/);
      const result = validator({ value: 'ABC123' }) as Problem[];
      expect(result).toHaveLength(1);
      expect(result[0].property).toBe('');
      expect(result[0].message).toContain('Expected value to match pattern');
      expect(result[0].message).toContain('ABC123');
    });

    it('should use custom error message when provided', () => {
      const validator = patternValidator(
        /^[a-z]+$/,
        'Must contain only lowercase letters',
      );
      const result = validator({ value: 'ABC' }) as Problem[];
      expect(result).toHaveLength(1);
      expect(result[0].message).toBe('Must contain only lowercase letters');
    });

    it('should work with email pattern', () => {
      const validator = patternValidator(/^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$/);
      expect(validator({ value: 'test@example.com' })).toEqual([]);
      const result = validator({ value: 'invalid-email' }) as Problem[];
      expect(result).toHaveLength(1);
    });
  });

  describe('minValidator', () => {
    it('should return empty array for number meeting minimum', () => {
      const validator = minValidator(0);
      expect(validator({ value: 0 })).toEqual([]);
      expect(validator({ value: 5 })).toEqual([]);
      expect(validator({ value: 100 })).toEqual([]);
    });

    it('should return problem for number below minimum', () => {
      const validator = minValidator(10);
      const result = validator({ value: 5 }) as Problem[];
      expect(result).toHaveLength(1);
      expect(result[0].property).toBe('');
      expect(result[0].message).toContain('Expected minimum value 10');
      expect(result[0].message).toContain('received 5');
    });

    it('should work with negative numbers', () => {
      const validator = minValidator(-10);
      expect(validator({ value: -5 })).toEqual([]);
      const result = validator({ value: -15 }) as Problem[];
      expect(result).toHaveLength(1);
    });

    it('should work with decimals', () => {
      const validator = minValidator(0.5);
      expect(validator({ value: 0.5 })).toEqual([]);
      expect(validator({ value: 0.6 })).toEqual([]);
      const result = validator({ value: 0.4 }) as Problem[];
      expect(result).toHaveLength(1);
    });
  });

  describe('maxValidator', () => {
    it('should return empty array for number within maximum', () => {
      const validator = maxValidator(100);
      expect(validator({ value: 100 })).toEqual([]);
      expect(validator({ value: 50 })).toEqual([]);
      expect(validator({ value: 0 })).toEqual([]);
    });

    it('should return problem for number exceeding maximum', () => {
      const validator = maxValidator(100);
      const result = validator({ value: 150 }) as Problem[];
      expect(result).toHaveLength(1);
      expect(result[0].property).toBe('');
      expect(result[0].message).toContain('Expected maximum value 100');
      expect(result[0].message).toContain('received 150');
    });

    it('should work with negative numbers', () => {
      const validator = maxValidator(-5);
      expect(validator({ value: -10 })).toEqual([]);
      const result = validator({ value: 0 }) as Problem[];
      expect(result).toHaveLength(1);
    });

    it('should work with decimals', () => {
      const validator = maxValidator(0.5);
      expect(validator({ value: 0.4 })).toEqual([]);
      const result = validator({ value: 0.6 }) as Problem[];
      expect(result).toHaveLength(1);
    });
  });

  describe('arrayMinLengthValidator', () => {
    it('should return empty array for array meeting minimum length', () => {
      const validator = arrayMinLengthValidator(2);
      expect(validator({ value: [1, 2] })).toEqual([]);
      expect(validator({ value: [1, 2, 3] })).toEqual([]);
    });

    it('should return problem for array below minimum length', () => {
      const validator = arrayMinLengthValidator(3);
      const result = validator({ value: [1, 2] }) as Problem[];
      expect(result).toHaveLength(1);
      expect(result[0].property).toBe('');
      expect(result[0].message).toContain('Expected minimum array length 3');
      expect(result[0].message).toContain('received length 2');
    });

    it('should work with empty arrays', () => {
      const validator = arrayMinLengthValidator(1);
      const result = validator({ value: [] }) as Problem[];
      expect(result).toHaveLength(1);
    });

    it('should allow empty arrays when minLength is 0', () => {
      const validator = arrayMinLengthValidator(0);
      expect(validator({ value: [] })).toEqual([]);
    });

    it('should work with arrays of different types', () => {
      const validator = arrayMinLengthValidator(2);
      expect(validator({ value: ['a', 'b'] })).toEqual([]);
      expect(validator({ value: [{ id: 1 }, { id: 2 }] })).toEqual([]);
    });
  });

  describe('arrayMaxLengthValidator', () => {
    it('should return empty array for array within maximum length', () => {
      const validator = arrayMaxLengthValidator(3);
      expect(validator({ value: [1, 2] })).toEqual([]);
      expect(validator({ value: [1, 2, 3] })).toEqual([]);
    });

    it('should return problem for array exceeding maximum length', () => {
      const validator = arrayMaxLengthValidator(3);
      const result = validator({ value: [1, 2, 3, 4, 5] }) as Problem[];
      expect(result).toHaveLength(1);
      expect(result[0].property).toBe('');
      expect(result[0].message).toContain('Expected maximum array length 3');
      expect(result[0].message).toContain('received length 5');
    });

    it('should work with empty arrays', () => {
      const validator = arrayMaxLengthValidator(5);
      expect(validator({ value: [] })).toEqual([]);
    });

    it('should work with arrays of different types', () => {
      const validator = arrayMaxLengthValidator(2);
      expect(validator({ value: ['a', 'b'] })).toEqual([]);
      const result = validator({
        value: [{ id: 1 }, { id: 2 }, { id: 3 }],
      }) as Problem[];
      expect(result).toHaveLength(1);
    });
  });
});
