/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  INJECTED_PROPERTY_METADATA_KEY,
  INJECTED_PROPERTY_OPTIONS_METADATA_KEY,
  type EntityDIToken,
} from './types.js';

/**
 * Decorator that marks a class property as an injected dependency.
 * Injected properties are not part of JSON serialization/deserialization,
 * but are manually injected into the object after construction.
 *
 * The decorated property will be accepted via the constructor just like
 * other properties, and will be injected via EntityDI when needed.
 *
 * @param token - The EntityDI token to use for resolving this dependency
 *
 * @example
 * ```typescript
 * @Entity()
 * class UserService {
 *   @Property({ type: () => String })
 *   name!: string;
 *
 *   @InjectedProperty(DatabaseToken)
 *   db!: Database;
 *
 *   constructor(data: { name: string; db: Database }) {
 *     this.name = data.name;
 *     this.db = data.db;
 *   }
 * }
 *
 * // When parsing JSON, the db property is ignored and injected afterwards
 * const json = { name: 'John' }; // No db field
 * const service = await EntityUtils.parse(UserService, json);
 * // service.db is injected via EntityDI
 * ```
 */
export function InjectedProperty<T = any>(
  token: EntityDIToken<T>,
): PropertyDecorator {
  return (target: object, propertyKey: string | symbol): void => {
    if (typeof propertyKey !== 'string') {
      return;
    }

    const existingProperties: string[] =
      Reflect.getOwnMetadata(INJECTED_PROPERTY_METADATA_KEY, target) || [];

    if (!existingProperties.includes(propertyKey)) {
      existingProperties.push(propertyKey);
    }

    Reflect.defineMetadata(
      INJECTED_PROPERTY_METADATA_KEY,
      existingProperties,
      target,
    );

    const existingOptions: Record<
      string,
      EntityDIToken<any>
    > = Reflect.getOwnMetadata(
      INJECTED_PROPERTY_OPTIONS_METADATA_KEY,
      target,
    ) || {};

    existingOptions[propertyKey] = token;

    Reflect.defineMetadata(
      INJECTED_PROPERTY_OPTIONS_METADATA_KEY,
      existingOptions,
      target,
    );
  };
}

/**
 * Get the list of injected property names for a class
 * @internal
 */
export function getInjectedPropertyNames(target: any): string[] {
  return Reflect.getOwnMetadata(INJECTED_PROPERTY_METADATA_KEY, target) || [];
}

/**
 * Get the injected property options (tokens) for a class
 * @internal
 */
export function getInjectedPropertyOptions(
  target: any,
): Record<string, EntityDIToken<any>> {
  return (
    Reflect.getOwnMetadata(INJECTED_PROPERTY_OPTIONS_METADATA_KEY, target) || {}
  );
}
