import 'reflect-metadata';
import { describe, it, expect, beforeEach } from 'vitest';
import { EntityUtils } from './entity-utils.js';
import { EntityDI } from './entity-di.js';
import { ValidationError } from './validation-error.js';
import {
  TestUser,
  TestProduct,
  EntityWithSpecialTypes,
  ValidatedEntity,
  CrossValidatedEntity,
  EntityWithDefaults,
  resetFactoryCallCount,
  EntityWithArrays,
  TestAddress,
  TestCompany,
  TestEmployee,
  TestTags,
  TestUserId,
  TestEmail,
  EntityWithStringifiable,
  EntityWithCustomSerialization,
  CustomValue,
  EntityWithPassthrough,
  EntityWithDI,
  LOGGER_TOKEN,
  ILogger,
} from './test-entities.js';

describe('EntityUtils.parse', () => {
  describe('Primitives', () => {
    it('should parse basic primitive types', async () => {
      const json = { name: 'Alice', age: 30, active: true };
      const user = await EntityUtils.parse(TestUser, json);

      expect(user).toBeInstanceOf(TestUser);
      expect(user.name).toBe('Alice');
      expect(user.age).toBe(30);
      expect(user.active).toBe(true);
    });

    it('should parse string, number, int, and date', async () => {
      const json = {
        id: 'prod-123',
        name: 'Laptop',
        price: 999.99,
        quantity: 5,
        createdAt: '2025-01-15T10:30:00.000Z',
      };
      const product = await EntityUtils.parse(TestProduct, json);

      expect(product).toBeInstanceOf(TestProduct);
      expect(product.id).toBe('prod-123');
      expect(product.name).toBe('Laptop');
      expect(product.price).toBe(999.99);
      expect(product.quantity).toBe(5);
      expect(product.createdAt).toBeInstanceOf(Date);
      expect(product.createdAt.toISOString()).toBe('2025-01-15T10:30:00.000Z');
    });

    it('should parse zero and empty string', async () => {
      const json = { name: '', age: 0, active: false };
      const user = await EntityUtils.parse(TestUser, json);

      expect(user.name).toBe('');
      expect(user.age).toBe(0);
      expect(user.active).toBe(false);
    });
  });

  describe('Special Types', () => {
    it('should parse Date from ISO string', async () => {
      const json = {
        timestamp: '2025-06-15T14:30:00.000Z',
        largeNumber: '9007199254740991',
        label: 'test',
      };
      const entity = await EntityUtils.parse(EntityWithSpecialTypes, json);

      expect(entity.timestamp).toBeInstanceOf(Date);
      expect(entity.timestamp.toISOString()).toBe('2025-06-15T14:30:00.000Z');
    });

    it('should parse Date from Date object', async () => {
      const date = new Date('2025-06-15T14:30:00.000Z');
      const json = {
        timestamp: date,
        largeNumber: '9007199254740991',
        label: 'test',
      };
      const entity = await EntityUtils.parse(EntityWithSpecialTypes, json);

      expect(entity.timestamp).toBe(date);
    });

    it('should parse BigInt from string', async () => {
      const json = {
        timestamp: new Date(),
        largeNumber: '9007199254740991',
        label: 'test',
      };
      const entity = await EntityUtils.parse(EntityWithSpecialTypes, json);

      expect(entity.largeNumber).toBe(9007199254740991n);
      expect(typeof entity.largeNumber).toBe('bigint');
    });

    it('should parse BigInt from bigint', async () => {
      const json = {
        timestamp: new Date(),
        largeNumber: 9007199254740991n,
        label: 'test',
      };
      const entity = await EntityUtils.parse(EntityWithSpecialTypes, json);

      expect(entity.largeNumber).toBe(9007199254740991n);
    });
  });

  describe('Type Checking (No Coercion)', () => {
    it('should throw on string to number coercion attempt', async () => {
      const json = { name: 'Alice', age: '30', active: true };

      await expect(EntityUtils.parse(TestUser, json)).rejects.toThrow(
        ValidationError,
      );
    });

    it('should throw on number to string coercion attempt', async () => {
      const json = { name: 123, age: 30, active: true };

      await expect(EntityUtils.parse(TestUser, json)).rejects.toThrow(
        ValidationError,
      );
    });

    it('should throw on invalid boolean type', async () => {
      const json = { name: 'Alice', age: 30, active: 'yes' };

      await expect(EntityUtils.parse(TestUser, json)).rejects.toThrow(
        ValidationError,
      );
    });
  });

  describe('Nested Entities', () => {
    it('should recursively parse nested entities (1 level)', async () => {
      const json = {
        name: 'Tech Corp',
        address: {
          street: '123 Main St',
          city: 'San Francisco',
          country: 'USA',
          zipCode: 94105,
        },
        employeeCount: 150,
      };

      const company = await EntityUtils.parse(TestCompany, json);

      expect(company).toBeInstanceOf(TestCompany);
      expect(company.address).toBeInstanceOf(TestAddress);
      expect(company.address.street).toBe('123 Main St');
      expect(company.address.city).toBe('San Francisco');
    });

    it('should recursively parse deeply nested entities (2 levels)', async () => {
      const json = {
        name: 'John Doe',
        email: 'john@example.com',
        company: {
          name: 'Tech Corp',
          address: {
            street: '123 Main St',
            city: 'San Francisco',
            country: 'USA',
            zipCode: 94105,
          },
          employeeCount: 150,
        },
        salary: 120000,
        hireDate: '2023-01-15T00:00:00.000Z',
      };

      const employee = await EntityUtils.parse(TestEmployee, json);

      expect(employee).toBeInstanceOf(TestEmployee);
      expect(employee.company).toBeInstanceOf(TestCompany);
      expect(employee.company.address).toBeInstanceOf(TestAddress);
      expect(employee.company.address.street).toBe('123 Main St');
    });
  });

  describe('Arrays', () => {
    it('should parse arrays of primitives', async () => {
      const json = {
        tags: ['typescript', 'testing'],
        ratings: [4, 5, 3],
        sparseArray: ['a', 'b'],
        users: [],
      };

      const entity = await EntityUtils.parse(EntityWithArrays, json);

      expect(entity.tags).toEqual(['typescript', 'testing']);
      expect(entity.ratings).toEqual([4, 5, 3]);
    });

    it('should parse sparse arrays with null', async () => {
      const json = {
        tags: [],
        ratings: [5],
        sparseArray: ['a', null, 'b', null],
        users: [],
      };

      const entity = await EntityUtils.parse(EntityWithArrays, json);

      expect(entity.sparseArray).toEqual(['a', null, 'b', null]);
    });

    it('should parse arrays of entities', async () => {
      const json = {
        tags: [],
        ratings: [5],
        sparseArray: [],
        users: [
          { name: 'Alice', age: 30, active: true },
          { name: 'Bob', age: 25, active: false },
        ],
      };

      const entity = await EntityUtils.parse(EntityWithArrays, json);

      expect(entity.users).toHaveLength(2);
      expect(entity.users[0]).toBeInstanceOf(TestUser);
      expect(entity.users[0].name).toBe('Alice');
      expect(entity.users[1]).toBeInstanceOf(TestUser);
      expect(entity.users[1].name).toBe('Bob');
    });

    it('should parse empty arrays', async () => {
      const json = {
        tags: [],
        ratings: [],
        sparseArray: [],
        users: [],
      };

      const entity = await EntityUtils.parse(EntityWithArrays, json);

      expect(entity.tags).toEqual([]);
      expect(entity.ratings).toEqual([]);
      expect(entity.users).toEqual([]);
    });
  });

  describe('CollectionEntity', () => {
    it('should parse collection from array', async () => {
      const json = ['javascript', 'typescript', 'nodejs'];

      const tags = await EntityUtils.parse(TestTags, json);

      expect(tags).toBeInstanceOf(TestTags);
      expect(tags.collection).toEqual(['javascript', 'typescript', 'nodejs']);
    });

    it('should parse empty collection', async () => {
      const json: string[] = [];

      const tags = await EntityUtils.parse(TestTags, json);

      expect(tags.collection).toEqual([]);
    });
  });

  describe('StringifiableEntity', () => {
    it('should parse stringifiable from string', async () => {
      const json = 'user-12345';

      const userId = await EntityUtils.parse(TestUserId, json);

      expect(userId).toBeInstanceOf(TestUserId);
      expect(userId.value).toBe('user-12345');
    });

    it('should parse stringifiable properties within entities', async () => {
      const json = {
        userId: 'user-999',
        email: 'user@test.com',
        name: 'Test User',
      };

      const entity = await EntityUtils.parse(EntityWithStringifiable, json);

      expect(entity.userId).toBeInstanceOf(TestUserId);
      expect(entity.userId.value).toBe('user-999');
      expect(entity.email).toBeInstanceOf(TestEmail);
      expect(entity.email.value).toBe('user@test.com');
    });
  });

  describe('Default Values', () => {
    beforeEach(() => {
      resetFactoryCallCount();
    });

    it('should apply static default values', async () => {
      const json = {};

      const entity = await EntityUtils.parse(EntityWithDefaults, json);

      expect(entity.name).toBe('default-name');
      expect(entity.enabled).toBe(true);
    });

    it('should apply factory default values', async () => {
      const json1 = {};
      const entity1 = await EntityUtils.parse(EntityWithDefaults, json1);
      const json2 = {};
      const entity2 = await EntityUtils.parse(EntityWithDefaults, json2);

      expect(entity1.counter).toBe(0);
      expect(entity2.counter).toBe(1); // Factory called again
    });

    it('should apply async factory defaults', async () => {
      const json = {};

      const entity = await EntityUtils.parse(EntityWithDefaults, json);

      expect(entity.asyncField).toBe('async-value');
    });

    it('should not override provided values with defaults', async () => {
      const json = {
        name: 'custom-name',
        enabled: false,
        counter: 999,
      };

      const entity = await EntityUtils.parse(EntityWithDefaults, json);

      expect(entity.name).toBe('custom-name');
      expect(entity.enabled).toBe(false);
      expect(entity.counter).toBe(999);
    });
  });

  describe('Validation Modes', () => {
    it('should store SOFT validation errors by default', async () => {
      const json = {
        username: 'ab', // Too short (min 3)
        email: 'invalid-email',
        age: 30,
      };

      const entity = await EntityUtils.parse(ValidatedEntity, json);

      const problems = EntityUtils.getProblems(entity);
      expect(problems).toHaveLength(2);
      expect(problems.some((p) => p.property === 'username')).toBe(true);
      expect(problems.some((p) => p.property === 'email')).toBe(true);
    });

    it('should throw on SOFT errors with strict mode', async () => {
      const json = {
        username: 'ab', // Too short
        email: 'valid@example.com',
        age: 30,
      };

      await expect(
        EntityUtils.parse(ValidatedEntity, json, {
          strict: true,
        }),
      ).rejects.toThrow(ValidationError);
    });

    it('should throw on entity validator errors with strict mode', async () => {
      const json = {
        password: 'password123',
        confirmPassword: 'different',
        startDate: '2025-01-01',
        endDate: '2025-01-02',
      };

      await expect(
        EntityUtils.parse(CrossValidatedEntity, json, {
          strict: true,
        }),
      ).rejects.toThrow(ValidationError);
    });
  });

  describe('Dependency Injection', () => {
    it('should inject dependencies', async () => {
      const mockLogger: ILogger = {
        // eslint-disable-next-line @typescript-eslint/no-empty-function
        log: () => {},
      };

      EntityDI.configure({
        providers: [{ provide: LOGGER_TOKEN, useValue: mockLogger }],
      });

      const json = { name: 'Test' };
      const entity = await EntityUtils.parse(EntityWithDI, json);

      expect(entity.logger).toBe(mockLogger);

      // Clean up
      EntityDI.configure({ providers: [] });
    });
  });

  describe('Custom Deserialization', () => {
    it('should use custom deserialize function', async () => {
      const json = {
        name: 'Point Entity',
        position: { x: 10, y: 20 },
      };

      const entity = await EntityUtils.parse(
        EntityWithCustomSerialization,
        json,
      );

      expect(entity.position).toBeInstanceOf(CustomValue);
      expect(entity.position.x).toBe(10);
      expect(entity.position.y).toBe(20);
    });
  });

  describe('Passthrough Properties', () => {
    it('should pass through unknown types as-is', async () => {
      const metadata = {
        nested: { deep: { value: 42 } },
        array: [1, 2, 3],
      };

      const json = {
        id: 'test-123',
        metadata,
        config: { setting1: true },
      };

      const entity = await EntityUtils.parse(EntityWithPassthrough, json);

      expect(entity.metadata).toEqual(metadata);
      expect(entity.config).toEqual({ setting1: true });
    });
  });

  describe('RawInput Storage', () => {
    it('should store raw input', async () => {
      const json = { name: 'Alice', age: 30, active: true };
      const user = await EntityUtils.parse(TestUser, json);

      const rawInput = EntityUtils.getRawInput(user);
      expect(rawInput).toEqual(json);
    });
  });

  describe('Error Handling', () => {
    it('should throw on missing required property', async () => {
      const json = { age: 30, active: true };

      await expect(EntityUtils.parse(TestUser, json)).rejects.toThrow(
        ValidationError,
      );
    });

    it('should throw on invalid Date string', async () => {
      const json = {
        timestamp: 'invalid-date',
        largeNumber: '123',
        label: 'test',
      };

      await expect(
        EntityUtils.parse(EntityWithSpecialTypes, json),
      ).rejects.toThrow(ValidationError);
    });

    it('should throw on invalid BigInt string', async () => {
      const json = {
        timestamp: new Date(),
        largeNumber: 'not-a-number',
        label: 'test',
      };

      await expect(
        EntityUtils.parse(EntityWithSpecialTypes, json),
      ).rejects.toThrow(ValidationError);
    });
  });
});

