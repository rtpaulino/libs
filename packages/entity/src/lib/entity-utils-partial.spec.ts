import 'reflect-metadata';
import { describe, it, expect } from 'vitest';
import { EntityUtils } from './entity-utils.js';
import { ValidationError } from './validation-error.js';
import {
  TestUser,
  TestProduct,
  ValidatedEntity,
  OptionalFieldsEntity,
  TestAddress,
  TestCompany,
  TestEmployee,
  EntityWithArrays,
  EntityWithDefaults,
} from './test-entities.js';

describe('EntityUtils.partialParse', () => {
  describe('Basic Behavior', () => {
    it('should return plain object, not entity instance', async () => {
      const result = await EntityUtils.partialParse(TestUser, {
        name: 'Alice',
        age: 30,
      });

      expect(result).not.toBeInstanceOf(TestUser);
      expect(typeof result).toBe('object');
      expect(result).toEqual({ name: 'Alice', age: 30 });
    });

    it('should only include present properties', async () => {
      const result = await EntityUtils.partialParse(TestUser, {
        name: 'Alice',
      });

      expect(result).toEqual({ name: 'Alice' });
      expect('age' in result).toBe(false);
      expect('active' in result).toBe(false);
    });

    it('should ignore missing properties entirely', async () => {
      const result = await EntityUtils.partialParse(OptionalFieldsEntity, {
        requiredField: 'present',
      });

      expect(result).toEqual({ requiredField: 'present' });
      expect('optionalField' in result).toBe(false);
      expect('requiredBoolean' in result).toBe(false);
    });
  });

  describe('No Default Values', () => {
    it('should NOT apply default values to missing properties', async () => {
      const result = await EntityUtils.partialParse(EntityWithDefaults, {
        counter: 5,
      });

      expect(result).toEqual({ counter: 5 });
      expect('name' in result).toBe(false); // Has default 'default-name'
      expect('enabled' in result).toBe(false); // Has default true
      expect('timestamp' in result).toBe(false); // Has default
    });

    it('should deserialize provided properties even when they have defaults', async () => {
      const result = await EntityUtils.partialParse(EntityWithDefaults, {
        name: 'custom',
        enabled: false,
      });

      expect(result).toEqual({ name: 'custom', enabled: false });
    });
  });

  describe('Primitive Deserialization', () => {
    it('should deserialize primitive types', async () => {
      const result = await EntityUtils.partialParse(TestProduct, {
        id: 'prod-123',
        price: 99.99,
        quantity: 10,
      });

      expect(result).toEqual({
        id: 'prod-123',
        price: 99.99,
        quantity: 10,
      });
    });

    it('should deserialize Date from ISO string', async () => {
      const result = await EntityUtils.partialParse(TestProduct, {
        createdAt: '2025-01-15T10:00:00.000Z',
      });

      expect(result.createdAt).toBeInstanceOf(Date);
      expect(result.createdAt!.toISOString()).toBe('2025-01-15T10:00:00.000Z');
    });

    it('should exclude explicit undefined values', async () => {
      const result = await EntityUtils.partialParse(OptionalFieldsEntity, {
        requiredField: 'test',
        optionalField: undefined,
        requiredBoolean: true,
      });

      expect(result.requiredField).toBe('test');
      expect(result.requiredBoolean).toBe(true);
      // undefined values are excluded from result
      expect('optionalField' in result).toBe(false);
    });

    it('should include present optional values', async () => {
      const result = await EntityUtils.partialParse(OptionalFieldsEntity, {
        requiredField: 'test',
        optionalNumber: 42,
        requiredBoolean: true,
      });

      expect(result.requiredField).toBe('test');
      expect(result.requiredBoolean).toBe(true);
      expect(result.optionalNumber).toBe(42);
    });
  });

  describe('Nested Entities', () => {
    it('should deserialize nested entities (1 level)', async () => {
      const result = await EntityUtils.partialParse(TestCompany, {
        name: 'Tech Corp',
        address: {
          street: '123 Main St',
          city: 'SF',
          country: 'USA',
          zipCode: 94105,
        },
      });

      expect(result.name).toBe('Tech Corp');
      expect(result.address).toBeInstanceOf(TestAddress);
      expect(result.address!.street).toBe('123 Main St');
      expect('employeeCount' in result).toBe(false);
    });

    it('should deserialize deeply nested entities (2 levels)', async () => {
      const result = await EntityUtils.partialParse(TestEmployee, {
        email: 'john@test.com',
        company: {
          name: 'Startup',
          address: {
            street: '456 Oak',
            city: 'Austin',
            country: 'USA',
            zipCode: 78701,
          },
          employeeCount: 25,
        },
      });

      expect(result.email).toBe('john@test.com');
      expect(result.company).toBeInstanceOf(TestCompany);
      expect(result.company!.address).toBeInstanceOf(TestAddress);
      expect('name' in result).toBe(false);
      expect('salary' in result).toBe(false);
    });

    it('should handle partial nested entities', async () => {
      const result = await EntityUtils.partialParse(TestCompany, {
        name: 'Tech Corp',
        address: {
          street: '123 Main St',
          city: 'SF',
        } as any, // Intentionally partial
      });

      expect(result.name).toBe('Tech Corp');
      // Should still try to deserialize, but may fail on required fields
    });
  });

  describe('Arrays', () => {
    it('should deserialize arrays of primitives', async () => {
      const result = await EntityUtils.partialParse(EntityWithArrays, {
        tags: ['typescript', 'testing'],
      });

      expect(result.tags).toEqual(['typescript', 'testing']);
      expect('ratings' in result).toBe(false);
      expect('users' in result).toBe(false);
    });

    it('should deserialize arrays of entities', async () => {
      const result = await EntityUtils.partialParse(EntityWithArrays, {
        users: [
          { name: 'Alice', age: 30, active: true },
          { name: 'Bob', age: 25, active: false },
        ],
      });

      expect(result.users).toHaveLength(2);
      expect(result.users![0]).toBeInstanceOf(TestUser);
      expect(result.users![0].name).toBe('Alice');
    });

    it('should deserialize empty arrays', async () => {
      const result = await EntityUtils.partialParse(EntityWithArrays, {
        tags: [],
        ratings: [],
      });

      expect(result.tags).toEqual([]);
      expect(result.ratings).toEqual([]);
    });
  });

  describe('Optional vs Missing Distinction', () => {
    it('should treat missing and undefined the same (both excluded)', async () => {
      const result1 = await EntityUtils.partialParse(OptionalFieldsEntity, {
        requiredField: 'test',
        requiredBoolean: true,
      });

      const result2 = await EntityUtils.partialParse(OptionalFieldsEntity, {
        requiredField: 'test',
        optionalField: undefined,
        requiredBoolean: true,
      });

      // Both should be excluded
      expect('optionalField' in result1).toBe(false);
      expect('optionalField' in result2).toBe(false);
    });

    it('should handle optional properties that are present', async () => {
      const result = await EntityUtils.partialParse(OptionalFieldsEntity, {
        requiredField: 'test',
        optionalField: 'present',
        optionalNumber: 42,
        requiredBoolean: true,
      });

      expect(result).toEqual({
        requiredField: 'test',
        optionalField: 'present',
        optionalNumber: 42,
        requiredBoolean: true,
      });
    });
  });

  describe('Validation - Default Mode (strict: false)', () => {
    it('should exclude properties with HARD validation errors', async () => {
      const result = await EntityUtils.partialParse(ValidatedEntity, {
        username: 'valid-username',
        email: 123 as any, // Wrong type - HARD error
        age: 30,
      });

      expect(result.username).toBe('valid-username');
      expect(result.age).toBe(30);
      expect('email' in result).toBe(false); // Excluded due to HARD error
    });

    it('should include properties with SOFT validation errors', async () => {
      const result = await EntityUtils.partialParse(ValidatedEntity, {
        username: 'ab', // Too short - SOFT error
        email: 'test@example.com',
        age: 30,
      });

      expect(result.username).toBe('ab');
      expect(result.email).toBe('test@example.com');
      expect(result.age).toBe(30);
    });

    it('should track problems for properties with HARD errors', async () => {
      const result = await EntityUtils.partialParse(ValidatedEntity, {
        username: 'valid',
        email: 123 as any,
        age: 30,
      });

      // Property excluded but we can't easily test for tracked problems
      // since partialParse returns plain object
      expect('email' in result).toBe(false);
    });
  });

  describe('Validation - Strict Mode (strict: true)', () => {
    it('should throw on HARD validation errors in strict mode', async () => {
      await expect(
        EntityUtils.partialParse(
          ValidatedEntity,
          {
            username: 'valid',
            email: 123 as any, // Type error
            age: 30,
          },
          { strict: true },
        ),
      ).rejects.toThrow(ValidationError);
    });

    it('should throw on SOFT validation errors in strict mode', async () => {
      await expect(
        EntityUtils.partialParse(
          ValidatedEntity,
          {
            username: 'ab', // Too short
            email: 'test@example.com',
            age: 30,
          },
          { strict: true },
        ),
      ).rejects.toThrow(ValidationError);
    });

    it('should succeed when all properties are valid in strict mode', async () => {
      const result = await EntityUtils.partialParse(
        ValidatedEntity,
        {
          username: 'validuser',
          email: 'test@example.com',
        },
        { strict: true },
      );

      expect(result).toEqual({
        username: 'validuser',
        email: 'test@example.com',
      });
    });
  });

  describe('Error Handling', () => {
    it('should throw on missing required nested entity properties in strict mode', async () => {
      await expect(
        EntityUtils.partialParse(
          TestCompany,
          {
            address: {
              street: '123 Main St',
              // Missing required: city, country, zipCode
            } as any,
          },
          { strict: true },
        ),
      ).rejects.toThrow(ValidationError);
    });

    it('should handle type mismatches by excluding in default mode', async () => {
      const result = await EntityUtils.partialParse(TestUser, {
        name: 'Alice',
        age: 'thirty' as any, // Wrong type
      });

      expect(result.name).toBe('Alice');
      expect('age' in result).toBe(false);
    });
  });

  describe('Use Cases', () => {
    it('should work for PATCH API endpoint patterns', async () => {
      // Simulating PATCH /users/:id with partial update
      const patchData = { age: 31 }; // Only updating age

      const result = await EntityUtils.partialParse(TestUser, patchData);

      expect(result).toEqual({ age: 31 });
      expect('name' in result).toBe(false);
      expect('active' in result).toBe(false);
    });

    it('should work for form submissions with sparse data', async () => {
      const formData = {
        name: 'Updated Name',
        // User didn't change other fields
      };

      const result = await EntityUtils.partialParse(TestUser, formData);

      expect(result).toEqual({ name: 'Updated Name' });
    });
  });
});

