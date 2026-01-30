/* eslint-disable @typescript-eslint/no-unsafe-function-type */
/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  ENTITY_METADATA_KEY,
  ENTITY_OPTIONS_METADATA_KEY,
  ENTITY_VALIDATOR_METADATA_KEY,
  ParseOptions,
  PROPERTY_METADATA_KEY,
  PROPERTY_OPTIONS_METADATA_KEY,
  PropertyOptions,
  SafeOperationResult,
} from './types.js';
import type { EntityOptions } from './entity.js';
import {
  getInjectedPropertyNames,
  getInjectedPropertyOptions,
} from './injected-property.js';
import { EntityDI } from './entity-di.js';
import { isEqualWith } from 'lodash-es';
import { ValidationError } from './validation-error.js';
import { Problem } from './problem.js';
import {
  prependPropertyPath,
  prependArrayIndex,
  createValidationError,
  combinePropertyPaths,
} from './validation-utils.js';
import {
  isPrimitiveConstructor,
  deserializePrimitive,
} from './primitive-deserializers.js';
import { ok } from 'assert';

/**
 * WeakMap to store validation problems for entity instances
 */
const problemsStorage = new WeakMap<object, Problem[]>();

/**
 * WeakMap to store raw input data for entity instances
 */
const rawInputStorage = new WeakMap<object, unknown>();

export class EntityUtils {
  /**
   * Checks if a given object is an instance of a class decorated with @Entity()
   * or if the provided value is an entity class itself
   *
   * @param obj - The object or class to check
   * @returns true if the object is an entity instance or entity class, false otherwise
   *
   * @example
   * ```typescript
   * @Entity()
   * class User {
   *   name: string;
   * }
   *
   * const user = new User();
   * console.log(EntityUtils.isEntity(user)); // true
   * console.log(EntityUtils.isEntity(User)); // true
   * console.log(EntityUtils.isEntity({})); // false
   * ```
   */
  static isEntity(obj: unknown): obj is object {
    if (obj == null) {
      return false;
    }

    // Check if obj is a constructor function (class)
    if (typeof obj === 'function') {
      return Reflect.hasMetadata(ENTITY_METADATA_KEY, obj);
    }

    // Check if obj is an object instance
    if (typeof obj !== 'object' || Array.isArray(obj)) {
      return false;
    }

    const constructor = Object.getPrototypeOf(obj).constructor;
    return Reflect.hasMetadata(ENTITY_METADATA_KEY, constructor);
  }

  /**
   * Gets the entity options for a given constructor
   *
   * @param entityOrClass - The entity class constructor or instance
   * @returns EntityOptions object (empty object if no options are defined)
   * @private
   */
  private static getEntityOptions(entityOrClass: unknown): EntityOptions {
    const constructor =
      typeof entityOrClass === 'function'
        ? entityOrClass
        : Object.getPrototypeOf(entityOrClass).constructor;

    const options: EntityOptions | undefined = Reflect.getMetadata(
      ENTITY_OPTIONS_METADATA_KEY,
      constructor,
    );
    return options ?? {};
  }

  /**
   * Checks if a given entity is marked as a collection entity
   *
   * @param entityOrClass - The entity instance or class to check
   * @returns true if the entity is a collection entity, false otherwise
   *
   * @example
   * ```typescript
   * @CollectionEntity()
   * class Tags {
   *   @ArrayProperty(() => String)
   *   collection: string[];
   * }
   *
   * const tags = new Tags({ collection: ['a', 'b'] });
   * console.log(EntityUtils.isCollectionEntity(tags)); // true
   * console.log(EntityUtils.isCollectionEntity(Tags)); // true
   * ```
   */
  static isCollectionEntity(entityOrClass: unknown): boolean {
    if (!this.isEntity(entityOrClass)) {
      return false;
    }

    const options = this.getEntityOptions(entityOrClass);

    return options.collection === true;
  }

  static sameEntity(a: object, b: object): boolean {
    if (!this.isEntity(a) || !this.isEntity(b)) {
      return false;
    }

    return Object.getPrototypeOf(a) === Object.getPrototypeOf(b);
  }

  static getPropertyKeys(target: object): string[] {
    // Determine if we're dealing with a prototype or an instance
    let currentProto: any;

    // Check if target is a prototype by checking if it has a constructor property
    // and if target === target.constructor.prototype
    if (target.constructor && target === target.constructor.prototype) {
      // target is already a prototype
      currentProto = target;
    } else {
      // target is an instance, get its prototype
      currentProto = Object.getPrototypeOf(target);
    }

    const keys: string[] = [];
    const seen = new Set<string>();

    // Walk the prototype chain to collect all inherited properties
    while (currentProto && currentProto !== Object.prototype) {
      // Use getOwnMetadata to only get metadata directly on this prototype
      const protoKeys: string[] =
        Reflect.getOwnMetadata(PROPERTY_METADATA_KEY, currentProto) || [];

      for (const key of protoKeys) {
        if (!seen.has(key)) {
          seen.add(key);
          keys.push(key);
        }
      }

      currentProto = Object.getPrototypeOf(currentProto);
    }

    return keys;
  }

