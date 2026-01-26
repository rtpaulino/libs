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

/**
 * Helper decorator for string properties
 * @example
 * class User {
 *   @StringProperty()
 *   name!: string;
 *
 *   @StringProperty({ optional: true })
 *   nickname?: string;
 * }
 */
export function StringProperty(
  options?: Omit<PropertyOptions<string>, 'type'>,
): PropertyDecorator {
  return Property({ ...options, type: () => String });
}

/**
 * Helper decorator for number properties
 * @example
 * class User {
 *   @NumberProperty()
 *   age!: number;
 *
 *   @NumberProperty({ optional: true })
 *   score?: number;
 * }
 */
export function NumberProperty(
  options?: Omit<PropertyOptions<number>, 'type'>,
): PropertyDecorator {
  return Property({ ...options, type: () => Number });
}

/**
 * Helper decorator for boolean properties
 * @example
 * class User {
 *   @BooleanProperty()
 *   active!: boolean;
 *
 *   @BooleanProperty({ optional: true })
 *   verified?: boolean;
 * }
 */
export function BooleanProperty(
  options?: Omit<PropertyOptions<boolean>, 'type'>,
): PropertyDecorator {
  return Property({ ...options, type: () => Boolean });
}

/**
 * Helper decorator for Date properties
 * @example
 * class User {
 *   @DateProperty()
 *   createdAt!: Date;
 *
 *   @DateProperty({ optional: true })
 *   deletedAt?: Date;
 * }
 */
export function DateProperty(
  options?: Omit<PropertyOptions<Date>, 'type'>,
): PropertyDecorator {
  return Property({ ...options, type: () => Date });
}

/**
 * Helper decorator for BigInt properties
 * @example
 * class User {
 *   @BigIntProperty()
 *   id!: bigint;
 *
 *   @BigIntProperty({ optional: true })
 *   balance?: bigint;
 * }
 */
export function BigIntProperty(
  options?: Omit<PropertyOptions<bigint>, 'type'>,
): PropertyDecorator {
  return Property({ ...options, type: () => BigInt });
}

/**
 * Helper decorator for entity properties
 * @example
 * class User {
 *   @EntityProperty(() => Address)
 *   address!: Address;
 *
 *   @EntityProperty(() => Profile, { optional: true })
 *   profile?: Profile;
 * }
 */
export function EntityProperty<T>(
  type: () => new () => T,
  options?: Omit<PropertyOptions<T>, 'type'>,
): PropertyDecorator {
  return Property({ ...options, type });
}

/**
 * Helper decorator for array properties
 * @example
 * class User {
 *   @ArrayProperty(() => String)
 *   tags!: string[];
 *
 *   @ArrayProperty(() => Phone)
 *   phones!: Phone[];
 *
 *   @ArrayProperty(() => Number, { optional: true })
 *   scores?: number[];
 *
 *   @ArrayProperty(() => String, { sparse: true })
 *   sparseList!: (string | null)[];
 * }
 */
export function ArrayProperty<T>(
  type: () => any,
  options?: Omit<PropertyOptions<T[]>, 'type' | 'array'>,
): PropertyDecorator {
  return Property({ ...options, type, array: true });
}
