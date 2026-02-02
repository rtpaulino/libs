/* eslint-disable @typescript-eslint/no-explicit-any */
import 'reflect-metadata';
import { describe, it, expect } from 'vitest';
import { EntityUtils } from './entity-utils.js';
import {
  TestUser,
  TestProduct,
  ValidatedEntity,
  OptionalFieldsEntity,
  EntityWithDefaults,
  EntityWithArrays,
  TestCompany,
  TestAddress,
  EntityWithImmutable,
} from './test-entities.js';

describe('EntityUtils.update', () => {
  describe('Basic Updates', () => {
    it('should update primitive properties', async () => {
      const user = new TestUser({ name: 'John', age: 30, active: true });
      const updated = await EntityUtils.update(user, {
        name: 'Jane',
        age: 31,
      });

      expect(updated).toBeInstanceOf(TestUser);
      expect(updated.name).toBe('Jane');
      expect(updated.age).toBe(31);
    });

    it('should update partial properties', async () => {
      const user = new TestUser({ name: 'John', age: 30, active: true });
      const updated = await EntityUtils.update(user, { name: 'Jane' });

      expect(updated.name).toBe('Jane');
      expect(updated.age).toBe(30); // unchanged
    });

    it('should not mutate original instance', async () => {
      const user = new TestUser({ name: 'John', age: 30, active: true });
      const updated = await EntityUtils.update(user, { name: 'Jane' });

      expect(user.name).toBe('John');
      expect(updated.name).toBe('Jane');
      expect(user).not.toBe(updated);
    });

    it('should update entity with special types', async () => {
      const product = new TestProduct({
        id: 'p1',
        name: 'Product A',
        price: 100,
        quantity: 10,
        createdAt: new Date('2024-01-01'),
      });

      const newDate = new Date('2024-02-01');
      const updated = await EntityUtils.update(product, {
        price: 150,
        createdAt: newDate,
      });

      expect(updated.price).toBe(150);
      expect(updated.createdAt).toEqual(newDate);
      expect(product.price).toBe(100); // original unchanged
    });
  });

  describe('Immutability (preventUpdates Flag)', () => {
    it('should not update properties with preventUpdates: true', async () => {
      const entity = new EntityWithImmutable({
        id: '123',
        name: 'initial',
        createdAt: new Date('2024-01-01'),
        value: 100,
      });
      const updated = await EntityUtils.update(entity, {
        id: '456',
        value: 200,
      });

      expect(updated.id).toBe('123'); // not updated due to preventUpdates
      expect(updated.value).toBe(200); // updated
    });

    it('should preserve immutable fields even in full updates', async () => {
      const entity = new EntityWithImmutable({
        id: '123',
        name: 'initial',
        createdAt: new Date('2024-01-01'),
        value: 100,
      });
      const updated = await EntityUtils.update(entity, {
        id: 'new-id',
        value: 200,
      });

      expect(updated.id).toBe('123');
      expect(updated.value).toBe(200);
    });
  });

  describe('Validation After Update', () => {
    it('should validate after update (default mode)', async () => {
      const entity = new ValidatedEntity({
        username: 'john',
        email: 'john@example.com',
        age: 25,
      });

      const updated = await EntityUtils.update(entity, { username: 'ab' });

      // Should not throw, but should have problems
      expect(updated.username).toBe('ab');
      const problems = EntityUtils.getProblems(updated);
      expect(problems.length).toBeGreaterThan(0);
      expect(problems.some((p) => p.property === 'username')).toBe(true);
    });

    it('should throw when validation fails in strict mode', async () => {
      const entity = new ValidatedEntity({
        username: 'john',
        email: 'john@example.com',
        age: 25,
      });

      await expect(
        EntityUtils.update(entity, { username: 'ab' }, { strict: true }),
      ).rejects.toThrow();
    });

    it('should pass validation when values are valid', async () => {
      const entity = new ValidatedEntity({
        username: 'john',
        email: 'john@example.com',
        age: 25,
      });

      const updated = await EntityUtils.update(
        entity,
        { username: 'jane', age: 30 },
        { strict: true },
      );

      expect(updated.username).toBe('jane');
      expect(updated.age).toBe(30);
      const problems = EntityUtils.getProblems(updated);
      expect(problems).toHaveLength(0);
    });

    it('should validate age constraints', async () => {
      const entity = new ValidatedEntity({
        username: 'john',
        email: 'john@example.com',
        age: 25,
      });

      const updated = await EntityUtils.update(entity, { age: 200 });

      const problems = EntityUtils.getProblems(updated);
      expect(problems.some((p) => p.property === 'age')).toBe(true);
    });
  });

  describe('Default Values Not Re-Applied', () => {
    it('should not re-apply default values on update', async () => {
      const entity = new EntityWithDefaults({
        name: 'custom',
        counter: 999,
        timestamp: new Date('2024-01-01'),
        asyncField: 'custom-async',
        enabled: false,
      });

      const updated = await EntityUtils.update(entity, { name: 'updated' });

      expect(updated.name).toBe('updated');
      expect(updated.counter).toBe(999); // not reset to default
      expect(updated.asyncField).toBe('custom-async');
    });

    it('should preserve optional fields even if they have defaults', async () => {
      const entity = new EntityWithDefaults({
        name: 'initial',
        counter: 10,
        timestamp: new Date('2024-01-01'),
        asyncField: 'initial',
        enabled: true,
      });

      const updated = await EntityUtils.update(entity, {
        name: 'new-value',
      });

      expect(updated.name).toBe('new-value');
      expect(updated.counter).toBe(10); // unchanged, not reset to default
    });
  });

  describe('Nested Entity Updates', () => {
    it('should update nested entity properties', async () => {
      const company = new TestCompany({
        name: 'TechCorp',
        address: new TestAddress({
          street: '123 Main St',
          city: 'Boston',
          country: 'USA',
          zipCode: 2101,
        }),
        employeeCount: 50,
      });

      const updated = await EntityUtils.update(company, {
        address: new TestAddress({
          street: '456 Oak Ave',
          city: 'Cambridge',
          country: 'USA',
          zipCode: 2139,
        }),
      });

      expect(updated.address.street).toBe('456 Oak Ave');
      expect(updated.address.city).toBe('Cambridge');
      expect(company.address.city).toBe('Boston'); // original unchanged
    });

    it('should handle partial nested updates', async () => {
      const company = new TestCompany({
        name: 'TechCorp',
        address: new TestAddress({
          street: '123 Main St',
          city: 'Boston',
          country: 'USA',
          zipCode: 2101,
        }),
        employeeCount: 50,
      });

      const updated = await EntityUtils.update(company, { name: 'NewCorp' });

      expect(updated.name).toBe('NewCorp');
      expect(updated.address.city).toBe('Boston'); // nested unchanged
    });
  });

  describe('Array Updates', () => {
    it('should update arrays', async () => {
      const entity = new EntityWithArrays({
        tags: ['tag1', 'tag2'],
        ratings: [1, 2, 3],
        sparseArray: ['a', null, 'b'],
        users: [],
      });

      const updated = await EntityUtils.update(entity, {
        tags: ['new1', 'new2', 'new3'],
      });

      expect(updated.tags).toEqual(['new1', 'new2', 'new3']);
      expect(updated.ratings).toEqual([1, 2, 3]); // unchanged
    });

    it('should handle empty array updates', async () => {
      const entity = new EntityWithArrays({
        tags: ['tag1', 'tag2'],
        ratings: [1, 2, 3],
        sparseArray: ['a', null, 'b'],
        users: [],
      });

      const updated = await EntityUtils.update(entity, { tags: [] });

      expect(updated.tags).toEqual([]);
      expect(updated.ratings).toEqual([1, 2, 3]);
    });
  });

  describe('Optional Fields', () => {
    it('should update optional fields', async () => {
      const entity = new OptionalFieldsEntity({
        requiredField: 'required',
        requiredBoolean: true,
      });

      const updated = await EntityUtils.update(entity, {
        optionalField: 'now-set',
      });

      expect(updated.optionalField).toBe('now-set');
      expect(updated.requiredField).toBe('required');
    });

    it('should clear optional fields with undefined', async () => {
      const entity = new OptionalFieldsEntity({
        requiredField: 'required',
        optionalField: 'initial',
        requiredBoolean: true,
      });

      const updated = await EntityUtils.update(entity, {
        optionalField: undefined,
      });

      expect(updated.optionalField).toBeUndefined();
    });
  });

  describe('Error Handling', () => {
    it('should throw error when updating non-entity instance', async () => {
      const notEntity = { name: 'John' };

      await expect(
        EntityUtils.update(notEntity as any, { name: 'Jane' }),
      ).rejects.toThrow('Cannot update non-entity instance');
    });
  });
});