  static getPropertyOptions(
    target: object,
    propertyKey: string,
  ): PropertyOptions | undefined {
    // Determine if we're dealing with a prototype or an instance
    let currentProto: any;

    // Check if target is a prototype by checking if it has a constructor property
    // and if target === target.constructor.prototype
    if (target.constructor && target === target.constructor.prototype) {
      // target is already a prototype
      currentProto = target;
    } else {
      // target is an instance, get its prototype
      currentProto = Object.getPrototypeOf(target);
    }

    // Walk the prototype chain to find the property options
    while (currentProto && currentProto !== Object.prototype) {
      const protoOptions: Record<string, PropertyOptions> =
        Reflect.getOwnMetadata(PROPERTY_OPTIONS_METADATA_KEY, currentProto) ||
        {};

      if (protoOptions[propertyKey]) {
        return protoOptions[propertyKey];
      }

      currentProto = Object.getPrototypeOf(currentProto);
    }

    return undefined;
  }

  static equals(a: unknown, b: unknown): boolean {
    return isEqualWith(a, b, (val1, val2) => {
      if (this.isEntity(val1)) {
        if (!this.sameEntity(val1, val2)) {
          return false;
        }

        const diff = this.diff(val1, val2);

        return diff.length === 0;
      } else if (
        val1 != null &&
        val2 != null &&
        typeof val1 === 'object' &&
        !Array.isArray(val1) &&
        typeof val2 === 'object' &&
        !Array.isArray(val2) &&
        'equals' in val1 &&
        typeof val1.equals === 'function'
      ) {
        return val1.equals(val2);
      }

      return undefined;
    });
  }

  static diff<T extends object>(
    oldEntity: T,
    newEntity: T,
  ): { property: string; oldValue: unknown; newValue: unknown }[] {
    if (!this.sameEntity(oldEntity, newEntity)) {
      throw new Error('Entities must be of the same type to compute diff');
    }

    const diffs: { property: string; oldValue: unknown; newValue: unknown }[] =
      [];

    const keys = this.getPropertyKeys(oldEntity);

    for (const key of keys) {
      const oldValue = (oldEntity as any)[key];
      const newValue = (newEntity as any)[key];

      // Check if there's a custom equals function for this property
      const propertyOptions = this.getPropertyOptions(oldEntity, key);

      let areEqual: boolean;
      if (oldValue == null && newValue == null) {
        areEqual = oldValue === newValue;
      } else if (oldValue == null || newValue == null) {
        areEqual = false;
      } else {
        areEqual = propertyOptions?.equals
          ? propertyOptions.equals(oldValue, newValue)
          : this.equals(oldValue, newValue);
      }

      if (!areEqual) {
        diffs.push({ property: key, oldValue, newValue });
      }
    }

    return diffs;
  }

  static changes<T extends object>(oldEntity: T, newEntity: T): Partial<T> {
    if (!this.sameEntity(oldEntity, newEntity)) {
      throw new Error('Entities must be of the same type to compute changes');
    }

    const diff = this.diff(oldEntity, newEntity);

    return diff.reduce((acc, { property, newValue }) => {
      (acc as any)[property] = newValue;
      return acc;
    }, {} as Partial<T>);
  }

