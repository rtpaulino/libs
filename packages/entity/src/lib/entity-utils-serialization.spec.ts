import 'reflect-metadata';
import { describe, it, expect } from 'vitest';
import { EntityUtils } from './entity-utils.js';
import {
  TestUser,
  TestProduct,
  EntityWithSpecialTypes,
  TestAddress,
  TestCompany,
  TestEmployee,
  EntityWithArrays,
  TestTags,
  TestIdList,
  TestUserCollection,
  TestUserId,
  TestEmail,
  EntityWithStringifiable,
  EntityWithCustomSerialization,
  EntityWithPassthrough,
  OptionalFieldsEntity,
  CustomValue,
} from './test-entities.js';

describe('EntityUtils.toJSON', () => {
  describe('Primitives', () => {
    it('should serialize basic primitive types', () => {
      const user = new TestUser({
        name: 'Alice',
        age: 30,
        active: true,
      });

      const json = EntityUtils.toJSON(user);

      expect(json).toEqual({
        name: 'Alice',
        age: 30,
        active: true,
      });
    });

    it('should serialize string, number, int, and date', () => {
      const date = new Date('2025-01-15T10:30:00Z');
      const product = new TestProduct({
        id: 'prod-123',
        name: 'Laptop',
        price: 999.99,
        quantity: 5,
        createdAt: date,
      });

      const json = EntityUtils.toJSON(product);

      expect(json).toEqual({
        id: 'prod-123',
        name: 'Laptop',
        price: 999.99,
        quantity: 5,
        createdAt: date.toISOString(),
      });
    });

    it('should serialize zero and empty string', () => {
      const user = new TestUser({
        name: '',
        age: 0,
        active: false,
      });

      const json = EntityUtils.toJSON(user);

      expect(json).toEqual({
        name: '',
        age: 0,
        active: false,
      });
    });
  });

  describe('Special Types', () => {
    it('should convert Date to ISO string', () => {
      const date = new Date('2025-06-15T14:30:00Z');
      const entity = new EntityWithSpecialTypes({
        timestamp: date,
        largeNumber: 9007199254740991n,
        label: 'test',
      });

      const json = EntityUtils.toJSON(entity) as any;

      expect(json.timestamp).toBe(date.toISOString());
      expect(typeof json.timestamp).toBe('string');
    });

    it('should convert BigInt to string', () => {
      const bigNum = BigInt('9007199254740991');
      const entity = new EntityWithSpecialTypes({
        timestamp: new Date(),
        largeNumber: bigNum,
        label: 'test',
      });

      const json = EntityUtils.toJSON(entity) as any;

      expect(json.largeNumber).toBe('9007199254740991');
      expect(typeof json.largeNumber).toBe('string');
    });
  });

  describe('Optional Properties', () => {
    it('should exclude undefined values from JSON', () => {
      const entity = new OptionalFieldsEntity({
        requiredField: 'present',
        requiredBoolean: true,
      });

      const json = EntityUtils.toJSON(entity);

      expect(json).toEqual({
        requiredField: 'present',
        requiredBoolean: true,
      });
      expect(json).not.toHaveProperty('optionalField');
      expect(json).not.toHaveProperty('optionalNumber');
    });

    it('should include null values in JSON', () => {
      const entity = new OptionalFieldsEntity({
        requiredField: 'present',
        optionalField: null as any,
        optionalNumber: null as any,
        requiredBoolean: false,
      });

      const json = EntityUtils.toJSON(entity);

      expect(json).toEqual({
        requiredField: 'present',
        optionalField: null,
        optionalNumber: null,
        requiredBoolean: false,
      });
    });

    it('should include explicitly set optional values', () => {
      const entity = new OptionalFieldsEntity({
        requiredField: 'present',
        optionalField: 'optional value',
        optionalNumber: 42,
        requiredBoolean: true,
      });

      const json = EntityUtils.toJSON(entity);

      expect(json).toEqual({
        requiredField: 'present',
        optionalField: 'optional value',
        optionalNumber: 42,
        requiredBoolean: true,
      });
    });
  });

  describe('Nested Entities', () => {
    it('should recursively serialize nested entities (1 level)', () => {
      const company = new TestCompany({
        name: 'Tech Corp',
        address: new TestAddress({
          street: '123 Main St',
          city: 'San Francisco',
          country: 'USA',
          zipCode: 94105,
        }),
        employeeCount: 150,
      });

      const json = EntityUtils.toJSON(company);

      expect(json).toEqual({
        name: 'Tech Corp',
        address: {
          street: '123 Main St',
          city: 'San Francisco',
          country: 'USA',
          zipCode: 94105,
        },
        employeeCount: 150,
      });
    });

    it('should recursively serialize deeply nested entities (2 levels)', () => {
      const employee = new TestEmployee({
        name: 'John Doe',
        email: 'john@example.com',
        company: new TestCompany({
          name: 'Tech Corp',
          address: new TestAddress({
            street: '123 Main St',
            city: 'San Francisco',
            country: 'USA',
            zipCode: 94105,
          }),
          employeeCount: 150,
        }),
        salary: 120000,
        hireDate: new Date('2023-01-15'),
      });

      const json = EntityUtils.toJSON(employee);

      expect(json).toEqual({
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
        hireDate: new Date('2023-01-15').toISOString(),
      });
    });
  });

  describe('Arrays', () => {
    it('should serialize arrays of primitives', () => {
      const entity = new EntityWithArrays({
        tags: ['typescript', 'testing', 'vitest'],
        ratings: [4, 5, 3, 5],
        sparseArray: ['a', null, 'b', undefined, 'c'],
        users: [],
      });

      const json = EntityUtils.toJSON(entity) as any;

      expect(json.tags).toEqual(['typescript', 'testing', 'vitest']);
      expect(json.ratings).toEqual([4, 5, 3, 5]);
    });

    it('should serialize sparse arrays with null/undefined', () => {
      const entity = new EntityWithArrays({
        tags: [],
        ratings: [5],
        sparseArray: ['a', null, 'b', undefined, 'c'],
        users: [],
      });

      const json = EntityUtils.toJSON(entity) as any;

      // Sparse arrays include null but not undefined
      expect(json.sparseArray).toEqual(['a', null, 'b', undefined, 'c']);
    });

    it('should serialize arrays of entities', () => {
      const entity = new EntityWithArrays({
        tags: [],
        ratings: [5],
        sparseArray: [],
        users: [
          new TestUser({ name: 'Alice', age: 30, active: true }),
          new TestUser({ name: 'Bob', age: 25, active: false }),
        ],
      });

      const json = EntityUtils.toJSON(entity) as any;

      expect(json.users).toEqual([
        { name: 'Alice', age: 30, active: true },
        { name: 'Bob', age: 25, active: false },
      ]);
    });

    it('should serialize empty arrays', () => {
      const entity = new EntityWithArrays({
        tags: [],
        ratings: [],
        sparseArray: [],
        users: [],
      });

      const json = EntityUtils.toJSON(entity);

      expect(json).toEqual({
        tags: [],
        ratings: [],
        sparseArray: [],
        users: [],
      });
    });
  });

  describe('CollectionEntity', () => {
    it('should unwrap string collection to array', () => {
      const tags = new TestTags({
        collection: ['javascript', 'typescript', 'nodejs'],
      });

      const json = EntityUtils.toJSON(tags);

      expect(json).toEqual(['javascript', 'typescript', 'nodejs']);
      expect(Array.isArray(json)).toBe(true);
    });

    it('should unwrap number collection to array', () => {
      const ids = new TestIdList({
        collection: [1, 2, 3, 4, 5],
      });

      const json = EntityUtils.toJSON(ids);

      expect(json).toEqual([1, 2, 3, 4, 5]);
    });

    it('should unwrap entity collection to array of objects', () => {
      const users = new TestUserCollection({
        collection: [
          new TestUser({ name: 'Alice', age: 30, active: true }),
          new TestUser({ name: 'Bob', age: 25, active: false }),
        ],
      });

      const json = EntityUtils.toJSON(users);

      expect(json).toEqual([
        { name: 'Alice', age: 30, active: true },
        { name: 'Bob', age: 25, active: false },
      ]);
    });

    it('should unwrap empty collection to empty array', () => {
      const tags = new TestTags({ collection: [] });

      const json = EntityUtils.toJSON(tags);

      expect(json).toEqual([]);
    });
  });

  describe('StringifiableEntity', () => {
    it('should unwrap stringifiable entity to string', () => {
      const userId = new TestUserId({ value: 'user-12345' });

      const json = EntityUtils.toJSON(userId);

      expect(json).toBe('user-12345');
      expect(typeof json).toBe('string');
    });

    it('should unwrap stringifiable email to string', () => {
      const email = new TestEmail({ value: 'test@example.com' });

      const json = EntityUtils.toJSON(email);

      expect(json).toBe('test@example.com');
    });

    it('should unwrap stringifiable properties within entities', () => {
      const entity = new EntityWithStringifiable({
        userId: new TestUserId({ value: 'user-999' }),
        email: new TestEmail({ value: 'user@test.com' }),
        name: 'Test User',
      });

      const json = EntityUtils.toJSON(entity);

      expect(json).toEqual({
        userId: 'user-999',
        email: 'user@test.com',
        name: 'Test User',
      });
    });
  });

  describe('Custom Serialization', () => {
    it('should use custom serialize function', () => {
      const entity = new EntityWithCustomSerialization({
        name: 'Point Entity',
        position: new CustomValue(10, 20),
      });

      const json = EntityUtils.toJSON(entity);

      expect(json).toEqual({
        name: 'Point Entity',
        position: { x: 10, y: 20 },
      });
    });
  });

  describe('Passthrough Properties', () => {
    it('should serialize passthrough properties as-is', () => {
      const metadata = {
        nested: { deep: { value: 42 } },
        array: [1, 2, 3],
        mixed: { a: 1, b: 'string', c: true },
      };

      const entity = new EntityWithPassthrough({
        id: 'test-123',
        metadata,
        config: { setting1: true, setting2: 'value' },
      });

      const json = EntityUtils.toJSON(entity) as any;

      expect(json).toEqual({
        id: 'test-123',
        metadata,
        config: { setting1: true, setting2: 'value' },
      });
      expect(json.metadata).toBe(metadata); // Same reference
    });

    it('should serialize passthrough with unknown types', () => {
      const entity = new EntityWithPassthrough({
        id: 'test-456',
        metadata: { unknown: 'type' },
        config: [1, 'two', { three: 3 }],
      });

      const json = EntityUtils.toJSON(entity) as any;

      expect(json.config).toEqual([1, 'two', { three: 3 }]);
    });
  });

  describe('Combined Features', () => {
    it('should handle entity with mixed features', () => {
      const entity = new EntityWithArrays({
        tags: ['tag1', 'tag2'],
        ratings: [4, 5],
        sparseArray: ['a', null, 'b'],
        users: [
          new TestUser({ name: 'User1', age: 20, active: true }),
          new TestUser({ name: 'User2', age: 30, active: false }),
        ],
      });

      const json = EntityUtils.toJSON(entity);

      expect(json).toEqual({
        tags: ['tag1', 'tag2'],
        ratings: [4, 5],
        sparseArray: ['a', null, 'b'],
        users: [
          { name: 'User1', age: 20, active: true },
          { name: 'User2', age: 30, active: false },
        ],
      });
    });

    it('should handle complex nested structure with collections and stringifiable', () => {
      const employee = new TestEmployee({
        name: 'Jane Doe',
        email: 'jane@test.com',
        company: new TestCompany({
          name: 'Startup Inc',
          address: new TestAddress({
            street: '456 Innovation Way',
            city: 'Austin',
            country: 'USA',
            zipCode: 78701,
          }),
          employeeCount: 25,
        }),
        salary: 95000,
        hireDate: new Date('2024-03-01'),
      });

      const json = EntityUtils.toJSON(employee) as any;

      expect(json).toMatchObject({
        name: 'Jane Doe',
        email: 'jane@test.com',
        company: {
          name: 'Startup Inc',
          address: {
            street: '456 Innovation Way',
            city: 'Austin',
            country: 'USA',
            zipCode: 78701,
          },
          employeeCount: 25,
        },
        salary: 95000,
      });
      expect(typeof json.hireDate).toBe('string');
    });
  });
});
