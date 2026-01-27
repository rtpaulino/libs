/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-wrapper-object-types */
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

// eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
export type AnyCtor<T = any> = Function & { prototype: T };

export type BuiltinCtors =
  | StringConstructor
  | NumberConstructor
  | BooleanConstructor
  | BigIntConstructor
  | SymbolConstructor
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
}