  /**
   * Serializes an entity to a plain object, converting only properties decorated with @Property()
   *
   * @param entity - The entity instance to serialize
   * @returns A plain object containing only the serialized decorated properties, or an array for collection entities
   *
   * @remarks
   * Serialization rules:
   * - Only properties decorated with @Property() are included
   * - If a property has a custom toJSON() method, it will be used
   * - Nested entities are recursively serialized using EntityUtils.toJSON()
   * - Arrays are mapped with toJSON() applied to each element
   * - Date objects are serialized to ISO strings
   * - bigint values are serialized to strings
   * - undefined values are excluded from the output
   * - null values are included in the output
   * - Circular references are not supported (will cause stack overflow)
   * - Collection entities (@CollectionEntity) are unwrapped to just their array
   *
   * @example
   * ```typescript
   * @Entity()
   * class Address {
   *   @Property() street: string;
   *   @Property() city: string;
   * }
   *
   * @Entity()
   * class User {
   *   @Property() name: string;
   *   @Property() address: Address;
   *   @Property() createdAt: Date;
   *   undecorated: string; // Will not be serialized
   * }
   *
   * const user = new User();
   * user.name = 'John';
   * user.address = new Address();
   * user.address.street = '123 Main St';
   * user.address.city = 'Boston';
   * user.createdAt = new Date('2024-01-01');
   * user.undecorated = 'ignored';
   *
   * const json = EntityUtils.toJSON(user);
   * // {
   * //   name: 'John',
   * //   address: { street: '123 Main St', city: 'Boston' },
   * //   createdAt: '2024-01-01T00:00:00.000Z'
   * // }
   *
   * @CollectionEntity()
   * class Tags {
   *   @ArrayProperty(() => String)
   *   collection: string[];
   * }
   *
   * const tags = new Tags({ collection: ['a', 'b'] });
   * const json = EntityUtils.toJSON(tags);
   * // ['a', 'b'] - unwrapped to array
   * ```
   */
  static toJSON<T extends object>(entity: T): unknown {
    if (this.isCollectionEntity(entity)) {
      const collectionPropertyOptions = this.getPropertyOptions(
        entity,
        'collection',
      );
      if (!collectionPropertyOptions) {
        throw new Error(
          `Collection entity 'collection' property is missing metadata`,
        );
      }
      if (!collectionPropertyOptions.array) {
        throw new Error(
          `Collection entity 'collection' property must be an array`,
        );
      }

      return this.serializeValue(
        (entity as any).collection,
        collectionPropertyOptions,
      );
    }

    const result: Record<string, unknown> = {};
    const keys = this.getPropertyKeys(entity);

    for (const key of keys) {
      const value = (entity as any)[key];

      // Skip undefined values
      if (value === undefined) {
        continue;
      }

      const options = this.getPropertyOptions(entity, key);
      result[key] = this.serializeValue(value, options);
    }

    return result;
  }

  /**
   * Serializes a single value according to the toJSON rules
   * @private
   */
  private static serializeValue(
    value: unknown,
    options?: PropertyOptions,
  ): unknown {
    if (value === null) {
      return null;
    }

    if (value === undefined) {
      return undefined;
    }

    const passthrough = options?.passthrough === true;
    if (passthrough) {
      return value;
    }

    if (Array.isArray(value)) {
      if (options?.serialize) {
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        return value.map((item) => options.serialize!(item as any));
      }
      return value.map((item) => this.serializeValue(item));
    }

    if (options?.serialize) {
      return options.serialize(value as any);
    }

    if (value instanceof Date) {
      return value.toISOString();
    }

    if (typeof value === 'bigint') {
      return value.toString();
    }

    if (this.isEntity(value)) {
      return this.toJSON(value);
    }

    if (
      typeof value === 'string' ||
      typeof value === 'number' ||
      typeof value === 'boolean'
    ) {
      return value;
    }

    throw new Error(
      `Cannot serialize value of type '${typeof value}'. Use passthrough: true in @Property() to explicitly allow serialization of unknown types.`,
    );
  }

  /**
   * Internal parse implementation with extended options
   * @private
   */
  private static async _parseInternal<T extends object>(
    entityClass: new (data: any) => T,
    plainObject: unknown,
    options: {
      strict?: boolean;
      skipDefaults?: boolean;
      skipMissing?: boolean;
    } = {},
  ): Promise<{ data: Record<string, unknown>; hardProblems: Problem[] }> {
    if (this.isCollectionEntity(entityClass)) {
      plainObject = { collection: plainObject };
    }
    if (plainObject == null) {
      throw createValidationError(
        `Expects an object but received ${typeof plainObject}`,
      );
    }
    if (Array.isArray(plainObject)) {
      throw createValidationError(`Expects an object but received array`);
    }
    if (typeof plainObject !== 'object') {
      throw createValidationError(
        `Expects an object but received ${typeof plainObject}`,
      );
    }

    const strict = options.strict ?? false;
    const skipDefaults = options.skipDefaults ?? false;
    const skipMissing = options.skipMissing ?? false;
    const keys = this.getPropertyKeys(entityClass.prototype);
    const data: Record<string, unknown> = {};
    const hardProblems: Problem[] = [];

    for (const key of keys) {
      const propertyOptions = this.getPropertyOptions(
        entityClass.prototype,
        key,
      );

      if (!propertyOptions) {
        hardProblems.push(
          new Problem({
            property: key,
            message: `Property has no metadata. This should not happen if @Property() was used correctly.`,
          }),
        );
        continue;
      }

      const value = (plainObject as Record<string, unknown>)[key];

      if (propertyOptions.passthrough === true) {
        data[key] = value;
        continue;
      }

      const isOptional = propertyOptions.optional === true;

      if (!(key in plainObject) || value == null) {
        if (skipMissing) {
          continue;
        }

        let valueToSet = value;

        if (!skipDefaults && propertyOptions.default !== undefined) {
          valueToSet =
            typeof propertyOptions.default === 'function'
              ? await propertyOptions.default()
              : propertyOptions.default;
        }

        if (!isOptional && valueToSet == null) {
          hardProblems.push(
            new Problem({
              property: key,
              message:
                'Required property is missing, null or undefined from input',
            }),
          );
        }
        data[key] = valueToSet;
        continue;
      }

      try {
        // Only pass strict to nested deserialization, not skipDefaults/skipMissing
        data[key] = await this.deserializeValue(value, propertyOptions, {
          strict,
        });
      } catch (error) {
        if (error instanceof ValidationError) {
          const problems = prependPropertyPath(key, error);
          hardProblems.push(...problems);
        } else if (error instanceof Error) {
          hardProblems.push(
            new Problem({
              property: key,
              message: error.message,
            }),
          );
        } else {
          throw error;
        }
      }
    }

    return { data, hardProblems };
  }

