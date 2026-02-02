/* eslint-disable @typescript-eslint/no-explicit-any */
import 'reflect-metadata';
import { describe, it, expect } from 'vitest';
import { EntityUtils } from './entity-utils.js';
import {
  TestUser,
  TestProduct,
  TestCompany,
  TestAddress,
  EntityWithArrays,
  EntityWithDefaults,
  EntityWithCustomEquals,
  ComplexEntity,
  TestUserId,
  UserRole,
  CustomPoint,
} from './test-entities.js';

describe('EntityUtils.equals', () => {
  describe('Primitive Equality', () => {
    it('should return true for identical primitive values', () => {
      expect(EntityUtils.equals(42, 42)).toBe(true);
      expect(EntityUtils.equals('test', 'test')).toBe(true);
      expect(EntityUtils.equals(true, true)).toBe(true);
      expect(EntityUtils.equals(null, null)).toBe(true);
      expect(EntityUtils.equals(undefined, undefined)).toBe(true);
    });

    it('should return false for different primitive values', () => {
      expect(EntityUtils.equals(42, 43)).toBe(false);
      expect(EntityUtils.equals('test', 'other')).toBe(false);
      expect(EntityUtils.equals(true, false)).toBe(false);
      expect(EntityUtils.equals(null, undefined)).toBe(false);
    });

    it('should handle BigInt equality', () => {
      expect(EntityUtils.equals(BigInt(123), BigInt(123))).toBe(true);
      expect(EntityUtils.equals(BigInt(123), BigInt(456))).toBe(false);
    });
  });

  describe('Date Equality', () => {
    it('should compare dates by value', () => {
      const date1 = new Date('2024-01-01');
      const date2 = new Date('2024-01-01');
      const date3 = new Date('2024-01-02');

      expect(EntityUtils.equals(date1, date2)).toBe(true);
      expect(EntityUtils.equals(date1, date3)).toBe(false);
    });
  });

  describe('Array Equality', () => {
    it('should return true for equal arrays', () => {
      const arr1 = [1, 2, 3];
      const arr2 = [1, 2, 3];

      expect(EntityUtils.equals(arr1, arr2)).toBe(true);
    });

    it('should return false for different arrays', () => {
      const arr1 = [1, 2, 3];
      const arr2 = [1, 2, 4];

      expect(EntityUtils.equals(arr1, arr2)).toBe(false);
    });

    it('should handle empty arrays', () => {
      expect(EntityUtils.equals([], [])).toBe(true);
      expect(EntityUtils.equals([], [1])).toBe(false);
    });

    it('should handle arrays with different lengths', () => {
      expect(EntityUtils.equals([1, 2], [1, 2, 3])).toBe(false);
    });
  });

  describe('Plain Object Equality', () => {
    it('should return true for equal plain objects', () => {
      const obj1 = { name: 'John', age: 30 };
      const obj2 = { name: 'John', age: 30 };

      expect(EntityUtils.equals(obj1, obj2)).toBe(true);
    });

    it('should return false for different plain objects', () => {
      const obj1 = { name: 'John', age: 30 };
      const obj2 = { name: 'Jane', age: 30 };

      expect(EntityUtils.equals(obj1, obj2)).toBe(false);
    });

    it('should handle nested plain objects', () => {
      const obj1 = { user: { name: 'John' } };
      const obj2 = { user: { name: 'John' } };
      const obj3 = { user: { name: 'Jane' } };

      expect(EntityUtils.equals(obj1, obj2)).toBe(true);
      expect(EntityUtils.equals(obj1, obj3)).toBe(false);
    });
  });

  describe('Entity Equality', () => {
    it('should return true for identical entity instances', () => {
      const user1 = new TestUser({ name: 'John', age: 30, active: true });
      const user2 = new TestUser({ name: 'John', age: 30, active: true });

      expect(EntityUtils.equals(user1, user2)).toBe(true);
    });

    it('should return false for different entity instances', () => {
      const user1 = new TestUser({ name: 'John', age: 30, active: true });
      const user2 = new TestUser({ name: 'Jane', age: 30, active: true });

      expect(EntityUtils.equals(user1, user2)).toBe(false);
    });

    it('should compare entities with Date properties', () => {
      const product1 = new TestProduct({
        id: 'p1',
        name: 'Product A',
        price: 100,
        quantity: 10,
        createdAt: new Date('2024-01-01'),
      });

      const product2 = new TestProduct({
        id: 'p1',
        name: 'Product A',
        price: 100,
        quantity: 10,
        createdAt: new Date('2024-01-01'),
      });

      expect(EntityUtils.equals(product1, product2)).toBe(true);
    });

    it('should return false for entities of different types', () => {
      const user = new TestUser({ name: 'John', age: 30, active: true });
      const product = new TestProduct({
        id: 'p1',
        name: 'Product',
        price: 100,
        quantity: 10,
        createdAt: new Date(),
      });

      expect(EntityUtils.equals(user, product as any)).toBe(false);
    });
  });

  describe('Nested Entity Equality', () => {
    it('should compare nested entities', () => {
      const company1 = new TestCompany({
        name: 'TechCorp',
        address: new TestAddress({
          street: '123 Main St',
          city: 'Boston',
          country: 'USA',
          zipCode: 2101,
        }),
        employeeCount: 50,
      });

      const company2 = new TestCompany({
        name: 'TechCorp',
        address: new TestAddress({
          street: '123 Main St',
          city: 'Boston',
          country: 'USA',
          zipCode: 2101,
        }),
        employeeCount: 50,
      });

      expect(EntityUtils.equals(company1, company2)).toBe(true);
    });

    it('should detect differences in nested entities', () => {
      const company1 = new TestCompany({
        name: 'TechCorp',
        address: new TestAddress({
          street: '123 Main St',
          city: 'Boston',
          country: 'USA',
          zipCode: 2101,
        }),
        employeeCount: 50,
      });

      const company2 = new TestCompany({
        name: 'TechCorp',
        address: new TestAddress({
          street: '456 Oak Ave',
          city: 'Cambridge',
          country: 'USA',
          zipCode: 2139,
        }),
        employeeCount: 50,
      });

      expect(EntityUtils.equals(company1, company2)).toBe(false);
    });
  });

  describe('Array Properties Equality', () => {
    it('should compare entities with array properties', () => {
      const entity1 = new EntityWithArrays({
        tags: ['tag1', 'tag2'],
        ratings: [1, 2, 3],
        sparseArray: ['a', null, 'b'],
        users: [new TestUser({ name: 'John', age: 30, active: true })],
      });

      const entity2 = new EntityWithArrays({
        tags: ['tag1', 'tag2'],
        ratings: [1, 2, 3],
        sparseArray: ['a', null, 'b'],
        users: [new TestUser({ name: 'John', age: 30, active: true })],
      });

      expect(EntityUtils.equals(entity1, entity2)).toBe(true);
    });

    it('should detect differences in array elements', () => {
      const entity1 = new EntityWithArrays({
        tags: ['tag1', 'tag2'],
        ratings: [1, 2, 3],
        sparseArray: ['a', null, 'b'],
        users: [],
      });

      const entity2 = new EntityWithArrays({
        tags: ['tag1', 'tag3'],
        ratings: [1, 2, 3],
        sparseArray: ['a', null, 'b'],
        users: [],
      });

      expect(EntityUtils.equals(entity1, entity2)).toBe(false);
    });
  });

  describe('Custom Equality', () => {
    it('should use custom equals method when defined', () => {
      const entity1 = new EntityWithCustomEquals({
        id: '123',
        location: new CustomPoint(10, 20),
      });

      const entity2 = new EntityWithCustomEquals({
        id: '123',
        location: new CustomPoint(10, 20),
      });

      // Custom equals compares points by coordinates
      expect(EntityUtils.equals(entity1, entity2)).toBe(true);
    });

    it('should return false when custom equals returns false', () => {
      const entity1 = new EntityWithCustomEquals({
        id: '123',
        location: new CustomPoint(10, 20),
      });

      const entity2 = new EntityWithCustomEquals({
        id: '123',
        location: new CustomPoint(30, 40),
      });

      expect(EntityUtils.equals(entity1, entity2)).toBe(false);
    });
  });
});

