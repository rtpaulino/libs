/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  ENTITY_METADATA_KEY,
  PROPERTY_METADATA_KEY,
  PROPERTY_OPTIONS_METADATA_KEY,
  PropertyOptions,
} from './types.js';
import { isEqualWith } from 'lodash-es';

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
   * @returns A plain object containing only the serialized decorated properties
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
   * ```
   */
  static toJSON<T extends object>(entity: T): Record<string, unknown> {
    const result: Record<string, unknown> = {};
    const keys = this.getPropertyKeys(entity);

    for (const key of keys) {
      const value = (entity as any)[key];

      // Skip undefined values
      if (value === undefined) {
        continue;
      }

      result[key] = this.serializeValue(value);
    }

    return result;
  }

  /**
   * Serializes a single value according to the toJSON rules
   * @private
   */
  private static serializeValue(value: unknown): unknown {
    if (value === null) {
      return null;
    }

    if (value === undefined) {
      return undefined;
    }

    if (value instanceof Date) {
      return value.toISOString();
    }

    if (typeof value === 'bigint') {
      return value.toString();
    }

    if (Array.isArray(value)) {
      return value.map((item) => this.serializeValue(item));
    }

    if (
      value != null &&
      typeof value === 'object' &&
      'toJSON' in value &&
      typeof value.toJSON === 'function'
    ) {
      return value.toJSON();
    }

    if (this.isEntity(value)) {
      return this.toJSON(value);
    }

    if (typeof value === 'object') {
      // TODO: log a warning that plain objects are being serialized as-is
      return value;
    }

    return value;
  }

  /**
   * Deserializes a plain object to an entity instance
   *
   * @param entityClass - The entity class constructor
   * @param plainObject - The plain object to deserialize
   * @returns A new instance of the entity with deserialized values
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
   *
   * @example
   * ```typescript
   * @Entity()
   * class User {
   *   @Property({ type: () => String }) name!: string;
   *   @Property({ type: () => Number }) age!: number;
   *   @Property({ type: () => String, optional: true }) email?: string;
   * }
   *
   * const json = { name: 'John', age: 30 };
   * const user = EntityUtils.parse(User, json);
   * // user is a properly typed User instance
   * ```
   */
  static parse<T extends object>(
    entityClass: new () => T,
    plainObject: Record<string, unknown>,
  ): T {
    const instance = new entityClass();
    const keys = this.getPropertyKeys(instance);

    for (const key of keys) {
      const options = this.getPropertyOptions(instance, key);

      if (!options || !options.type) {
        throw new Error(
          `Property '${key}' requires type metadata for parsing. Use @Property({ type: () => TypeName })`,
        );
      }

      // Validate sparse option is only used with arrays
      if (options.sparse === true && options.array !== true) {
        throw new Error(
          `Property '${key}' has sparse: true but array is not true. The sparse option only applies to arrays.`,
        );
      }

      const value = plainObject[key];
      const isOptional = options.optional === true;

      if (!(key in plainObject)) {
        if (!isOptional) {
          throw new Error(
            `Property '${key}' is required but missing from input`,
          );
        }
        continue;
      }

      if (value === null || value === undefined) {
        if (!isOptional) {
          throw new Error(`Property '${key}' cannot be null or undefined`);
        }
        (instance as any)[key] = value;
        continue;
      }

      (instance as any)[key] = this.deserializeValue(value, options, key);
    }

    return instance;
  }

  /**
   * Deserializes a single value according to the type metadata
   * @private
   */
  private static deserializeValue(
    value: unknown,
    options: PropertyOptions,
    propertyKey: string,
  ): unknown {
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const typeConstructor = options.type!();
    const isArray = options.array === true;
    const isSparse = options.sparse === true;

    // Handle arrays
    if (isArray) {
      if (!Array.isArray(value)) {
        throw new Error(
          `Property '${propertyKey}' expects an array but received ${typeof value}`,
        );
      }

      return value.map((item, index) => {
        if (item === null || item === undefined) {
          if (!isSparse) {
            throw new Error(
              `Property '${propertyKey}[${index}]' cannot be null or undefined. Use sparse: true to allow null/undefined elements in arrays.`,
            );
          }
          return item;
        }
        return this.deserializeSingleValue(
          item,
          typeConstructor,
          `${propertyKey}[${index}]`,
        );
      });
    }

    return this.deserializeSingleValue(value, typeConstructor, propertyKey);
  }

  /**
   * Deserializes a single non-array value
   * @private
   */
  private static deserializeSingleValue(
    value: unknown,
    typeConstructor: any,
    propertyKey: string,
  ): unknown {
    // Handle primitives
    if (typeConstructor === String) {
      if (typeof value !== 'string') {
        throw new Error(
          `Property '${propertyKey}' expects a string but received ${typeof value}`,
        );
      }
      return value;
    }

    if (typeConstructor === Number) {
      if (typeof value !== 'number') {
        throw new Error(
          `Property '${propertyKey}' expects a number but received ${typeof value}`,
        );
      }
      return value;
    }

    if (typeConstructor === Boolean) {
      if (typeof value !== 'boolean') {
        throw new Error(
          `Property '${propertyKey}' expects a boolean but received ${typeof value}`,
        );
      }
      return value;
    }

    // Handle BigInt
    if (typeConstructor === BigInt) {
      if (typeof value === 'bigint') {
        return value;
      }
      if (typeof value === 'string') {
        try {
          return BigInt(value);
        } catch (err) {
          throw new Error(
            `Property '${propertyKey}' cannot parse '${value}' as BigInt`,
          );
        }
      }
      throw new Error(
        `Property '${propertyKey}' expects a bigint or string but received ${typeof value}`,
      );
    }

    // Handle Date
    if (typeConstructor === Date) {
      if (value instanceof Date) {
        return value;
      }
      if (typeof value === 'string') {
        const date = new Date(value);
        if (isNaN(date.getTime())) {
          throw new Error(
            `Property '${propertyKey}' cannot parse '${value}' as Date`,
          );
        }
        return date;
      }
      throw new Error(
        `Property '${propertyKey}' expects a Date or ISO string but received ${typeof value}`,
      );
    }

    // Handle nested entities
    if (this.isEntity(typeConstructor)) {
      if (typeof value !== 'object' || value === null || Array.isArray(value)) {
        throw new Error(
          `Property '${propertyKey}' expects an object but received ${typeof value}`,
        );
      }
      return this.parse(
        typeConstructor as new () => object,
        value as Record<string, unknown>,
      );
    }

    // Unknown type - return as-is but log warning
    // TODO: Consider throwing error for unknown types in strict mode
    return value;
  }
}