  /**
   * Deserializes a plain object to an entity instance
   *
   * @param entityClass - The entity class constructor. Must accept a data object parameter.
   * @param plainObject - The plain object to deserialize
   * @param parseOptions - Parse options (strict mode)
   * @returns Promise resolving to a new instance of the entity with deserialized values
   *
   * @remarks
   * Deserialization rules:
   * - All @Property() decorators must include type metadata for parse() to work
   * - Properties without type metadata will throw an error
   * - Required properties (optional !== true) must be present and not null/undefined
   * - Optional properties (optional === true) can be undefined or null
   * - Arrays are supported with the array: true option
   * - Nested entities are recursively deserialized
   * - Type conversion is strict (no coercion)
   * - Entity constructors must accept a required data parameter
   *
   * Validation behavior:
   * - If strict: true - both HARD and SOFT problems throw ValidationError
   * - If strict: false (default) - HARD problems throw ValidationError, SOFT problems stored
   * - Property validators run first, then entity validators
   * - Validators can be synchronous or asynchronous
   * - Problems are accessible via EntityUtils.getProblems()
   * - Raw input data is accessible via EntityUtils.getRawInput()
   *
   * @example
   * ```typescript
   * @Entity()
   * class User {
   *   @Property({ type: () => String }) name!: string;
   *   @Property({ type: () => Number }) age!: number;
   *
   *   constructor(data: Partial<User>) {
   *     Object.assign(this, data);
   *   }
   * }
   *
   * const json = { name: 'John', age: 30 };
   * const user = await EntityUtils.parse(User, json);
   * const userStrict = await EntityUtils.parse(User, json, { strict: true });
   * ```
   */
  static async parse<T extends object>(
    entityClass: new (data: any) => T,
    plainObject: unknown,
    parseOptions: ParseOptions = {},
  ): Promise<T> {
    const strict = parseOptions?.strict ?? false;

    const { data, hardProblems } = await this._parseInternal(
      entityClass,
      plainObject,
      { strict },
    );

    if (hardProblems.length > 0) {
      throw new ValidationError(hardProblems);
    }

    await this.addInjectedDependencies(data, entityClass.prototype);

    const instance = new entityClass(data);

    rawInputStorage.set(instance, plainObject as Record<string, unknown>);

    const problems = await this.validate(instance);

    if (problems.length > 0 && strict) {
      throw new ValidationError(problems);
    }

    return instance;
  }

  /**
   * Safely deserializes a plain object to an entity instance without throwing errors
   *
   * @param entityClass - The entity class constructor. Must accept a data object parameter.
   * @param plainObject - The plain object to deserialize
   * @param parseOptions - Parse options (strict mode)
   * @returns Promise resolving to a result object with success flag, data, and problems
   *
   * @remarks
   * Similar to parse() but returns a result object instead of throwing errors:
   * - On success with strict: true - returns { success: true, data, problems: [] }
   * - On success with strict: false - returns { success: true, data, problems: [...] } (may include soft problems)
   * - On failure - returns { success: false, data: undefined, problems: [...] }
   *
   * All deserialization and validation rules from parse() apply.
   * See parse() documentation for detailed deserialization behavior.
   *
   * @example
   * ```typescript
   * @Entity()
   * class User {
   *   @Property({ type: () => String }) name!: string;
   *   @Property({ type: () => Number }) age!: number;
   *
   *   constructor(data: Partial<User>) {
   *     Object.assign(this, data);
   *   }
   * }
   *
   * const result = await EntityUtils.safeParse(User, { name: 'John', age: 30 });
   * if (result.success) {
   *   console.log(result.data); // User instance
   *   console.log(result.problems); // [] or soft problems if not strict
   * } else {
   *   console.log(result.problems); // Hard problems
   * }
   * ```
   */
  static async safeParse<T extends object>(
    entityClass: new (data: any) => T,
    plainObject: unknown,
    parseOptions?: ParseOptions,
  ): SafeOperationResult<T> {
    try {
      const data = await this.parse(entityClass, plainObject, parseOptions);
      const problems = this.getProblems(data);

      return {
        success: true,
        data,
        problems,
      };
    } catch (error) {
      if (error instanceof ValidationError) {
        return {
          success: false,
          data: undefined,
          problems: error.problems,
        };
      }
      throw error;
    }
  }

