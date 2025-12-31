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
}
