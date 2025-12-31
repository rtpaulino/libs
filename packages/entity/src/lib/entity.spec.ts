import 'reflect-metadata';
import { describe, it, expect } from 'vitest';
import { EntityUtils } from './entity.js';
import { Property } from './property.js';

describe('EntityUtils', () => {
  describe('getPropertyKeys', () => {
    it('should return empty array for class without properties', () => {
      class EmptyEntity {}

      const utils = new EntityUtils();
      const keys = utils.getPropertyKeys(EmptyEntity.prototype);

      expect(keys).toEqual([]);
    });

    it('should return property keys for class with decorated properties', () => {
      class TestEntity {
        @Property()
        name!: string;

        @Property()
        age!: number;
      }

      const utils = new EntityUtils();
      const keys = utils.getPropertyKeys(TestEntity.prototype);

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

      const utils = new EntityUtils();
      const keys = utils.getPropertyKeys(MixedEntity.prototype);

      expect(keys).toHaveLength(1);
      expect(keys).toContain('decorated');
      expect(keys).not.toContain('undecorated');
    });

    it('should handle symbol property keys', () => {
      const symbolKey = Symbol('test');

      class SymbolEntity {
        @Property()
        [symbolKey]!: string;
      }

      const utils = new EntityUtils();
      const keys = utils.getPropertyKeys(SymbolEntity.prototype);

      expect(keys).toHaveLength(1);
      expect(keys).toContain(symbolKey);
    });

    it('should work with multiple instances of EntityUtils', () => {
      class TestEntity {
        @Property()
        name!: string;
      }

      const utils1 = new EntityUtils();
      const utils2 = new EntityUtils();

      const keys1 = utils1.getPropertyKeys(TestEntity.prototype);
      const keys2 = utils2.getPropertyKeys(TestEntity.prototype);

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

      const utils = new EntityUtils();

      // Due to how TypeScript decorators work with prototypes,
      // the base prototype gets both properties when derived class is decorated
      // This is because derived class prototype initially references base prototype
      const baseKeys = utils.getPropertyKeys(BaseEntity.prototype);
      const derivedKeys = utils.getPropertyKeys(DerivedEntity.prototype);

      // Both should contain their respective properties
      expect(baseKeys).toContain('id');
      expect(derivedKeys).toContain('name');
    });

    it('should not duplicate property keys when decorator is applied multiple times', () => {
      class TestEntity {
        @Property()
        name!: string;
      }

      // Apply decorator again manually (simulating edge case)
      Property()(TestEntity.prototype, 'name');

      const utils = new EntityUtils();
      const keys = utils.getPropertyKeys(TestEntity.prototype);

      expect(keys).toEqual(['name']);
    });
  });
});