describe('EntityUtils.safeUpdate', () => {
  describe('Success Cases', () => {
    it('should return success for valid update', async () => {
      const user = new TestUser({ name: 'John', age: 30, active: true });
      const result = await EntityUtils.safeUpdate(user, { name: 'Jane' });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toBeInstanceOf(TestUser);
        expect(result.data.name).toBe('Jane');
        expect(result.problems).toHaveLength(0);
      }
    });

    it('should return success with validation problems in non-strict mode', async () => {
      const entity = new ValidatedEntity({
        username: 'john',
        email: 'john@example.com',
        age: 25,
      });

      const result = await EntityUtils.safeUpdate(
        entity,
        { username: 'ab' },
        { strict: false },
      );

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.username).toBe('ab');
        expect(result.problems.length).toBeGreaterThan(0);
      }
    });
  });

  describe('Failure Cases', () => {
    it('should return failure when validation fails in strict mode', async () => {
      const entity = new ValidatedEntity({
        username: 'john',
        email: 'john@example.com',
        age: 25,
      });

      const result = await EntityUtils.safeUpdate(
        entity,
        { username: 'ab' },
        { strict: true },
      );

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.data).toBeUndefined();
        expect(result.problems.length).toBeGreaterThan(0);
        expect(result.problems.some((p) => p.property === 'username')).toBe(
          true,
        );
      }
    });
  });

  describe('preventUpdates with safeUpdate', () => {
    it('should not update immutable fields', async () => {
      const entity = new EntityWithImmutable({
        id: '123',
        name: 'initial',
        createdAt: new Date('2024-01-01'),
        value: 100,
      });

      const result = await EntityUtils.safeUpdate(entity, {
        id: '456',
        value: 200,
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.id).toBe('123'); // not updated
        expect(result.data.value).toBe(200);
      }
    });
  });

  describe('Complex Updates with safeUpdate', () => {
    it('should handle nested entity updates safely', async () => {
      const company = new TestCompany({
        name: 'TechCorp',
        address: new TestAddress({
          street: '123 Main St',
          city: 'Boston',
          country: 'USA',
          zipCode: 2101,
        }),
        employeeCount: 50,
      });

      const result = await EntityUtils.safeUpdate(company, {
        address: new TestAddress({
          street: '456 Oak Ave',
          city: 'Cambridge',
          country: 'USA',
          zipCode: 2139,
        }),
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.address.city).toBe('Cambridge');
      }
    });

    it('should handle array updates safely', async () => {
      const entity = new EntityWithArrays({
        tags: ['tag1', 'tag2'],
        ratings: [1, 2, 3],
        sparseArray: ['a', null, 'b'],
        users: [],
      });

      const result = await EntityUtils.safeUpdate(entity, {
        tags: ['new1', 'new2'],
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.tags).toEqual(['new1', 'new2']);
      }
    });
  });

  describe('Validation Modes', () => {
    it('should respect strict: false (default)', async () => {
      const entity = new ValidatedEntity({
        username: 'john',
        email: 'john@example.com',
        age: 25,
      });

      const result = await EntityUtils.safeUpdate(entity, { age: 200 });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.age).toBe(200);
        expect(result.problems.length).toBeGreaterThan(0);
      }
    });

    it('should respect strict: true', async () => {
      const entity = new ValidatedEntity({
        username: 'john',
        email: 'john@example.com',
        age: 25,
      });

      const result = await EntityUtils.safeUpdate(
        entity,
        { age: 200 },
        { strict: true },
      );

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.problems.length).toBeGreaterThan(0);
      }
    });
  });
});
