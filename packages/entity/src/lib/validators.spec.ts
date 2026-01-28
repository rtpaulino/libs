import { describe, it, expect } from 'vitest';
import { enumValidator, intValidator } from './validators.js';
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
});
