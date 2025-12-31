import { PROPERTY_METADATA_KEY } from './types.js';

/**
 * Property decorator that marks class properties with metadata.
 * This decorator can be used to identify and track properties within classes.
 *
 * @example
 * class User {
 *   @Property()
 *   name: string;
 *
 *   @Property()
 *   age: number;
 * }
 */
export function Property(): PropertyDecorator {
  return (target: Object, propertyKey: string | symbol): void => {
    // Get existing metadata or initialize empty array
    const existingProperties: (string | symbol)[] =
      Reflect.getMetadata(PROPERTY_METADATA_KEY, target) || [];

    // Add this property if not already tracked
    if (!existingProperties.includes(propertyKey)) {
      existingProperties.push(propertyKey);
    }

    // Store updated metadata
    Reflect.defineMetadata(PROPERTY_METADATA_KEY, existingProperties, target);
  };
}
