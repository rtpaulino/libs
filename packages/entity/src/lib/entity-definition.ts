/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  ENTITY_METADATA_KEY,
  ENTITY_OPTIONS_METADATA_KEY,
  ENTITY_VALIDATOR_METADATA_KEY,
  PROPERTY_METADATA_KEY,
  PROPERTY_OPTIONS_METADATA_KEY,
  PropertyOptions,
  type AnyCtor,
} from './types.js';
import { EntityOptions } from './entity.js';
import { EntityRegistry } from './entity-registry.js';
import { EntityUtils } from './entity-utils.js';
import { Problem } from './problem.js';
import {
  stringPropertyOptions,
  enumPropertyOptions,
  numberPropertyOptions,
  intPropertyOptions,
  booleanPropertyOptions,
  datePropertyOptions,
  bigIntPropertyOptions,
  entityPropertyOptions,
  arrayPropertyOptions,
  passthroughPropertyOptions,
  discriminatedEntityPropertyOptions,
} from './property.js';
import { zodPropertyOptions } from './zod-property.js';

/**
 * Configuration for defining an entity schema
 */
export interface EntitySchemaConfig<T = any> {
  /**
   * Name for the entity (required for schema-based entities)
   */
  name: string;
  /**
   * Entity options (collection, stringifiable, etc.)
   */
  options?: Omit<EntityOptions, 'name'>;
  /**
   * Property definitions - key is property name, value is property options
   */
  properties: Record<string, PropertyOptions>;
  /**
   * Validator functions that will be attached to the entity class
   * Each function receives the entity instance and returns problems
   */
  validators?: Array<(instance: T) => Problem[] | Promise<Problem[]>>;
  /**
   * Whether to register this entity in the EntityRegistry.
   * For dynamic schemas, defaults to false to prevent memory leaks.
   * Set to true if you need discriminated entity deserialization.
   */
  register?: boolean;
}

/**
 * Wrapper object returned by EntitySchema.define() with EntityUtils methods
 */
export interface EntitySchemaWrapper<T> {
  /**
   * The generated entity class
   */
  readonly entityClass: AnyCtor<T>;

  /**
   * Parse data into an entity instance
   */
  parse(data: unknown): Promise<T>;

  /**
   * Parse data into an entity instance without throwing
   */
  safeParse(
    data: unknown,
  ): Promise<
    | { success: true; data: T; problems: Problem[] }
    | { success: false; data: undefined; problems: Problem[] }
  >;

  /**
   * Parse only present properties without throwing
   */
  parsePartial(data: unknown): Promise<Partial<T>>;

  /**
   * Parse only present properties without throwing
   */
  safeParsePartial(
    data: unknown,
  ): Promise<
    | { success: true; data: Partial<T>; problems: Problem[] }
    | { success: false; data: undefined; problems: Problem[] }
  >;

  /**
   * Serialize entity instance to plain object
   */
  serialize(instance: T): unknown;

  /**
   * Update entity instance with new data
   */
  update(instance: T, data: unknown): Promise<T>;

  /**
   * Update entity instance with new data without throwing
   */
  safeUpdate(
    instance: T,
    data: unknown,
  ): Promise<
    | { success: true; data: T; problems: Problem[] }
    | { success: false; data: T; problems: Problem[] }
  >;

  /**
   * Validate entity instance
   */
  validate(instance: T): Promise<Problem[]>;

  /**
   * Check if two instances are equal
   */
  equals(a: T, b: T): boolean;

  /**
   * Get differences between two instances
   */
  diff(a: T, b: T): Record<string, { from: unknown; to: unknown }>;

  /**
   * Get changed values as partial object
   */
  getChanges(a: T, b: T): Partial<T>;
}

/**
 * Define entity metadata on an existing class programmatically
 * This sets the same metadata that @Entity() and @Property() decorators would set
 *
 * @param entityClass - The class to define as an entity
 * @param config - Configuration with properties, options, and validators
 * @internal
 */
