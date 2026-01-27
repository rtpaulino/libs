/* eslint-disable @typescript-eslint/no-wrapper-object-types */
/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  AnyCtor,
  type CtorLike,
  PROPERTY_METADATA_KEY,
  PROPERTY_OPTIONS_METADATA_KEY,
  PropertyOptions,
} from './types.js';

/**
 * Property decorator that marks class properties with metadata.
 * This decorator can be used to identify and track properties within classes.
 *
 * @param options - Configuration for the property (type is required)
 *
 * @example
 * class User {
 *   @Property({ type: () => String })
 *   name: string;
 *
 *   @Property({ type: () => String, equals: (a, b) => a.toLowerCase() === b.toLowerCase() })
 *   email: string;
 *
 *   @Property({ type: () => Number })
 *   age: number;
 * }
 */
export function Property<T, C extends CtorLike<T>>(
  options: PropertyOptions<T, C>,
): PropertyDecorator {
  return (target: object, propertyKey: string | symbol): void => {
    if (typeof propertyKey !== 'string') {
      return;
    }

    const existingProperties: string[] =
      Reflect.getOwnMetadata(PROPERTY_METADATA_KEY, target) || [];

    if (!existingProperties.includes(propertyKey)) {
      existingProperties.push(propertyKey);
    }

    Reflect.defineMetadata(PROPERTY_METADATA_KEY, existingProperties, target);

    if (options.passthrough === true) {
      if (options.array === true) {
        throw new Error(
          `Property '${propertyKey}' has passthrough: true and array: true. Passthrough cannot be combined with array.`,
        );
      }
      if (options.optional === true) {
        throw new Error(
          `Property '${propertyKey}' has passthrough: true and optional: true. Passthrough cannot be combined with optional.`,
        );
      }
      if (options.sparse === true) {
        throw new Error(
          `Property '${propertyKey}' has passthrough: true and sparse: true. Passthrough cannot be combined with sparse.`,
        );
      }
      if (
        options.serialize !== undefined ||
        options.deserialize !== undefined
      ) {
        throw new Error(
          `Property '${propertyKey}' has passthrough: true and custom serialize/deserialize functions. Passthrough cannot be combined with serialize or deserialize.`,
        );
      }
    }

    if (options.sparse === true && options.array !== true) {
      throw new Error(
        `Property '${propertyKey}' has sparse: true but array is not true. The sparse option only applies to arrays.`,
      );
    }

    // Validate serialize/deserialize pairing
    const hasSerialize = options.serialize !== undefined;
    const hasDeserialize = options.deserialize !== undefined;
    if (hasSerialize !== hasDeserialize) {
      throw new Error(
        `Property '${propertyKey}' must define both serialize and deserialize functions, or neither. Found only ${hasSerialize ? 'serialize' : 'deserialize'}.`,
      );
    }

    const existingOptions: Record<
      string,
      PropertyOptions<any, any>
    > = Reflect.getOwnMetadata(PROPERTY_OPTIONS_METADATA_KEY, target) || {};

    existingOptions[propertyKey] = options;

    Reflect.defineMetadata(
      PROPERTY_OPTIONS_METADATA_KEY,
      existingOptions,
      target,
    );
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
  options?: Omit<PropertyOptions<string, StringConstructor>, 'type'>,
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
  options?: Omit<PropertyOptions<number, NumberConstructor>, 'type'>,
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
  options?: Omit<PropertyOptions<boolean, BooleanConstructor>, 'type'>,
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
  options?: Omit<PropertyOptions<Date, DateConstructor>, 'type'>,
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
  options?: Omit<PropertyOptions<bigint, BigIntConstructor>, 'type'>,
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
export function EntityProperty<T, C extends AnyCtor<T>>(
  type: () => C,
  options?: Omit<PropertyOptions<T, C>, 'type'>,
): PropertyDecorator {
  return Property<T, C>({ ...options, type });
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
export function ArrayProperty<T, C extends CtorLike<T>>(
  type: () => C,
  options?: Omit<PropertyOptions<T, C>, 'type' | 'array'>,
): PropertyDecorator {
  return Property({ ...options, type, array: true });
}

/**
 * Helper decorator for passthrough properties that bypass type validation.
 * Use this for generic types like Record<string, unknown>, any, or custom objects.
 * @example
 * class Config {
 *   @PassthroughProperty()
 *   metadata!: Record<string, unknown>;
 *
 *   @PassthroughProperty()
 *   customData!: any;
 * }
 */
export function PassthroughProperty(): PropertyDecorator {
  // Use a dummy type since type is mandatory but not used with passthrough
  return Property({ type: () => Object, passthrough: true });
}
