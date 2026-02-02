/* eslint-disable @typescript-eslint/no-explicit-any */
import 'reflect-metadata';
import { describe, it, expect } from 'vitest';
import { EntityUtils } from './entity-utils.js';
import { ValidationError } from './validation-error.js';
import {
  TestUser,
  TestCompany,
  OptionalFieldsEntity,
  EntityWithArrays,
  ValidatedEntity,
  TestEmployee,
} from './test-entities.js';
import { Entity } from './entity.js';
import { StringProperty, EntityProperty } from './property.js';

describe('EntityUtils Edge Cases', () => {
  describe('Invalid Input Types', () => {
    it('should throw ValidationError for wrong primitive types', async () => {
      await expect(
        EntityUtils.parse(TestUser, {
          name: 123, // should be string
          age: '30', // should be number
          active: 'true', // should be boolean
        } as any),
      ).rejects.toThrow(ValidationError);
    });

    it('should throw ValidationError for null on required properties', async () => {
      await expect(
        EntityUtils.parse(TestUser, {
          name: null,
          age: 30,
          active: true,
        } as any),
      ).rejects.toThrow(ValidationError);
    });

    it('should throw ValidationError for undefined on required properties', async () => {
      await expect(
        EntityUtils.parse(TestUser, {
          name: 'John',
          age: undefined,
          active: true,
        } as any),
      ).rejects.toThrow(ValidationError);
    });

    it('should throw ValidationError for missing required properties', async () => {
      await expect(
        EntityUtils.parse(TestUser, {
          name: 'John',
          age: 30,
          // missing required 'active'
        } as any),
      ).rejects.toThrow(ValidationError);
    });

    it('should throw ValidationError for array instead of object', async () => {
      await expect(EntityUtils.parse(TestUser, [] as any)).rejects.toThrow(
        ValidationError,
      );
    });

    it('should throw ValidationError for null input', async () => {
      await expect(EntityUtils.parse(TestUser, null as any)).rejects.toThrow(
        ValidationError,
      );
    });

    it('should throw ValidationError for undefined input', async () => {
      await expect(
        EntityUtils.parse(TestUser, undefined as any),
      ).rejects.toThrow(ValidationError);
    });

    it('should throw ValidationError for primitive input', async () => {
      await expect(
        EntityUtils.parse(TestUser, 'string' as any),
      ).rejects.toThrow(ValidationError);
    });
  });

  describe('Type Coercion Prevention', () => {
    it('should not coerce string to number', async () => {
      await expect(
        EntityUtils.parse(TestUser, {
          name: 'John',
          age: '30' as any, // string "30" should not become number 30
          active: true,
        }),
      ).rejects.toThrow(ValidationError);
    });

    it('should not coerce number to string', async () => {
      await expect(
        EntityUtils.parse(TestUser, {
          name: 123 as any, // number should not become string
          age: 30,
          active: true,
        }),
      ).rejects.toThrow(ValidationError);
    });

    it('should not coerce 0 to false', async () => {
      await expect(
        EntityUtils.parse(TestUser, {
          name: 'John',
          age: 30,
          active: 0 as any, // 0 should not become false
        }),
      ).rejects.toThrow(ValidationError);
    });

    it('should not coerce 1 to true', async () => {
      await expect(
        EntityUtils.parse(TestUser, {
          name: 'John',
          age: 30,
          active: 1 as any, // 1 should not become true
        }),
      ).rejects.toThrow(ValidationError);
    });

    it('should not coerce empty string to false', async () => {
      await expect(
        EntityUtils.parse(TestUser, {
          name: 'John',
          age: 30,
          active: '' as any, // empty string should not become false
        }),
      ).rejects.toThrow(ValidationError);
    });
  });

  describe('Null vs Undefined', () => {
    it('should handle null on optional properties', async () => {
      const entity = await EntityUtils.parse(OptionalFieldsEntity, {
        requiredField: 'test',
        optionalField: null,
        requiredBoolean: true,
      });

      expect(entity.optionalField).toBeNull();
    });

    it('should handle undefined on optional properties', async () => {
      const entity = await EntityUtils.parse(OptionalFieldsEntity, {
        requiredField: 'test',
        optionalField: undefined,
        requiredBoolean: true,
      });

      expect(entity.optionalField).toBeUndefined();
    });

    it('should handle missing optional properties', async () => {
      const entity = await EntityUtils.parse(OptionalFieldsEntity, {
        requiredField: 'test',
        requiredBoolean: true,
      });

      expect(entity.optionalField).toBeUndefined();
    });

    it('should serialize null differently from undefined', async () => {
      const entity1 = await EntityUtils.parse(OptionalFieldsEntity, {
        requiredField: 'test',
        optionalField: null,
        requiredBoolean: true,
      });

      const entity2 = await EntityUtils.parse(OptionalFieldsEntity, {
        requiredField: 'test',
        optionalField: undefined,
        requiredBoolean: true,
      });

      const json1 = EntityUtils.toJSON(entity1);
      const json2 = EntityUtils.toJSON(entity2);

      // null should be included, undefined should be excluded
      expect(json1).toHaveProperty('optionalField', null);
      expect(json2).not.toHaveProperty('optionalField');
    });
  });

  describe('Empty Arrays and Objects', () => {
    it('should handle empty arrays', async () => {
      const entity = await EntityUtils.parse(EntityWithArrays, {
        tags: [],
        ratings: [1], // min length 1
        sparseArray: [],
        users: [],
      });

      expect(entity.tags).toEqual([]);
      expect(entity.sparseArray).toEqual([]);
      expect(entity.users).toEqual([]);
    });

    it('should serialize empty arrays', async () => {
      const entity = await EntityUtils.parse(EntityWithArrays, {
        tags: [],
        ratings: [1], // min length 1
        sparseArray: [],
        users: [],
      });

      const json = EntityUtils.toJSON(entity);

      expect(json).toHaveProperty('tags', []);
      expect(json).toHaveProperty('sparseArray', []);
      expect(json).toHaveProperty('users', []);
    });

    it('should handle empty nested entity', async () => {
      @Entity()
      class EmptyEntity {
        // eslint-disable-next-line @typescript-eslint/no-empty-function
        constructor() {}
      }

      @Entity()
      class ContainerEntity {
        @EntityProperty(() => EmptyEntity)
        empty!: EmptyEntity;

        constructor(data: { empty: EmptyEntity }) {
          this.empty = data.empty;
        }
      }

      const entity = await EntityUtils.parse(ContainerEntity, {
        empty: {},
      });

      expect(entity.empty).toBeInstanceOf(EmptyEntity);
    });
  });

  describe('Deeply Nested Structures', () => {
    it('should handle 3 levels of nesting', async () => {
      const input = {
        name: 'John Doe',
        email: 'john@example.com',
        company: {
          name: 'TechCorp',
          address: {
            street: '123 Main St',
            city: 'Boston',
            country: 'USA',
            zipCode: 2101,
          },
          employeeCount: 50,
        },
        salary: 75000,
        hireDate: new Date('2023-01-15'),
      };

      const employee = await EntityUtils.parse(TestEmployee, input);

      expect(employee.name).toBe('John Doe');
      expect(employee.email).toBe('john@example.com');
      expect(employee.company.name).toBe('TechCorp');
      expect(employee.company.address.city).toBe('Boston');
      expect(employee.company.address.zipCode).toBe(2101);
      expect(employee.salary).toBe(75000);
    });

    it('should serialize 3 levels of nesting', async () => {
      const input = {
        name: 'John Doe',
        email: 'john@example.com',
        company: {
          name: 'TechCorp',
          address: {
            street: '123 Main St',
            city: 'Boston',
            country: 'USA',
            zipCode: 2101,
          },
          employeeCount: 50,
        },
        salary: 75000,
        hireDate: '2023-01-15T00:00:00.000Z',
      };

      const employee = await EntityUtils.parse(TestEmployee, input);
      const json = EntityUtils.toJSON(employee);

      expect(json).toHaveProperty('name', 'John Doe');
      expect(json).toHaveProperty('email', 'john@example.com');
      expect((json as any).company.name).toBe('TechCorp');
      expect((json as any).company.address.city).toBe('Boston');
    });

    it('should handle equality for deeply nested entities', async () => {
      const input1 = {
        name: 'John Doe',
        email: 'john@example.com',
        company: {
          name: 'TechCorp',
          address: {
            street: '123 Main St',
            city: 'Boston',
            country: 'USA',
            zipCode: 2101,
          },
          employeeCount: 50,
        },
        salary: 75000,
        hireDate: new Date('2023-01-15'),
      };

      const input2 = {
        name: 'John Doe',
        email: 'john@example.com',
        company: {
          name: 'TechCorp',
          address: {
            street: '123 Main St',
            city: 'Boston',
            country: 'USA',
            zipCode: 2101,
          },
          employeeCount: 50,
        },
        salary: 75000,
        hireDate: new Date('2023-01-15'),
      };

      const employee1 = await EntityUtils.parse(TestEmployee, input1);
      const employee2 = await EntityUtils.parse(TestEmployee, input2);

      expect(EntityUtils.equals(employee1, employee2)).toBe(true);
    });
  });

  describe('Large Arrays', () => {
    it('should handle arrays with 1000 elements', async () => {
      const largeArray = Array.from({ length: 1000 }, (_, i) => `tag-${i}`);

      const entity = await EntityUtils.parse(EntityWithArrays, {
        tags: largeArray,
        ratings: [1, 2, 3], // min 1, max 5
        sparseArray: Array.from({ length: 1000 }, (_, i) => `sparse-${i}`),
        users: [],
      });

      expect(entity.tags).toHaveLength(1000);
      expect(entity.sparseArray).toHaveLength(1000);
      expect(entity.tags[999]).toBe('tag-999');
      expect(entity.sparseArray[999]).toBe('sparse-999');
    });

    it('should serialize large arrays efficiently', async () => {
      const largeArray = Array.from({ length: 1000 }, (_, i) => `tag-${i}`);

      const entity = await EntityUtils.parse(EntityWithArrays, {
        tags: largeArray,
        ratings: [1, 2, 3],
        sparseArray: Array.from({ length: 1000 }, (_, i) => `sparse-${i}`),
        users: [],
      });

      const json = EntityUtils.toJSON(entity);

      expect((json as any).tags).toHaveLength(1000);
      expect((json as any).sparseArray).toHaveLength(1000);
    });
  });

  describe('Extra Properties in Input', () => {
    it('should ignore extra properties during parse', async () => {
      const entity = await EntityUtils.parse(TestUser, {
        name: 'John',
        age: 30,
        active: true,
        extraField: 'should be ignored',
        anotherExtra: 123,
      } as any);

      expect(entity).toBeInstanceOf(TestUser);
      expect(entity.name).toBe('John');
      expect((entity as any).extraField).toBeUndefined();
      expect((entity as any).anotherExtra).toBeUndefined();
    });

    it('should ignore extra nested properties', async () => {
      const entity = await EntityUtils.parse(TestCompany, {
        name: 'TechCorp',
        address: {
          street: '123 Main St',
          city: 'Boston',
          country: 'USA',
          zipCode: 2101,
          extraNested: 'ignored',
        },
        employeeCount: 50,
        extraTop: 'also ignored',
      } as any);

      expect(entity.name).toBe('TechCorp');
      expect((entity as any).extraTop).toBeUndefined();
      expect((entity.address as any).extraNested).toBeUndefined();
    });
  });

  describe('Circular Reference Prevention', () => {
    it('should not create circular references in constructor', () => {
      @Entity()
      class SelfReferencing {
        @StringProperty()
        name!: string;

        @EntityProperty(() => SelfReferencing, { optional: true })
        parent?: SelfReferencing;

        constructor(data: { name: string; parent?: SelfReferencing }) {
          this.name = data.name;
          this.parent = data.parent;
        }
      }

      const child = new SelfReferencing({ name: 'child' });
      const parent = new SelfReferencing({ name: 'parent', parent: child });

      expect(parent.name).toBe('parent');
      expect(parent.parent).toBe(child);
      expect(child.parent).toBeUndefined();
    });

    it('should handle self-referencing during parse', async () => {
      @Entity()
      class TreeNode {
        @StringProperty()
        value!: string;

        @EntityProperty(() => TreeNode, { optional: true })
        left?: TreeNode;

        @EntityProperty(() => TreeNode, { optional: true })
        right?: TreeNode;

        constructor(data: {
          value: string;
          left?: TreeNode;
          right?: TreeNode;
        }) {
          this.value = data.value;
          this.left = data.left;
          this.right = data.right;
        }
      }

      const tree = await EntityUtils.parse(TreeNode, {
        value: 'root',
        left: {
          value: 'left-child',
        },
        right: {
          value: 'right-child',
          left: {
            value: 'right-left-grandchild',
          },
        },
      });

      expect(tree.value).toBe('root');
      expect(tree.left?.value).toBe('left-child');
      expect(tree.right?.value).toBe('right-child');
      expect(tree.right?.left?.value).toBe('right-left-grandchild');
    });
  });

  describe('Validation Edge Cases', () => {
    it('should handle validation with empty strings', async () => {
      const entity = await EntityUtils.parse(ValidatedEntity, {
        username: '', // too short (min 3)
        email: 'test@example.com',
        age: 25,
      });

      const problems = EntityUtils.getProblems(entity);
      expect(problems.length).toBeGreaterThan(0);
      expect(problems.some((p) => p.property === 'username')).toBe(true);
    });

    it('should handle validation with boundary values', async () => {
      const entity = await EntityUtils.parse(ValidatedEntity, {
        username: 'abc', // exactly min length (3)
        email: 'test@example.com',
        age: 0, // exactly min (0)
      });

      const problems = EntityUtils.getProblems(entity);
      expect(problems).toHaveLength(0);
    });

    it('should handle validation with max boundary values', async () => {
      const entity = await EntityUtils.parse(ValidatedEntity, {
        username: '12345678901234567890', // exactly max length (20)
        email: 'test@example.com',
        age: 150, // exactly max (150)
      });

      const problems = EntityUtils.getProblems(entity);
      expect(problems).toHaveLength(0);
    });

    it('should handle validation exceeding max values', async () => {
      const entity = await EntityUtils.parse(ValidatedEntity, {
        username: '123456789012345678901', // exceeds max length (21)
        email: 'test@example.com',
        age: 151, // exceeds max (151)
      });

      const problems = EntityUtils.getProblems(entity);
      expect(problems.length).toBeGreaterThan(0);
      expect(problems.some((p) => p.property === 'username')).toBe(true);
      expect(problems.some((p) => p.property === 'age')).toBe(true);
    });
  });

  describe('Concurrent Operations', () => {
    it('should handle multiple parse operations concurrently', async () => {
      const promises = Array.from({ length: 10 }, (_, i) =>
        EntityUtils.parse(TestUser, {
          name: `User${i}`,
          age: 20 + i,
          active: i % 2 === 0,
        }),
      );

      const results = await Promise.all(promises);

      expect(results).toHaveLength(10);
      results.forEach((user, i) => {
        expect(user.name).toBe(`User${i}`);
        expect(user.age).toBe(20 + i);
        expect(user.active).toBe(i % 2 === 0);
      });
    });

    it('should handle multiple update operations concurrently', async () => {
      const user = await EntityUtils.parse(TestUser, {
        name: 'John',
        age: 30,
        active: true,
      });

      const promises = Array.from({ length: 10 }, (_, i) =>
        EntityUtils.update(user, { age: 30 + i }),
      );

      const results = await Promise.all(promises);

      expect(results).toHaveLength(10);
      results.forEach((updated, i) => {
        expect(updated.age).toBe(30 + i);
        expect(updated.name).toBe('John');
      });
    });
  });

  describe('Error Message Quality', () => {
    it('should provide clear error messages for type mismatches', async () => {
      try {
        await EntityUtils.parse(TestUser, {
          name: 123,
          age: 30,
          active: true,
        } as any);
        expect.fail('Should have thrown ValidationError');
      } catch (error) {
        expect(error).toBeInstanceOf(ValidationError);
        expect((error as ValidationError).message).toContain('name');
      }
    });

    it('should provide clear error messages for missing required fields', async () => {
      try {
        await EntityUtils.parse(TestUser, {
          name: 'John',
          age: 30,
        } as any);
        expect.fail('Should have thrown ValidationError');
      } catch (error) {
        expect(error).toBeInstanceOf(ValidationError);
        const message = (error as ValidationError).message;
        expect(message).toContain('active');
      }
    });

    it('should provide clear error messages for nested validation failures', async () => {
      try {
        await EntityUtils.parse(TestCompany, {
          name: 'TechCorp',
          address: {
            street: '123 Main St',
            city: 'Boston',
            country: 'USA',
            zipCode: 'invalid', // should be number
          },
          employeeCount: 50,
        } as any);
        expect.fail('Should have thrown ValidationError');
      } catch (error) {
        expect(error).toBeInstanceOf(ValidationError);
        const message = (error as ValidationError).message;
        expect(message).toContain('address');
        expect(message).toContain('zipCode');
      }
    });
  });
});