function defineEntity<T>(
  entityClass: AnyCtor<T>,
  config: EntitySchemaConfig<T>,
): void {
  const entityName = config.name;

  // 1. Mark as entity
  Reflect.defineMetadata(ENTITY_METADATA_KEY, true, entityClass);

  // 2. Set entity options with resolved name
  const entityOptions: EntityOptions = {
    ...config.options,
    name: entityName,
  };
  Reflect.defineMetadata(
    ENTITY_OPTIONS_METADATA_KEY,
    entityOptions,
    entityClass,
  );

  // 3. Register in EntityRegistry if enabled
  if (config.register) {
    EntityRegistry.register(entityName, entityClass);
  }

  // 4. Set property keys
  const propertyKeys = Object.keys(config.properties);
  Reflect.defineMetadata(
    PROPERTY_METADATA_KEY,
    propertyKeys,
    entityClass.prototype,
  );

  // 5. Set property options
  Reflect.defineMetadata(
    PROPERTY_OPTIONS_METADATA_KEY,
    config.properties,
    entityClass.prototype,
  );

  // 6. Set up validators if provided
  if (config.validators && config.validators.length > 0) {
    const validatorMethodNames: string[] = [];

    config.validators.forEach((validatorFn, index) => {
      const methodName = `__dynamicValidator${index}`;
      validatorMethodNames.push(methodName);

      // Attach validator as instance method that uses 'this'
      (entityClass.prototype as any)[methodName] = function ():
        | Problem[]
        | Promise<Problem[]> {
        return validatorFn(this);
      };
    });

    Reflect.defineMetadata(
      ENTITY_VALIDATOR_METADATA_KEY,
      validatorMethodNames,
      entityClass.prototype,
    );
  }
}

/**
 * Factory for creating schema-based entities without pre-defining a class
 */
export class EntitySchema {
  /**
   * Define a new entity schema and return a wrapper with EntityUtils methods
   *
   * @param config - Schema configuration with name, properties, options, and validators
   * @returns Wrapper object with parse, serialize, validate, etc. methods
   *
   * @example
   * ```typescript
   * const UserSchema = EntitySchema.define({
   *   name: 'User',
   *   properties: {
   *     name: { type: () => String },
   *     age: { type: () => Number, optional: true },
   *     tags: { type: () => String, array: true },
   *   },
   *   validators: [
   *     (user) => user.name.length < 2 ? [{ path: 'name', message: 'Too short' }] : []
   *   ]
   * });
   *
   * const user = await UserSchema.parse({ name: 'John', age: 30, tags: ['admin'] });
   * const serialized = UserSchema.serialize(user);
   * const isValid = (await UserSchema.validate(user)).length === 0;
   * ```
   */
  static define<T extends object = any>(
    config: EntitySchemaConfig<T>,
  ): EntitySchemaWrapper<T> {
    // Generate anonymous entity class
    const entityClass = class {
      constructor(data: any) {
        Object.assign(this, data);
      }
    } as unknown as AnyCtor<T>;

    // Define entity metadata
    defineEntity(entityClass, {
      name: config.name,
      options: config.options,
      properties: config.properties,
      validators: config.validators,
      register: config.register ?? false, // Default to false for dynamic schemas to prevent memory leaks
    });

    // Create wrapper with EntityUtils methods
    const wrapper: EntitySchemaWrapper<T> = {
      entityClass,

      async parse(data: unknown): Promise<T> {
        return EntityUtils.parse(entityClass as any, data) as Promise<T>;
      },

      async safeParse(data: unknown) {
        return EntityUtils.safeParse(entityClass as any, data) as Promise<
          | { success: true; data: T; problems: Problem[] }
          | { success: false; data: undefined; problems: Problem[] }
        >;
      },

      async parsePartial(data: unknown): Promise<Partial<T>> {
        return EntityUtils.partialParse(entityClass as any, data) as Promise<
          Partial<T>
        >;
      },

      async safeParsePartial(data: unknown) {
        return EntityUtils.safePartialParse(
          entityClass as any,
          data,
        ) as unknown as Promise<
          | { success: true; data: Partial<T>; problems: Problem[] }
          | { success: false; data: undefined; problems: Problem[] }
        >;
      },

      serialize(instance: T): unknown {
        return EntityUtils.toJSON(instance as any);
      },

      async update(instance: T, data: unknown): Promise<T> {
        return EntityUtils.update(instance as any, data as any) as Promise<T>;
      },

      async safeUpdate(instance: T, data: unknown) {
        return EntityUtils.safeUpdate(instance as any, data as any) as Promise<
          | { success: true; data: T; problems: Problem[] }
          | { success: false; data: T; problems: Problem[] }
        >;
      },

      async validate(instance: T): Promise<Problem[]> {
        return EntityUtils.validate(instance as any);
      },

      equals(a: T, b: T): boolean {
        return EntityUtils.equals(a as any, b as any);
      },

      diff(a: T, b: T): Record<string, { from: unknown; to: unknown }> {
        const diffs = EntityUtils.diff(a as any, b as any);
        const result: Record<string, { from: unknown; to: unknown }> = {};
        for (const diff of diffs) {
          result[diff.property] = { from: diff.oldValue, to: diff.newValue };
        }
        return result;
      },

      getChanges(a: T, b: T): Partial<T> {
        return EntityUtils.changes(a as any, b as any) as Partial<T>;
      },
    };

    return wrapper;
  }
}

