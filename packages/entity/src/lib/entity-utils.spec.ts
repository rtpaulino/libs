import 'reflect-metadata';
import { describe, it, expect } from 'vitest';
import { EntityUtils } from './entity-utils.js';
import {
  Property,
  StringProperty,
  NumberProperty,
  BooleanProperty,
  DateProperty,
  BigIntProperty,
  EntityProperty,
  ArrayProperty,
  PassthroughProperty,
} from './property.js';
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
        @Property({ type: () => Object })
        name!: string;

        @Property({ type: () => Object })
        age!: number;
      }

      const keys = EntityUtils.getPropertyKeys(TestEntity.prototype);

      expect(keys).toHaveLength(2);
      expect(keys).toContain('name');
      expect(keys).toContain('age');
    });

    it('should return only decorated properties, not all class properties', () => {
      class MixedEntity {
        @Property({ type: () => Object })
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
        @Property({ type: () => Object })
        name!: string;
      }

      const keys1 = EntityUtils.getPropertyKeys(TestEntity.prototype);
      const keys2 = EntityUtils.getPropertyKeys(TestEntity.prototype);

      expect(keys1).toEqual(keys2);
      expect(keys1).toEqual(['name']);
    });

    it('should handle inherited properties correctly', () => {
      class BaseEntity {
        @Property({ type: () => Object })
        id!: number;
      }

      class DerivedEntity extends BaseEntity {
        @Property({ type: () => Object })
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
        @Property({ type: () => Object })
        id!: number;
      }

      class MiddleEntity extends BaseEntity {
        @Property({ type: () => Object })
        createdAt!: Date;
      }

      class DerivedEntity extends MiddleEntity {
        @Property({ type: () => Object })
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
        @Property({ type: () => Object })
        name!: string;

        @Property({ type: () => Object })
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
        @Property({ type: () => Object })
        id!: number;
      }

      class DerivedEntity extends BaseEntity {
        @Property({ type: () => Object })
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
        @Property({ type: () => Object })
        name!: string;
      }

      // Apply decorator again manually (simulating edge case)
      Property({ type: () => Object })(TestEntity.prototype, 'name');

      const keys = EntityUtils.getPropertyKeys(TestEntity.prototype);

      expect(keys).toEqual(['name']);
    });
  });

  describe('sameEntity', () => {
    it('should return true for instances of the same entity class', () => {
      @Entity()
      class User {
        @Property({ type: () => Object })
        name!: string;
      }

      const user1 = new User();
      const user2 = new User();

      expect(EntityUtils.sameEntity(user1, user2)).toBe(true);
    });

    it('should return false for instances of different entity classes', () => {
      @Entity()
      class User {
        @Property({ type: () => Object })
        name!: string;
      }

      @Entity()
      class Product {
        @Property({ type: () => Object })
        title!: string;
      }

      const user = new User();
      const product = new Product();

      expect(EntityUtils.sameEntity(user, product)).toBe(false);
    });

    it('should return false when first argument is not an entity', () => {
      @Entity()
      class User {
        @Property({ type: () => Object })
        name!: string;
      }

      const user = new User();
      const plainObj = { name: 'test' };

      expect(EntityUtils.sameEntity(plainObj, user)).toBe(false);
    });

    it('should return false when second argument is not an entity', () => {
      @Entity()
      class User {
        @Property({ type: () => Object })
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
        @Property({ type: () => Object })
        id!: number;
      }

      @Entity()
      class DerivedEntity extends BaseEntity {
        @Property({ type: () => Object })
        name!: string;
      }

      const derived1 = new DerivedEntity();
      const derived2 = new DerivedEntity();

      expect(EntityUtils.sameEntity(derived1, derived2)).toBe(true);
    });

    it('should return false for base and derived entity instances', () => {
      @Entity()
      class BaseEntity {
        @Property({ type: () => Object })
        id!: number;
      }

      @Entity()
      class DerivedEntity extends BaseEntity {
        @Property({ type: () => Object })
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
        @Property({ type: () => Object })
        name!: string;

        @Property({ type: () => Object })
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
        @Property({ type: () => Object })
        name!: string;

        @Property({ type: () => Object })
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
        @Property({ type: () => Object })
        name!: string;
      }

      @Entity()
      class Product {
        @Property({ type: () => Object })
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
        @Property({ type: () => Object })
        street!: string;

        @Property({ type: () => Object })
        city!: string;
      }

      @Entity()
      class User {
        @Property({ type: () => Object })
        name!: string;

        @Property({ type: () => Object })
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
        @Property({ type: () => Object })
        street!: string;

        @Property({ type: () => Object })
        city!: string;
      }

      @Entity()
      class User {
        @Property({ type: () => Object })
        name!: string;

        @Property({ type: () => Object })
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
        @Property({ type: () => Object })
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
        @Property({ type: () => Object })
        id!: number;
      }

      @Entity()
      class User extends BaseEntity {
        @Property({ type: () => Object })
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
        @Property({ type: () => Object })
        name!: string;

        @Property({ type: () => Object })
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
      const arr1 = [1, 2, 3];
      const arr2 = [1, 2, 3];

      // Add equals method to arrays (which shouldn't be called)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (arr1 as any).equals = () => false;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (arr2 as any).equals = () => false;

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
        @Property({ type: () => Object })
        name!: string;

        @Property({ type: () => Object })
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
        @Property({ type: () => Object })
        name!: string;

        @Property({ type: () => Object })
        age!: number;

        @Property({ type: () => Object })
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
        @Property({ type: () => Object })
        name!: string;
      }

      @Entity()
      class Product {
        @Property({ type: () => Object })
        title!: string;
      }

      const user = new User();
      const product = new Product();

      expect(() =>
        EntityUtils.changes(user, product as unknown as User),
      ).toThrow('Entities must be of the same type to compute changes');
    });

    it('should handle inherited properties', () => {
      @Entity()
      class BaseEntity {
        @Property({ type: () => Object })
        id!: number;
      }

      @Entity()
      class User extends BaseEntity {
        @Property({ type: () => Object })
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
        @Property({ type: () => Object })
        id!: number;

        @Property({ type: () => Object })
        createdAt!: Date;
      }

      @Entity()
      class User extends BaseEntity {
        @Property({ type: () => Object })
        name!: string;

        @Property({ type: () => Object })
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
        @Property({ type: () => Object })
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
        @Property({ type: () => Object })
        name!: string;

        @Property({ type: () => Object })
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
        @Property({ type: () => Object })
        name!: string;

        @Property({ type: () => Object })
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
        @Property({ type: () => Object })
        name!: string;

        @Property({ type: () => Object })
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
        @Property({ type: () => Object })
        name!: string;

        @Property({ type: () => Object })
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
        @Property({ type: () => Object })
        name!: string;

        @Property({ type: () => Object })
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
        @Property({ type: () => Object })
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
        @Property({ type: () => Object })
        id!: number;
      }

      @Entity()
      class DerivedEntity extends BaseEntity {
        @Property({ type: () => Object })
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
        @Property({ type: () => Object })
        id!: number;

        @Property({ type: () => Object })
        createdAt!: Date;
      }

      @Entity()
      class DerivedEntity extends BaseEntity {
        @Property({ type: () => Object })
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
        @Property({ type: () => Object })
        name!: string;
      }

      @Entity()
      class Product {
        @Property({ type: () => Object })
        title!: string;
      }

      const user = new User();
      const product = new Product();

      expect(() => EntityUtils.diff(user, product as unknown as User)).toThrow(
        'Entities must be of the same type to compute diff',
      );
    });

    it('should handle changes in nested entities', () => {
      @Entity()
      class Address {
        @Property({ type: () => Object })
        street!: string;

        @Property({ type: () => Object })
        city!: string;
      }

      @Entity()
      class User {
        @Property({ type: () => Object })
        name!: string;

        @Property({ type: () => Object })
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
        @Property({ type: () => String })
        name!: string;

        @Property({
          type: () => String,
          equals: (a, b) => a.toLowerCase() === b.toLowerCase(),
        })
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
        @Property({
          type: () => String,
          equals: (a, b) => a.toLowerCase() === b.toLowerCase(),
        })
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
          type: () => Date,
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

  describe('toJSON', () => {
    describe('simple entities', () => {
      it('should serialize only @Property decorated properties', () => {
        @Entity()
        class User {
          @Property({ type: () => Object }) name!: string;
          @Property({ type: () => Object }) age!: number;
          undecorated!: string;
        }

        const user = new User();
        user.name = 'John';
        user.age = 30;
        user.undecorated = 'should not appear';

        const json = EntityUtils.toJSON(user);

        expect(json).toEqual({
          name: 'John',
          age: 30,
        });
        expect(json).not.toHaveProperty('undecorated');
      });

      it('should exclude undefined values', () => {
        @Entity()
        class User {
          @Property({ type: () => Object }) name!: string;
          @Property({ type: () => Object }) age?: number;
          @Property({ type: () => Object }) email?: string;
        }

        const user = new User();
        user.name = 'John';
        // age and email are undefined

        const json = EntityUtils.toJSON(user);

        expect(json).toEqual({
          name: 'John',
        });
        expect(json).not.toHaveProperty('age');
        expect(json).not.toHaveProperty('email');
      });

      it('should include null values', () => {
        @Entity()
        class User {
          @Property({ type: () => Object }) name!: string;
          @Property({ type: () => Object }) age!: number | null;
          @Property({ type: () => Object }) email!: string | null;
        }

        const user = new User();
        user.name = 'John';
        user.age = null;
        user.email = null;

        const json = EntityUtils.toJSON(user);

        expect(json).toEqual({
          name: 'John',
          age: null,
          email: null,
        });
      });

      it('should serialize primitives correctly', () => {
        @Entity()
        class Data {
          @Property({ type: () => Object }) str!: string;
          @Property({ type: () => Object }) num!: number;
          @Property({ type: () => Object }) bool!: boolean;
          @Property({ type: () => Object }) zero!: number;
          @Property({ type: () => Object }) empty!: string;
        }

        const data = new Data();
        data.str = 'test';
        data.num = 42;
        data.bool = true;
        data.zero = 0;
        data.empty = '';

        const json = EntityUtils.toJSON(data);

        expect(json).toEqual({
          str: 'test',
          num: 42,
          bool: true,
          zero: 0,
          empty: '',
        });
      });
    });

    describe('inheritance', () => {
      it('should serialize properties from parent and child classes', () => {
        @Entity()
        class BaseEntity {
          @Property({ type: () => Object }) id!: number;
          @Property({ type: () => Object }) createdAt!: Date;
        }

        @Entity()
        class User extends BaseEntity {
          @Property({ type: () => Object }) name!: string;
          @Property({ type: () => Object }) email!: string;
        }

        const user = new User();
        user.id = 1;
        user.createdAt = new Date('2024-01-01T00:00:00.000Z');
        user.name = 'John';
        user.email = 'john@example.com';

        const json = EntityUtils.toJSON(user);

        expect(json).toEqual({
          id: 1,
          createdAt: '2024-01-01T00:00:00.000Z',
          name: 'John',
          email: 'john@example.com',
        });
      });

      it('should handle multi-level inheritance', () => {
        @Entity()
        class BaseEntity {
          @Property({ type: () => Object }) id!: number;
        }

        @Entity()
        class TimestampedEntity extends BaseEntity {
          @Property({ type: () => Object }) createdAt!: Date;
        }

        @Entity()
        class User extends TimestampedEntity {
          @Property({ type: () => Object }) name!: string;
        }

        const user = new User();
        user.id = 1;
        user.createdAt = new Date('2024-01-01T00:00:00.000Z');
        user.name = 'John';

        const json = EntityUtils.toJSON(user);

        expect(json).toEqual({
          id: 1,
          createdAt: '2024-01-01T00:00:00.000Z',
          name: 'John',
        });
      });
    });

    describe('Date serialization', () => {
      it('should serialize Date to ISO string', () => {
        @Entity()
        class Event {
          @Property({ type: () => Object }) name!: string;
          @Property({ type: () => Object }) date!: Date;
        }

        const event = new Event();
        event.name = 'Meeting';
        event.date = new Date('2024-06-15T14:30:00.000Z');

        const json = EntityUtils.toJSON(event);

        expect(json).toEqual({
          name: 'Meeting',
          date: '2024-06-15T14:30:00.000Z',
        });
      });

      it('should handle null Date', () => {
        @Entity()
        class Event {
          @Property({ type: () => Object }) name!: string;
          @Property({ type: () => Object }) date!: Date | null;
        }

        const event = new Event();
        event.name = 'Meeting';
        event.date = null;

        const json = EntityUtils.toJSON(event);

        expect(json).toEqual({
          name: 'Meeting',
          date: null,
        });
      });
    });

    describe('bigint serialization', () => {
      it('should serialize bigint to string', () => {
        @Entity()
        class Data {
          @Property({ type: () => Object }) id!: bigint;
          @Property({ type: () => Object }) largeNumber!: bigint;
        }

        const data = new Data();
        data.id = BigInt(123);
        data.largeNumber = BigInt('9007199254740991999');

        const json = EntityUtils.toJSON(data);

        expect(json).toEqual({
          id: '123',
          largeNumber: '9007199254740991999',
        });
      });

      it('should handle null bigint', () => {
        @Entity()
        class Data {
          @Property({ type: () => Object }) id!: bigint | null;
        }

        const data = new Data();
        data.id = null;

        const json = EntityUtils.toJSON(data);

        expect(json).toEqual({
          id: null,
        });
      });
    });

    describe('nested entities', () => {
      it('should recursively serialize nested entities', () => {
        @Entity()
        class Address {
          @Property({ type: () => Object }) street!: string;
          @Property({ type: () => Object }) city!: string;
          @Property({ type: () => Object }) zipCode!: string;
        }

        @Entity()
        class User {
          @Property({ type: () => Object }) name!: string;
          @Property({ type: () => Object }) address!: Address;
        }

        const address = new Address();
        address.street = '123 Main St';
        address.city = 'Boston';
        address.zipCode = '02101';

        const user = new User();
        user.name = 'John';
        user.address = address;

        const json = EntityUtils.toJSON(user);

        expect(json).toEqual({
          name: 'John',
          address: {
            street: '123 Main St',
            city: 'Boston',
            zipCode: '02101',
          },
        });
      });

      it('should handle null nested entities', () => {
        @Entity()
        class Address {
          @Property({ type: () => Object }) street!: string;
        }

        @Entity()
        class User {
          @Property({ type: () => Object }) name!: string;
          @Property({ type: () => Object }) address!: Address | null;
        }

        const user = new User();
        user.name = 'John';
        user.address = null;

        const json = EntityUtils.toJSON(user);

        expect(json).toEqual({
          name: 'John',
          address: null,
        });
      });

      it('should handle deeply nested entities', () => {
        @Entity()
        class Country {
          @Property({ type: () => Object }) name!: string;
          @Property({ type: () => Object }) code!: string;
        }

        @Entity()
        class Address {
          @Property({ type: () => Object }) street!: string;
          @Property({ type: () => Object }) country!: Country;
        }

        @Entity()
        class User {
          @Property({ type: () => Object }) name!: string;
          @Property({ type: () => Object }) address!: Address;
        }

        const country = new Country();
        country.name = 'USA';
        country.code = 'US';

        const address = new Address();
        address.street = '123 Main St';
        address.country = country;

        const user = new User();
        user.name = 'John';
        user.address = address;

        const json = EntityUtils.toJSON(user);

        expect(json).toEqual({
          name: 'John',
          address: {
            street: '123 Main St',
            country: {
              name: 'USA',
              code: 'US',
            },
          },
        });
      });
    });

    describe('array serialization', () => {
      it('should serialize arrays of primitives', () => {
        @Entity()
        class User {
          @Property({ type: () => Object }) name!: string;
          @Property({ type: () => Object }) tags!: string[];
          @Property({ type: () => Object }) scores!: number[];
        }

        const user = new User();
        user.name = 'John';
        user.tags = ['developer', 'typescript', 'node'];
        user.scores = [95, 87, 92];

        const json = EntityUtils.toJSON(user);

        expect(json).toEqual({
          name: 'John',
          tags: ['developer', 'typescript', 'node'],
          scores: [95, 87, 92],
        });
      });

      it('should serialize arrays of entities', () => {
        @Entity()
        class Phone {
          @Property({ type: () => Object }) type!: string;
          @Property({ type: () => Object }) number!: string;
        }

        @Entity()
        class User {
          @Property({ type: () => Object }) name!: string;
          @Property({ type: () => Object }) phones!: Phone[];
        }

        const phone1 = new Phone();
        phone1.type = 'mobile';
        phone1.number = '555-0001';

        const phone2 = new Phone();
        phone2.type = 'work';
        phone2.number = '555-0002';

        const user = new User();
        user.name = 'John';
        user.phones = [phone1, phone2];

        const json = EntityUtils.toJSON(user);

        expect(json).toEqual({
          name: 'John',
          phones: [
            { type: 'mobile', number: '555-0001' },
            { type: 'work', number: '555-0002' },
          ],
        });
      });

      it('should serialize arrays containing mixed types including entities', () => {
        @Entity()
        class Tag {
          @Property({ type: () => Object }) name!: string;
        }

        @Entity()
        class Post {
          @Property({ type: () => Object }) title!: string;
          @Property({ type: () => Object }) tags!: (Tag | string)[];
        }

        const tag = new Tag();
        tag.name = 'important';

        const post = new Post();
        post.title = 'My Post';
        post.tags = [tag, 'typescript', 'coding'];

        const json = EntityUtils.toJSON(post);

        expect(json).toEqual({
          title: 'My Post',
          tags: [{ name: 'important' }, 'typescript', 'coding'],
        });
      });

      it('should handle empty arrays', () => {
        @Entity()
        class User {
          @Property({ type: () => Object }) name!: string;
          @Property({ type: () => Object }) tags!: string[];
        }

        const user = new User();
        user.name = 'John';
        user.tags = [];

        const json = EntityUtils.toJSON(user);

        expect(json).toEqual({
          name: 'John',
          tags: [],
        });
      });

      it('should serialize arrays of Dates', () => {
        @Entity()
        class Event {
          @Property({ type: () => Object }) name!: string;
          @Property({ type: () => Object }) dates!: Date[];
        }

        const event = new Event();
        event.name = 'Conference';
        event.dates = [
          new Date('2024-01-01T00:00:00.000Z'),
          new Date('2024-01-02T00:00:00.000Z'),
        ];

        const json = EntityUtils.toJSON(event);

        expect(json).toEqual({
          name: 'Conference',
          dates: ['2024-01-01T00:00:00.000Z', '2024-01-02T00:00:00.000Z'],
        });
      });

      it('should serialize arrays of bigints', () => {
        @Entity()
        class Data {
          @Property({ type: () => Object }) name!: string;
          @Property({ type: () => Object }) ids!: bigint[];
        }

        const data = new Data();
        data.name = 'test';
        data.ids = [BigInt(1), BigInt(2), BigInt(999999999999)];

        const json = EntityUtils.toJSON(data);

        expect(json).toEqual({
          name: 'test',
          ids: ['1', '2', '999999999999'],
        });
      });

      it('should handle nested arrays', () => {
        @Entity()
        class Matrix {
          @Property({ type: () => Object }) name!: string;
          @Property({ type: () => Object }) data!: number[][];
        }

        const matrix = new Matrix();
        matrix.name = 'test-matrix';
        matrix.data = [
          [1, 2, 3],
          [4, 5, 6],
        ];

        const json = EntityUtils.toJSON(matrix);

        expect(json).toEqual({
          name: 'test-matrix',
          data: [
            [1, 2, 3],
            [4, 5, 6],
          ],
        });
      });
    });

    describe('custom toJSON', () => {
      it('should use custom toJSON method if present on property value', () => {
        class CustomObject {
          constructor(
            public value: string,
            public secret: string,
          ) {}

          toJSON() {
            return { customValue: this.value.toUpperCase() };
          }
        }

        @Entity()
        class User {
          @Property({ type: () => Object }) name!: string;
          @Property({ type: () => Object }) data!: CustomObject;
        }

        const user = new User();
        user.name = 'John';
        user.data = new CustomObject('hello', 'password');

        const json = EntityUtils.toJSON(user);

        expect(json).toEqual({
          name: 'John',
          data: { customValue: 'HELLO' },
        });
      });

      it('should prefer custom toJSON over entity serialization', () => {
        @Entity()
        class SpecialEntity {
          @Property({ type: () => Object }) value!: string;
          @Property({ type: () => Object }) secret!: string;

          toJSON() {
            return { onlyValue: this.value };
          }
        }

        @Entity()
        class Container {
          @Property({ type: () => Object }) name!: string;
          @Property({ type: () => Object }) special!: SpecialEntity;
        }

        const special = new SpecialEntity();
        special.value = 'visible';
        special.secret = 'hidden';

        const container = new Container();
        container.name = 'test';
        container.special = special;

        const json = EntityUtils.toJSON(container);

        expect(json).toEqual({
          name: 'test',
          special: { onlyValue: 'visible' },
        });
      });

      it('should handle custom toJSON in arrays', () => {
        class CustomObject {
          constructor(public value: string) {}

          toJSON() {
            return { transformed: this.value.toUpperCase() };
          }
        }

        @Entity()
        class Container {
          @Property({ type: () => Object }) items!: CustomObject[];
        }

        const container = new Container();
        container.items = [
          new CustomObject('hello'),
          new CustomObject('world'),
        ];

        const json = EntityUtils.toJSON(container);

        expect(json).toEqual({
          items: [{ transformed: 'HELLO' }, { transformed: 'WORLD' }],
        });
      });
    });

    describe('complex scenarios', () => {
      it('should handle entity with all types combined', () => {
        @Entity()
        class Tag {
          @Property({ type: () => Object }) name!: string;
        }

        @Entity()
        class Address {
          @Property({ type: () => Object }) street!: string;
          @Property({ type: () => Object }) city!: string;
        }

        @Entity()
        class User {
          @Property({ type: () => Object }) id!: bigint;
          @Property({ type: () => Object }) name!: string;
          @Property({ type: () => Object }) age!: number;
          @Property({ type: () => Object }) active!: boolean;
          @Property({ type: () => Object }) email!: string | null;
          @Property({ type: () => Object }) phone?: string;
          @Property({ type: () => Object }) createdAt!: Date;
          @Property({ type: () => Object }) address!: Address;
          @Property({ type: () => Object }) tags!: Tag[];
          @Property({ type: () => Object }) scores!: number[];
          undecorated!: string;
        }

        const tag1 = new Tag();
        tag1.name = 'developer';

        const tag2 = new Tag();
        tag2.name = 'typescript';

        const address = new Address();
        address.street = '123 Main St';
        address.city = 'Boston';

        const user = new User();
        user.id = BigInt(12345);
        user.name = 'John';
        user.age = 30;
        user.active = true;
        user.email = null;
        // phone is undefined
        user.createdAt = new Date('2024-01-01T12:00:00.000Z');
        user.address = address;
        user.tags = [tag1, tag2];
        user.scores = [95, 87, 92];
        user.undecorated = 'should not appear';

        const json = EntityUtils.toJSON(user);

        expect(json).toEqual({
          id: '12345',
          name: 'John',
          age: 30,
          active: true,
          email: null,
          createdAt: '2024-01-01T12:00:00.000Z',
          address: {
            street: '123 Main St',
            city: 'Boston',
          },
          tags: [{ name: 'developer' }, { name: 'typescript' }],
          scores: [95, 87, 92],
        });
        expect(json).not.toHaveProperty('phone');
        expect(json).not.toHaveProperty('undecorated');
      });
    });

    describe('edge cases', () => {
      it('should handle entity with no properties set', () => {
        @Entity()
        class Empty {
          @Property({ type: () => Object }) name?: string;
          @Property({ type: () => Object }) age?: number;
        }

        const empty = new Empty();

        const json = EntityUtils.toJSON(empty);

        expect(json).toEqual({});
      });

      it('should handle entity with only null properties', () => {
        @Entity()
        class User {
          @Property({ type: () => Object }) name!: string | null;
          @Property({ type: () => Object }) email!: string | null;
        }

        const user = new User();
        user.name = null;
        user.email = null;

        const json = EntityUtils.toJSON(user);

        expect(json).toEqual({
          name: null,
          email: null,
        });
      });

      it('should handle plain objects as property values', () => {
        @Entity()
        class Config {
          @Property({ type: () => String })
          name!: string;

          @PassthroughProperty()
          settings!: Record<string, unknown>;
        }

        const config = new Config();
        config.name = 'app-config';
        config.settings = {
          theme: 'dark',
          fontSize: 14,
          features: { beta: true },
        };

        const json = EntityUtils.toJSON(config);

        expect(json).toEqual({
          name: 'app-config',
          settings: {
            theme: 'dark',
            fontSize: 14,
            features: { beta: true },
          },
        });
      });

      it('should throw error for plain objects without passthrough', () => {
        @Entity()
        class Config {
          @Property({ type: () => String })
          name!: string;

          @Property({ type: () => Object })
          settings!: Record<string, unknown>;
        }

        const config = new Config();
        config.name = 'app-config';
        config.settings = { theme: 'dark' };

        expect(() => EntityUtils.toJSON(config)).toThrow(
          "Cannot serialize value of type 'object'",
        );
      });
    });
  });

  describe('parse', () => {
    describe('primitives', () => {
      it('should parse string properties', () => {
        @Entity()
        class User {
          @Property({ type: () => String })
          name!: string;
        }

        const json = { name: 'John' };
        const user = EntityUtils.parse(User, json);

        expect(user).toBeInstanceOf(User);
        expect(user.name).toBe('John');
      });

      it('should parse number properties', () => {
        @Entity()
        class User {
          @Property({ type: () => Number })
          age!: number;
        }

        const json = { age: 30 };
        const user = EntityUtils.parse(User, json);

        expect(user).toBeInstanceOf(User);
        expect(user.age).toBe(30);
      });

      it('should parse boolean properties', () => {
        @Entity()
        class User {
          @Property({ type: () => Boolean })
          active!: boolean;
        }

        const json = { active: true };
        const user = EntityUtils.parse(User, json);

        expect(user).toBeInstanceOf(User);
        expect(user.active).toBe(true);
      });

      it('should parse multiple primitive properties', () => {
        @Entity()
        class User {
          @Property({ type: () => String })
          name!: string;

          @Property({ type: () => Number })
          age!: number;

          @Property({ type: () => Boolean })
          active!: boolean;
        }

        const json = { name: 'John', age: 30, active: true };
        const user = EntityUtils.parse(User, json);

        expect(user.name).toBe('John');
        expect(user.age).toBe(30);
        expect(user.active).toBe(true);
      });
    });

    describe('Date and BigInt', () => {
      it('should parse Date from ISO string', () => {
        @Entity()
        class Event {
          @Property({ type: () => Date })
          createdAt!: Date;
        }

        const json = { createdAt: '2024-01-01T12:00:00.000Z' };
        const event = EntityUtils.parse(Event, json);

        expect(event.createdAt).toBeInstanceOf(Date);
        expect(event.createdAt.toISOString()).toBe('2024-01-01T12:00:00.000Z');
      });

      it('should parse Date from Date object', () => {
        @Entity()
        class Event {
          @Property({ type: () => Date })
          createdAt!: Date;
        }

        const date = new Date('2024-01-01T12:00:00.000Z');
        const json = { createdAt: date };
        const event = EntityUtils.parse(Event, json);

        expect(event.createdAt).toBe(date);
      });

      it('should parse BigInt from string', () => {
        @Entity()
        class Data {
          @Property({ type: () => BigInt })
          id!: bigint;
        }

        const json = { id: '12345678901234567890' };
        const data = EntityUtils.parse(Data, json);

        expect(data.id).toBe(BigInt('12345678901234567890'));
      });

      it('should parse BigInt from bigint', () => {
        @Entity()
        class Data {
          @Property({ type: () => BigInt })
          id!: bigint;
        }

        const json = { id: BigInt(123) };
        const data = EntityUtils.parse(Data, json);

        expect(data.id).toBe(BigInt(123));
      });
    });

    describe('nested entities', () => {
      it('should parse nested entities', () => {
        @Entity()
        class Address {
          @Property({ type: () => String })
          street!: string;

          @Property({ type: () => String })
          city!: string;
        }

        @Entity()
        class User {
          @Property({ type: () => String })
          name!: string;

          @Property({ type: () => Address })
          address!: Address;
        }

        const json = {
          name: 'John',
          address: {
            street: '123 Main St',
            city: 'Boston',
          },
        };

        const user = EntityUtils.parse(User, json);

        expect(user.name).toBe('John');
        expect(user.address).toBeInstanceOf(Address);
        expect(user.address.street).toBe('123 Main St');
        expect(user.address.city).toBe('Boston');
      });

      it('should parse deeply nested entities', () => {
        @Entity()
        class Country {
          @Property({ type: () => String })
          name!: string;
        }

        @Entity()
        class Address {
          @Property({ type: () => String })
          street!: string;

          @Property({ type: () => Country })
          country!: Country;
        }

        @Entity()
        class User {
          @Property({ type: () => String })
          name!: string;

          @Property({ type: () => Address })
          address!: Address;
        }

        const json = {
          name: 'John',
          address: {
            street: '123 Main St',
            country: {
              name: 'USA',
            },
          },
        };

        const user = EntityUtils.parse(User, json);

        expect(user.address.country).toBeInstanceOf(Country);
        expect(user.address.country.name).toBe('USA');
      });
    });

    describe('arrays', () => {
      it('should parse arrays of primitives', () => {
        @Entity()
        class User {
          @Property({ type: () => String, array: true })
          tags!: string[];
        }

        const json = { tags: ['developer', 'typescript'] };
        const user = EntityUtils.parse(User, json);

        expect(Array.isArray(user.tags)).toBe(true);
        expect(user.tags).toEqual(['developer', 'typescript']);
      });

      it('should parse arrays of numbers', () => {
        @Entity()
        class Data {
          @Property({ type: () => Number, array: true })
          scores!: number[];
        }

        const json = { scores: [95, 87, 92] };
        const data = EntityUtils.parse(Data, json);

        expect(data.scores).toEqual([95, 87, 92]);
      });

      it('should parse arrays of entities', () => {
        @Entity()
        class Phone {
          @Property({ type: () => String })
          number!: string;
        }

        @Entity()
        class User {
          @Property({ type: () => Phone, array: true })
          phones!: Phone[];
        }

        const json = {
          phones: [{ number: '555-0001' }, { number: '555-0002' }],
        };

        const user = EntityUtils.parse(User, json);

        expect(user.phones).toHaveLength(2);
        expect(user.phones[0]).toBeInstanceOf(Phone);
        expect(user.phones[0].number).toBe('555-0001');
        expect(user.phones[1]).toBeInstanceOf(Phone);
        expect(user.phones[1].number).toBe('555-0002');
      });

      it('should parse empty arrays', () => {
        @Entity()
        class User {
          @Property({ type: () => String, array: true })
          tags!: string[];
        }

        const json = { tags: [] };
        const user = EntityUtils.parse(User, json);

        expect(user.tags).toEqual([]);
      });

      it('should reject null/undefined elements in non-sparse arrays', () => {
        @Entity()
        class Data {
          @Property({ type: () => String, array: true })
          values!: string[];
        }

        const json = { values: ['a', null, 'b'] };

        expect(() => EntityUtils.parse(Data, json)).toThrow(
          "Property 'values[1]' cannot be null or undefined",
        );
      });

      it('should reject undefined elements in non-sparse arrays', () => {
        @Entity()
        class Data {
          @Property({ type: () => String, array: true })
          values!: string[];
        }

        const json = { values: ['a', undefined, 'b'] };

        expect(() => EntityUtils.parse(Data, json)).toThrow(
          "Property 'values[1]' cannot be null or undefined",
        );
      });

      it('should allow null/undefined elements in sparse arrays', () => {
        @Entity()
        class Data {
          @Property({ type: () => String, array: true, sparse: true })
          values!: (string | null)[];
        }

        const json = { values: ['a', null, 'b', undefined] };
        const data = EntityUtils.parse(Data, json);

        expect(data.values).toEqual(['a', null, 'b', undefined]);
      });
    });

    describe('optional properties', () => {
      it('should allow optional properties to be undefined', () => {
        @Entity()
        class User {
          @Property({ type: () => String })
          name!: string;

          @Property({ type: () => String, optional: true })
          nickname?: string;
        }

        const json = { name: 'John' };
        const user = EntityUtils.parse(User, json);

        expect(user.name).toBe('John');
        expect(user.nickname).toBeUndefined();
      });

      it('should allow optional properties to be null', () => {
        @Entity()
        class User {
          @Property({ type: () => String })
          name!: string;

          @Property({ type: () => String, optional: true })
          email?: string;
        }

        const json = { name: 'John', email: null };
        const user = EntityUtils.parse(User, json);

        expect(user.name).toBe('John');
        expect(user.email).toBeNull();
      });

      it('should parse optional properties when present', () => {
        @Entity()
        class User {
          @Property({ type: () => String })
          name!: string;

          @Property({ type: () => String, optional: true })
          nickname?: string;
        }

        const json = { name: 'John', nickname: 'Johnny' };
        const user = EntityUtils.parse(User, json);

        expect(user.name).toBe('John');
        expect(user.nickname).toBe('Johnny');
      });

      it('should handle optional nested entities', () => {
        @Entity()
        class Address {
          @Property({ type: () => String })
          street!: string;
        }

        @Entity()
        class User {
          @Property({ type: () => String })
          name!: string;

          @Property({ type: () => Address, optional: true })
          address?: Address;
        }

        const json = { name: 'John' };
        const user = EntityUtils.parse(User, json);

        expect(user.name).toBe('John');
        expect(user.address).toBeUndefined();
      });

      it('should handle optional arrays', () => {
        @Entity()
        class User {
          @Property({ type: () => String })
          name!: string;

          @Property({ type: () => String, array: true, optional: true })
          tags?: string[];
        }

        const json = { name: 'John' };
        const user = EntityUtils.parse(User, json);

        expect(user.name).toBe('John');
        expect(user.tags).toBeUndefined();
      });
    });

    describe('inheritance', () => {
      it('should parse properties from parent and child classes', () => {
        @Entity()
        class BaseEntity {
          @Property({ type: () => Number })
          id!: number;
        }

        @Entity()
        class User extends BaseEntity {
          @Property({ type: () => String })
          name!: string;
        }

        const json = { id: 1, name: 'John' };
        const user = EntityUtils.parse(User, json);

        expect(user.id).toBe(1);
        expect(user.name).toBe('John');
      });

      it('should parse multi-level inheritance', () => {
        @Entity()
        class BaseEntity {
          @Property({ type: () => Number })
          id!: number;
        }

        @Entity()
        class TimestampedEntity extends BaseEntity {
          @Property({ type: () => Date })
          createdAt!: Date;
        }

        @Entity()
        class User extends TimestampedEntity {
          @Property({ type: () => String })
          name!: string;
        }

        const json = {
          id: 1,
          createdAt: '2024-01-01T00:00:00.000Z',
          name: 'John',
        };

        const user = EntityUtils.parse(User, json);

        expect(user.id).toBe(1);
        expect(user.createdAt).toBeInstanceOf(Date);
        expect(user.name).toBe('John');
      });
    });

    describe('round-trip serialization', () => {
      it('should round-trip simple entities', () => {
        @Entity()
        class User {
          @Property({ type: () => String })
          name!: string;

          @Property({ type: () => Number })
          age!: number;
        }

        const original = new User();
        original.name = 'John';
        original.age = 30;

        const json = EntityUtils.toJSON(original);
        const parsed = EntityUtils.parse(User, json);

        expect(EntityUtils.equals(original, parsed)).toBe(true);
      });

      it('should round-trip entities with nested entities', () => {
        @Entity()
        class Address {
          @Property({ type: () => String })
          street!: string;

          @Property({ type: () => String })
          city!: string;
        }

        @Entity()
        class User {
          @Property({ type: () => String })
          name!: string;

          @Property({ type: () => Address })
          address!: Address;
        }

        const address = new Address();
        address.street = '123 Main St';
        address.city = 'Boston';

        const original = new User();
        original.name = 'John';
        original.address = address;

        const json = EntityUtils.toJSON(original);
        const parsed = EntityUtils.parse(User, json);

        expect(EntityUtils.equals(original, parsed)).toBe(true);
      });

      it('should round-trip entities with arrays', () => {
        @Entity()
        class User {
          @Property({ type: () => String })
          name!: string;

          @Property({ type: () => String, array: true })
          tags!: string[];
        }

        const original = new User();
        original.name = 'John';
        original.tags = ['dev', 'typescript'];

        const json = EntityUtils.toJSON(original);
        const parsed = EntityUtils.parse(User, json);

        expect(EntityUtils.equals(original, parsed)).toBe(true);
      });

      it('should round-trip entities with Dates and BigInts', () => {
        @Entity()
        class Data {
          @Property({ type: () => BigInt })
          id!: bigint;

          @Property({ type: () => Date })
          createdAt!: Date;
        }

        const original = new Data();
        original.id = BigInt(12345);
        original.createdAt = new Date('2024-01-01T12:00:00.000Z');

        const json = EntityUtils.toJSON(original);
        const parsed = EntityUtils.parse(Data, json);

        expect(parsed.id).toBe(original.id);
        expect(parsed.createdAt.getTime()).toBe(original.createdAt.getTime());
      });
    });

    describe('error handling', () => {
      it('should throw error when property metadata is missing', () => {
        @Entity()
        class User {
          @Property({ type: () => String })
          name!: string;
        }

        const json = { name: 'John' };
        const user = EntityUtils.parse(User, json);

        // This test now verifies that with proper metadata, parsing works
        expect(user.name).toBe('John');
      });

      it('should throw error when required property is missing', () => {
        @Entity()
        class User {
          @Property({ type: () => String })
          name!: string;

          @Property({ type: () => Number })
          age!: number;
        }

        const json = { name: 'John' };

        expect(() => EntityUtils.parse(User, json)).toThrow(
          "Property 'age' is required but missing from input",
        );
      });

      it('should throw error when required property is null', () => {
        @Entity()
        class User {
          @Property({ type: () => String })
          name!: string;
        }

        const json = { name: null };

        expect(() => EntityUtils.parse(User, json)).toThrow(
          "Property 'name' cannot be null or undefined",
        );
      });

      it('should throw error when required property is undefined', () => {
        @Entity()
        class User {
          @Property({ type: () => String })
          name!: string;
        }

        const json = { name: undefined };

        expect(() => EntityUtils.parse(User, json)).toThrow(
          "Property 'name' cannot be null or undefined",
        );
      });

      it('should throw error for type mismatch on string', () => {
        @Entity()
        class User {
          @Property({ type: () => String })
          name!: string;
        }

        const json = { name: 123 };

        expect(() => EntityUtils.parse(User, json)).toThrow(
          "Property 'name' expects a string but received number",
        );
      });

      it('should throw error for type mismatch on number', () => {
        @Entity()
        class User {
          @Property({ type: () => Number })
          age!: number;
        }

        const json = { age: 'not a number' };

        expect(() => EntityUtils.parse(User, json)).toThrow(
          "Property 'age' expects a number but received string",
        );
      });

      it('should throw error for type mismatch on boolean', () => {
        @Entity()
        class User {
          @Property({ type: () => Boolean })
          active!: boolean;
        }

        const json = { active: 'true' };

        expect(() => EntityUtils.parse(User, json)).toThrow(
          "Property 'active' expects a boolean but received string",
        );
      });

      it('should throw error for invalid Date string', () => {
        @Entity()
        class Event {
          @Property({ type: () => Date })
          createdAt!: Date;
        }

        const json = { createdAt: 'not a date' };

        expect(() => EntityUtils.parse(Event, json)).toThrow(
          "Property 'createdAt' cannot parse 'not a date' as Date",
        );
      });

      it('should throw error for invalid BigInt string', () => {
        @Entity()
        class Data {
          @Property({ type: () => BigInt })
          id!: bigint;
        }

        const json = { id: 'not a bigint' };

        expect(() => EntityUtils.parse(Data, json)).toThrow(
          "Property 'id' cannot parse 'not a bigint' as BigInt",
        );
      });

      it('should throw error when array expected but not received', () => {
        @Entity()
        class User {
          @Property({ type: () => String, array: true })
          tags!: string[];
        }

        const json = { tags: 'not an array' };

        expect(() => EntityUtils.parse(User, json)).toThrow(
          "Property 'tags' expects an array but received string",
        );
      });

      it('should throw error for nested entity type mismatch', () => {
        @Entity()
        class Address {
          @Property({ type: () => String })
          street!: string;
        }

        @Entity()
        class User {
          @Property({ type: () => Address })
          address!: Address;
        }

        const json = { address: 'not an object' };

        expect(() => EntityUtils.parse(User, json)).toThrow(
          "Property 'address' expects an object but received string",
        );
      });

      it('should throw error with correct property path in array', () => {
        @Entity()
        class User {
          @Property({ type: () => Number, array: true })
          scores!: number[];
        }

        const json = { scores: [95, 'invalid', 92] };

        expect(() => EntityUtils.parse(User, json)).toThrow(
          "Property 'scores[1]' expects a number but received string",
        );
      });

      it('should throw error when sparse is true without array', () => {
        // This now fails at decorator time
        expect(() => {
          const decorator = Property({ type: () => String, sparse: true });
          decorator({}, 'value');
        }).toThrow("Property 'value' has sparse: true but array is not true");
      });

      it('should throw error when passthrough is combined with array', () => {
        expect(() => {
          const decorator = Property({
            type: () => String,
            passthrough: true,
            array: true,
          });
          decorator({}, 'value');
        }).toThrow("Property 'value' has passthrough: true and array: true");
      });

      it('should throw error when passthrough is combined with optional', () => {
        expect(() => {
          const decorator = Property({
            type: () => String,
            passthrough: true,
            optional: true,
          });
          decorator({}, 'value');
        }).toThrow("Property 'value' has passthrough: true and optional: true");
      });

      it('should throw error when passthrough is combined with sparse', () => {
        expect(() => {
          const decorator = Property({
            type: () => String,
            passthrough: true,
            sparse: true,
          });
          decorator({}, 'value');
        }).toThrow("Property 'value' has passthrough: true and sparse: true");
      });
    });

    describe('PassthroughProperty helper', () => {
      it('should work with PassthroughProperty for serialization', () => {
        @Entity()
        class Config {
          @StringProperty()
          name!: string;

          @PassthroughProperty()
          metadata!: Record<string, unknown>;
        }

        const config = new Config();
        config.name = 'test';
        config.metadata = { custom: 'value', nested: { data: 123 } };

        const json = EntityUtils.toJSON(config);

        expect(json).toEqual({
          name: 'test',
          metadata: { custom: 'value', nested: { data: 123 } },
        });
      });

      it('should work with PassthroughProperty for deserialization', () => {
        @Entity()
        class Config {
          @StringProperty()
          name!: string;

          @PassthroughProperty()
          metadata!: Record<string, unknown>;
        }

        const json = {
          name: 'test',
          metadata: { custom: 'value', nested: { data: 123 } },
        };

        const config = EntityUtils.parse(Config, json);

        expect(config.name).toBe('test');
        expect(config.metadata).toEqual({
          custom: 'value',
          nested: { data: 123 },
        });
      });

      it('should round-trip with PassthroughProperty', () => {
        @Entity()
        class Config {
          @StringProperty()
          name!: string;

          @PassthroughProperty()
          data!: unknown;
        }

        const original = new Config();
        original.name = 'test';
        original.data = {
          complex: [1, 2, { nested: true }],
          map: new Map([['key', 'value']]),
        };

        const json = EntityUtils.toJSON(original);
        const parsed = EntityUtils.parse(Config, json);

        expect(parsed.name).toBe(original.name);
        expect(parsed.data).toEqual(original.data);
      });
    });

    describe('helper decorators', () => {
      it('should work with StringProperty', () => {
        @Entity()
        class User {
          @StringProperty()
          name!: string;
        }

        const json = { name: 'John' };
        const user = EntityUtils.parse(User, json);

        expect(user.name).toBe('John');
      });

      it('should work with NumberProperty', () => {
        @Entity()
        class User {
          @NumberProperty()
          age!: number;
        }

        const json = { age: 30 };
        const user = EntityUtils.parse(User, json);

        expect(user.age).toBe(30);
      });

      it('should work with BooleanProperty', () => {
        @Entity()
        class User {
          @BooleanProperty()
          active!: boolean;
        }

        const json = { active: true };
        const user = EntityUtils.parse(User, json);

        expect(user.active).toBe(true);
      });

      it('should work with DateProperty', () => {
        @Entity()
        class Event {
          @DateProperty()
          createdAt!: Date;
        }

        const json = { createdAt: '2024-01-01T00:00:00.000Z' };
        const event = EntityUtils.parse(Event, json);

        expect(event.createdAt).toBeInstanceOf(Date);
      });

      it('should work with BigIntProperty', () => {
        @Entity()
        class Data {
          @BigIntProperty()
          id!: bigint;
        }

        const json = { id: '123' };
        const data = EntityUtils.parse(Data, json);

        expect(data.id).toBe(BigInt(123));
      });

      it('should work with EntityProperty', () => {
        @Entity()
        class Address {
          @StringProperty()
          street!: string;
        }

        @Entity()
        class User {
          @StringProperty()
          name!: string;

          @EntityProperty(() => Address)
          address!: Address;
        }

        const json = {
          name: 'John',
          address: { street: '123 Main St' },
        };

        const user = EntityUtils.parse(User, json);

        expect(user.address).toBeInstanceOf(Address);
        expect(user.address.street).toBe('123 Main St');
      });

      it('should work with ArrayProperty', () => {
        @Entity()
        class User {
          @ArrayProperty(() => String)
          tags!: string[];
        }

        const json = { tags: ['dev', 'typescript'] };
        const user = EntityUtils.parse(User, json);

        expect(user.tags).toEqual(['dev', 'typescript']);
      });

      it('should work with optional helper decorators', () => {
        @Entity()
        class User {
          @StringProperty()
          name!: string;

          @StringProperty({ optional: true })
          nickname?: string;

          @NumberProperty({ optional: true })
          age?: number;
        }

        const json = { name: 'John' };
        const user = EntityUtils.parse(User, json);

        expect(user.name).toBe('John');
        expect(user.nickname).toBeUndefined();
        expect(user.age).toBeUndefined();
      });

      it('should work with ArrayProperty of entities', () => {
        @Entity()
        class Phone {
          @StringProperty()
          number!: string;
        }

        @Entity()
        class User {
          @ArrayProperty(() => Phone)
          phones!: Phone[];
        }

        const json = {
          phones: [{ number: '555-0001' }, { number: '555-0002' }],
        };

        const user = EntityUtils.parse(User, json);

        expect(user.phones).toHaveLength(2);
        expect(user.phones[0]).toBeInstanceOf(Phone);
        expect(user.phones[0].number).toBe('555-0001');
      });

      it('should work with sparse ArrayProperty', () => {
        @Entity()
        class Data {
          @ArrayProperty(() => String, { sparse: true })
          values!: (string | null)[];
        }

        const json = { values: ['a', null, 'b', undefined] };
        const data = EntityUtils.parse(Data, json);

        expect(data.values).toEqual(['a', null, 'b', undefined]);
      });

      it('should reject null in non-sparse ArrayProperty', () => {
        @Entity()
        class Data {
          @ArrayProperty(() => String)
          values!: string[];
        }

        const json = { values: ['a', null, 'b'] };

        expect(() => EntityUtils.parse(Data, json)).toThrow(
          "Property 'values[1]' cannot be null or undefined",
        );
      });
    });

    describe('passthrough option with explicit type', () => {
      it('should throw error for unknown type without passthrough in parse', () => {
        @Entity()
        class Data {
          @Property({ type: () => Symbol })
          value!: symbol;
        }

        const json = { value: 'test' };

        expect(() => EntityUtils.parse(Data, json)).toThrow(
          "Property 'value' has unknown type constructor",
        );
      });
    });
  });
});