  /**
   * Partially deserializes a plain object, returning a plain object with only present properties
   *
   * @param entityClass - The entity class constructor
   * @param plainObject - The plain object to deserialize
   * @param options - Options with strict mode
   * @returns Promise resolving to a plain object with deserialized properties (Partial<T>)
   *
   * @remarks
   * Differences from parse():
   * - Returns a plain object, not an entity instance
   * - Ignores missing properties (does not include them in result)
   * - Does NOT apply default values to missing properties
   * - When strict: false (default), properties with HARD problems are excluded from result but problems are tracked
   * - When strict: true, any HARD problem throws ValidationError
   * - Nested entities/arrays are still fully deserialized and validated as normal
   *
   * @example
   * ```typescript
   * @Entity()
   * class User {
   *   @Property({ type: () => String }) name!: string;
   *   @Property({ type: () => Number, default: 0 }) age!: number;
   *
   *   constructor(data: Partial<User>) {
   *     Object.assign(this, data);
   *   }
   * }
   *
   * const partial = await EntityUtils.partialParse(User, { name: 'John' });
   * // partial = { name: 'John' } (age is not included, default not applied)
   *
   * const partialWithError = await EntityUtils.partialParse(User, { name: 'John', age: 'invalid' });
   * // partialWithError = { name: 'John' } (age excluded due to HARD problem)
   * // Access problems via second return value
   * ```
   */
  static async partialParse<T extends object>(
    entityClass: new (data: any) => T,
    plainObject: unknown,
    options: { strict?: boolean } = {},
  ): Promise<Partial<T>> {
    const result = await this.safePartialParse(
      entityClass,
      plainObject,
      options,
    );

    if (!result.success) {
      throw new ValidationError(result.problems);
    }

    return result.data;
  }

  /**
   * Safely performs partial deserialization without throwing errors
   *
   * @param entityClass - The entity class constructor
   * @param plainObject - The plain object to deserialize
   * @param options - Options with strict mode
   * @returns Promise resolving to a result object with success flag, partial data, and problems
   *
   * @remarks
   * Similar to partialParse() but returns a result object instead of throwing errors:
   * - On success with strict: true - returns { success: true, data: Partial<T>, problems: [] }
   * - On success with strict: false - returns { success: true, data: Partial<T>, problems: [...] } (includes hard problems for excluded properties)
   * - On failure (strict mode only) - returns { success: false, data: undefined, problems: [...] }
   *
   * All partial deserialization rules from partialParse() apply.
   * See partialParse() documentation for detailed behavior.
   *
   * @example
   * ```typescript
   * @Entity()
   * class User {
   *   @Property({ type: () => String }) name!: string;
   *   @Property({ type: () => Number }) age!: number;
   *
   *   constructor(data: Partial<User>) {
   *     Object.assign(this, data);
   *   }
   * }
   *
   * const result = await EntityUtils.safePartialParse(User, { name: 'John', age: 'invalid' });
   * if (result.success) {
   *   console.log(result.data); // { name: 'John' }
   *   console.log(result.problems); // [Problem for age property]
   * } else {
   *   console.log(result.problems); // Hard problems (only in strict mode)
   * }
   * ```
   */
  static async safePartialParse<T extends object>(
    entityClass: new (data: any) => T,
    plainObject: unknown,
    options?: { strict?: boolean },
  ): Promise<SafeOperationResult<Partial<T>>> {
    const strict = options?.strict ?? false;

    const { data, hardProblems } = await this._parseInternal(
      entityClass,
      plainObject,
      { strict, skipDefaults: true, skipMissing: true },
    );

    if (strict && hardProblems.length > 0) {
      return {
        success: false,
        data: undefined,
        problems: hardProblems,
      };
    }

    const propertyProblems = await this.validateProperties(
      data,
      entityClass.prototype,
    );
    const validationProblems = [...hardProblems, ...propertyProblems];

    if (strict && propertyProblems.length > 0) {
      return {
        success: false,
        data: undefined,
        problems: validationProblems,
      };
    }

    this.setProblems(data, validationProblems);

    return {
      success: true,
      data: data as Partial<T>,
      problems: validationProblems,
    };
  }