describe('EntityUtils.diff', () => {
  describe('Basic Diff', () => {
    it('should return empty array when entities are identical', () => {
      const user1 = new TestUser({ name: 'John', age: 30, active: true });
      const user2 = new TestUser({ name: 'John', age: 30, active: true });

      const diffs = EntityUtils.diff(user1, user2);

      expect(diffs).toEqual([]);
    });

    it('should detect differences in primitive properties', () => {
      const user1 = new TestUser({ name: 'John', age: 30, active: true });
      const user2 = new TestUser({ name: 'Jane', age: 31, active: false });

      const diffs = EntityUtils.diff(user1, user2);

      expect(diffs).toHaveLength(3);
      expect(diffs).toContainEqual({
        property: 'name',
        oldValue: 'John',
        newValue: 'Jane',
      });
      expect(diffs).toContainEqual({
        property: 'age',
        oldValue: 30,
        newValue: 31,
      });
      expect(diffs).toContainEqual({
        property: 'active',
        oldValue: true,
        newValue: false,
      });
    });

    it('should detect single property change', () => {
      const user1 = new TestUser({ name: 'John', age: 30, active: true });
      const user2 = new TestUser({ name: 'Jane', age: 30, active: true });

      const diffs = EntityUtils.diff(user1, user2);

      expect(diffs).toHaveLength(1);
      expect(diffs[0]).toEqual({
        property: 'name',
        oldValue: 'John',
        newValue: 'Jane',
      });
    });
  });

  describe('Date Properties Diff', () => {
    it('should detect date changes', () => {
      const product1 = new TestProduct({
        id: 'p1',
        name: 'Product',
        price: 100,
        quantity: 10,
        createdAt: new Date('2024-01-01'),
      });

      const product2 = new TestProduct({
        id: 'p1',
        name: 'Product',
        price: 100,
        quantity: 10,
        createdAt: new Date('2024-02-01'),
      });

      const diffs = EntityUtils.diff(product1, product2);

      expect(diffs).toHaveLength(1);
      expect(diffs[0].property).toBe('createdAt');
    });
  });

  describe('Nested Entity Diff', () => {
    it('should detect differences in nested entities', () => {
      const company1 = new TestCompany({
        name: 'TechCorp',
        address: new TestAddress({
          street: '123 Main St',
          city: 'Boston',
          country: 'USA',
          zipCode: 2101,
        }),
        employeeCount: 50,
      });

      const company2 = new TestCompany({
        name: 'TechCorp',
        address: new TestAddress({
          street: '123 Main St',
          city: 'Cambridge',
          country: 'USA',
          zipCode: 2101,
        }),
        employeeCount: 50,
      });

      const diffs = EntityUtils.diff(company1, company2);

      expect(diffs).toHaveLength(1);
      expect(diffs[0].property).toBe('address');
    });
  });

  describe('Array Properties Diff', () => {
    it('should detect array changes', () => {
      const entity1 = new EntityWithArrays({
        tags: ['tag1', 'tag2'],
        ratings: [1, 2, 3],
        sparseArray: ['a', null],
        users: [],
      });

      const entity2 = new EntityWithArrays({
        tags: ['tag1', 'tag3'],
        ratings: [1, 2, 3],
        sparseArray: ['a', null],
        users: [],
      });

      const diffs = EntityUtils.diff(entity1, entity2);

      expect(diffs).toHaveLength(1);
      expect(diffs[0].property).toBe('tags');
    });

    it('should detect array length changes', () => {
      const entity1 = new EntityWithArrays({
        tags: ['tag1', 'tag2'],
        ratings: [1, 2],
        sparseArray: [],
        users: [],
      });

      const entity2 = new EntityWithArrays({
        tags: ['tag1', 'tag2', 'tag3'],
        ratings: [1, 2],
        sparseArray: [],
        users: [],
      });

      const diffs = EntityUtils.diff(entity1, entity2);

      expect(diffs).toHaveLength(1);
      expect(diffs[0].property).toBe('tags');
    });
  });

  describe('Entity Type Validation', () => {
    it('should throw when comparing different entity types', () => {
      const user = new TestUser({ name: 'John', age: 30, active: true });
      const product = new TestProduct({
        id: 'p1',
        name: 'Product',
        price: 100,
        quantity: 10,
        createdAt: new Date(),
      });

      expect(() => EntityUtils.diff(user, product as any)).toThrow();
    });
  });

  describe('Optional Properties Diff', () => {
    it('should handle optional properties', () => {
      const entity1 = new EntityWithDefaults({
        name: 'test1',
        counter: 1,
        timestamp: new Date('2024-01-01'),
        asyncField: 'async1',
        enabled: true,
      });

      const entity2 = new EntityWithDefaults({
        name: 'test2',
        counter: 1,
        timestamp: new Date('2024-01-01'),
        asyncField: 'async1',
        enabled: true,
      });

      const diffs = EntityUtils.diff(entity1, entity2);

      expect(diffs).toHaveLength(1);
      expect(diffs[0].property).toBe('name');
    });
  });
});

