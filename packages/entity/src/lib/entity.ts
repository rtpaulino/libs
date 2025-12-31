import { ENTITY_METADATA_KEY } from './types.js';

/**
 * Decorator that marks a class as an Entity.
 * This allows us to identify entity instances later.
 *
 * @example
 * ```typescript
 * @Entity()
 * class User {
 *   name: string;
 * }
 * ```
 */
export function Entity(): ClassDecorator {
  return function (target: Function) {
    // Store metadata on the class constructor
    Reflect.defineMetadata(ENTITY_METADATA_KEY, true, target);
  };
}