  /**
   * Updates an entity instance with new values, respecting preventUpdates flags on properties
   *
   * @param instance - The entity instance to update. Must be an Entity.
   * @param updates - Partial object with properties to update
   * @param options - Update options (strict mode)
   * @returns Promise resolving to a new instance with updated values
   *
   * @remarks
   * Update behavior:
   * - Creates a shallow copy of the instance
   * - For each @Property(), copies the value from updates if it exists
   * - Properties with preventUpdates: true will not be copied from updates
   * - Runs entity validators after applying updates
   * - Throws ValidationError if validation fails and strict: true
   * - Soft problems are stored on the instance if strict: false (default)
   *
   * @example
   * ```typescript
   * @Entity()
   * class User {
   *   @Property({ type: () => String }) name!: string;
   *   @Property({ type: () => String, preventUpdates: true }) id!: string;
   *
   *   constructor(data: Partial<User>) {
   *     Object.assign(this, data);
   *   }
   * }
   *
   * const user = new User({ id: '123', name: 'John' });
   * const updated = await EntityUtils.update(user, { id: '456', name: 'Jane' });
   * // updated.id === '123' (not updated due to preventUpdates: true)
   * // updated.name === 'Jane'
   * ```
   */
  static async update<T extends object>(
    instance: T,
    updates: Partial<T>,
    options?: { strict?: boolean },
  ): Promise<T> {
    if (!this.isEntity(instance)) {
      throw new Error('Cannot update non-entity instance');
    }

    const strict = options?.strict ?? false;
    const Constructor = Object.getPrototypeOf(instance).constructor;
    const keys = this.getPropertyKeys(instance);
    const data: Record<string, unknown> = {};

    // Copy existing properties
    for (const key of keys) {
      const value = (instance as any)[key];
      data[key] = value;
    }

    // Apply updates, respecting preventUpdates flag
    for (const key of keys) {
      if (key in updates) {
        const propertyOptions = this.getPropertyOptions(instance, key);
        if (propertyOptions && propertyOptions.preventUpdates === true) {
          // Skip updating this property
          continue;
        }
        data[key] = (updates as any)[key];
      }
    }

    const newInstance = new Constructor(data);

    const problems = await this.validate(newInstance);

    if (problems.length > 0 && strict) {
      throw new ValidationError(problems);
    }

    return newInstance;
  }

  /**
   * Safely updates an entity instance without throwing errors
   *
   * @param instance - The entity instance to update. Must be an Entity.
   * @param updates - Partial object with properties to update
   * @param options - Update options (strict mode)
   * @returns Promise resolving to a result object with success flag, data, and problems
   *
   * @remarks
   * Similar to update() but returns a result object instead of throwing errors:
   * - On success with strict: true - returns { success: true, data, problems: [] }
   * - On success with strict: false - returns { success: true, data, problems: [...] } (may include soft problems)
   * - On failure - returns { success: false, data: undefined, problems: [...] }
   *
   * All update and validation rules from update() apply.
   * See update() documentation for detailed update behavior.
   *
   * @example
   * ```typescript
   * @Entity()
   * class User {
   *   @Property({ type: () => String }) name!: string;
   *
   *   constructor(data: Partial<User>) {
   *     Object.assign(this, data);
   *   }
   * }
   *
   * const user = new User({ name: 'John' });
   * const result = await EntityUtils.safeUpdate(user, { name: 'Jane' });
   * if (result.success) {
   *   console.log(result.data); // Updated User instance
   *   console.log(result.problems); // [] or soft problems if not strict
   * } else {
   *   console.log(result.problems); // Hard problems
   * }
   * ```
   */
  static async safeUpdate<T extends object>(
    instance: T,
    updates: Partial<T>,
    options?: { strict?: boolean },
  ): SafeOperationResult<T> {
    try {
      const updatedInstance = await this.update(instance, updates, options);
      const problems = this.getProblems(updatedInstance);

      return {
        success: true,
        data: updatedInstance,
        problems,
      };
    } catch (error) {
      if (error instanceof ValidationError) {
        return {
          success: false,
          data: undefined,
          problems: error.problems,
        };
      }
      throw error;
    }
  }

  /**
   * Deserializes a single value according to the type metadata
   * @private
   */
  private static async deserializeValue(
    value: unknown,
    options: PropertyOptions,
    parseOptions: ParseOptions,
  ): Promise<unknown> {
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const typeConstructor = options.type!();
    const isArray = options.array === true;
    const isSparse = options.sparse === true;

    if (isArray) {
      if (!Array.isArray(value)) {
        throw createValidationError(
          `Expects an array but received ${typeof value}`,
        );
      }

      const arrayProblems: Problem[] = [];
      const result: unknown[] = [];

      for (let index = 0; index < value.length; index++) {
        const item = value[index];
        if (item === null || item === undefined) {
          if (!isSparse) {
            arrayProblems.push(
              new Problem({
                property: `[${index}]`,
                message: 'Cannot be null or undefined.',
              }),
            );
          }
          result.push(item);
        } else {
          try {
            if (options.deserialize) {
              result.push(options.deserialize(item));
            } else {
              result.push(
                await this.deserializeSingleValue(
                  item,
                  typeConstructor,
                  parseOptions,
                ),
              );
            }
          } catch (error) {
            if (error instanceof ValidationError) {
              const problems = prependArrayIndex(index, error);
              arrayProblems.push(...problems);
            } else {
              throw error;
            }
          }
        }
      }

      if (arrayProblems.length > 0) {
        throw new ValidationError(arrayProblems);
      }

      return result;
    }

    if (options.deserialize) {
      return options.deserialize(value);
    }

    return await this.deserializeSingleValue(
      value,
      typeConstructor,
      parseOptions,
    );
  }