/**
 * Property definition helpers for EntitySchema
 * These mirror the decorator-based property helpers but return PropertyOptions objects
 */
export const EntityProps = {
  /**
   * String property with optional validation
   * @example
   * EntitySchema.define({
   *   name: 'User',
   *   properties: {
   *     name: EntityProps.String({ minLength: 2, maxLength: 50 }),
   *     email: EntityProps.String({ pattern: /^.+@.+\..+$/ }),
   *   }
   * })
   */
  String: stringPropertyOptions,

  /**
   * Enum property (validates string against enum values)
   * @example
   * enum Status { Active = 'active', Inactive = 'inactive' }
   * EntitySchema.define({
   *   name: 'User',
   *   properties: {
   *     status: EntityProps.Enum(Status),
   *   }
   * })
   */
  Enum: enumPropertyOptions,

  /**
   * Number property with optional min/max validation
   * @example
   * EntitySchema.define({
   *   name: 'User',
   *   properties: {
   *     age: EntityProps.Number({ min: 0, max: 150 }),
   *     score: EntityProps.Number({ optional: true }),
   *   }
   * })
   */
  Number: numberPropertyOptions,

  /**
   * Integer property (number that must be an integer)
   * @example
   * EntitySchema.define({
   *   name: 'User',
   *   properties: {
   *     age: EntityProps.Int({ min: 0 }),
   *   }
   * })
   */
  Int: intPropertyOptions,

  /**
   * Boolean property
   * @example
   * EntitySchema.define({
   *   name: 'User',
   *   properties: {
   *     isActive: EntityProps.Boolean(),
   *     emailVerified: EntityProps.Boolean({ optional: true }),
   *   }
   * })
   */
  Boolean: booleanPropertyOptions,

  /**
   * Date property
   * @example
   * EntitySchema.define({
   *   name: 'Event',
   *   properties: {
   *     createdAt: EntityProps.Date(),
   *     scheduledFor: EntityProps.Date({ optional: true }),
   *   }
   * })
   */
  Date: datePropertyOptions,

  /**
   * BigInt property
   * @example
   * EntitySchema.define({
   *   name: 'Transaction',
   *   properties: {
   *     amount: EntityProps.BigInt(),
   *   }
   * })
   */
  BigInt: bigIntPropertyOptions,

  /**
   * Entity property (nested entity)
   * @example
   * const AddressSchema = EntitySchema.define({ ... });
   * EntitySchema.define({
   *   name: 'User',
   *   properties: {
   *     address: EntityProps.Entity(() => AddressSchema.entityClass),
   *   }
   * })
   */
  Entity: entityPropertyOptions,

  /**
   * Array property
   * @example
   * EntitySchema.define({
   *   name: 'User',
   *   properties: {
   *     tags: EntityProps.Array(() => String),
   *     addresses: EntityProps.Array(() => AddressSchema.entityClass),
   *   }
   * })
   */
  Array: arrayPropertyOptions,

  /**
   * Passthrough property (no deserialization/validation)
   * @example
   * EntitySchema.define({
   *   name: 'Config',
   *   properties: {
   *     metadata: EntityProps.Passthrough(),
   *   }
   * })
   */
  Passthrough: passthroughPropertyOptions,

  /**
   * Zod schema property (validates using Zod schema)
   * @example
   * import { z } from 'zod';
   * EntitySchema.define({
   *   name: 'User',
   *   properties: {
   *     data: EntityProps.Zod(z.object({
   *       name: z.string().min(3),
   *       age: z.number().int().min(0)
   *     })),
   *   }
   * })
   */
  Zod: zodPropertyOptions,

  /**
   * Discriminated entity property (for polymorphic entities with discriminator)
   * @example
   * EntitySchema.define({
   *   name: 'Shape',
   *   properties: {
   *     shape: EntityProps.DiscriminatedEntity({ discriminatorProperty: 'type' }),
   *   }
   * })
   */
  DiscriminatedEntity: discriminatedEntityPropertyOptions,
};
