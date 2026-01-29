/* eslint-disable @typescript-eslint/no-unsafe-function-type */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-wrapper-object-types */
import type { Problem } from './problem.js';

/**
 * Metadata key used to store property information
 */
export const PROPERTY_METADATA_KEY = Symbol('property:metadata');

/**
 * Metadata key used to store property options
 */
export const PROPERTY_OPTIONS_METADATA_KEY = Symbol(
  'property:options:metadata',
);

/**
 * Metadata key used to store entity information
 */
export const ENTITY_METADATA_KEY = Symbol('entity:metadata');

/**
 * Metadata key used to store entity validator methods
 */
export const ENTITY_VALIDATOR_METADATA_KEY = Symbol(
  'entity:validator:metadata',
);

/**
 * Metadata key used to store injected property information
 */
export const INJECTED_PROPERTY_METADATA_KEY = Symbol(
  'injected-property:metadata',
);

/**
 * Metadata key used to store injected property options (tokens)
 */
export const INJECTED_PROPERTY_OPTIONS_METADATA_KEY = Symbol(
  'injected-property:options:metadata',
);

export type AnyCtor<T = any> = Function & { prototype: T };

export type BuiltinCtors =
  | StringConstructor
  | NumberConstructor
  | BooleanConstructor
  | BigIntConstructor
  | SymbolConstructor
  | DateConstructor;

/**
 * Type constructors for primitive types that can be deserialized
 * (excludes Symbol which cannot be deserialized from JSON)
 */
export type PrimitiveConstructor =
  | StringConstructor
  | NumberConstructor
  | BooleanConstructor
  | BigIntConstructor
  | DateConstructor;

export type CtorLike<T> = AnyCtor<T> | BuiltinCtors;

export type InstanceOfCtorLike<C> = C extends StringConstructor
  ? string
  : C extends NumberConstructor
    ? number
    : C extends BooleanConstructor
      ? boolean
      : C extends BigIntConstructor
        ? bigint
        : C extends SymbolConstructor
          ? symbol
          : C extends DateConstructor
            ? Date
            : C extends AnyCtor<infer T>
              ? T
              : never;

/**
 * Options for the Property decorator
 */
export interface PropertyOptions<
  T = any,
  C extends CtorLike<T> = AnyCtor<T> | BuiltinCtors,