  /**
   * Deserializes a single non-array value
   * Reports validation errors with empty property (caller will prepend context)
   * @private
   */
  private static async deserializeSingleValue(
    value: unknown,
    typeConstructor: any,
    parseOptions: ParseOptions,
  ): Promise<unknown> {
    if (isPrimitiveConstructor(typeConstructor)) {
      return deserializePrimitive(value, typeConstructor);
    }

    if (this.isEntity(typeConstructor)) {
      return await this.parse(
        typeConstructor as new (data: any) => object,
        value as Record<string, unknown>,
        parseOptions,
      );
    }

    throw createValidationError(
      `Has unknown type constructor. Supported types are: String, Number, Boolean, Date, BigInt, and @Entity() classes. Use passthrough: true to explicitly allow unknown types.`,
    );
  }

  /**
   * Validates a property value by running validators and nested entity validation.
   * Prepends the property path to all returned problems.
   * @private
   */
  private static async validatePropertyValue(
    propertyPath: string,
    value: unknown,
    validators: PropertyOptions['validators'],
  ): Promise<Problem[]> {
    const problems: Problem[] = [];

    if (validators) {
      for (const validator of validators) {
        const validatorProblems = await validator({ value });
        // Prepend propertyPath to all problems
        for (const problem of validatorProblems) {
          problems.push(
            new Problem({
              property: combinePropertyPaths(propertyPath, problem.property),
              message: problem.message,
            }),
          );
        }
      }
    }

    if (EntityUtils.isEntity(value)) {
      const existingProblems = problemsStorage.get(value);
      const nestedProblems =
        existingProblems && existingProblems.length > 0
          ? existingProblems
          : await EntityUtils.validate(value);

      const prependedProblems = prependPropertyPath(
        propertyPath,
        new ValidationError(nestedProblems),
      );
      problems.push(...prependedProblems);
    }

    return problems;
  }

  /**
   * Runs property validators for a given property value
   * @private
   */
  private static async runPropertyValidators(
    key: string,
    value: unknown,
    options: PropertyOptions,
  ): Promise<Problem[]> {
    const problems: Problem[] = [];
    const isArray = options?.array === true;
    const isPassthrough = options?.passthrough === true;

    if (isPassthrough || !isArray) {
      const valueProblems = await this.validatePropertyValue(
        key,
        value,
        options.validators,
      );
      problems.push(...valueProblems);
    } else {
      ok(Array.isArray(value), 'Value must be an array for array property');

      const arrayValidators = options.arrayValidators || [];
      for (const validator of arrayValidators) {
        const validatorProblems = await validator({ value });
        for (const problem of validatorProblems) {
          problems.push(
            new Problem({
              property: combinePropertyPaths(key, problem.property),
              message: problem.message,
            }),
          );
        }
      }

      const validators = options.validators || [];
      if (validators.length > 0) {
        for (let i = 0; i < value.length; i++) {
          const element = value[i];
          if (element !== null && element !== undefined) {
            const elementPath = `${key}[${i}]`;
            const elementProblems = await this.validatePropertyValue(
              elementPath,
              element,
              validators,
            );
            problems.push(...elementProblems);
          }
        }
      }
    }

    return problems;
  }

  /**
   * Validates all properties on an object (entity instance or plain object)
   * @private
   */
  private static async validateProperties(
    dataOrInstance: Record<string, unknown> | object,
    prototype: object,
  ): Promise<Problem[]> {
    const problems: Problem[] = [];
    const keys = Object.keys(dataOrInstance);

    for (const key of keys) {
      const options = this.getPropertyOptions(prototype, key);
      if (options) {
        const value = (dataOrInstance as any)[key];
        if (value != null) {
          const validationProblems = await this.runPropertyValidators(
            key,
            value,
            options,
          );
          problems.push(...validationProblems);
        }
      }
    }

    return problems;
  }

  private static async addInjectedDependencies(
    data: Record<string, unknown>,
    prototype: object,
  ): Promise<void> {
    const injectedPropertyNames = getInjectedPropertyNames(prototype);
    if (injectedPropertyNames.length === 0) {
      return;
    }

    const injectedPropertyOptions = getInjectedPropertyOptions(prototype);

    for (const propertyName of injectedPropertyNames) {
      const token = injectedPropertyOptions[propertyName];
      if (token) {
        const dependency = await EntityDI.get(token);
        data[propertyName] = dependency;
      }
    }
  }