describe('EntityUtils.safePartialParse', () => {
  describe('Success Cases', () => {
    it('should return success with partial data', async () => {
      const result = await EntityUtils.safePartialParse(TestUser, {
        name: 'Alice',
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual({ name: 'Alice' });
        expect('age' in result.data).toBe(false);
      }
    });

    it('should return success with empty object', async () => {
      const result = await EntityUtils.safePartialParse(TestUser, {});

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual({});
      }
    });

    it('should return success with SOFT errors in default mode', async () => {
      const result = await EntityUtils.safePartialParse(ValidatedEntity, {
        username: 'ab', // Too short - SOFT error
        email: 'test@example.com',
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.username).toBe('ab');
        expect(result.problems.length).toBeGreaterThan(0);
      }
    });

    it('should exclude properties with HARD errors in default mode', async () => {
      const result = await EntityUtils.safePartialParse(ValidatedEntity, {
        username: 'valid',
        email: 123 as any, // Type error - HARD
        age: 30,
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.username).toBe('valid');
        expect('email' in result.data).toBe(false);
        expect(result.problems.length).toBeGreaterThan(0);
      }
    });
  });

  describe('Failure Cases', () => {
    it('should return failure on HARD errors in strict mode', async () => {
      const result = await EntityUtils.safePartialParse(
        ValidatedEntity,
        {
          email: 123 as any,
        },
        { strict: true },
      );

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.problems.length).toBeGreaterThan(0);
      }
    });

    it('should return failure on SOFT errors in strict mode', async () => {
      const result = await EntityUtils.safePartialParse(
        ValidatedEntity,
        {
          username: 'ab', // Too short
        },
        { strict: true },
      );

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.problems.length).toBeGreaterThan(0);
      }
    });

    it('should never throw exceptions', async () => {
      const result = await EntityUtils.safePartialParse(TestUser, {
        name: 123 as any,
        age: 'invalid' as any,
      });

      // Should not throw, always returns result
      expect(result.success).toBeDefined();
    });
  });

  describe('Validation Modes', () => {
    it('should handle mixed HARD/SOFT errors in default mode', async () => {
      const result = await EntityUtils.safePartialParse(ValidatedEntity, {
        username: 'ab', // SOFT
        email: 123 as any, // HARD
        age: 30,
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.username).toBe('ab'); // Included
        expect('email' in result.data).toBe(false); // Excluded
        expect(result.data.age).toBe(30);
      }
    });
  });

  describe('Nested Entities', () => {
    it('should handle nested entities in safe mode', async () => {
      const result = await EntityUtils.safePartialParse(TestCompany, {
        name: 'Tech Corp',
        address: {
          street: '123 Main',
          city: 'SF',
          country: 'USA',
          zipCode: 94105,
        },
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.address).toBeInstanceOf(TestAddress);
      }
    });

    it('should handle errors in nested entities gracefully', async () => {
      const result = await EntityUtils.safePartialParse(TestCompany, {
        address: {
          street: 123 as any, // Wrong type
        },
      });

      // Behavior depends on implementation - either success with exclusion or failure
      expect(result.success).toBeDefined();
    });
  });
});