describe('EntityUtils.safeParse', () => {
  describe('Success Cases', () => {
    it('should return success result for valid input', async () => {
      const json = { name: 'Alice', age: 30, active: true };
      const result = await EntityUtils.safeParse(TestUser, json);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toBeInstanceOf(TestUser);
        expect(result.data.name).toBe('Alice');
      }
    });

    it('should return success with nested entities', async () => {
      const json = {
        name: 'Tech Corp',
        address: {
          street: '123 Main St',
          city: 'SF',
          country: 'USA',
          zipCode: 94105,
        },
        employeeCount: 150,
      };

      const result = await EntityUtils.safeParse(TestCompany, json);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.address).toBeInstanceOf(TestAddress);
      }
    });

    it('should return success with default values applied', async () => {
      resetFactoryCallCount();
      const json = {};
      const result = await EntityUtils.safeParse(EntityWithDefaults, json);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.name).toBe('default-name');
      }
    });
  });

  describe('Failure Cases', () => {
    it('should return failure result on HARD validation errors', async () => {
      const json = { age: 30, active: true }; // Missing required 'name'

      const result = await EntityUtils.safeParse(TestUser, json);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.problems).toHaveLength(1);
        expect(result.problems[0].property).toBe('name');
      }
    });

    it('should return failure on type mismatch', async () => {
      const json = { name: 'Alice', age: '30', active: true };

      const result = await EntityUtils.safeParse(TestUser, json);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.problems.length).toBeGreaterThan(0);
      }
    });

    it('should return failure with SOFT errors when strict is true', async () => {
      const json = {
        username: 'ab',
        email: 'invalid',
        age: 30,
      };

      const result = await EntityUtils.safeParse(ValidatedEntity, json, {
        strict: true,
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.problems.length).toBeGreaterThan(0);
      }
    });

    it('should never throw exceptions', async () => {
      const json = { completely: 'invalid' };

      // Should not throw, always returns result
      const result = await EntityUtils.safeParse(TestUser, json);

      expect(result.success).toBe(false);
    });
  });

  describe('Validation Mode Handling', () => {
    it('should return success with SOFT errors by default', async () => {
      const json = {
        username: 'ab', // SOFT error
        email: 'invalid',
        age: 30,
      };

      const result = await EntityUtils.safeParse(ValidatedEntity, json);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.problems.length).toBeGreaterThan(0);
      }
    });
  });
});
