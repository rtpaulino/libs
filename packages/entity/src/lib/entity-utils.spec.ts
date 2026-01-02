import 'reflect-metadata';
import { describe, it, expect } from 'vitest';
import { EntityUtils } from './entity-utils.js';
import { Property } from './property.js';
import { Entity } from './entity.js';

describe('EntityUtils', () => {
  describe('isEntity', () => {
    it('should return true for entity class constructor', () => {
      @Entity()
      class User {
        name!: string;
      }

      expect(EntityUtils.isEntity(User)).toBe(true);
    });

    it('should return true for entity instance', () => {
      @Entity()
      class User {
        name!: string;
      }

      const user = new User();
      expect(EntityUtils.isEntity(user)).toBe(true);
    });

    it('should return false for non-entity class constructor', () => {
      class RegularClass {
        name!: string;
      }

      expect(EntityUtils.isEntity(RegularClass)).toBe(false);
    });

    it('should return false for non-entity instance', () => {
      class RegularClass {
        name!: string;
      }

      const obj = new RegularClass();
      expect(EntityUtils.isEntity(obj)).toBe(false);
    });

    it('should return false for plain object', () => {
      const obj = { name: 'test' };
      expect(EntityUtils.isEntity(obj)).toBe(false);
    });

    it('should return false for null', () => {
      expect(EntityUtils.isEntity(null)).toBe(false);
    });

    it('should return false for undefined', () => {
      expect(EntityUtils.isEntity(undefined)).toBe(false);
    });

    it('should return false for primitives', () => {
      expect(EntityUtils.isEntity(42)).toBe(false);
      expect(EntityUtils.isEntity('string')).toBe(false);
      expect(EntityUtils.isEntity(true)).toBe(false);
    });

    it('should return false for arrays', () => {
      expect(EntityUtils.isEntity([])).toBe(false);
      expect(EntityUtils.isEntity([1, 2, 3])).toBe(false);
    });

    it('should return false for built-in objects', () => {
      expect(EntityUtils.isEntity(new Date())).toBe(false);
      expect(EntityUtils.isEntity(new Map())).toBe(false);
      expect(EntityUtils.isEntity(new Set())).toBe(false);
    });

    it('should work with inherited entity classes', () => {
      @Entity()
      class BaseEntity {
        id!: number;
      }

      class DerivedEntity extends BaseEntity {
        name!: string;
      }

      expect(EntityUtils.isEntity(BaseEntity)).toBe(true);
      expect(EntityUtils.isEntity(new BaseEntity())).toBe(true);
      // Metadata is inherited, so derived class instances are also entities
      expect(EntityUtils.isEntity(DerivedEntity)).toBe(true);
      expect(EntityUtils.isEntity(new DerivedEntity())).toBe(true);
    });

    it('should return true when both parent and child are decorated', () => {
      @Entity()
      class BaseEntity {
        id!: number;
      }

      @Entity()
      class DerivedEntity extends BaseEntity {
        name!: string;
      }

      expect(EntityUtils.isEntity(BaseEntity)).toBe(true);
      expect(EntityUtils.isEntity(new BaseEntity())).toBe(true);
      expect(EntityUtils.isEntity(DerivedEntity)).toBe(true);
      expect(EntityUtils.isEntity(new DerivedEntity())).toBe(true);
    });
  });

  describe('getPropertyKeys', () => {
    it('should return empty array for class without properties', () => {
      class EmptyEntity {}

      const keys = EntityUtils.getPropertyKeys(EmptyEntity.prototype);

      expect(keys).toEqual([]);
    });

    it('should return property keys for class with decorated properties', () => {
      class TestEntity {
        @Property()
        name!: string;

        @Property()
        age!: number;
      }

      const keys = EntityUtils.getPropertyKeys(TestEntity.prototype);

      expect(keys).toHaveLength(2);
      expect(keys).toContain('name');
      expect(keys).toContain('age');
    });

    it('should return only decorated properties, not all class properties', () => {
      class MixedEntity {
        @Property()
        decorated!: string;

        undecorated!: string;
      }

      const keys = EntityUtils.getPropertyKeys(MixedEntity.prototype);

      expect(keys).toHaveLength(1);
      expect(keys).toContain('decorated');
      expect(keys).not.toContain('undecorated');
    });

    it('should work with multiple instances of EntityUtils', () => {
      class TestEntity {
        @Property()
        name!: string;
      }

      const keys1 = EntityUtils.getPropertyKeys(TestEntity.prototype);
      const keys2 = EntityUtils.getPropertyKeys(TestEntity.prototype);

      expect(keys1).toEqual(keys2);
      expect(keys1).toEqual(['name']);
    });

    it('should handle inherited properties correctly', () => {
      class BaseEntity {
        @Property()
        id!: number;
      }

      class DerivedEntity extends BaseEntity {
        @Property()
        name!: string;
      }

      const baseKeys = EntityUtils.getPropertyKeys(BaseEntity.prototype);
      const derivedKeys = EntityUtils.getPropertyKeys(DerivedEntity.prototype);

      // Base should only have its own property
      expect(baseKeys).toHaveLength(1);
      expect(baseKeys).toContain('id');

      // Derived should have both its own and inherited properties
      expect(derivedKeys).toHaveLength(2);
      expect(derivedKeys).toContain('id');
      expect(derivedKeys).toContain('name');
    });

    it('should support multi-level inheritance', () => {
      class BaseEntity {
        @Property()
        id!: number;
      }

      class MiddleEntity extends BaseEntity {
        @Property()
        createdAt!: Date;
      }

      class DerivedEntity extends MiddleEntity {
        @Property()
        name!: string;
      }

      const derivedKeys = EntityUtils.getPropertyKeys(DerivedEntity.prototype);

      // Should have all properties from the chain
      expect(derivedKeys).toHaveLength(3);
      expect(derivedKeys).toContain('id');
      expect(derivedKeys).toContain('createdAt');
      expect(derivedKeys).toContain('name');
    });

    it('should work when passing an object instance', () => {
      class TestEntity {
        @Property()
        name!: string;

        @Property()
        age!: number;
      }

      const instance = new TestEntity();
      const keys = EntityUtils.getPropertyKeys(instance);

      expect(keys).toHaveLength(2);
      expect(keys).toContain('name');
      expect(keys).toContain('age');
    });

    it('should work with inherited properties when passing an object instance', () => {
      class BaseEntity {
        @Property()
        id!: number;
      }

      class DerivedEntity extends BaseEntity {
        @Property()
        name!: string;
      }

      const instance = new DerivedEntity();
      const keys = EntityUtils.getPropertyKeys(instance);

      // Should get both inherited and own properties
      expect(keys).toHaveLength(2);
      expect(keys).toContain('id');
      expect(keys).toContain('name');
    });

    it('should not duplicate property keys when decorator is applied multiple times', () => {
      class TestEntity {
        @Property()
        name!: string;
      }

      // Apply decorator again manually (simulating edge case)
      Property()(TestEntity.prototype, 'name');

      const keys = EntityUtils.getPropertyKeys(TestEntity.prototype);

      expect(keys).toEqual(['name']);
    });
  });

  describe('sameEntity', () => {
    it('should return true for instances of the same entity class', () => {
      @Entity()
      class User {
        @Property()
        name!: string;
      }

      const user1 = new User();
      const user2 = new User();

      expect(EntityUtils.sameEntity(user1, user2)).toBe(true);
    });

    it('should return false for instances of different entity classes', () => {
      @Entity()
      class User {
        @Property()
        name!: string;
      }

      @Entity()
      class Product {
        @Property()
        title!: string;
      }

      const user = new User();
      const product = new Product();

      expect(EntityUtils.sameEntity(user, product)).toBe(false);
    });

    it('should return false when first argument is not an entity', () => {
      @Entity()
      class User {
        @Property()
        name!: string;
      }

      const user = new User();
      const plainObj = { name: 'test' };

      expect(EntityUtils.sameEntity(plainObj, user)).toBe(false);
    });

    it('should return false when second argument is not an entity', () => {
      @Entity()
      class User {
        @Property()
        name!: string;
      }

      const user = new User();
      const plainObj = { name: 'test' };

      expect(EntityUtils.sameEntity(user, plainObj)).toBe(false);
    });

    it('should return false when both arguments are not entities', () => {
      const obj1 = { name: 'test1' };
      const obj2 = { name: 'test2' };

      expect(EntityUtils.sameEntity(obj1, obj2)).toBe(false);
    });

    it('should return true for derived entities of the same class', () => {
      @Entity()
      class BaseEntity {
        @Property()
        id!: number;
      }

      @Entity()
      class DerivedEntity extends BaseEntity {
        @Property()
        name!: string;
      }

      const derived1 = new DerivedEntity();
      const derived2 = new DerivedEntity();

      expect(EntityUtils.sameEntity(derived1, derived2)).toBe(true);
    });

    it('should return false for base and derived entity instances', () => {
      @Entity()
      class BaseEntity {
        @Property()
        id!: number;
      }

      @Entity()
      class DerivedEntity extends BaseEntity {
        @Property()
        name!: string;
      }

      const base = new BaseEntity();
      const derived = new DerivedEntity();

      expect(EntityUtils.sameEntity(base, derived)).toBe(false);
    });
  });

  describe('equals', () => {
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
    });

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

    it('should return true for identical entity instances', () => {
      @Entity()
      class User {
        @Property()
        name!: string;

        @Property()
        age!: number;
      }

      const user1 = new User();
      user1.name = 'John';
      user1.age = 30;

      const user2 = new User();
      user2.name = 'John';
      user2.age = 30;

      expect(EntityUtils.equals(user1, user2)).toBe(true);
    });

    it('should return false for different entity instances', () => {
      @Entity()
      class User {
        @Property()
        name!: string;

        @Property()
        age!: number;
      }

      const user1 = new User();
      user1.name = 'John';
      user1.age = 30;

      const user2 = new User();
      user2.name = 'Jane';
      user2.age = 30;

      expect(EntityUtils.equals(user1, user2)).toBe(false);
    });

    it('should return false for entities of different types', () => {
      @Entity()
      class User {
        @Property()
        name!: string;
      }

      @Entity()
      class Product {
        @Property()
        name!: string;
      }

      const user = new User();
      user.name = 'John';

      const product = new Product();
      product.name = 'John';

      expect(EntityUtils.equals(user, product)).toBe(false);
    });

    it('should handle nested entities', () => {
      @Entity()
      class Address {
        @Property()
        street!: string;

        @Property()
        city!: string;
      }

      @Entity()
      class User {
        @Property()
        name!: string;

        @Property()
        address!: Address;
      }

      const address1 = new Address();
      address1.street = '123 Main St';
      address1.city = 'Springfield';

      const address2 = new Address();
      address2.street = '123 Main St';
      address2.city = 'Springfield';

      const user1 = new User();
      user1.name = 'John';
      user1.address = address1;

      const user2 = new User();
      user2.name = 'John';
      user2.address = address2;

      expect(EntityUtils.equals(user1, user2)).toBe(true);
    });

    it('should return false for nested entities with differences', () => {
      @Entity()
      class Address {
        @Property()
        street!: string;

        @Property()
        city!: string;
      }

      @Entity()
      class User {
        @Property()
        name!: string;

        @Property()
        address!: Address;
      }

      const address1 = new Address();
      address1.street = '123 Main St';
      address1.city = 'Springfield';

      const address2 = new Address();
      address2.street = '456 Oak Ave';
      address2.city = 'Springfield';

      const user1 = new User();
      user1.name = 'John';
      user1.address = address1;

      const user2 = new User();
      user2.name = 'John';
      user2.address = address2;

      expect(EntityUtils.equals(user1, user2)).toBe(false);
    });

    it('should handle nested plain objects', () => {
      const obj1 = { user: { name: 'John', profile: { age: 30 } } };
      const obj2 = { user: { name: 'John', profile: { age: 30 } } };

      expect(EntityUtils.equals(obj1, obj2)).toBe(true);
    });

    it('should handle arrays of entities', () => {
      @Entity()
      class User {
        @Property()
        name!: string;
      }

      const user1 = new User();
      user1.name = 'John';

      const user2 = new User();
      user2.name = 'John';

      expect(EntityUtils.equals([user1], [user2])).toBe(true);
    });

    it('should handle inherited properties in entity comparison', () => {
      @Entity()
      class BaseEntity {
        @Property()
        id!: number;
      }

      @Entity()
      class User extends BaseEntity {
        @Property()
        name!: string;
      }

      const user1 = new User();
      user1.id = 1;
      user1.name = 'John';

      const user2 = new User();
      user2.id = 1;
      user2.name = 'John';

      expect(EntityUtils.equals(user1, user2)).toBe(true);
    });

    it('should use custom equals method for non-entity objects', () => {
      class CustomObject {
        constructor(public value: number) {}

        equals(other: CustomObject): boolean {
          return this.value === other.value;
        }
      }

      const obj1 = new CustomObject(42);
      const obj2 = new CustomObject(42);
      const obj3 = new CustomObject(43);

      expect(EntityUtils.equals(obj1, obj2)).toBe(true);
      expect(EntityUtils.equals(obj1, obj3)).toBe(false);
    });

    it('should use custom equals method in nested objects', () => {
      class Point {
        constructor(
          public x: number,
          public y: number,
        ) {}

        equals(other: Point): boolean {
          return this.x === other.x && this.y === other.y;
        }
      }

      const obj1 = { location: new Point(10, 20), name: 'A' };
      const obj2 = { location: new Point(10, 20), name: 'A' };
      const obj3 = { location: new Point(15, 20), name: 'A' };

      expect(EntityUtils.equals(obj1, obj2)).toBe(true);
      expect(EntityUtils.equals(obj1, obj3)).toBe(false);
    });

    it('should use custom equals method in arrays', () => {
      class Value {
        constructor(public data: string) {}

        equals(other: Value): boolean {
          return this.data === other.data;
        }
      }

      const arr1 = [new Value('a'), new Value('b')];
      const arr2 = [new Value('a'), new Value('b')];
      const arr3 = [new Value('a'), new Value('c')];

      expect(EntityUtils.equals(arr1, arr2)).toBe(true);
      expect(EntityUtils.equals(arr1, arr3)).toBe(false);
    });

    it('should use custom equals method within entity properties', () => {
      class Timestamp {
        constructor(public ms: number) {}

        equals(other: Timestamp): boolean {
          return this.ms === other.ms;
        }
      }

      @Entity()
      class Event {
        @Property()
        name!: string;

        @Property()
        timestamp!: Timestamp;
      }

      const event1 = new Event();
      event1.name = 'Login';
      event1.timestamp = new Timestamp(1000);

      const event2 = new Event();
      event2.name = 'Login';
      event2.timestamp = new Timestamp(1000);

      const event3 = new Event();
      event3.name = 'Login';
      event3.timestamp = new Timestamp(2000);

      expect(EntityUtils.equals(event1, event2)).toBe(true);
      expect(EntityUtils.equals(event1, event3)).toBe(false);
    });

    it('should not use equals method if one value is null or undefined', () => {
      class CustomObject {
        constructor(public value: number) {}

        equals(other: CustomObject): boolean {
          return this.value === other.value;
        }
      }

      const obj = new CustomObject(42);

      expect(EntityUtils.equals(obj, null)).toBe(false);
      expect(EntityUtils.equals(null, obj)).toBe(false);
      expect(EntityUtils.equals(obj, undefined)).toBe(false);
      expect(EntityUtils.equals(undefined, obj)).toBe(false);
    });

    it('should handle objects with equals method that is not a function', () => {
      const obj1 = { value: 42, equals: 'not a function' };
      const obj2 = { value: 42, equals: 'not a function' };

      // Should fall back to default comparison
      expect(EntityUtils.equals(obj1, obj2)).toBe(true);
    });

    it('should not use equals method for arrays', () => {
      // Arrays should not be treated as objects with equals method
      const arr1: any = [1, 2, 3];
      const arr2: any = [1, 2, 3];

      // Add equals method to arrays (which shouldn't be called)
      arr1.equals = () => false;
      arr2.equals = () => false;

      // Should use array comparison, not the equals method
      expect(EntityUtils.equals(arr1, arr2)).toBe(true);
    });

    it('should use custom equals with complex nested structures', () => {
      class Coordinate {
        constructor(
          public x: number,
          public y: number,
        ) {}

        equals(other: Coordinate): boolean {
          return this.x === other.x && this.y === other.y;
        }
      }

      const obj1 = {
        points: [
          { coord: new Coordinate(1, 2), label: 'A' },
          { coord: new Coordinate(3, 4), label: 'B' },
        ],
      };

      const obj2 = {
        points: [
          { coord: new Coordinate(1, 2), label: 'A' },
          { coord: new Coordinate(3, 4), label: 'B' },
        ],
      };

      const obj3 = {
        points: [
          { coord: new Coordinate(1, 2), label: 'A' },
          { coord: new Coordinate(5, 6), label: 'B' },
        ],
      };

      expect(EntityUtils.equals(obj1, obj2)).toBe(true);
      expect(EntityUtils.equals(obj1, obj3)).toBe(false);
    });
  });

  describe('changes', () => {
    it('should return empty object when entities are identical', () => {
      @Entity()
      class User {
        @Property()
        name!: string;

        @Property()
        age!: number;
      }

      const entity1 = new User();
      entity1.name = 'John';
      entity1.age = 30;

      const entity2 = new User();
      entity2.name = 'John';
      entity2.age = 30;

      const changes = EntityUtils.changes(entity1, entity2);

      expect(changes).toEqual({});
    });

    it('should return only changed properties', () => {
      @Entity()
      class User {
        @Property()
        name!: string;

        @Property()
        age!: number;

        @Property()
        email!: string;
      }

      const oldEntity = new User();
      oldEntity.name = 'John';
      oldEntity.age = 30;
      oldEntity.email = 'john@example.com';

      const newEntity = new User();
      newEntity.name = 'Jane';
      newEntity.age = 30;
      newEntity.email = 'jane@example.com';

      const changes = EntityUtils.changes(oldEntity, newEntity);

      expect(changes).toEqual({
        name: 'Jane',
        email: 'jane@example.com',
      });
      expect(changes).not.toHaveProperty('age');
    });

    it('should throw error for entities of different types', () => {
      @Entity()
      class User {
        @Property()
        name!: string;
      }

      @Entity()
      class Product {
        @Property()
        title!: string;
      }

      const user = new User();
      const product = new Product();

      expect(() => EntityUtils.changes(user, product as any)).toThrow(
        'Entities must be of the same type to compute changes',
      );
    });

    it('should handle inherited properties', () => {
      @Entity()
      class BaseEntity {
        @Property()
        id!: number;
      }

      @Entity()
      class User extends BaseEntity {
        @Property()
        name!: string;
      }

      const oldEntity = new User();
      oldEntity.id = 1;
      oldEntity.name = 'John';

      const newEntity = new User();
      newEntity.id = 2;
      newEntity.name = 'John';

      const changes = EntityUtils.changes(oldEntity, newEntity);

      expect(changes).toEqual({ id: 2 });
    });

    it('should handle multiple changes across inheritance chain', () => {
      @Entity()
      class BaseEntity {
        @Property()
        id!: number;

        @Property()
        createdAt!: Date;
      }

      @Entity()
      class User extends BaseEntity {
        @Property()
        name!: string;

        @Property()
        email!: string;
      }

      const oldDate = new Date('2024-01-01');
      const newDate = new Date('2024-01-02');

      const oldEntity = new User();
      oldEntity.id = 1;
      oldEntity.createdAt = oldDate;
      oldEntity.name = 'John';
      oldEntity.email = 'john@example.com';

      const newEntity = new User();
      newEntity.id = 2;
      newEntity.createdAt = newDate;
      newEntity.name = 'Jane';
      newEntity.email = 'john@example.com';

      const changes = EntityUtils.changes(oldEntity, newEntity);

      expect(changes).toEqual({
        id: 2,
        createdAt: newDate,
        name: 'Jane',
      });
      expect(changes).not.toHaveProperty('email');
    });

    it('should ignore undecorated properties', () => {
      @Entity()
      class User {
        @Property()
        name!: string;

        undecorated!: string;
      }

      const oldEntity = new User();
      oldEntity.name = 'John';
      oldEntity.undecorated = 'old';

      const newEntity = new User();
      newEntity.name = 'Jane';
      newEntity.undecorated = 'new';

      const changes = EntityUtils.changes(oldEntity, newEntity);

      expect(changes).toEqual({ name: 'Jane' });
      expect(changes).not.toHaveProperty('undecorated');
    });

    it('should handle changes to undefined', () => {
      @Entity()
      class User {
        @Property()
        name!: string;

        @Property()
        nickname?: string;
      }

      const oldEntity = new User();
      oldEntity.name = 'John';
      oldEntity.nickname = 'Johnny';

      const newEntity = new User();
      newEntity.name = 'John';
      newEntity.nickname = undefined;

      const changes = EntityUtils.changes(oldEntity, newEntity);

      expect(changes).toEqual({ nickname: undefined });
    });

    it('should handle changes from undefined', () => {
      @Entity()
      class User {
        @Property()
        name!: string;

        @Property()
        nickname?: string;
      }

      const oldEntity = new User();
      oldEntity.name = 'John';
      oldEntity.nickname = undefined;

      const newEntity = new User();
      newEntity.name = 'John';
      newEntity.nickname = 'Johnny';

      const changes = EntityUtils.changes(oldEntity, newEntity);

      expect(changes).toEqual({ nickname: 'Johnny' });
    });

    it('should handle changes to null', () => {
      @Entity()
      class User {
        @Property()
        name!: string;

        @Property()
        nickname!: string | null;
      }

      const oldEntity = new User();
      oldEntity.name = 'John';
      oldEntity.nickname = 'Johnny';

      const newEntity = new User();
      newEntity.name = 'John';
      newEntity.nickname = null;

      const changes = EntityUtils.changes(oldEntity, newEntity);

      expect(changes).toEqual({ nickname: null });
    });
  });

  describe('diff', () => {
    it('should return empty array when entities are identical', () => {
      @Entity()
      class TestEntity {
        @Property()
        name!: string;

        @Property()
        age!: number;
      }

      const entity1 = new TestEntity();
      entity1.name = 'John';
      entity1.age = 30;

      const entity2 = new TestEntity();
      entity2.name = 'John';
      entity2.age = 30;

      const diffs = EntityUtils.diff(entity1, entity2);

      expect(diffs).toEqual([]);
    });

    it('should detect differences in decorated properties', () => {
      @Entity()
      class TestEntity {
        @Property()
        name!: string;

        @Property()
        age!: number;
      }

      const oldEntity = new TestEntity();
      oldEntity.name = 'John';
      oldEntity.age = 30;

      const newEntity = new TestEntity();
      newEntity.name = 'Jane';
      newEntity.age = 30;

      const diffs = EntityUtils.diff(oldEntity, newEntity);

      expect(diffs).toHaveLength(1);
      expect(diffs[0]).toEqual({
        property: 'name',
        oldValue: 'John',
        newValue: 'Jane',
      });
    });

    it('should ignore undecorated properties', () => {
      @Entity()
      class TestEntity {
        @Property()
        name!: string;

        undecorated!: string;
      }

      const oldEntity = new TestEntity();
      oldEntity.name = 'John';
      oldEntity.undecorated = 'old';

      const newEntity = new TestEntity();
      newEntity.name = 'John';
      newEntity.undecorated = 'new';

      const diffs = EntityUtils.diff(oldEntity, newEntity);

      expect(diffs).toEqual([]);
    });

    it('should detect differences in inherited properties', () => {
      @Entity()
      class BaseEntity {
        @Property()
        id!: number;
      }

      @Entity()
      class DerivedEntity extends BaseEntity {
        @Property()
        name!: string;
      }

      const oldEntity = new DerivedEntity();
      oldEntity.id = 1;
      oldEntity.name = 'John';

      const newEntity = new DerivedEntity();
      newEntity.id = 2;
      newEntity.name = 'John';

      const diffs = EntityUtils.diff(oldEntity, newEntity);

      expect(diffs).toHaveLength(1);
      expect(diffs[0]).toEqual({
        property: 'id',
        oldValue: 1,
        newValue: 2,
      });
    });

    it('should detect multiple differences across inheritance chain', () => {
      @Entity()
      class BaseEntity {
        @Property()
        id!: number;

        @Property()
        createdAt!: Date;
      }

      @Entity()
      class DerivedEntity extends BaseEntity {
        @Property()
        name!: string;
      }

      const oldDate = new Date('2024-01-01');
      const newDate = new Date('2024-01-02');

      const oldEntity = new DerivedEntity();
      oldEntity.id = 1;
      oldEntity.createdAt = oldDate;
      oldEntity.name = 'John';

      const newEntity = new DerivedEntity();
      newEntity.id = 2;
      newEntity.createdAt = newDate;
      newEntity.name = 'Jane';

      const diffs = EntityUtils.diff(oldEntity, newEntity);

      expect(diffs).toHaveLength(3);
      expect(diffs).toContainEqual({
        property: 'id',
        oldValue: 1,
        newValue: 2,
      });
      expect(diffs).toContainEqual({
        property: 'createdAt',
        oldValue: oldDate,
        newValue: newDate,
      });
      expect(diffs).toContainEqual({
        property: 'name',
        oldValue: 'John',
        newValue: 'Jane',
      });
    });

    it('should throw error for entities of different types', () => {
      @Entity()
      class User {
        @Property()
        name!: string;
      }

      @Entity()
      class Product {
        @Property()
        title!: string;
      }

      const user = new User();
      const product = new Product();

      expect(() => EntityUtils.diff(user, product as any)).toThrow(
        'Entities must be of the same type to compute diff',
      );
    });

    it('should handle changes in nested entities', () => {
      @Entity()
      class Address {
        @Property()
        street!: string;

        @Property()
        city!: string;
      }

      @Entity()
      class User {
        @Property()
        name!: string;

        @Property()
        address!: Address;
      }

      const address1 = new Address();
      address1.street = '123 Main St';
      address1.city = 'Springfield';

      const address2 = new Address();
      address2.street = '456 Oak Ave';
      address2.city = 'Springfield';

      const user1 = new User();
      user1.name = 'John';
      user1.address = address1;

      const user2 = new User();
      user2.name = 'John';
      user2.address = address2;

      const diffs = EntityUtils.diff(user1, user2);

      expect(diffs).toHaveLength(1);
      expect(diffs[0].property).toBe('address');
      expect(diffs[0].oldValue).toBe(address1);
      expect(diffs[0].newValue).toBe(address2);
    });

    it('should use custom equals function from property options', () => {
      @Entity()
      class User {
        @Property()
        name!: string;

        @Property({ equals: (a, b) => a.toLowerCase() === b.toLowerCase() })
        email!: string;
      }

      const user1 = new User();
      user1.name = 'John';
      user1.email = 'JOHN@EXAMPLE.COM';

      const user2 = new User();
      user2.name = 'John';
      user2.email = 'john@example.com';

      const diffs = EntityUtils.diff(user1, user2);

      // Should detect no differences because custom equals treats emails case-insensitively
      expect(diffs).toEqual([]);
    });

    it('should detect differences when custom equals returns false', () => {
      @Entity()
      class User {
        @Property({ equals: (a, b) => a.toLowerCase() === b.toLowerCase() })
        email!: string;
      }

      const user1 = new User();
      user1.email = 'john@example.com';

      const user2 = new User();
      user2.email = 'jane@example.com';

      const diffs = EntityUtils.diff(user1, user2);

      expect(diffs).toHaveLength(1);
      expect(diffs[0]).toEqual({
        property: 'email',
        oldValue: 'john@example.com',
        newValue: 'jane@example.com',
      });
    });

    it('should use custom equals with complex types', () => {
      @Entity()
      class User {
        @Property({
          equals: (a: Date, b: Date) =>
            a.getFullYear() === b.getFullYear() &&
            a.getMonth() === b.getMonth() &&
            a.getDate() === b.getDate(),
        })
        birthDate!: Date;
      }

      const user1 = new User();
      user1.birthDate = new Date('2000-01-15T10:30:00');

      const user2 = new User();
      user2.birthDate = new Date('2000-01-15T14:45:00');

      const diffs = EntityUtils.diff(user1, user2);

      // Should detect no differences because custom equals only compares date (not time)
      expect(diffs).toEqual([]);
    });
  });
});
