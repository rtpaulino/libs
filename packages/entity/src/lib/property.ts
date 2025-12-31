import {
  PROPERTY_METADATA_KEY,
  PROPERTY_OPTIONS_METADATA_KEY,
  PropertyOptions,
} from './types.js';

/**
 * Property decorator that marks class properties with metadata.
 * This decorator can be used to identify and track properties within classes.
 *
 * @param options - Optional configuration for the property
 *
 * @example
 * class User {
 *   @Property()
 *   name: string;
 *
 *   @Property({ equals: (a, b) => a.toLowerCase() === b.toLowerCase() })
 *   email: string;
 *
 *   @Property()
 *   age: number;
 * }
 */
export function Property<T = any>(
  options?: PropertyOptions<T>,
): PropertyDecorator {
  return (target: object, propertyKey: string | symbol): void => {
    // Only support string property keys
    if (typeof propertyKey !== 'string') {
      return;
    }

    // Get existing metadata from own property only (not from prototype chain)
    const existingProperties: string[] =
      Reflect.getOwnMetadata(PROPERTY_METADATA_KEY, target) || [];

    // Add this property if not already tracked
    if (!existingProperties.includes(propertyKey)) {
      existingProperties.push(propertyKey);
    }

    // Store updated metadata on the target itself
    Reflect.defineMetadata(PROPERTY_METADATA_KEY, existingProperties, target);

    // Store property options if provided
    if (options) {
      const existingOptions: Record<string, PropertyOptions> =
        Reflect.getOwnMetadata(PROPERTY_OPTIONS_METADATA_KEY, target) || {};

      existingOptions[propertyKey] = options;

      Reflect.defineMetadata(
        PROPERTY_OPTIONS_METADATA_KEY,
        existingOptions,
        target,
      );
    }
  };
}
