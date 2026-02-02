/* eslint-disable @typescript-eslint/no-explicit-any */
import 'reflect-metadata';
import { describe, it, expect } from 'vitest';
import { EntityUtils } from './entity-utils.js';
import { Problem } from './problem.js';
import {
  TestUser,
  TestTags,
  TestUserCollection,
  TestUserId,
  TestEmail,
  ValidatedEntity,
  TestCompany,
  TestAddress,
} from './test-entities.js';

describe('EntityUtils Metadata', () => {
  describe('isEntity', () => {
    it('should return true for entity class constructor', () => {
      expect(EntityUtils.isEntity(TestUser)).toBe(true);
      expect(EntityUtils.isEntity(TestCompany)).toBe(true);
      expect(EntityUtils.isEntity(ValidatedEntity)).toBe(true);
    });

    it('should return true for entity instances', () => {
      const user = new TestUser({ name: 'John', age: 30, active: true });
      expect(EntityUtils.isEntity(user)).toBe(true);

      const company = new TestCompany({
        name: 'TechCorp',
        address: new TestAddress({
          street: '123 Main',
          city: 'Boston',
          country: 'USA',
          zipCode: 2101,
        }),
        employeeCount: 50,
      });
      expect(EntityUtils.isEntity(company)).toBe(true);
    });

    it('should return false for non-entity classes', () => {
      class RegularClass {
        name!: string;
      }

      expect(EntityUtils.isEntity(RegularClass)).toBe(false);
      expect(EntityUtils.isEntity(new RegularClass())).toBe(false);
    });

    it('should return false for plain objects', () => {
      const obj = { name: 'test', age: 30 };
      expect(EntityUtils.isEntity(obj)).toBe(false);
    });

    it('should return false for primitives', () => {
      expect(EntityUtils.isEntity(42)).toBe(false);
      expect(EntityUtils.isEntity('string')).toBe(false);
      expect(EntityUtils.isEntity(true)).toBe(false);
      expect(EntityUtils.isEntity(null)).toBe(false);
      expect(EntityUtils.isEntity(undefined)).toBe(false);
    });

    it('should return false for arrays and built-in objects', () => {
      expect(EntityUtils.isEntity([])).toBe(false);
      expect(EntityUtils.isEntity([1, 2, 3])).toBe(false);
      expect(EntityUtils.isEntity(new Date())).toBe(false);
      expect(EntityUtils.isEntity(new Map())).toBe(false);
      expect(EntityUtils.isEntity(new Set())).toBe(false);
    });
  });

  describe('isCollectionEntity', () => {
    it('should return true for collection entity classes', () => {
      expect(EntityUtils.isCollectionEntity(TestTags)).toBe(true);
      expect(EntityUtils.isCollectionEntity(TestUserCollection)).toBe(true);
    });

    it('should return true for collection entity instances', () => {
      const tags = new TestTags({ collection: ['tag1', 'tag2'] });
      expect(EntityUtils.isCollectionEntity(tags)).toBe(true);

      const users = new TestUserCollection({
        collection: [new TestUser({ name: 'John', age: 30, active: true })],
      });
      expect(EntityUtils.isCollectionEntity(users)).toBe(true);
    });

    it('should return false for regular entities', () => {
      expect(EntityUtils.isCollectionEntity(TestUser)).toBe(false);
      expect(EntityUtils.isCollectionEntity(TestCompany)).toBe(false);

      const user = new TestUser({ name: 'John', age: 30, active: true });
      expect(EntityUtils.isCollectionEntity(user)).toBe(false);
    });

    it('should return false for non-entities', () => {
      class NotAnEntity {}

      expect(EntityUtils.isCollectionEntity(NotAnEntity)).toBe(false);
      expect(EntityUtils.isCollectionEntity(new NotAnEntity())).toBe(false);
      expect(EntityUtils.isCollectionEntity({})).toBe(false);
      expect(EntityUtils.isCollectionEntity(null)).toBe(false);
      expect(EntityUtils.isCollectionEntity(undefined)).toBe(false);
    });
  });

  describe('isStringifiable', () => {
    it('should return true for stringifiable entity classes', () => {
      expect(EntityUtils.isStringifiable(TestUserId)).toBe(true);
      expect(EntityUtils.isStringifiable(TestEmail)).toBe(true);
    });

    it('should return true for stringifiable entity instances', () => {
      const userId = new TestUserId({ value: 'user-123' });
      expect(EntityUtils.isStringifiable(userId)).toBe(true);

      const email = new TestEmail({ value: 'test@example.com' });
      expect(EntityUtils.isStringifiable(email)).toBe(true);
    });

    it('should return false for regular entities', () => {
      expect(EntityUtils.isStringifiable(TestUser)).toBe(false);
      expect(EntityUtils.isStringifiable(TestCompany)).toBe(false);

      const user = new TestUser({ name: 'John', age: 30, active: true });
      expect(EntityUtils.isStringifiable(user)).toBe(false);
    });

    it('should return false for collection entities', () => {
      expect(EntityUtils.isStringifiable(TestTags)).toBe(false);
      expect(EntityUtils.isStringifiable(TestUserCollection)).toBe(false);
    });

    it('should return false for non-entities', () => {
      expect(EntityUtils.isStringifiable({})).toBe(false);
      expect(EntityUtils.isStringifiable(null)).toBe(false);
      expect(EntityUtils.isStringifiable(undefined)).toBe(false);
    });
  });

  describe('sameEntity', () => {
    it('should return true for same entity type', () => {
      const user1 = new TestUser({ name: 'John', age: 30, active: true });
      const user2 = new TestUser({ name: 'Jane', age: 25, active: false });

      expect(EntityUtils.sameEntity(user1, user2)).toBe(true);
    });

    it('should return false for different entity types', () => {
      const user = new TestUser({ name: 'John', age: 30, active: true });
      const company = new TestCompany({
        name: 'TechCorp',
        address: new TestAddress({
          street: '123 Main',
          city: 'Boston',
          country: 'USA',
          zipCode: 2101,
        }),
        employeeCount: 50,
      });

      expect(EntityUtils.sameEntity(user, company as any)).toBe(false);
    });

    it('should return true when comparing same instance', () => {
      const user = new TestUser({ name: 'John', age: 30, active: true });

      expect(EntityUtils.sameEntity(user, user)).toBe(true);
    });
  });

  describe('getPropertyKeys', () => {
    it('should return property keys for entity', () => {
      const keys = EntityUtils.getPropertyKeys(TestUser.prototype);

      expect(keys).toContain('name');
      expect(keys).toContain('age');
      expect(keys).toContain('active');
      expect(keys.length).toBeGreaterThan(0);
    });

    it('should return property keys for entity with nested properties', () => {
      const keys = EntityUtils.getPropertyKeys(TestCompany.prototype);

      expect(keys).toContain('name');
      expect(keys).toContain('address');
      expect(keys).toContain('employeeCount');
    });

    it('should handle entities with validators', () => {
      const keys = EntityUtils.getPropertyKeys(ValidatedEntity.prototype);

      expect(keys).toContain('username');
      expect(keys).toContain('email');
      expect(keys).toContain('age');
    });
  });

  describe('getPropertyOptions', () => {
    it('should return property options for decorated properties', () => {
      const nameOptions = EntityUtils.getPropertyOptions(
        TestUser.prototype,
        'name',
      );

      expect(nameOptions).toBeDefined();
      expect(nameOptions?.type).toBeDefined();
    });

    it('should return undefined for non-existent properties', () => {
      const options = EntityUtils.getPropertyOptions(
        TestUser.prototype,
        'nonexistent' as any,
      );

      expect(options).toBeUndefined();
    });

    it('should return options with validators for validated properties', () => {
      const usernameOptions = EntityUtils.getPropertyOptions(
        ValidatedEntity.prototype,
        'username',
      );

      expect(usernameOptions).toBeDefined();
      expect(usernameOptions?.type).toBeDefined();
      expect(typeof usernameOptions?.type).toBe('function');
    });

    it('should return options with optional flag', () => {
      const addressOptions = EntityUtils.getPropertyOptions(
        TestCompany.prototype,
        'address',
      );

      expect(addressOptions).toBeDefined();
      expect(addressOptions?.type).toBeDefined();
    });
  });

  describe('getProblems', () => {
    it('should return empty array for entity without problems', () => {
      const user = new TestUser({ name: 'John', age: 30, active: true });

      const problems = EntityUtils.getProblems(user);

      expect(problems).toEqual([]);
    });

    it('should return problems after validation failure', async () => {
      const entity = await EntityUtils.parse(ValidatedEntity, {
        username: 'ab', // too short
        email: 'test@example.com',
        age: 25,
      });

      const problems = EntityUtils.getProblems(entity);

      expect(problems.length).toBeGreaterThan(0);
      expect(problems[0]).toBeInstanceOf(Problem);
    });

    it('should store and retrieve multiple problems', async () => {
      const entity = await EntityUtils.parse(ValidatedEntity, {
        username: 'ab', // too short
        email: 'invalid', // bad format
        age: 200, // out of range
      });

      const problems = EntityUtils.getProblems(entity);

      expect(problems.length).toBeGreaterThan(1);
    });

    it('should handle problems being cleared', async () => {
      const entity = await EntityUtils.parse(ValidatedEntity, {
        username: 'ab',
        email: 'test@example.com',
        age: 25,
      });

      expect(EntityUtils.getProblems(entity).length).toBeGreaterThan(0);

      // Re-validate with correct data
      entity.username = 'john';
      await EntityUtils.validate(entity);

      expect(EntityUtils.getProblems(entity)).toHaveLength(0);
    });
  });

  describe('setProblems', () => {
    it('should set problems on entity', () => {
      const user = new TestUser({ name: 'John', age: 30, active: true });
      const problems = [
        new Problem({ property: 'name', message: 'Test error' }),
      ];

      EntityUtils.setProblems(user, problems);

      expect(EntityUtils.getProblems(user)).toEqual(problems);
      expect(EntityUtils.getProblems(user).length).toBeGreaterThan(0);
    });

    it('should replace existing problems', async () => {
      const entity = await EntityUtils.parse(ValidatedEntity, {
        username: 'ab',
        email: 'test@example.com',
        age: 25,
      });

      const initialProblems = EntityUtils.getProblems(entity);
      expect(initialProblems.length).toBeGreaterThan(0);

      const newProblems = [
        new Problem({ property: 'custom', message: 'Custom error' }),
      ];

      EntityUtils.setProblems(entity, newProblems);

      expect(EntityUtils.getProblems(entity)).toEqual(newProblems);
      expect(EntityUtils.getProblems(entity)).toHaveLength(1);
    });

    it('should clear problems when set to empty array', () => {
      const user = new TestUser({ name: 'John', age: 30, active: true });
      EntityUtils.setProblems(user, [
        new Problem({ property: 'name', message: 'Error' }),
      ]);

      expect(EntityUtils.getProblems(user).length).toBeGreaterThan(0);

      EntityUtils.setProblems(user, []);

      expect(EntityUtils.getProblems(user).length).toBe(0);
      expect(EntityUtils.getProblems(user)).toEqual([]);
    });
  });

  describe('getRawInput', () => {
    it('should return raw input for parsed entities', async () => {
      const input = { name: 'John', age: 30, active: true };
      const user = await EntityUtils.parse(TestUser, input);

      const rawInput = EntityUtils.getRawInput(user);

      expect(rawInput).toBe(input);
    });

    it('should return undefined for manually created entities', () => {
      const user = new TestUser({ name: 'John', age: 30, active: true });

      const rawInput = EntityUtils.getRawInput(user);

      expect(rawInput).toBeUndefined();
    });

    it('should not preserve raw input through updates by default', async () => {
      const input = { name: 'John', age: 30, active: true };
      const user = await EntityUtils.parse(TestUser, input);
      const updated = await EntityUtils.update(user, { name: 'Jane' });

      // update creates a new instance, raw input is lost unless preserved manually
      const rawInput = EntityUtils.getRawInput(updated);
      expect(rawInput).toBeUndefined();
    });
  });

  describe('setRawInput', () => {
    it('should set raw input on entity', () => {
      const user = new TestUser({ name: 'John', age: 30, active: true });
      const input = { name: 'John', age: 30, active: true };

      EntityUtils.setRawInput(user, input);

      expect(EntityUtils.getRawInput(user)).toBe(input);
    });

    it('should replace existing raw input', async () => {
      const input1 = { name: 'John', age: 30, active: true };
      const user = await EntityUtils.parse(TestUser, input1);

      const input2 = { name: 'Jane', age: 25, active: false };
      EntityUtils.setRawInput(user, input2);

      expect(EntityUtils.getRawInput(user)).toBe(input2);
      expect(EntityUtils.getRawInput(user)).not.toBe(input1);
    });
  });

  describe('Entity Type Checks Integration', () => {
    it('should correctly identify different entity types', () => {
      // Regular entity
      expect(EntityUtils.isEntity(TestUser)).toBe(true);
      expect(EntityUtils.isCollectionEntity(TestUser)).toBe(false);
      expect(EntityUtils.isStringifiable(TestUser)).toBe(false);

      // Collection entity
      expect(EntityUtils.isEntity(TestTags)).toBe(true);
      expect(EntityUtils.isCollectionEntity(TestTags)).toBe(true);
      expect(EntityUtils.isStringifiable(TestTags)).toBe(false);

      // Stringifiable entity
      expect(EntityUtils.isEntity(TestUserId)).toBe(true);
      expect(EntityUtils.isCollectionEntity(TestUserId)).toBe(false);
      expect(EntityUtils.isStringifiable(TestUserId)).toBe(true);
    });

    it('should work with entity instances', () => {
      const user = new TestUser({ name: 'John', age: 30, active: true });
      const tags = new TestTags({ collection: ['tag1'] });
      const userId = new TestUserId({ value: 'user-123' });

      expect(EntityUtils.isEntity(user)).toBe(true);
      expect(EntityUtils.isCollectionEntity(user)).toBe(false);
      expect(EntityUtils.isStringifiable(user)).toBe(false);

      expect(EntityUtils.isEntity(tags)).toBe(true);
      expect(EntityUtils.isCollectionEntity(tags)).toBe(true);
      expect(EntityUtils.isStringifiable(tags)).toBe(false);

      expect(EntityUtils.isEntity(userId)).toBe(true);
      expect(EntityUtils.isCollectionEntity(userId)).toBe(false);
      expect(EntityUtils.isStringifiable(userId)).toBe(true);
    });
  });

  describe('Metadata Persistence', () => {
    it('should preserve entity type through parse and update', async () => {
      const input = { name: 'John', age: 30, active: true };
      const user = await EntityUtils.parse(TestUser, input);

      expect(EntityUtils.isEntity(user)).toBe(true);
      expect(EntityUtils.getRawInput(user)).toBe(input);

      const updated = await EntityUtils.update(user, { name: 'Jane' });

      expect(EntityUtils.isEntity(updated)).toBe(true);
    });

    it('should maintain problems across validation calls', async () => {
      const entity = await EntityUtils.parse(ValidatedEntity, {
        username: 'ab',
        email: 'test@example.com',
        age: 25,
      });

      const problems = EntityUtils.getProblems(entity);
      expect(problems.length).toBeGreaterThan(0);

      // Problems should persist until cleared
      expect(EntityUtils.getProblems(entity).length).toBeGreaterThan(0);
    });
  });
});