  /**
   * Validates an entity instance by running all property and entity validators
   *
   * @param instance - The entity instance to validate
   * @returns Promise resolving to array of Problems found during validation (empty if valid)
   *
   * @remarks
   * - Property validators run first, then entity validators
   * - Each validator can be synchronous or asynchronous
   * - Empty array means no problems found
   *
   * @example
   * ```typescript
   * const user = new User({ name: '', age: -5 });
   * const problems = await EntityUtils.validate(user);
   * console.log(problems); // [Problem, Problem, ...]
   * ```
   */
  static async validate<T extends object>(instance: T): Promise<Problem[]> {
    if (!this.isEntity(instance)) {
      throw new Error('Cannot validate non-entity instance');
    }

    const problems: Problem[] = [];

    const propertyProblems = await this.validateProperties(instance, instance);
    problems.push(...propertyProblems);

    const entityValidators = this.getEntityValidators(instance);
    for (const validatorMethod of entityValidators) {
      const validatorProblems = await (instance as any)[validatorMethod]();
      if (Array.isArray(validatorProblems)) {
        problems.push(...validatorProblems);
      }
    }

    EntityUtils.setProblems(instance, problems);

    return problems;
  }

  /**
   * Gets the validation problems for an entity instance
   *
   * @param instance - The entity instance
   * @returns Array of Problems (empty if no problems or instance not parsed)
   *
   * @remarks
   * - Only returns problems from the last parse() call
   * - Returns empty array if instance was not created via parse()
   * - Returns empty array if parse() was called with strict: true
   *
   * @example
   * ```typescript
   * const user = EntityUtils.parse(User, data);
   * const problems = EntityUtils.getProblems(user);
   * console.log(problems); // [Problem, ...]
   * ```
   */
  static getProblems<T extends object>(instance: T): Problem[] {
    return problemsStorage.get(instance) || [];
  }

  /**
   * Sets the validation problems for an entity instance
   *
   * @param instance - The entity instance
   * @param problems - Array of Problems to associate with the instance
   *
   * @remarks
   * - Overwrites any existing problems for the instance
   * - Pass an empty array to clear problems
   *
   * @example
   * ```typescript
   * const user = new User({ name: 'John' });
   * EntityUtils.setProblems(user, [new Problem({ property: 'name', message: 'Invalid name' })]);
   * ```
   */
  static setProblems<T extends object>(instance: T, problems: Problem[]): void {
    if (problems.length === 0) {
      problemsStorage.delete(instance);
    } else {
      problemsStorage.set(instance, problems);
    }
  }

  /**
   * Gets the raw input data that was used to create an entity instance
   *
   * @param instance - The entity instance
   * @returns The raw input object, or undefined if not available
   *
   * @remarks
   * - Only available for instances created via parse()
   * - Returns a reference to the original input data (not a copy)
   *
   * @example
   * ```typescript
   * const user = EntityUtils.parse(User, { name: 'John', age: 30 });
   * const rawInput = EntityUtils.getRawInput(user);
   * console.log(rawInput); // { name: 'John', age: 30 }
   * ```
   */
  static getRawInput<T extends object>(instance: T): unknown {
    return rawInputStorage.get(instance);
  }

  /**
   * Sets the raw input data for an entity instance
   *
   * @param instance - The entity instance
   * @param rawInput - The raw input object to associate with the instance
   *
   * @remarks
   * - Overwrites any existing raw input for the instance
   * - Pass undefined to clear the raw input
   *
   * @example
   * ```typescript
   * const user = new User({ name: 'John' });
   * EntityUtils.setRawInput(user, { name: 'John', age: 30 });
   * ```
   */
  static setRawInput<T extends object>(
    instance: T,
    rawInput: Record<string, unknown> | undefined,
  ): void {
    if (rawInput === undefined) {
      rawInputStorage.delete(instance);
    } else {
      rawInputStorage.set(instance, rawInput);
    }
  }

  /**
   * Gets all entity validator method names for an entity
   * @private
   */
  private static getEntityValidators(target: object): string[] {
    let currentProto: any;

    if (target.constructor && target === target.constructor.prototype) {
      currentProto = target;
    } else {
      currentProto = Object.getPrototypeOf(target);
    }

    const validators: string[] = [];
    const seen = new Set<string>();

    while (currentProto && currentProto !== Object.prototype) {
      const protoValidators: string[] =
        Reflect.getOwnMetadata(ENTITY_VALIDATOR_METADATA_KEY, currentProto) ||
        [];

      for (const validator of protoValidators) {
        if (!seen.has(validator)) {
          seen.add(validator);
          validators.push(validator);
        }
      }

      currentProto = Object.getPrototypeOf(currentProto);
    }

    return validators;
  }
}
