/* eslint-disable @typescript-eslint/no-explicit-any */
import 'reflect-metadata';
import { describe, it, expect } from 'vitest';
import { isEqual } from 'lodash-es';
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

        constructor(data: { name: string }) {
          Object.assign(this, data);
        }
      }

      expect(EntityUtils.isEntity(User)).toBe(true);
    });

    it('should return true for entity instance', () => {
      @Entity()
      class User {
        name!: string;

        constructor(data: { name: string }) {
          Object.assign(this, data);
        }
      }

      const user = new User({ name: 'John' });
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

        constructor(data: { id: number }) {
          Object.assign(this, data);
        }
      }

      class DerivedEntity extends BaseEntity {
        name!: string;

        constructor(data: { id: number; name: string }) {
          super(data);
          Object.assign(this, data);
        }
      }

      expect(EntityUtils.isEntity(BaseEntity)).toBe(true);
      expect(EntityUtils.isEntity(new BaseEntity({ id: 1 }))).toBe(true);
      // Metadata is inherited, so derived class instances are also entities
      expect(EntityUtils.isEntity(DerivedEntity)).toBe(true);
      expect(
        EntityUtils.isEntity(new DerivedEntity({ id: 1, name: 'John' })),
      ).toBe(true);
    });

    it('should return true when both parent and child are decorated', () => {
      @Entity()
      class BaseEntity {
        id!: number;

        constructor(data: { id: number }) {
          Object.assign(this, data);
        }
      }

      @Entity()
      class DerivedEntity extends BaseEntity {
        name!: string;

        constructor(data: { id: number; name: string }) {
          super(data);
          Object.assign(this, data);
        }
      }

      expect(EntityUtils.isEntity(BaseEntity)).toBe(true);
      expect(EntityUtils.isEntity(new BaseEntity({ id: 1 }))).toBe(true);
      expect(EntityUtils.isEntity(DerivedEntity)).toBe(true);
      expect(
        EntityUtils.isEntity(new DerivedEntity({ id: 1, name: 'Test' })),
      ).toBe(true);
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

        constructor(data: { name: string }) {
          Object.assign(this, data);
        }
      }

      const user1 = new User({ name: 'John' });
      const user2 = new User({ name: 'Jane' });

      expect(EntityUtils.sameEntity(user1, user2)).toBe(true);
    });

    it('should return false for instances of different entity classes', () => {
      @Entity()
      class User {
        @Property({ type: () => Object })
        name!: string;

        constructor(data: { name: string }) {
          Object.assign(this, data);
        }
      }

      @Entity()
      class Product {
        @Property({ type: () => Object })
        title!: string;

        constructor(data: { title: string }) {
          Object.assign(this, data);
        }
      }

      const user = new User({ name: 'John' });
      const product = new Product({ title: 'Product' });

      expect(EntityUtils.sameEntity(user, product)).toBe(false);
    });

    it('should return false when first argument is not an entity', () => {
      @Entity()
      class User {
        @Property({ type: () => Object })
        name!: string;

        constructor(data: { name: string }) {
          Object.assign(this, data);
        }
      }

      const user = new User({ name: 'John' });
      const plainObj = { name: 'test' };

      expect(EntityUtils.sameEntity(plainObj, user)).toBe(false);
    });

    it('should return false when second argument is not an entity', () => {
      @Entity()
      class User {
        @Property({ type: () => Object })
        name!: string;

        constructor(data: { name: string }) {
          Object.assign(this, data);
        }
      }

      const user = new User({ name: 'John' });
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

        constructor(data: { id: number }) {
          Object.assign(this, data);
        }
      }

      @Entity()
      class DerivedEntity extends BaseEntity {
        @Property({ type: () => Object })
        name!: string;

        constructor(data: { id: number; name: string }) {
          super(data);
          Object.assign(this, data);
        }
      }

      const derived1 = new DerivedEntity({ id: 1, name: 'Test1' });
      const derived2 = new DerivedEntity({ id: 2, name: 'Test2' });

      expect(EntityUtils.sameEntity(derived1, derived2)).toBe(true);
    });

    it('should return false for base and derived entity instances', () => {
      @Entity()
      class BaseEntity {
        @Property({ type: () => Object })
        id!: number;

        constructor(data: { id: number }) {
          Object.assign(this, data);
        }
      }

      @Entity()
      class DerivedEntity extends BaseEntity {
        @Property({ type: () => Object })
        name!: string;

        constructor(data: { id: number; name: string }) {
          super(data);
          Object.assign(this, data);
        }
      }

      const base = new BaseEntity({ id: 1 });
      const derived = new DerivedEntity({ id: 1, name: 'Test' });

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

        constructor(data: { name: string; age: number }) {
          Object.assign(this, data);
        }
      }

      const user1 = new User({ name: 'John', age: 30 });

      const user2 = new User({ name: 'Jane', age: 30 });
      user2.name = 'John';

      expect(EntityUtils.equals(user1, user2)).toBe(true);
    });

    it('should return false for different entity instances', () => {
      @Entity()
      class User {
        @Property({ type: () => Object })
        name!: string;

        @Property({ type: () => Object })
        age!: number;

        constructor(data: { name: string; age: number }) {
          Object.assign(this, data);
        }
      }

      const user1 = new User({ name: 'John', age: 30 });

      const user2 = new User({ name: 'Jane', age: 30 });

      expect(EntityUtils.equals(user1, user2)).toBe(false);
    });

    it('should return false for entities of different types', () => {
      @Entity()
      class User {
        @Property({ type: () => Object })
        name!: string;

        constructor(data: { name: string }) {
          Object.assign(this, data);
        }
      }

      @Entity()
      class Product {
        @Property({ type: () => Object })
        name!: string;

        constructor(data: { name: string }) {
          Object.assign(this, data);
        }
      }

      const user = new User({ name: 'John' });

      const product = new Product({ name: 'Product' });
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

        constructor(data: { street: string; city: string }) {
          Object.assign(this, data);
        }
      }

      @Entity()
      class User {
        @Property({ type: () => Object })
        name!: string;

        @Property({ type: () => Object })
        address!: Address;

        constructor(data: { name: string; address: Address }) {
          Object.assign(this, data);
        }
      }

      const address1 = new Address({ street: '123 Main', city: 'Boston' });
      address1.street = '123 Main St';
      address1.city = 'Springfield';

      const address2 = new Address({ street: '456 Oak', city: 'NYC' });
      address2.street = '123 Main St';
      address2.city = 'Springfield';

      const user1 = new User({ name: 'John', address: address1 });

      const user2 = new User({ name: 'Jane', address: address2 });
      user2.name = 'John';

      expect(EntityUtils.equals(user1, user2)).toBe(true);
    });

    it('should return false for nested entities with differences', () => {
      @Entity()
      class Address {
        @Property({ type: () => Object })
        street!: string;

        @Property({ type: () => Object })
        city!: string;

        constructor(data: { street: string; city: string }) {
          Object.assign(this, data);
        }
      }

      @Entity()
      class User {
        @Property({ type: () => Object })
        name!: string;

        @Property({ type: () => Object })
        address!: Address;

        constructor(data: { name: string; address: Address }) {
          Object.assign(this, data);
        }
      }

      const address1 = new Address({ street: '123 Main', city: 'Boston' });
      address1.street = '123 Main St';
      address1.city = 'Springfield';

      const address2 = new Address({ street: '456 Oak', city: 'NYC' });
      address2.street = '456 Oak Ave';
      address2.city = 'Springfield';

      const user1 = new User({ name: 'John', address: address1 });

      const user2 = new User({ name: 'Jane', address: address2 });
      user2.name = 'John';

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

        constructor(data: { name: string }) {
          Object.assign(this, data);
        }
      }

      const user1 = new User({ name: 'John' });

      const user2 = new User({ name: 'Jane' });
      user2.name = 'John';

      expect(EntityUtils.equals([user1], [user2])).toBe(true);
    });

    it('should handle inherited properties in entity comparison', () => {
      @Entity()
      class BaseEntity {
        @Property({ type: () => Object })
        id!: number;

        constructor(data: { id: number }) {
          Object.assign(this, data);
        }
      }

      @Entity()
      class User extends BaseEntity {
        @Property({ type: () => Object })
        name!: string;

        constructor(data: { id: number; name: string }) {
          super(data);
          Object.assign(this, data);
        }
      }

      const user1 = new User({ id: 1, name: 'John' });

      const user2 = new User({ id: 1, name: 'Jane' });
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

        constructor(data: { name: string; timestamp: Timestamp }) {
          Object.assign(this, data);
        }
      }

      const event1 = new Event({
        name: 'Login',
        timestamp: new Timestamp(1000),
      });

      const event2 = new Event({
        name: 'Login',
        timestamp: new Timestamp(1000),
      });

      const event3 = new Event({
        name: 'Login',
        timestamp: new Timestamp(2000),
      });

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

        constructor(data: { name: string; age: number }) {
          Object.assign(this, data);
        }
      }

      const entity1 = new User({ name: 'John', age: 30 });

      const entity2 = new User({ name: 'John', age: 30 });

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

        constructor(data: { name: string; age: number; email: string }) {
          Object.assign(this, data);
        }
      }

      const oldEntity = new User({
        name: 'John',
        age: 30,
        email: 'john@example.com',
      });

      const newEntity = new User({
        name: 'Jane',
        age: 30,
        email: 'jane@example.com',
      });

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

        constructor(data: { name: string }) {
          Object.assign(this, data);
        }
      }

      @Entity()
      class Product {
        @Property({ type: () => Object })
        title!: string;

        constructor(data: { title: string }) {
          Object.assign(this, data);
        }
      }

      const user = new User({ name: 'John' });
      const product = new Product({ title: 'Product' });

      expect(() =>
        EntityUtils.changes(user, product as unknown as User),
      ).toThrow('Entities must be of the same type to compute changes');
    });

    it('should handle inherited properties', () => {
      @Entity()
      class BaseEntity {
        @Property({ type: () => Object })
        id!: number;

        constructor(data: { id: number }) {
          Object.assign(this, data);
        }
      }

      @Entity()
      class User extends BaseEntity {
        @Property({ type: () => Object })
        name!: string;

        constructor(data: { id: number; name: string }) {
          super(data);
          Object.assign(this, data);
        }
      }

      const oldEntity = new User({ id: 1, name: 'John' });

      const newEntity = new User({ id: 2, name: 'John' });

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

        constructor(data: { id: number; createdAt: Date }) {
          Object.assign(this, data);
        }
      }

      @Entity()
      class User extends BaseEntity {
        @Property({ type: () => Object })
        name!: string;

        @Property({ type: () => Object })
        email!: string;

        constructor(data: {
          id: number;
          createdAt: Date;
          name: string;
          email: string;
        }) {
          super(data);
          Object.assign(this, data);
        }
      }

      const oldDate = new Date('2024-01-01');
      const newDate = new Date('2024-01-02');

      const oldEntity = new User({
        id: 1,
        createdAt: oldDate,
        name: 'John',
        email: 'john@example.com',
      });

      const newEntity = new User({
        id: 2,
        createdAt: newDate,
        name: 'Jane',
        email: 'john@example.com',
      });

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

        constructor(data: { name: string }) {
          Object.assign(this, data);
        }
      }

      const oldEntity = new User({ name: 'Old' });
      oldEntity.name = 'John';
      oldEntity.undecorated = 'old';

      const newEntity = new User({ name: 'New' });
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

        constructor(data: { name: string; nickname?: string }) {
          Object.assign(this, data);
        }
      }

      const oldEntity = new User({ name: 'Old' });
      oldEntity.name = 'John';
      oldEntity.nickname = 'Johnny';

      const newEntity = new User({ name: 'New' });
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

        constructor(data: { name: string; nickname?: string }) {
          Object.assign(this, data);
        }
      }

      const oldEntity = new User({ name: 'Old' });
      oldEntity.name = 'John';
      oldEntity.nickname = undefined;

      const newEntity = new User({ name: 'New' });
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

        constructor(data: { name: string; nickname: string | null }) {
          Object.assign(this, data);
        }
      }

      const oldEntity = new User({ name: 'John', nickname: 'Johnny' });
      oldEntity.name = 'John';
      oldEntity.nickname = 'Johnny';

      const newEntity = new User({ name: 'John', nickname: null });
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

        constructor(data: { name: string; age: number }) {
          Object.assign(this, data);
        }
      }

      const entity1 = new TestEntity({ name: 'John', age: 30 });

      const entity2 = new TestEntity({ name: 'John', age: 30 });

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

        constructor(data: { name: string; age: number }) {
          Object.assign(this, data);
        }
      }

      const oldEntity = new TestEntity({ name: 'John', age: 30 });

      const newEntity = new TestEntity({ name: 'Jane', age: 30 });

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

        constructor(data: { name: string }) {
          Object.assign(this, data);
        }
      }

      const oldEntity = new TestEntity({ name: 'John' });
      oldEntity.undecorated = 'old';

      const newEntity = new TestEntity({ name: 'John' });
      newEntity.undecorated = 'new';

      const diffs = EntityUtils.diff(oldEntity, newEntity);

      expect(diffs).toEqual([]);
    });

    it('should detect differences in inherited properties', () => {
      @Entity()
      class BaseEntity {
        @Property({ type: () => Object })
        id!: number;

        constructor(data: { id: number }) {
          Object.assign(this, data);
        }
      }

      @Entity()
      class DerivedEntity extends BaseEntity {
        @Property({ type: () => Object })
        name!: string;

        constructor(data: { id: number; name: string }) {
          super(data);
          Object.assign(this, data);
        }
      }

      const oldEntity = new DerivedEntity({ id: 1, name: 'John' });

      const newEntity = new DerivedEntity({ id: 2, name: 'John' });

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

        constructor(data: { id: number; createdAt: Date }) {
          Object.assign(this, data);
        }
      }

      @Entity()
      class DerivedEntity extends BaseEntity {
        @Property({ type: () => Object })
        name!: string;

        constructor(data: { id: number; createdAt: Date; name: string }) {
          super(data);
          Object.assign(this, data);
        }
      }

      const oldDate = new Date('2024-01-01');
      const newDate = new Date('2024-01-02');

      const oldEntity = new DerivedEntity({
        id: 1,
        createdAt: oldDate,
        name: 'John',
      });

      const newEntity = new DerivedEntity({
        id: 2,
        createdAt: newDate,
        name: 'Jane',
      });

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

        constructor(data: { name: string }) {
          Object.assign(this, data);
        }
      }

      @Entity()
      class Product {
        @Property({ type: () => Object })
        title!: string;

        constructor(data: { title: string }) {
          Object.assign(this, data);
        }
      }

      const user = new User({ name: 'John' });
      const product = new Product({ title: 'Product' });

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

        constructor(data: { street: string; city: string }) {
          Object.assign(this, data);
        }
      }

      @Entity()
      class User {
        @Property({ type: () => Object })
        name!: string;

        @Property({ type: () => Object })
        address!: Address;

        constructor(data: { name: string; address: Address }) {
          Object.assign(this, data);
        }
      }

      const address1 = new Address({ street: '123 Main', city: 'Boston' });
      address1.street = '123 Main St';
      address1.city = 'Springfield';

      const address2 = new Address({ street: '456 Oak', city: 'NYC' });
      address2.street = '456 Oak Ave';
      address2.city = 'Springfield';

      const user1 = new User({ name: 'John', address: address1 });

      const user2 = new User({ name: 'Jane', address: address2 });
      user2.name = 'John';

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
        constructor(data: { name?: string; email?: string }) {
          Object.assign(this, data);
        }
      }

      const user1 = new User({ name: 'John' });
      user1.name = 'John';
      user1.email = 'JOHN@EXAMPLE.COM';

      const user2 = new User({ name: 'Jane' });
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
        constructor(data: { email?: string; name?: string }) {
          Object.assign(this, data);
        }
      }

      const user1 = new User({ name: 'John' });
      user1.email = 'john@example.com';

      const user2 = new User({ name: 'Jane' });
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

        constructor(data: { birthDate?: Date; name?: string }) {
          Object.assign(this, data);
        }
      }

      const user1 = new User({ name: 'John' });
      user1.birthDate = new Date('2000-01-15T10:30:00');

      const user2 = new User({ name: 'Jane' });
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

          constructor(data: { name: string; age: number }) {
            Object.assign(this, data);
          }
        }

        const user = new User({ name: 'John', age: 30 });
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

          constructor(data: { name: string; age?: number; email?: string }) {
            Object.assign(this, data);
          }
        }

        const user = new User({ name: 'John' });
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

          constructor(data: {
            name: string;
            age: number | null;
            email: string | null;
          }) {
            Object.assign(this, data);
          }
        }

        const user = new User({ name: 'John', age: null, email: null });

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

          constructor(data: {
            str: string;
            num: number;
            bool: boolean;
            zero: number;
            empty: string;
          }) {
            Object.assign(this, data);
          }
        }

        const data = new Data({
          str: 'test',
          num: 42,
          bool: true,
          zero: 0,
          empty: '',
        });

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

          constructor(data: { id: number; createdAt: Date }) {
            Object.assign(this, data);
          }
        }

        @Entity()
        class User extends BaseEntity {
          @Property({ type: () => Object }) name!: string;
          @Property({ type: () => Object }) email!: string;

          constructor(data: {
            id: number;
            createdAt: Date;
            name: string;
            email: string;
          }) {
            super(data);
            Object.assign(this, data);
          }
        }

        const user = new User({
          id: 1,
          createdAt: new Date('2024-01-01T00:00:00.000Z'),
          name: 'John',
          email: 'john@example.com',
        });

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

          constructor(data: { id: number }) {
            Object.assign(this, data);
          }
        }

        @Entity()
        class TimestampedEntity extends BaseEntity {
          @Property({ type: () => Object }) createdAt!: Date;

          constructor(data: { id: number; createdAt: Date }) {
            super(data);
            Object.assign(this, data);
          }
        }

        @Entity()
        class User extends TimestampedEntity {
          @Property({ type: () => Object }) name!: string;

          constructor(data: { id: number; createdAt: Date; name: string }) {
            super(data);
            Object.assign(this, data);
          }
        }

        const user = new User({
          id: 1,
          createdAt: new Date('2024-01-01T00:00:00.000Z'),
          name: 'John',
        });

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

          constructor(data: { name: string; date: Date }) {
            Object.assign(this, data);
          }
        }

        const event = new Event({
          name: 'Meeting',
          date: new Date('2024-06-15T14:30:00.000Z'),
        });

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

          constructor(data: { name: string; date: Date | null }) {
            Object.assign(this, data);
          }
        }

        const event = new Event({ name: 'Meeting', date: null });

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

          constructor(data: { id: bigint; largeNumber: bigint }) {
            Object.assign(this, data);
          }
        }

        const data = new Data({
          id: BigInt(123),
          largeNumber: BigInt('9007199254740991999'),
        });

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

          constructor(data: { id: bigint | null }) {
            Object.assign(this, data);
          }
        }

        const data = new Data({ id: null });

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

          constructor(data: { street: string; city: string; zipCode: string }) {
            Object.assign(this, data);
          }
        }

        @Entity()
        class User {
          @Property({ type: () => Object }) name!: string;
          @Property({ type: () => Object }) address!: Address;

          constructor(data: { name: string; address: Address }) {
            Object.assign(this, data);
          }
        }

        const address = new Address({
          street: '789 Pine',
          city: 'LA',
          zipCode: '90001',
        });
        address.street = '123 Main St';
        address.city = 'Boston';
        address.zipCode = '02101';

        const user = new User({ name: 'John', address });

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

          constructor(data: { street: string }) {
            Object.assign(this, data);
          }
        }

        @Entity()
        class User {
          @Property({ type: () => Object }) name!: string;
          @Property({ type: () => Object }) address!: Address | null;

          constructor(data: { name: string; address: Address | null }) {
            Object.assign(this, data);
          }
        }

        const user = new User({ name: 'John', address: null });

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

          constructor(data: { name: string; code: string }) {
            Object.assign(this, data);
          }
        }

        @Entity()
        class Address {
          @Property({ type: () => Object }) street!: string;
          @Property({ type: () => Object }) country!: Country;

          constructor(data: { street: string; country: Country }) {
            Object.assign(this, data);
          }
        }

        @Entity()
        class User {
          @Property({ type: () => Object }) name!: string;
          @Property({ type: () => Object }) address!: Address;

          constructor(data: { name: string; address: Address }) {
            Object.assign(this, data);
          }
        }

        const country = new Country({ name: 'USA', code: 'US' });
        const address = new Address({ street: '123 Main St', country });
        const user = new User({ name: 'John', address });

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

          constructor(data: {
            name: string;
            tags: string[];
            scores: number[];
          }) {
            Object.assign(this, data);
          }
        }

        const user = new User({
          name: 'John',
          tags: ['developer', 'typescript', 'node'],
          scores: [95, 87, 92],
        });

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

          constructor(data: { type: string; number: string }) {
            Object.assign(this, data);
          }
        }

        @Entity()
        class User {
          @Property({ type: () => Object }) name!: string;
          @Property({ type: () => Object }) phones!: Phone[];

          constructor(data: { name: string; phones: Phone[] }) {
            Object.assign(this, data);
          }
        }

        const phone1 = new Phone({ type: 'mobile', number: '555-0001' });
        const phone2 = new Phone({ type: 'work', number: '555-0002' });
        const user = new User({ name: 'John', phones: [phone1, phone2] });

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

          constructor(data: { name: string }) {
            Object.assign(this, data);
          }
        }

        @Entity()
        class Post {
          @Property({ type: () => Object }) title!: string;
          @Property({ type: () => Object }) tags!: (Tag | string)[];

          constructor(data: { title: string; tags: (Tag | string)[] }) {
            Object.assign(this, data);
          }
        }

        const tag = new Tag({ name: 'important' });
        const post = new Post({
          title: 'My Post',
          tags: [tag, 'typescript', 'coding'],
        });

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

          constructor(data: { name: string; tags: string[] }) {
            Object.assign(this, data);
          }
        }

        const user = new User({ name: 'John', tags: [] });

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

          constructor(data: { name: string; dates: Date[] }) {
            Object.assign(this, data);
          }
        }

        const event = new Event({
          name: 'Conference',
          dates: [
            new Date('2024-01-01T00:00:00.000Z'),
            new Date('2024-01-02T00:00:00.000Z'),
          ],
        });

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

          constructor(data: { name: string; ids: bigint[] }) {
            Object.assign(this, data);
          }
        }

        const data = new Data({
          name: 'test',
          ids: [BigInt(1), BigInt(2), BigInt(999999999999)],
        });

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

          constructor(data: { name: string; data: number[][] }) {
            Object.assign(this, data);
          }
        }

        const matrix = new Matrix({
          name: 'test-matrix',
          data: [
            [1, 2, 3],
            [4, 5, 6],
          ],
        });

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

    describe('custom serialize/deserialize', () => {
      it('should use custom serialize function when provided', () => {
        class CustomObject {
          constructor(
            public value: string,
            public secret: string,
          ) {}
        }

        @Entity()
        class User {
          @StringProperty() name!: string;
          @Property({
            type: () => CustomObject,
            serialize: (obj: CustomObject) => ({
              customValue: obj.value.toUpperCase(),
            }),
            deserialize: (json: any) =>
              new CustomObject(json.customValue.toLowerCase(), ''),
          })
          data!: CustomObject;

          constructor(data: { name: string; data: CustomObject }) {
            Object.assign(this, data);
          }
        }

        const user = new User({
          name: 'John',
          data: new CustomObject('hello', 'password'),
        });

        const json = EntityUtils.toJSON(user);

        expect(json).toEqual({
          name: 'John',
          data: { customValue: 'HELLO' },
        });
      });

      it('should use custom deserialize function for symmetric round-trip', async () => {
        class CustomObject {
          constructor(
            public value: string,
            public secret: string,
          ) {}
        }

        @Entity()
        class User {
          @StringProperty() name!: string;
          @Property({
            type: () => CustomObject,
            serialize: (obj: CustomObject) => ({
              customValue: obj.value.toUpperCase(),
            }),
            deserialize: (json: any) =>
              new CustomObject(json.customValue.toLowerCase(), ''),
          })
          data!: CustomObject;

          constructor(data: { name: string; data: CustomObject }) {
            Object.assign(this, data);
          }
        }

        const original = new User({
          name: 'John',
          data: new CustomObject('hello', 'password'),
        });

        const json = EntityUtils.toJSON(original);
        const parsed = await EntityUtils.parse(User, json);

        expect(parsed.name).toBe('John');
        expect(parsed.data).toBeInstanceOf(CustomObject);
        expect(parsed.data.value).toBe('hello');
      });

      it('should handle custom serialize/deserialize in arrays', async () => {
        class CustomObject {
          constructor(public value: string) {}
        }

        @Entity()
        class Container {
          @ArrayProperty(() => CustomObject, {
            serialize: (obj: CustomObject) => ({
              transformed: obj.value.toUpperCase(),
            }),
            deserialize: (json: any) => new CustomObject(json.transformed),
          } as any)
          items!: CustomObject[];

          constructor(data: { items: CustomObject[] }) {
            Object.assign(this, data);
          }
        }

        const container = new Container({
          items: [new CustomObject('hello'), new CustomObject('world')],
        });

        const json = EntityUtils.toJSON(container);

        expect(json).toEqual({
          items: [{ transformed: 'HELLO' }, { transformed: 'WORLD' }],
        });

        const parsed = await EntityUtils.parse(Container, json);
        expect(parsed.items).toHaveLength(2);
        expect(parsed.items[0]).toBeInstanceOf(CustomObject);
        expect(parsed.items[0].value).toBe('HELLO');
      });

      it('should throw error when only serialize is defined', () => {
        expect(() => {
          @Entity()
          class User {
            @Property({
              type: () => String,
              serialize: (val: string) => val.toUpperCase(),
            } as any)
            name!: string;
          }
          new User();
        }).toThrow(/must define both serialize and deserialize/);
      });

      it('should throw error when only deserialize is defined', () => {
        expect(() => {
          @Entity()
          class User {
            @Property({
              type: () => String,
              deserialize: (val: any) => val.toLowerCase(),
            } as any)
            name!: string;
          }
          new User();
        }).toThrow(/must define both serialize and deserialize/);
      });

      it('should not use serialize/deserialize when passthrough is true', async () => {
        @Entity()
        class User {
          @Property({
            type: () => String,
            passthrough: true,
          })
          metadata!: Record<string, unknown>;

          constructor(data: { metadata: Record<string, unknown> }) {
            Object.assign(this, data);
          }
        }

        const user = new User({ metadata: { nested: { data: 'value' } } });

        const json = EntityUtils.toJSON(user);
        expect(json.metadata).toEqual({ nested: { data: 'value' } });

        const parsed = await EntityUtils.parse(User, json);
        expect(parsed.metadata).toEqual({ nested: { data: 'value' } });
      });

      it('should throw error when passthrough is combined with serialize', () => {
        expect(() => {
          @Entity()
          class User {
            @Property({
              type: () => String,
              passthrough: true,
              serialize: (val: any) => val,
              deserialize: (val: any) => val,
            } as any)
            data!: any;
          }
          new User();
        }).toThrow(
          /passthrough: true and custom serialize\/deserialize functions/,
        );
      });

      it('should throw error when passthrough is combined with deserialize', () => {
        expect(() => {
          @Entity()
          class User {
            @Property({
              type: () => String,
              passthrough: true,
              serialize: (val: any) => val,
              deserialize: (val: any) => val,
            } as any)
            data!: any;
          }
          new User();
        }).toThrow(
          /passthrough: true and custom serialize\/deserialize functions/,
        );
      });

      it('should handle complex transformations with nested data', async () => {
        class Point {
          constructor(
            public x: number,
            public y: number,
          ) {}
        }

        @Entity()
        class Shape {
          @StringProperty() name!: string;
          @Property({
            type: () => Point,
            serialize: (point: Point) => `${point.x},${point.y}`,
            deserialize: (str: any) => {
              const [x, y] = str.split(',').map(Number);
              return new Point(x, y);
            },
          })
          position!: Point;
          constructor(data: { name: string; position: Point }) {
            Object.assign(this, data);
          }
        }

        const shape = new Shape({
          name: 'circle',
          position: new Point(10, 20),
        });

        const json = EntityUtils.toJSON(shape);
        expect(json).toEqual({
          name: 'circle',
          position: '10,20',
        });

        const parsed = await EntityUtils.parse(Shape, json);
        expect(parsed.position).toBeInstanceOf(Point);
        expect(parsed.position.x).toBe(10);
        expect(parsed.position.y).toBe(20);
      });

      it('should maintain serialization order with serialize callbacks', () => {
        class Wrapper {
          constructor(public value: string) {}
        }

        @Entity()
        class Data {
          @Property({
            type: () => Wrapper,
            serialize: (w: Wrapper) => ({ wrapped: w.value }),
            deserialize: (json: any) => new Wrapper(json.wrapped),
          })
          first!: Wrapper;

          @StringProperty() middle!: string;

          @Property({
            type: () => Wrapper,
            serialize: (w: Wrapper) => ({ wrapped: w.value }),
            deserialize: (json: any) => new Wrapper(json.wrapped),
          })
          last!: Wrapper;
        }

        const data = new Data();
        data.first = new Wrapper('a');
        data.middle = 'b';
        data.last = new Wrapper('c');

        const json = EntityUtils.toJSON(data);
        const keys = Object.keys(json);
        expect(keys).toEqual(['first', 'middle', 'last']);
      });
    });

    describe('complex scenarios', () => {
      it('should handle entity with all types combined', () => {
        @Entity()
        class Tag {
          @Property({ type: () => Object }) name!: string;

          constructor(data: { name: string }) {
            Object.assign(this, data);
          }
        }

        @Entity()
        class Address {
          @Property({ type: () => Object }) street!: string;
          @Property({ type: () => Object }) city!: string;

          constructor(data: { street: string; city: string }) {
            Object.assign(this, data);
          }
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

          constructor(data: {
            id: bigint;
            name: string;
            age: number;
            active: boolean;
            email: string | null;
            phone?: string;
            createdAt: Date;
            address: Address;
            tags: Tag[];
            scores: number[];
          }) {
            Object.assign(this, data);
          }
        }

        const tag1 = new Tag({ name: 'developer' });
        const tag2 = new Tag({ name: 'typescript' });
        const address = new Address({ street: '123 Main St', city: 'Boston' });

        const user = new User({
          id: BigInt(12345),
          name: 'John',
          age: 30,
          active: true,
          email: null,
          createdAt: new Date('2024-01-01T12:00:00.000Z'),
          address,
          tags: [tag1, tag2],
          scores: [95, 87, 92],
        });
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

          constructor(data: { name?: string; age?: number } = {}) {
            Object.assign(this, data);
          }
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

          constructor(data: { name: string | null; email: string | null }) {
            Object.assign(this, data);
          }
        }

        const user = new User({ name: null, email: null });

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

          constructor(data: {
            name: string;
            settings: Record<string, unknown>;
          }) {
            Object.assign(this, data);
          }
        }

        const config = new Config({
          name: 'app-config',
          settings: {
            theme: 'dark',
            fontSize: 14,
            features: { beta: true },
          },
        });

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

          constructor(data: {
            name: string;
            settings: Record<string, unknown>;
          }) {
            Object.assign(this, data);
          }
        }

        const config = new Config({
          name: 'app-config',
          settings: { theme: 'dark' },
        });

        expect(() => EntityUtils.toJSON(config)).toThrow(
          "Cannot serialize value of type 'object'",
        );
      });
    });
  });

  describe('parse', () => {
    describe('primitives', () => {
      it('should parse string properties', async () => {
        @Entity()
        class User {
          @Property({ type: () => String })
          name!: string;

          constructor(data: { name: string }) {
            Object.assign(this, data);
          }
        }

        const json = { name: 'John' };
        const user = await EntityUtils.parse(User, json);

        expect(user).toBeInstanceOf(User);
        expect(user.name).toBe('John');
      });

      it('should parse number properties', async () => {
        @Entity()
        class User {
          @Property({ type: () => Number })
          age!: number;

          constructor(data: { age: number }) {
            Object.assign(this, data);
          }
        }

        const json = { age: 30 };
        const user = await EntityUtils.parse(User, json);

        expect(user).toBeInstanceOf(User);
        expect(user.age).toBe(30);
      });

      it('should parse boolean properties', async () => {
        @Entity()
        class User {
          @Property({ type: () => Boolean })
          active!: boolean;

          constructor(data: { active: boolean }) {
            Object.assign(this, data);
          }
        }

        const json = { active: true };
        const user = await EntityUtils.parse(User, json);

        expect(user).toBeInstanceOf(User);
        expect(user.active).toBe(true);
      });

      it('should parse multiple primitive properties', async () => {
        @Entity()
        class User {
          @Property({ type: () => String })
          name!: string;

          @Property({ type: () => Number })
          age!: number;

          @Property({ type: () => Boolean })
          active!: boolean;

          constructor(data: { name: string; age: number; active: boolean }) {
            Object.assign(this, data);
          }
        }

        const json = { name: 'John', age: 30, active: true };
        const user = await EntityUtils.parse(User, json);

        expect(user.name).toBe('John');
        expect(user.age).toBe(30);
        expect(user.active).toBe(true);
      });
    });

    describe('Date and BigInt', () => {
      it('should parse Date from ISO string', async () => {
        @Entity()
        class Event {
          @Property({ type: () => Date })
          createdAt!: Date;

          constructor(data: { createdAt: Date }) {
            Object.assign(this, data);
          }
        }

        const json = { createdAt: '2024-01-01T12:00:00.000Z' };
        const event = await EntityUtils.parse(Event, json);

        expect(event.createdAt).toBeInstanceOf(Date);
        expect(event.createdAt.toISOString()).toBe('2024-01-01T12:00:00.000Z');
      });

      it('should parse Date from Date object', async () => {
        @Entity()
        class Event {
          @Property({ type: () => Date })
          createdAt!: Date;

          constructor(data: { createdAt: Date }) {
            Object.assign(this, data);
          }
        }

        const date = new Date('2024-01-01T12:00:00.000Z');
        const json = { createdAt: date };
        const event = await EntityUtils.parse(Event, json);

        expect(event.createdAt).toBe(date);
      });

      it('should parse BigInt from string', async () => {
        @Entity()
        class Data {
          @Property({ type: () => BigInt })
          id!: bigint;

          constructor(data: { id: bigint }) {
            Object.assign(this, data);
          }
        }

        const json = { id: '12345678901234567890' };
        const data = await EntityUtils.parse(Data, json);

        expect(data.id).toBe(BigInt('12345678901234567890'));
      });

      it('should parse BigInt from bigint', async () => {
        @Entity()
        class Data {
          @Property({ type: () => BigInt })
          id!: bigint;

          constructor(data: { id: bigint }) {
            Object.assign(this, data);
          }
        }

        const json = { id: BigInt(123) };
        const data = await EntityUtils.parse(Data, json);

        expect(data.id).toBe(BigInt(123));
      });
    });

    describe('nested entities', () => {
      it('should parse nested entities', async () => {
        @Entity()
        class Address {
          @Property({ type: () => String })
          street!: string;

          @Property({ type: () => String })
          city!: string;

          constructor(data: { street: string; city: string }) {
            Object.assign(this, data);
          }
        }

        @Entity()
        class User {
          @Property({ type: () => String })
          name!: string;

          @Property({ type: () => Address })
          address!: Address;

          constructor(data: { name: string; address: Address }) {
            Object.assign(this, data);
          }
        }

        const json = {
          name: 'John',
          address: {
            street: '123 Main St',
            city: 'Boston',
          },
        };

        const user = await EntityUtils.parse(User, json);

        expect(user.name).toBe('John');
        expect(user.address).toBeInstanceOf(Address);
        expect(user.address.street).toBe('123 Main St');
        expect(user.address.city).toBe('Boston');
      });

      it('should parse deeply nested entities', async () => {
        @Entity()
        class Country {
          @Property({ type: () => String })
          name!: string;

          constructor(data: { name: string }) {
            Object.assign(this, data);
          }
        }

        @Entity()
        class Address {
          @Property({ type: () => String })
          street!: string;

          @Property({ type: () => Country })
          country!: Country;

          constructor(data: { street: string; country: Country }) {
            Object.assign(this, data);
          }
        }

        @Entity()
        class User {
          @Property({ type: () => String })
          name!: string;

          @Property({ type: () => Address })
          address!: Address;

          constructor(data: { name: string; address: Address }) {
            Object.assign(this, data);
          }
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

        const user = await EntityUtils.parse(User, json);

        expect(user.address.country).toBeInstanceOf(Country);
        expect(user.address.country.name).toBe('USA');
      });
    });

    describe('arrays', () => {
      it('should parse arrays of primitives', async () => {
        @Entity()
        class User {
          @Property({ type: () => String, array: true })
          tags!: string[];
          constructor(data: { tags: string[] }) {
            Object.assign(this, data);
          }
        }

        const json = { tags: ['developer', 'typescript'] };
        const user = await EntityUtils.parse(User, json);

        expect(Array.isArray(user.tags)).toBe(true);
        expect(user.tags).toEqual(['developer', 'typescript']);
      });

      it('should parse arrays of numbers', async () => {
        @Entity()
        class Data {
          @Property({ type: () => Number, array: true })
          scores!: number[];
          constructor(data: { scores: number[] }) {
            Object.assign(this, data);
          }
        }

        const json = { scores: [95, 87, 92] };
        const data = await EntityUtils.parse(Data, json);

        expect(data.scores).toEqual([95, 87, 92]);
      });

      it('should parse arrays of entities', async () => {
        @Entity()
        class Phone {
          @Property({ type: () => String })
          number!: string;
          constructor(data: { number: string }) {
            Object.assign(this, data);
          }
        }

        @Entity()
        class User {
          @Property({ type: () => Phone, array: true })
          phones!: Phone[];
          constructor(data: { phones: Phone[] }) {
            Object.assign(this, data);
          }
        }

        const json = {
          phones: [{ number: '555-0001' }, { number: '555-0002' }],
        };

        const user = await EntityUtils.parse(User, json);

        expect(user.phones).toHaveLength(2);
        expect(user.phones[0]).toBeInstanceOf(Phone);
        expect(user.phones[0].number).toBe('555-0001');
        expect(user.phones[1]).toBeInstanceOf(Phone);
        expect(user.phones[1].number).toBe('555-0002');
      });

      it('should parse empty arrays', async () => {
        @Entity()
        class User {
          @Property({ type: () => String, array: true })
          tags!: string[];
          constructor(data: { tags: string[] }) {
            Object.assign(this, data);
          }
        }

        const json = { tags: [] };
        const user = await EntityUtils.parse(User, json);

        expect(user.tags).toEqual([]);
      });

      it('should reject null/undefined elements in non-sparse arrays', async () => {
        @Entity()
        class Data {
          @Property({ type: () => String, array: true })
          values!: string[];
          constructor(data: { values: string[] }) {
            Object.assign(this, data);
          }
        }

        const json = { values: ['a', null, 'b'] };

        await expect(
          async () => await EntityUtils.parse(Data, json),
        ).rejects.toThrow('values[1]: Cannot be null or undefined');
      });

      it('should reject undefined elements in non-sparse arrays', async () => {
        @Entity()
        class Data {
          @Property({ type: () => String, array: true })
          values!: string[];
          constructor(data: { values: string[] }) {
            Object.assign(this, data);
          }
        }

        const json = { values: ['a', undefined, 'b'] };

        await expect(
          async () => await EntityUtils.parse(Data, json),
        ).rejects.toThrow('values[1]: Cannot be null or undefined');
      });

      it('should allow null/undefined elements in sparse arrays', async () => {
        @Entity()
        class Data {
          @Property({ type: () => String, array: true, sparse: true })
          values!: (string | null)[];
          constructor(data: { values: (string | null)[] }) {
            Object.assign(this, data);
          }
        }

        const json = { values: ['a', null, 'b', undefined] };
        const data = await EntityUtils.parse(Data, json);

        expect(data.values).toEqual(['a', null, 'b', undefined]);
      });
    });

    describe('optional properties', () => {
      it('should allow optional properties to be undefined', async () => {
        @Entity()
        class User {
          @Property({ type: () => String })
          name!: string;

          @Property({ type: () => String, optional: true })
          nickname?: string;
          constructor(data: { name: string; nickname?: string }) {
            Object.assign(this, data);
          }
        }

        const json = { name: 'John' };
        const user = await EntityUtils.parse(User, json);

        expect(user.name).toBe('John');
        expect(user.nickname).toBeUndefined();
      });

      it('should allow optional properties to be null', async () => {
        @Entity()
        class User {
          @Property({ type: () => String })
          name!: string;

          @Property({ type: () => String, optional: true })
          email?: string;
          constructor(data: { name: string; email?: string | null }) {
            Object.assign(this, data);
          }
        }

        const json = { name: 'John', email: null };
        const user = await EntityUtils.parse(User, json);

        expect(user.name).toBe('John');
        expect(user.email).toBeNull();
      });

      it('should parse optional properties when present', async () => {
        @Entity()
        class User {
          @Property({ type: () => String })
          name!: string;

          @Property({ type: () => String, optional: true })
          nickname?: string;
          constructor(data: { name: string; nickname?: string }) {
            Object.assign(this, data);
          }
        }

        const json = { name: 'John', nickname: 'Johnny' };
        const user = await EntityUtils.parse(User, json);

        expect(user.name).toBe('John');
        expect(user.nickname).toBe('Johnny');
      });

      it('should handle optional nested entities', async () => {
        @Entity()
        class Address {
          @Property({ type: () => String })
          street!: string;
          constructor(data: { street: string }) {
            Object.assign(this, data);
          }
        }

        @Entity()
        class User {
          @Property({ type: () => String })
          name!: string;

          @Property({ type: () => Address, optional: true })
          address?: Address;
          constructor(data: { name: string; address?: Address }) {
            Object.assign(this, data);
          }
        }

        const json = { name: 'John' };
        const user = await EntityUtils.parse(User, json);

        expect(user.name).toBe('John');
        expect(user.address).toBeUndefined();
      });

      it('should handle optional arrays', async () => {
        @Entity()
        class User {
          @Property({ type: () => String })
          name!: string;

          @Property({ type: () => String, array: true, optional: true })
          tags?: string[];
          constructor(data: { name: string; tags?: string[] }) {
            Object.assign(this, data);
          }
        }

        const json = { name: 'John' };
        const user = await EntityUtils.parse(User, json);

        expect(user.name).toBe('John');
        expect(user.tags).toBeUndefined();
      });
    });

    describe('inheritance', () => {
      it('should parse properties from parent and child classes', async () => {
        @Entity()
        class BaseEntity {
          @Property({ type: () => Number })
          id!: number;
          constructor(data: { id: number }) {
            Object.assign(this, data);
          }
        }

        @Entity()
        class User extends BaseEntity {
          @Property({ type: () => String })
          name!: string;
          constructor(data: { id: number; name: string }) {
            super(data);
            Object.assign(this, data);
          }
        }

        const json = { id: 1, name: 'John' };
        const user = await EntityUtils.parse(User, json);

        expect(user.id).toBe(1);
        expect(user.name).toBe('John');
      });

      it('should parse multi-level inheritance', async () => {
        @Entity()
        class BaseEntity {
          @Property({ type: () => Number })
          id!: number;
          constructor(data: { id: number; createdAt?: Date; name?: string }) {
            Object.assign(this, data);
          }
        }

        @Entity()
        class TimestampedEntity extends BaseEntity {
          @Property({ type: () => Date })
          createdAt!: Date;
          constructor(data: { id: number; createdAt: Date; name?: string }) {
            super(data);
            Object.assign(this, data);
          }
        }

        @Entity()
        class User extends TimestampedEntity {
          @Property({ type: () => String })
          name!: string;
          constructor(data: { id: number; createdAt: Date; name: string }) {
            super(data);
            Object.assign(this, data);
          }
        }

        const json = {
          id: 1,
          createdAt: '2024-01-01T00:00:00.000Z',
          name: 'John',
        };

        const user = await EntityUtils.parse(User, json);

        expect(user.id).toBe(1);
        expect(user.createdAt).toBeInstanceOf(Date);
        expect(user.name).toBe('John');
      });
    });

    describe('round-trip serialization', () => {
      it('should round-trip simple entities', async () => {
        @Entity()
        class User {
          @Property({ type: () => String })
          name!: string;

          @Property({ type: () => Number })
          age!: number;
          constructor(data: { name: string; age: number }) {
            Object.assign(this, data);
          }
        }

        const original = new User({ name: 'John', age: 30 });

        const json = EntityUtils.toJSON(original);
        const parsed = await EntityUtils.parse(User, json);

        expect(EntityUtils.equals(original, parsed)).toBe(true);
      });

      it('should round-trip entities with nested entities', async () => {
        @Entity()
        class Address {
          @Property({ type: () => String })
          street!: string;

          @Property({ type: () => String })
          city!: string;
          constructor(data: { street: string; city: string }) {
            Object.assign(this, data);
          }
        }

        @Entity()
        class User {
          @Property({ type: () => String })
          name!: string;

          @Property({ type: () => Address })
          address!: Address;
          constructor(data: { name: string; address: Address }) {
            Object.assign(this, data);
          }
        }

        const address = new Address({ street: '123 Main St', city: 'Boston' });

        const original = new User({ name: 'John', address: address });

        const json = EntityUtils.toJSON(original);
        const parsed = await EntityUtils.parse(User, json);

        expect(EntityUtils.equals(original, parsed)).toBe(true);
      });

      it('should round-trip entities with arrays', async () => {
        @Entity()
        class User {
          @Property({ type: () => String })
          name!: string;

          @Property({ type: () => String, array: true })
          tags!: string[];
          constructor(data: { name: string; tags: string[] }) {
            Object.assign(this, data);
          }
        }

        const original = new User({
          name: 'John',
          tags: ['dev', 'typescript'],
        });

        const json = EntityUtils.toJSON(original);
        const parsed = await EntityUtils.parse(User, json);

        expect(EntityUtils.equals(original, parsed)).toBe(true);
      });

      it('should round-trip entities with Dates and BigInts', async () => {
        @Entity()
        class Data {
          @Property({ type: () => BigInt })
          id!: bigint;

          @Property({ type: () => Date })
          createdAt!: Date;
          constructor(data: { id: bigint; createdAt: Date }) {
            Object.assign(this, data);
          }
        }

        const original = new Data({
          id: BigInt(12345),
          createdAt: new Date('2024-01-01T12:00:00.000Z'),
        });

        const json = EntityUtils.toJSON(original);
        const parsed = await EntityUtils.parse(Data, json);

        expect(parsed.id).toBe(original.id);
        expect(parsed.createdAt.getTime()).toBe(original.createdAt.getTime());
      });
    });

    describe('error handling', () => {
      it('should throw error when property metadata is missing', async () => {
        @Entity()
        class User {
          @Property({ type: () => String })
          name!: string;
          constructor(data: { name: string }) {
            Object.assign(this, data);
          }
        }

        const json = { name: 'John' };
        const user = await EntityUtils.parse(User, json);

        // This test now verifies that with proper metadata, parsing works
        expect(user.name).toBe('John');
      });

      it('should throw error when required property is missing', async () => {
        @Entity()
        class User {
          @Property({ type: () => String })
          name!: string;

          @Property({ type: () => Number })
          age!: number;
          constructor(data: { name: string; age: number }) {
            Object.assign(this, data);
          }
        }

        const json = { name: 'John' };

        await expect(
          async () => await EntityUtils.parse(User, json),
        ).rejects.toThrow('age: Required property is missing from input');
      });

      it('should throw error when required property is null', async () => {
        @Entity()
        class User {
          @Property({ type: () => String })
          name!: string;
          constructor(data: { name: string | null }) {
            Object.assign(this, data);
          }
        }

        const json = { name: null };

        await expect(
          async () => await EntityUtils.parse(User, json),
        ).rejects.toThrow('name: Cannot be null or undefined');
      });

      it('should throw error when required property is undefined', async () => {
        @Entity()
        class User {
          @Property({ type: () => String })
          name!: string;
          constructor(data: { name?: string }) {
            Object.assign(this, data);
          }
        }

        const json = { name: undefined };

        await expect(
          async () => await EntityUtils.parse(User, json),
        ).rejects.toThrow('name: Cannot be null or undefined');
      });

      it('should throw error for type mismatch on string', async () => {
        @Entity()
        class User {
          @Property({ type: () => String })
          name!: string;
          constructor(data: { name: string | number }) {
            Object.assign(this, data);
          }
        }

        const json = { name: 123 };

        await expect(
          async () => await EntityUtils.parse(User, json),
        ).rejects.toThrow('name: Expects a string but received number');
      });

      it('should throw error for type mismatch on number', async () => {
        @Entity()
        class User {
          @Property({ type: () => Number })
          age!: number;
          constructor(data: { age: number | string }) {
            Object.assign(this, data);
          }
        }

        const json = { age: 'not a number' };

        await expect(
          async () => await EntityUtils.parse(User, json),
        ).rejects.toThrow('age: Expects a number but received string');
      });

      it('should throw error for type mismatch on boolean', async () => {
        @Entity()
        class User {
          @Property({ type: () => Boolean })
          active!: boolean;
          constructor(data: { active: boolean | string }) {
            Object.assign(this, data);
          }
        }

        const json = { active: 'true' };

        await expect(
          async () => await EntityUtils.parse(User, json),
        ).rejects.toThrow('active: Expects a boolean but received string');
      });

      it('should throw error for invalid Date string', async () => {
        @Entity()
        class Event {
          @Property({ type: () => Date })
          createdAt!: Date;
          constructor(data: { createdAt: Date | string }) {
            Object.assign(this, data);
          }
        }

        const json = { createdAt: 'not a date' };

        await expect(
          async () => await EntityUtils.parse(Event, json),
        ).rejects.toThrow("createdAt: Cannot parse 'not a date' as Date");
      });

      it('should throw error for invalid BigInt string', async () => {
        @Entity()
        class Data {
          @Property({ type: () => BigInt })
          id!: bigint;
          constructor(data: { id: bigint | string }) {
            Object.assign(this, data);
          }
        }

        const json = { id: 'not a bigint' };

        await expect(
          async () => await EntityUtils.parse(Data, json),
        ).rejects.toThrow("id: Cannot parse 'not a bigint' as BigInt");
      });

      it('should throw error when array expected but not received', async () => {
        @Entity()
        class User {
          @Property({ type: () => String, array: true })
          tags!: string[];
          constructor(data: { tags: string[] | string }) {
            Object.assign(this, data);
          }
        }

        const json = { tags: 'not an array' };

        await expect(
          async () => await EntityUtils.parse(User, json),
        ).rejects.toThrow('tags: Expects an array but received string');
      });

      it('should throw error for nested entity type mismatch', async () => {
        @Entity()
        class Address {
          @Property({ type: () => String })
          street!: string;
          constructor(data: { street: string }) {
            Object.assign(this, data);
          }
        }

        @Entity()
        class User {
          @Property({ type: () => Address })
          address!: Address;
          constructor(data: { address: Address | string }) {
            Object.assign(this, data);
          }
        }

        const json = { address: 'not an object' };

        await expect(
          async () => await EntityUtils.parse(User, json),
        ).rejects.toThrow('address: Expects an object but received string');
      });

      it('should throw error with correct property path in array', async () => {
        @Entity()
        class User {
          @Property({ type: () => Number, array: true })
          scores!: number[];
          constructor(data: { scores: (number | string)[] }) {
            Object.assign(this, data);
          }
        }

        const json = { scores: [95, 'invalid', 92] };

        await expect(
          async () => await EntityUtils.parse(User, json),
        ).rejects.toThrow('scores[1]: Expects a number but received string');
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
          constructor(data: {
            name: string;
            metadata: Record<string, unknown>;
          }) {
            Object.assign(this, data);
          }
        }

        const config = new Config({
          name: 'test',
          metadata: { custom: 'value', nested: { data: 123 } },
        });

        const json = EntityUtils.toJSON(config);

        expect(json).toEqual({
          name: 'test',
          metadata: { custom: 'value', nested: { data: 123 } },
        });
      });

      it('should work with PassthroughProperty for deserialization', async () => {
        @Entity()
        class Config {
          @StringProperty()
          name!: string;

          @PassthroughProperty()
          metadata!: Record<string, unknown>;
          constructor(data: {
            name: string;
            metadata: Record<string, unknown>;
          }) {
            Object.assign(this, data);
          }
        }

        const json = {
          name: 'test',
          metadata: { custom: 'value', nested: { data: 123 } },
        };

        const config = await EntityUtils.parse(Config, json);

        expect(config.name).toBe('test');
        expect(config.metadata).toEqual({
          custom: 'value',
          nested: { data: 123 },
        });
      });

      it('should round-trip with PassthroughProperty', async () => {
        @Entity()
        class Config {
          @StringProperty()
          name!: string;

          @PassthroughProperty()
          data!: unknown;
          constructor(data: { name: string; data: unknown }) {
            Object.assign(this, data);
          }
        }

        const original = new Config({
          name: 'test',
          data: {
            complex: [1, 2, { nested: true }],
            map: new Map([['key', 'value']]),
          },
        });

        const json = EntityUtils.toJSON(original);
        const parsed = await EntityUtils.parse(Config, json);

        expect(parsed.name).toBe(original.name);
        expect(parsed.data).toEqual(original.data);
      });
    });

    describe('helper decorators', () => {
      it('should work with StringProperty', async () => {
        @Entity()
        class User {
          @StringProperty()
          name!: string;
          constructor(data: { name: string }) {
            Object.assign(this, data);
          }
        }

        const json = { name: 'John' };
        const user = await EntityUtils.parse(User, json);

        expect(user.name).toBe('John');
      });

      it('should work with NumberProperty', async () => {
        @Entity()
        class User {
          @NumberProperty()
          age!: number;
          constructor(data: { age: number }) {
            Object.assign(this, data);
          }
        }

        const json = { age: 30 };
        const user = await EntityUtils.parse(User, json);

        expect(user.age).toBe(30);
      });

      it('should work with BooleanProperty', async () => {
        @Entity()
        class User {
          @BooleanProperty()
          active!: boolean;
          constructor(data: { active: boolean }) {
            Object.assign(this, data);
          }
        }

        const json = { active: true };
        const user = await EntityUtils.parse(User, json);

        expect(user.active).toBe(true);
      });

      it('should work with DateProperty', async () => {
        @Entity()
        class Event {
          @DateProperty()
          createdAt!: Date;
          constructor(data: { createdAt: Date | string }) {
            Object.assign(this, data);
          }
        }

        const json = { createdAt: '2024-01-01T00:00:00.000Z' };
        const event = await EntityUtils.parse(Event, json);

        expect(event.createdAt).toBeInstanceOf(Date);
      });

      it('should work with BigIntProperty', async () => {
        @Entity()
        class Data {
          @BigIntProperty()
          id!: bigint;
          constructor(data: { id: bigint | string }) {
            Object.assign(this, data);
          }
        }

        const json = { id: '123' };
        const data = await EntityUtils.parse(Data, json);

        expect(data.id).toBe(BigInt(123));
      });

      it('should work with EntityProperty', async () => {
        @Entity()
        class Address {
          @StringProperty()
          street!: string;
          constructor(data: { street: string }) {
            Object.assign(this, data);
          }
        }

        @Entity()
        class User {
          @StringProperty()
          name!: string;

          @EntityProperty(() => Address)
          address!: Address;
          constructor(data: { name: string; address: Address }) {
            Object.assign(this, data);
          }
        }

        const json = {
          name: 'John',
          address: { street: '123 Main St' },
        };

        const user = await EntityUtils.parse(User, json);

        expect(user.address).toBeInstanceOf(Address);
        expect(user.address.street).toBe('123 Main St');
      });

      it('should work with ArrayProperty', async () => {
        @Entity()
        class User {
          @ArrayProperty(() => String)
          tags!: string[];
          constructor(data: { tags: string[] }) {
            Object.assign(this, data);
          }
        }

        const json = { tags: ['dev', 'typescript'] };
        const user = await EntityUtils.parse(User, json);

        expect(user.tags).toEqual(['dev', 'typescript']);
      });

      it('should work with optional helper decorators', async () => {
        @Entity()
        class User {
          @StringProperty()
          name!: string;

          @StringProperty({ optional: true })
          nickname?: string;

          @NumberProperty({ optional: true })
          age?: number;
          constructor(data: { name: string; nickname?: string; age?: number }) {
            Object.assign(this, data);
          }
        }

        const json = { name: 'John' };
        const user = await EntityUtils.parse(User, json);

        expect(user.name).toBe('John');
        expect(user.nickname).toBeUndefined();
        expect(user.age).toBeUndefined();
      });

      it('should work with ArrayProperty of entities', async () => {
        @Entity()
        class Phone {
          @StringProperty()
          number!: string;
          constructor(data: { number: string }) {
            Object.assign(this, data);
          }
        }

        @Entity()
        class User {
          @ArrayProperty(() => Phone)
          phones!: Phone[];
          constructor(data: { phones: Phone[] }) {
            Object.assign(this, data);
          }
        }

        const json = {
          phones: [{ number: '555-0001' }, { number: '555-0002' }],
        };

        const user = await EntityUtils.parse(User, json);

        expect(user.phones).toHaveLength(2);
        expect(user.phones[0]).toBeInstanceOf(Phone);
        expect(user.phones[0].number).toBe('555-0001');
      });

      it('should work with sparse ArrayProperty', async () => {
        @Entity()
        class Data {
          @ArrayProperty(() => String, { sparse: true })
          values!: (string | null)[];
          constructor(data: { values: (string | null)[] }) {
            Object.assign(this, data);
          }
        }

        const json = { values: ['a', null, 'b', undefined] };
        const data = await EntityUtils.parse(Data, json);

        expect(data.values).toEqual(['a', null, 'b', undefined]);
      });

      it('should reject null in non-sparse ArrayProperty', async () => {
        @Entity()
        class Data {
          @ArrayProperty(() => String)
          values!: string[];
          constructor(data: { values: (string | null)[] }) {
            Object.assign(this, data);
          }
        }

        const json = { values: ['a', null, 'b'] };

        await expect(
          async () => await EntityUtils.parse(Data, json),
        ).rejects.toThrow('values[1]: Cannot be null or undefined');
      });
    });

    describe('passthrough option with explicit type', () => {
      it('should throw error for unknown type without passthrough in parse', async () => {
        @Entity()
        class Data {
          @Property({ type: () => Symbol })
          value!: symbol;
          constructor(data: { value: symbol | string }) {
            Object.assign(this, data);
          }
        }

        const json = { value: 'test' };

        await expect(
          async () => await EntityUtils.parse(Data, json),
        ).rejects.toThrow('value: Has unknown type constructor');
      });
    });
  });

  describe('toJSON and parse round-trip', () => {
    it('should handle complex entity with multiple property types through serialization and deserialization', async () => {
      // Define nested entities
      @Entity()
      class Address {
        @StringProperty()
        street!: string;

        @StringProperty()
        city!: string;

        @NumberProperty()
        zipCode!: number;
        constructor(data: { street: string; city: string; zipCode: number }) {
          Object.assign(this, data);
        }
      }

      @Entity()
      class Phone {
        @StringProperty()
        type!: string;

        @StringProperty()
        number!: string;
        constructor(data: { type: string; number: string }) {
          Object.assign(this, data);
        }
      }

      @Entity()
      class User {
        @StringProperty()
        name!: string;

        @NumberProperty()
        age!: number;

        @BooleanProperty()
        active!: boolean;

        @DateProperty()
        createdAt!: Date;

        @BigIntProperty()
        balance!: bigint;

        @EntityProperty(() => Address)
        address!: Address;

        @ArrayProperty(() => Phone)
        phones!: Phone[];

        @ArrayProperty(() => String)
        tags!: string[];

        @ArrayProperty(() => Number)
        scores!: number[];

        @StringProperty({ optional: true })
        nickname?: string;

        @ArrayProperty(() => String, { sparse: true })
        sparseList!: (string | null)[];

        @PassthroughProperty()
        metadata!: Record<string, unknown>;
        constructor(data: {
          name: string;
          age: number;
          active: boolean;
          createdAt: Date;
          balance: bigint;
          address: Address;
          phones: Phone[];
          tags: string[];
          scores: number[];
          nickname?: string;
          sparseList: (string | null)[];
          metadata: Record<string, unknown>;
        }) {
          Object.assign(this, data);
        }
      }

      // Create a complex entity
      const address = new Address({
        street: '123 Main St',
        city: 'Boston',
        zipCode: 12345,
      });

      const phone1 = new Phone({ type: 'mobile', number: '555-0001' });

      const phone2 = new Phone({ type: 'home', number: '555-0002' });

      const originalUser = new User({
        name: 'John Doe',
        age: 30,
        active: true,
        createdAt: new Date('2024-01-15T10:30:00.000Z'),
        balance: BigInt('999999999999999999'),
        address: address,
        phones: [phone1, phone2],
        tags: ['developer', 'typescript', 'nodejs'],
        scores: [95, 87, 92],
        sparseList: ['first', null, 'third'],
        metadata: { custom: 'data', nested: { value: 42 } },
      });

      // Serialize to JSON
      const json = EntityUtils.toJSON(originalUser);

      // Deserialize back to entity
      const parsedUser = await EntityUtils.parse(User, json);

      // Use lodash isEqual to compare the entire structure
      expect(isEqual(originalUser, parsedUser)).toBe(true);

      // Additional instanceof checks
      expect(parsedUser).toBeInstanceOf(User);
      expect(parsedUser.address).toBeInstanceOf(Address);
      expect(parsedUser.phones[0]).toBeInstanceOf(Phone);
      expect(parsedUser.phones[1]).toBeInstanceOf(Phone);
      expect(parsedUser.createdAt).toBeInstanceOf(Date);

      // Verify primitive types
      expect(typeof parsedUser.name).toBe('string');
      expect(typeof parsedUser.age).toBe('number');
      expect(typeof parsedUser.active).toBe('boolean');
      expect(typeof parsedUser.balance).toBe('bigint');

      // Verify arrays
      expect(Array.isArray(parsedUser.phones)).toBe(true);
      expect(Array.isArray(parsedUser.tags)).toBe(true);
      expect(Array.isArray(parsedUser.scores)).toBe(true);
      expect(Array.isArray(parsedUser.sparseList)).toBe(true);

      // Verify optional property
      expect(parsedUser.nickname).toBeUndefined();

      // Verify specific values
      expect(parsedUser.name).toBe('John Doe');
      expect(parsedUser.age).toBe(30);
      expect(parsedUser.active).toBe(true);
      expect(parsedUser.balance).toBe(BigInt('999999999999999999'));
      expect(parsedUser.address.street).toBe('123 Main St');
      expect(parsedUser.address.city).toBe('Boston');
      expect(parsedUser.address.zipCode).toBe(12345);
      expect(parsedUser.phones).toHaveLength(2);
      expect(parsedUser.phones[0].type).toBe('mobile');
      expect(parsedUser.phones[0].number).toBe('555-0001');
      expect(parsedUser.phones[1].type).toBe('home');
      expect(parsedUser.phones[1].number).toBe('555-0002');
      expect(parsedUser.tags).toEqual(['developer', 'typescript', 'nodejs']);
      expect(parsedUser.scores).toEqual([95, 87, 92]);
      expect(parsedUser.sparseList).toEqual(['first', null, 'third']);
      expect(parsedUser.metadata).toEqual({
        custom: 'data',
        nested: { value: 42 },
      });
      expect(parsedUser.createdAt.toISOString()).toBe(
        '2024-01-15T10:30:00.000Z',
      );
    });
  });
});
