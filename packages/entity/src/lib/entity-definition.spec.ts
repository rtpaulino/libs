/* eslint-disable @typescript-eslint/no-unsafe-function-type */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, expect, it, beforeEach } from 'vitest';
import { EntitySchema } from './entity-definition.js';
import { EntityUtils } from './entity-utils.js';
import { EntityRegistry } from './entity-registry.js';
import { Problem } from './problem.js';

describe('EntitySchema.define', () => {
  beforeEach(() => {
    // Clean up registry between tests
    const registry = (EntityRegistry as any).registry as Map<string, Function>;
    registry.clear();
  });

  it('should define entity metadata on a class', async () => {
    const UserSchema = EntitySchema.define({
      name: 'User',
      properties: {
        name: { type: () => String },
        age: { type: () => Number, optional: true },
      },
    });

    const User = UserSchema.entityClass;

    // Test that entity is properly defined
    expect(EntityUtils.isEntity(User)).toBe(true);
    expect(EntityUtils.getEntityName(User)).toBe('User');
    expect(EntityUtils.getPropertyKeys(User.prototype)).toEqual([
      'name',
      'age',
    ]);

    // Test parsing
    const user = (await EntityUtils.parse(User as any, {
      name: 'John',
      age: 30,
    })) as any;
    expect(user).toBeInstanceOf(User);
    expect(user.name).toBe('John');
    expect(user.age).toBe(30);
  });

  it('should support custom entity name', () => {
    const UserSchema = EntitySchema.define({
      name: 'CustomUser',
      properties: {
        name: { type: () => String },
      },
    });

    const User = UserSchema.entityClass;

    expect(EntityUtils.getEntityName(User)).toBe('CustomUser');
    expect(EntityRegistry.has('CustomUser')).toBe(true);
  });

  it('should support entity options', () => {
    const TagsSchema = EntitySchema.define({
      name: 'Tags',
      options: {
        collection: true,
        wrapperProperty: 'collection',
      },
      properties: {
        collection: { type: () => String, array: true },
      },
    });

    const Tags = TagsSchema.entityClass;

    expect(EntityUtils.isCollectionEntity(Tags)).toBe(true);
  });

  it('should support validators', async () => {
    const UserSchema = EntitySchema.define({
      name: 'User',
      properties: {
        name: { type: () => String },
      },
      validators: [
        (instance: any): Problem[] => {
          if (!instance || typeof instance.name !== 'string') {
            return [];
          }
          return instance.name.length < 2
            ? [
                {
                  property: 'name',
                  message: 'Name must be at least 2 characters',
                },
              ]
            : [];
        },
      ],
    });

    const User = UserSchema.entityClass;

    // Test that validators are attached to entity
    const validUser = new (User as any)({ name: 'John' });
    const validProblems = await EntityUtils.validate(validUser);
    expect(validProblems).toHaveLength(0);

    // Test that validators catch issues
    const invalidUser = new (User as any)({ name: 'J' });
    const invalidProblems = await EntityUtils.validate(invalidUser);
    expect(invalidProblems).toHaveLength(1);
    expect(invalidProblems[0].message).toBe(
      'Name must be at least 2 characters',
    );
  });

  it('should support complex property options', async () => {
    const UserSchema = EntitySchema.define({
      name: 'User',
      properties: {
        name: {
          type: () => String,
          validators: [
            (data) =>
              data.value.length === 0
                ? [{ property: 'name', message: 'Name required' }]
                : [],
          ],
        },
        age: {
          type: () => Number,
          validators: [
            (data) =>
              data.value < 0
                ? [{ property: 'age', message: 'Age must be positive' }]
                : [],
          ],
        },
        tags: {
          type: () => String,
          array: true,
          arrayValidators: [
            (data) =>
              data.value.length > 10
                ? [{ property: 'tags', message: 'Too many tags' }]
                : [],
          ],
        },
        metadata: {
          type: () => Object,
          optional: true,
          passthrough: true,
        },
      },
    });

    const User = UserSchema.entityClass;

    // Test valid case
    const user = (await EntityUtils.parse(User as any, {
      name: 'John',
      age: 30,
      tags: ['admin', 'user'],
      metadata: { role: 'admin' },
    })) as any;

    expect(user.name).toBe('John');
    expect(user.age).toBe(30);
    expect(user.tags).toEqual(['admin', 'user']);
    expect(user.metadata).toEqual({ role: 'admin' });

    // Test validation
    const problems = await EntityUtils.validate(user);
    expect(problems).toHaveLength(0);
  });

  it('should support nested entities', async () => {
    // Define Address entity first
    const AddressSchema = EntitySchema.define({
      name: 'Address',
      properties: {
        street: { type: () => String },
        city: { type: () => String },
      },
    });

    const Address = AddressSchema.entityClass;

    // Define User entity with nested Address
    const UserSchema = EntitySchema.define({
      name: 'User',
      properties: {
        name: { type: () => String },
        address: { type: () => Address },
      },
    });

    const User = UserSchema.entityClass;

    const user = (await EntityUtils.parse(User as any, {
      name: 'John',
      address: {
        street: '123 Main St',
        city: 'Springfield',
      },
    })) as any;

    expect(user.name).toBe('John');
    expect(user.address).toBeInstanceOf(Address);
    expect(user.address.street).toBe('123 Main St');
    expect(user.address.city).toBe('Springfield');
  });
});

