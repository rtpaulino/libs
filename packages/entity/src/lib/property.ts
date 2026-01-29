/* eslint-disable @typescript-eslint/no-wrapper-object-types */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { isEqual } from 'lodash-es';
import {
  AnyCtor,
  type CtorLike,
  type InstanceOfCtorLike,
  PROPERTY_METADATA_KEY,
  PROPERTY_OPTIONS_METADATA_KEY,
  PropertyOptions,
} from './types.js';
import {
  enumValidator,
  intValidator,
  minLengthValidator,
  maxLengthValidator,
  patternValidator,
  minValidator,
  maxValidator,
  arrayMinLengthValidator,
  arrayMaxLengthValidator,
} from './validators.js';

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
      if (options.collection === true) {
        throw new Error(
          `Property '${propertyKey}' has passthrough: true and collection: true. Passthrough cannot be combined with collection.`,
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

    if (options.arrayValidators && options.array !== true) {
      throw new Error(
        `Property '${propertyKey}' has arrayValidators defined but array is not true. The arrayValidators option only applies to arrays.`,
      );
    }

    if (options.collection === true) {
      if (options.array === true) {
        throw new Error(
          `Property '${propertyKey}' has collection: true and array: true. Collection cannot be combined with array.`,
        );
      }
      if (options.passthrough === true) {
        throw new Error(
          `Property '${propertyKey}' has collection: true and passthrough: true. Collection cannot be combined with passthrough.`,
        );
      }
      if (
        options.serialize !== undefined ||
        options.deserialize !== undefined
      ) {
        throw new Error(
          `Property '${propertyKey}' has collection: true and custom serialize/deserialize functions. Collection cannot be combined with serialize or deserialize.`,
        );
      }
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
 *
 *   @StringProperty({ minLength: 3, maxLength: 50 })
 *   username!: string;
 *
 *   @StringProperty({ pattern: /^[a-z]+$/ })
 *   slug!: string;
 * }
 */
export function StringProperty(
  options?: Omit<PropertyOptions<string, StringConstructor>, 'type'> & {
    minLength?: number;
    maxLength?: number;
    pattern?: RegExp;
    patternMessage?: string;
  },
): PropertyDecorator {
  const validators = [...(options?.validators || [])];

  if (options?.minLength !== undefined) {
    validators.unshift(minLengthValidator(options.minLength));
  }
  if (options?.maxLength !== undefined) {
    validators.unshift(maxLengthValidator(options.maxLength));
  }
  if (options?.pattern !== undefined) {
    validators.unshift(
      patternValidator(options.pattern, options.patternMessage),
    );
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { minLength, maxLength, pattern, patternMessage, ...restOptions } =
    options || {};

  return Property({
    ...restOptions,
    type: () => String,
    validators: validators.length > 0 ? validators : undefined,
  });
}

/**
 * Helper decorator for enum properties (string enums)
 * Validates that the string value matches one of the enum values
 * @param enumType - The enum object (e.g., MyEnum)
 * @param options - Additional property options
 * @example
 * enum Status {
 *   Active = 'active',
 *   Inactive = 'inactive'
 * }
 *
 * class User {
 *   @EnumProperty(Status)
 *   status!: Status;
 *
 *   @EnumProperty(Status, { optional: true })
 *   previousStatus?: Status;
 * }
 */
export function EnumProperty<T extends Record<string, string>>(
  enumType: T,
  options?: Omit<PropertyOptions<string, StringConstructor>, 'type'>,
): PropertyDecorator {
  const validators = options?.validators
    ? [enumValidator(enumType), ...options.validators]
    : [enumValidator(enumType)];

  return Property({ ...options, type: () => String, validators });
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
 *
 *   @NumberProperty({ min: 0, max: 100 })
 *   percentage!: number;
 * }
 */
export function NumberProperty(
  options?: Omit<PropertyOptions<number, NumberConstructor>, 'type'> & {
    min?: number;
    max?: number;
  },
): PropertyDecorator {
  const validators = [...(options?.validators || [])];

  if (options?.min !== undefined) {
    validators.unshift(minValidator(options.min));
  }
  if (options?.max !== undefined) {
    validators.unshift(maxValidator(options.max));
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { min, max, ...restOptions } = options || {};

  return Property({
    ...restOptions,
    type: () => Number,
    validators: validators.length > 0 ? validators : undefined,
  });
}

/**
 * Helper decorator for integer properties
 * Validates that the number is an integer (no decimal places)
 * @example
 * class User {
 *   @IntProperty()
 *   age!: number;
 *
 *   @IntProperty({ optional: true })
 *   count?: number;
 * }
 */
export function IntProperty(
  options?: Omit<PropertyOptions<number, NumberConstructor>, 'type'>,
): PropertyDecorator {
  const validators = options?.validators
    ? [intValidator(), ...options.validators]
    : [intValidator()];

  return Property({ ...options, type: () => Number, validators });
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
export function EntityProperty<
  T,
  C extends AnyCtor<T> & { new (data: any): T },
>(
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
 *
 *   @ArrayProperty(() => String, { minLength: 1, maxLength: 10 })
 *   limitedList!: string[];
 * }
 */
export function ArrayProperty<T, C extends CtorLike<T>>(
  type: () => C,
  options?: Omit<PropertyOptions<T, C>, 'type' | 'array'> & {
    minLength?: number;
    maxLength?: number;
  },
): PropertyDecorator {
  const arrayValidators = [...(options?.arrayValidators || [])];

  if (options?.minLength !== undefined) {
    arrayValidators.unshift(arrayMinLengthValidator(options.minLength));
  }
  if (options?.maxLength !== undefined) {
    arrayValidators.unshift(arrayMaxLengthValidator(options.maxLength));
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { minLength, maxLength, ...restOptions } = options || {};

  return Property({
    ...restOptions,
    type,
    array: true,
    arrayValidators: arrayValidators.length > 0 ? arrayValidators : undefined,
  });
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

export const StringifiableProperty = <
  T extends { equals?(other: T): boolean; toString(): string },
  C extends CtorLike<T> & { parse(value: string): T },
>(
  type: () => C,
  data: Omit<
    PropertyOptions<T, C>,
    'serialize' | 'deserialize' | 'passthrough' | 'type' | 'equals'
  > = {},
): PropertyDecorator =>
  Property<T, C>({
    ...data,
    type,
    equals: (a, b) => (a.equals ? a.equals(b) : a.toString() === b.toString()),
    serialize: (value) => value.toString(),
    deserialize: (value) => {
      if (typeof value === 'string') {
        return type().parse(value) as InstanceOfCtorLike<C>;
      }
      throw new Error(`Invalid value ${type().name}: ${String(value)}`);
    },
  });

export const SerializableProperty = <
  T extends { equals?(other: T): boolean; toJSON(): unknown },
  C extends CtorLike<T> & { parse(value: unknown): T },
>(
  type: () => C,
  data: Omit<
    PropertyOptions<T, C>,
    'serialize' | 'deserialize' | 'passthrough' | 'type' | 'equals'
  > = {},
) =>
  Property({
    ...data,
    type,
    equals: (a: T, b: T) =>
      a.equals ? a.equals(b) : isEqual(a.toJSON(), b.toJSON()),
    serialize: (value: T) => value.toJSON(),
    deserialize: (value: unknown) => {
      return type().parse(value) as InstanceOfCtorLike<C>;
    },
  });