> {
  /**
   * Custom equality comparison function for this property
   * @param a - First value to compare
   * @param b - Second value to compare
   * @returns true if values are equal, false otherwise
   */
  equals?: (a: InstanceOfCtorLike<C>, b: InstanceOfCtorLike<C>) => boolean;

  /**
   * Type constructor for this property. Required for EntityUtils.parse() support.
   * Use a function that returns the type constructor to support forward references.
   * @example
   * @Property({ type: () => String })
   * name!: string;
   *
   * @Property({ type: () => Address })
   * address!: Address;
   */
  type: () => C;

  /**
   * Whether this property is an array. Defaults to false.
   * When true, the deserializer will map over array elements.
   * @example
   * @Property({ type: () => String, array: true })
   * tags!: string[];
   */
  array?: boolean;

  /**
   * Whether this property is a collection entity. Defaults to false.
   * When true, the property is an entity with a 'collection' array property.
   * During serialization, the collection entity is unwrapped to just the array.
   * During deserialization, the array is wrapped in a collection entity.
   * @example
   * @Property({ type: () => MyCollection, collection: true })
   * myCollection!: MyCollection;
   */
  collection?: boolean;

  /**
   * Whether this property is optional. Defaults to false.
   * When true, the property can be undefined or null.
   * When false, the property must be present and not null/undefined.
   * @example
   * @Property({ type: () => String, optional: true })
   * nickname?: string;
   */
  optional?: boolean;

  /**
   * Whether the array can contain null/undefined elements. Defaults to false.
   * Only applicable when array is true.
   * When false (default), null/undefined elements will cause an error.
   * When true, null/undefined elements are allowed in the array.
   * @example
   * @Property({ type: () => String, array: true, sparse: true })
   * tags!: (string | null)[];
   */
  sparse?: boolean;

  /**
   * Whether to bypass type validation and pass values through as-is.
   * Use this for generic types like Record<string, unknown> or any.
   * When true, no type checking or transformation is performed.
   * Also bypasses any custom serialize/deserialize callbacks.
   * @example
   * @Property({ passthrough: true })
   * metadata!: Record<string, unknown>;
   */
  passthrough?: boolean;

  /**
   * Whether to prevent this property from being updated via EntityUtils.update().
   * When true, this property cannot be modified through update operations.
   * Defaults to false, allowing the property to be updated.
   * @example
   * @Property({ type: () => String, preventUpdates: true })
   * id!: string; // This property cannot be updated
   */
  preventUpdates?: boolean;

  /**
   * Default value for the property when not provided during deserialization.
   * Can be a static value or a function that returns the default value.
   * The function can be async and return a Promise.
   * @example
   * @Property({ type: () => String, default: 'N/A' })
   * nickname?: string;
   *
   * @Property({ type: () => Date, default: () => new Date() })
   * createdAt!: Date;
   *
   * @Property({ type: () => String, default: async () => await fetchDefaultValue() })
   * value!: string;
   */
  default?:
    | InstanceOfCtorLike<C>
    | (() => InstanceOfCtorLike<C> | Promise<InstanceOfCtorLike<C>>);

  /**
   * Custom serialization function to convert the property value to JSON-compatible format.
   * Must be paired with deserialize - both must be defined together or both omitted.
   * Not used when passthrough is true.
   * @example
   * @Property({
   *   type: () => MyClass,
   *   serialize: (value) => ({ data: value.toData() }),
   *   deserialize: (json) => MyClass.fromData(json.data)
   * })
   * myProperty!: MyClass;
   */
  serialize?: (value: InstanceOfCtorLike<C>) => unknown;

  /**
   * Custom deserialization function to convert JSON data back to the property type.
   * Must be paired with serialize - both must be defined together or both omitted.
   * Not used when passthrough is true.
   * @example
   * @Property({
   *   type: () => MyClass,
   *   serialize: (value) => ({ data: value.toData() }),
   *   deserialize: (json) => MyClass.fromData(json.data)
   * })
   * myProperty!: MyClass;
   */
  deserialize?: (serialized: unknown) => InstanceOfCtorLike<C>;

  /**
   * Array of validator functions for this property.
   * Each validator receives the property value and validation context.
   * Empty array means validation passed.
   * If the property is an array (array: true), these validators will run against each item.
   * Use arrayValidators instead to validate the array as a whole.
   * If passthrough is true, validators will run against the raw value.
   * @example
   * @Property({
   *   type: () => String,
   *   validators: [
   *     (value, { createProblem }) =>
   *       value.length > 10 ? [createProblem('Too long')] : []
   *   ]
   * })
   * name!: string;
   */
  validators?: PropertyValidator<InstanceOfCtorLike<C>>[];

  /**
   * Array of validator functions for this property when it is an array.
   * Each validator receives the array value and validation context.
   * Empty array means validation passed.
   * Only applicable when array is true.
   * Not applicable when passthrough is true.
   * @example
   * @Property({
   *   type: () => Number,
   *   array: true,
   *   arrayValidators: [
   *     (value, { createProblem }) =>
   *       value.length === 0 ? [createProblem('Array cannot be empty')] : []
   *   ]
   * })
   * scores!: number[];
   */
  arrayValidators?: PropertyValidator<InstanceOfCtorLike<C>[]>[];
}

/**
 * A validator function for a property.
 * The validator receives the value and returns Problems with property paths relative to the value.
 * Can be synchronous or asynchronous.
 * The calling code will prepend the actual property key to all returned problems.
 *
 * @param data - Object containing the value to validate
 * @param data.value - The value to validate
 * @returns Array of Problems (empty if valid) or Promise resolving to Problems.
 *          Problems should have empty property for the value itself,
 *          or relative paths for nested properties (e.g., 'name', '[0]', 'address.street')
 *
 * @example
 * ```typescript
 * // Synchronous validator
 * (({ value }) =>
 *   value.length < 3 ? [new Problem({ property: '', message: 'Too short' })] : [])
 *
 * // Asynchronous validator
 * async ({ value }) => {
 *   const exists = await checkDatabase(value);
 *   return exists ? [] : [new Problem({ property: '', message: 'Not found' })];
 * }
 * ```
 */
export type PropertyValidator<T> = (data: {
  value: T;
}) => Problem[] | Promise<Problem[]>;

/**
 * A validator function for an entity.
 * Can be synchronous or asynchronous.
 * @param instance - The entity instance to validate
 * @returns Array of Problems (empty if valid) or Promise resolving to Problems
 */
export type EntityValidatorFn<T = any> = (
  instance: T,
) => Problem[] | Promise<Problem[]>;

export interface Type<T = any> extends Function {
  new (...args: any[]): T;
}

export type EntityDIToken<T = any> =
  | string
  | symbol
  | Function
  | AnyCtor<T>
  | Type<T>;

export type EntityDIProvider<T = any> =
  | {
      provide: EntityDIToken<T>;
      useValue?: T;
      useFactory?: never;
    }
  | {
      provide: EntityDIToken<T>;
      useValue?: never;
      useFactory?: () => T | Promise<T>;
    };

export type EntityDIFallbackFn = (token: EntityDIToken) => Promise<any>;

/**
 * Generic type for safe operation results that can succeed or fail
 * @template T - The data type on success
 */
export type SafeOperationResult<T> = Promise<
  | { success: true; data: T; problems: Problem[] }
  | { success: false; data: undefined; problems: Problem[] }
>;

export type ParseOptions = { strict?: boolean };
