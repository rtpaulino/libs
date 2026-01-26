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
 * Options for the Property decorator
 */
export interface PropertyOptions<T = any> {
  /**
   * Custom equality comparison function for this property
   * @param a - First value to compare
   * @param b - Second value to compare
   * @returns true if values are equal, false otherwise
   */
  equals?: (a: T, b: T) => boolean;

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
  type?: () => any;

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
}