describe('EntityUtils Comparison Integration', () => {
  describe('Complex Entity Comparison', () => {
    it('should compare complex entities with multiple property types', () => {
      const entity1 = new ComplexEntity({
        id: 'test-id',
        name: 'Test',
        role: UserRole.USER,
        userId: new TestUserId({ value: 'user-123' }),
        address: new TestAddress({
          street: '123 Main',
          city: 'Boston',
          country: 'USA',
          zipCode: 2101,
        }),
        tags: ['tag1'],
        products: [],
        metadata: { key: 'value' },
      });

      const entity2 = new ComplexEntity({
        id: 'test-id',
        name: 'Test',
        role: UserRole.USER,
        userId: new TestUserId({ value: 'user-123' }),
        address: new TestAddress({
          street: '123 Main',
          city: 'Boston',
          country: 'USA',
          zipCode: 2101,
        }),
        tags: ['tag1'],
        products: [],
        metadata: { key: 'value' },
      });

      expect(EntityUtils.equals(entity1, entity2)).toBe(true);
      expect(EntityUtils.diff(entity1, entity2)).toEqual([]);
    });

    it('should detect multiple differences in complex entities', () => {
      const entity1 = new ComplexEntity({
        id: 'test-id',
        name: 'Test',
        role: UserRole.USER,
        userId: new TestUserId({ value: 'user-123' }),
        address: new TestAddress({
          street: '123 Main',
          city: 'Boston',
          country: 'USA',
          zipCode: 2101,
        }),
        tags: ['tag1'],
        products: [],
        metadata: { key: 'value1' },
      });

      const entity2 = new ComplexEntity({
        id: 'test-id',
        name: 'Updated',
        role: UserRole.ADMIN,
        userId: new TestUserId({ value: 'user-123' }),
        address: new TestAddress({
          street: '456 Oak',
          city: 'Cambridge',
          country: 'USA',
          zipCode: 2139,
        }),
        tags: ['tag2'],
        products: [],
        metadata: { key: 'value2' },
      });

      const diffs = EntityUtils.diff(entity1, entity2);

      expect(diffs.length).toBeGreaterThan(0);
      expect(diffs.some((d) => d.property === 'name')).toBe(true);
      expect(diffs.some((d) => d.property === 'role')).toBe(true);
    });
  });

  describe('Equality and Diff Consistency', () => {
    it('should have consistent equals and diff results for identical entities', () => {
      const user1 = new TestUser({ name: 'John', age: 30, active: true });
      const user2 = new TestUser({ name: 'John', age: 30, active: true });

      expect(EntityUtils.equals(user1, user2)).toBe(true);
      expect(EntityUtils.diff(user1, user2)).toEqual([]);
    });

    it('should have consistent equals and diff results for different entities', () => {
      const user1 = new TestUser({ name: 'John', age: 30, active: true });
      const user2 = new TestUser({ name: 'Jane', age: 30, active: true });

      expect(EntityUtils.equals(user1, user2)).toBe(false);
      expect(EntityUtils.diff(user1, user2).length).toBeGreaterThan(0);
    });
  });
});