describe('EntitySchema', () => {
  beforeEach(() => {
    // Clean up registry between tests
    const registry = (EntityRegistry as any).registry as Map<string, Function>;
    registry.clear();
  });

  it('should create schema wrapper with all methods', async () => {
    const UserSchema = EntitySchema.define({
      name: 'User',
      properties: {
        name: { type: () => String },
        age: { type: () => Number, optional: true },
      },
    });

    // Test entityClass property
    expect(UserSchema.entityClass).toBeDefined();
    expect(typeof UserSchema.entityClass).toBe('function');

    // Test parse
    const user = await UserSchema.parse({ name: 'John', age: 30 });
    expect(user.name).toBe('John');
    expect(user.age).toBe(30);

    // Test serialize
    const serialized = UserSchema.serialize(user);
    expect(serialized).toEqual({ name: 'John', age: 30 });

    // Test validation
    const problems = await UserSchema.validate(user);
    expect(problems).toHaveLength(0);
  });

  it('should support safeParse', async () => {
    const UserSchema = EntitySchema.define({
      name: 'User',
      properties: {
        name: { type: () => String },
        age: { type: () => Number },
      },
    });

    // Valid case
    const validResult = await UserSchema.safeParse({ name: 'John', age: 30 });
    expect(validResult.success).toBe(true);
    if (validResult.success) {
      expect(validResult.data.name).toBe('John');
      expect(validResult.data.age).toBe(30);
    }

    // Invalid case (missing required field)
    const invalidResult = await UserSchema.safeParse({ name: 'John' });
    expect(invalidResult.success).toBe(false);
    expect(invalidResult.problems.length).toBeGreaterThan(0);
  });

  it('should support parsePartial', async () => {
    const UserSchema = EntitySchema.define({
      name: 'User',
      properties: {
        name: { type: () => String },
        age: { type: () => Number },
        email: { type: () => String, optional: true },
      },
    });

    const partial = await UserSchema.parsePartial({ name: 'John' });
    expect(partial.name).toBe('John');
    expect(partial.age).toBeUndefined();
    expect(partial.email).toBeUndefined();
  });

  it('should support safeParsePartial', async () => {
    const UserSchema = EntitySchema.define({
      name: 'User',
      properties: {
        name: { type: () => String },
        age: { type: () => Number },
      },
    });

    const result = await UserSchema.safeParsePartial({
      name: 'John',
      invalid: 'value',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.name).toBe('John');
      expect((result.data as any).invalid).toBeUndefined();
    }
  });

  it('should support update operations', async () => {
    const UserSchema = EntitySchema.define({
      name: 'User',
      properties: {
        name: { type: () => String },
        age: { type: () => Number },
      },
    });

    const user = await UserSchema.parse({ name: 'John', age: 30 });
    const updatedUser = await UserSchema.update(user, { age: 31 });

    expect(updatedUser.name).toBe('John');
    expect(updatedUser.age).toBe(31);
  });

  it('should support safeUpdate operations', async () => {
    const UserSchema = EntitySchema.define({
      name: 'User',
      properties: {
        name: { type: () => String },
        age: { type: () => Number },
      },
    });

    const user = await UserSchema.parse({ name: 'John', age: 30 });
    const result = await UserSchema.safeUpdate(user, { age: 31 });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.name).toBe('John');
      expect(result.data.age).toBe(31);
    }
  });

  it('should support equality and diff operations', async () => {
    const UserSchema = EntitySchema.define({
      name: 'User',
      properties: {
        name: { type: () => String },
        age: { type: () => Number },
      },
    });

    const user1 = await UserSchema.parse({ name: 'John', age: 30 });
    const user2 = await UserSchema.parse({ name: 'John', age: 30 });
    const user3 = await UserSchema.parse({ name: 'John', age: 31 });

    // Test equals
    expect(UserSchema.equals(user1, user2)).toBe(true);
    expect(UserSchema.equals(user1, user3)).toBe(false);

    // Test diff
    const diff = UserSchema.diff(user1, user3);
    expect(diff).toEqual({
      age: { from: 30, to: 31 },
    });

    // Test getChanges
    const changes = UserSchema.getChanges(user1, user3);
    expect(changes).toEqual({ age: 31 });
  });

  it('should support validators in schema', async () => {
    const UserSchema = EntitySchema.define({
      name: 'User',
      properties: {
        name: { type: () => String },
        age: { type: () => Number },
      },
      validators: [
        (user: any): Problem[] => {
          if (!user || typeof user.age !== 'number') {
            return [];
          }
          return user.age < 0
            ? [{ property: 'age', message: 'Age must be positive' }]
            : [];
        },
        (user: any): Problem[] => {
          if (!user || typeof user.name !== 'string') {
            return [];
          }
          return user.name.length === 0
            ? [{ property: 'name', message: 'Name is required' }]
            : [];
        },
      ],
    });

    // Test with valid instances - construct directly
    const validUser = new (UserSchema.entityClass as any)({
      name: 'John',
      age: 30,
    });
    const validProblems = await UserSchema.validate(validUser);
    expect(validProblems).toHaveLength(0);

    // Test with invalid instances - construct directly
    const invalidUser = new (UserSchema.entityClass as any)({
      name: '',
      age: -5,
    });
    const invalidProblems = await UserSchema.validate(invalidUser);
    expect(invalidProblems).toHaveLength(2);
    expect(invalidProblems.find((p) => p.property === 'age')?.message).toBe(
      'Age must be positive',
    );
    expect(invalidProblems.find((p) => p.property === 'name')?.message).toBe(
      'Name is required',
    );
  });

  it('should support entity options in schema', async () => {
    const TagsSchema = EntitySchema.define({
      name: 'Tags',
      options: {
        collection: true,
        wrapperProperty: 'collection',
      },
      properties: {
        collection: { type: () => String, array: true },
      },
    });

    // Test that it's recognized as a collection entity
    expect(EntityUtils.isCollectionEntity(TagsSchema.entityClass)).toBe(true);

    // Test parsing array directly (collection entity behavior)
    const tags = await TagsSchema.parse(['admin', 'user', 'moderator']);
    expect(tags.collection).toEqual(['admin', 'user', 'moderator']);

    // Test serialization unwraps to array
    const serialized = TagsSchema.serialize(tags);
    expect(serialized).toEqual(['admin', 'user', 'moderator']);
  });

  it('should support arrays and nested entities', async () => {
    const AddressSchema = EntitySchema.define({
      name: 'Address',
      properties: {
        street: { type: () => String },
        city: { type: () => String },
      },
    });

    const UserSchema = EntitySchema.define({
      name: 'User',
      properties: {
        name: { type: () => String },
        addresses: { type: () => AddressSchema.entityClass, array: true },
        tags: { type: () => String, array: true },
      },
    });

    const user = await UserSchema.parse({
      name: 'John',
      addresses: [
        { street: '123 Main St', city: 'Springfield' },
        { street: '456 Oak Ave', city: 'Shelbyville' },
      ],
      tags: ['admin', 'user'],
    });

    expect(user.name).toBe('John');
    expect(user.addresses).toHaveLength(2);
    expect(user.addresses[0]).toBeInstanceOf(AddressSchema.entityClass);
    expect(user.addresses[0].street).toBe('123 Main St');
    expect(user.addresses[1].city).toBe('Shelbyville');
    expect(user.tags).toEqual(['admin', 'user']);
  });

  it('should work with EntityUtils methods', async () => {
    const UserSchema = EntitySchema.define({
      name: 'SchemaUser',
      properties: {
        name: { type: () => String },
        age: { type: () => Number },
      },
    });

    // Test that EntityUtils methods work directly on the schema class
    const user = (await EntityUtils.parse(UserSchema.entityClass as any, {
      name: 'John',
      age: 30,
    })) as any;
    expect(user.name).toBe('John');
    expect(user.age).toBe(30);

    const serialized = EntityUtils.toJSON(user);
    expect(serialized).toEqual({ name: 'John', age: 30 });

    const isEntity = EntityUtils.isEntity(UserSchema.entityClass);
    expect(isEntity).toBe(true);

    const entityName = EntityUtils.getEntityName(UserSchema.entityClass);
    expect(entityName).toBe('SchemaUser');
  });
});
