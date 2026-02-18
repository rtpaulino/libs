/* eslint-disable @typescript-eslint/no-wrapper-object-types */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { isEqual } from 'lodash-es';
import {
  AnyCtor,
  type CtorLike,
  type InstanceOfCtorLike,
  PROPERTY_METADATA_KEY,
  PROPERTY_OPTIONS_METADATA_KEY,
  POLYMORPHIC_PROPERTY_METADATA_KEY,
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
import { PolymorphicRegistry } from './polymorphic-registry.js';
import { deserializeNumberFromBigInt } from './primitive-deserializers.js';

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

    if (options.arrayValidators && options.array !== true) {
      throw new Error(
        `Property '${propertyKey}' has arrayValidators defined but array is not true. The arrayValidators option only applies to arrays.`,
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
 *
 *   @StringProperty({ minLength: 3, maxLength: 50 })
 *   username!: string;
 *
 *   @StringProperty({ pattern: /^[a-z]+$/ })
 *   slug!: string;
 * }
 */
/**
 * Creates property options for a string property with optional validation
 * Used internally by StringProperty decorator and Props.String helper
 */
export function stringPropertyOptions(
  options?: Omit<PropertyOptions<string, StringConstructor>, 'type'> & {
    minLength?: number;
    maxLength?: number;
    pattern?: RegExp;
    patternMessage?: string;
  },
): PropertyOptions<string, StringConstructor> {
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

  return {
    ...restOptions,
    type: () => String,
    validators: validators.length > 0 ? validators : undefined,
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
 *   @StringProperty({ minLength: 2, maxLength: 50 })
 *   username!: string;
 *
 *   @StringProperty({ pattern: /^[a-z]+$/, patternMessage: 'Must be lowercase letters only' })
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
  return Property(stringPropertyOptions(options));
}

/**
 * Creates property options for an enum property
 * Used internally by EnumProperty decorator and Props.Enum helper
 */
export function enumPropertyOptions<T extends Record<string, string>>(
  enumType: T,
  options?: Omit<PropertyOptions<string, StringConstructor>, 'type'>,
): PropertyOptions<string, StringConstructor> {
  const validators = options?.validators
    ? [enumValidator(enumType), ...options.validators]
    : [enumValidator(enumType)];

  return { ...options, type: () => String, validators };
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
  return Property(enumPropertyOptions(enumType, options));
}

/**
 * Creates property options for a number property
 * Used internally by NumberProperty decorator and Props.Number helper
 */
export function numberPropertyOptions(
  options?: Omit<PropertyOptions<number, NumberConstructor>, 'type'> & {
    min?: number;
    max?: number;

    /**
     * When `true`, `bigint` values and integer-formatted strings (e.g. `"-42"`) will
     * be coerced to `number` during deserialization.
     *
     * @warning Information may be lost if the `BigInt` value exceeds the safe integer
     * range for `number` (`Number.MAX_SAFE_INTEGER` / `Number.MIN_SAFE_INTEGER`).
     */
    parseBigInt?: boolean;
  },
): PropertyOptions<number, NumberConstructor> {
  const validators = [...(options?.validators || [])];

  if (options?.min !== undefined) {
    validators.unshift(minValidator(options.min));
  }
  if (options?.max !== undefined) {
    validators.unshift(maxValidator(options.max));
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { min, max, parseBigInt, ...restOptions } = options || {};

  const deserialize = parseBigInt ? deserializeNumberFromBigInt : undefined;

  return {
    ...restOptions,
    type: () => Number,
    validators: validators.length > 0 ? validators : undefined,
    ...(deserialize ? { serialize: (v: number) => v, deserialize } : {}),
  };
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
    /**
     * When `true`, `bigint` values and integer-formatted strings (e.g. `"-42"`) will
     * be coerced to `number` during deserialization.
     *
     * @warning Information may be lost if the `BigInt` value exceeds the safe integer
     * range for `number` (`Number.MAX_SAFE_INTEGER` / `Number.MIN_SAFE_INTEGER`).
     */
    parseBigInt?: boolean;
  },
): PropertyDecorator {
  return Property(numberPropertyOptions(options));
}

/**
 * Creates property options for an integer property
 * Used internally by IntProperty decorator and Props.Int helper
 */
export function intPropertyOptions(
  options?: Omit<PropertyOptions<number, NumberConstructor>, 'type'> & {
    min?: number;
    max?: number;
    /**
     * When `true`, `bigint` values and integer-formatted strings (e.g. `"-42"`) will
     * be coerced to `number` during deserialization.
     *
     * @warning Information may be lost if the `BigInt` value exceeds the safe integer
     * range for `number` (`Number.MAX_SAFE_INTEGER` / `Number.MIN_SAFE_INTEGER`).
     */
    parseBigInt?: boolean;
  },
): PropertyOptions<number, NumberConstructor> {
  const validators = [...(options?.validators || [])];

  if (options?.min !== undefined) {
    validators.unshift(minValidator(options.min));
  }
  if (options?.max !== undefined) {
    validators.unshift(maxValidator(options.max));
  }

  validators.unshift(intValidator());

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { min, max, parseBigInt, ...restOptions } = options || {};

  const deserialize = parseBigInt ? deserializeNumberFromBigInt : undefined;

  return {
    ...restOptions,
    type: () => Number,
    validators: validators.length > 0 ? validators : undefined,
    ...(deserialize ? { serialize: (v: number) => v, deserialize } : {}),
  };
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
 *
 *   @IntProperty({ min: 0, max: 100 })
 *   percentage!: number;
 * }
 */
export function IntProperty(
  options?: Omit<PropertyOptions<number, NumberConstructor>, 'type'> & {
    min?: number;
    max?: number;
    /**
     * When `true`, `bigint` values and integer-formatted strings (e.g. `"-42"`) will
     * be coerced to `number` during deserialization.
     *
     * @warning Information may be lost if the `BigInt` value exceeds the safe integer
     * range for `number` (`Number.MAX_SAFE_INTEGER` / `Number.MIN_SAFE_INTEGER`).
     */
    parseBigInt?: boolean;
  },
): PropertyDecorator {
  return Property(intPropertyOptions(options));
}

/**
 * Creates property options for a boolean property
 * Used internally by BooleanProperty decorator and Props.Boolean helper
 */
export function booleanPropertyOptions(
  options?: Omit<PropertyOptions<boolean, BooleanConstructor>, 'type'>,
): PropertyOptions<boolean, BooleanConstructor> {
  return { ...options, type: () => Boolean };
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
  return Property(booleanPropertyOptions(options));
}

/**
 * Creates property options for a Date property
 * Used internally by DateProperty decorator and Props.Date helper
 */
export function datePropertyOptions(
  options?: Omit<PropertyOptions<Date, DateConstructor>, 'type'>,
): PropertyOptions<Date, DateConstructor> {
  return { ...options, type: () => Date };
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
  return Property(datePropertyOptions(options));
}

/**
 * Creates property options for a BigInt property
 * Used internally by BigIntProperty decorator and Props.BigInt helper
 */
export function bigIntPropertyOptions(
  options?: Omit<PropertyOptions<bigint, BigIntConstructor>, 'type'>,
): PropertyOptions<bigint, BigIntConstructor> {
  return { ...options, type: () => BigInt };
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
  return Property(bigIntPropertyOptions(options));
}

/**
 * Creates property options for an entity property
 * Used internally by EntityProperty decorator and Props.Entity helper
 */
export function entityPropertyOptions<
  T,
  C extends AnyCtor<T> & { new (data: any): T },
>(
  type: () => C,
  options?: Omit<PropertyOptions<T, C>, 'type'>,
): PropertyOptions<T, C> {
  return { ...options, type };
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
  return Property<T, C>(entityPropertyOptions(type, options));
}

/**
 * Creates property options for an array property
 * Used internally by ArrayProperty decorator and Props.Array helper
 */
export function arrayPropertyOptions<T, C extends CtorLike<T>>(
  type: () => C,
  options?: Omit<PropertyOptions<T, C>, 'type' | 'array'> & {
    minLength?: number;
    maxLength?: number;
  },
): PropertyOptions<T, C> {
  const validators = [...(options?.arrayValidators || [])];

  if (options?.minLength !== undefined) {
    validators.unshift(arrayMinLengthValidator(options.minLength));
  }
  if (options?.maxLength !== undefined) {
    validators.unshift(arrayMaxLengthValidator(options.maxLength));
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { minLength, maxLength, ...restOptions } = options || {};

  return {
    ...restOptions,
    type,
    array: true,
    arrayValidators: validators.length > 0 ? validators : undefined,
  };
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
 * Creates property options for a passthrough property
 * Used internally by PassthroughProperty decorator and Props.Passthrough helper
 */
export function passthroughPropertyOptions(
  options?: Omit<PropertyOptions, 'type' | 'passthrough'>,
): PropertyOptions {
  return { ...options, type: () => Object, passthrough: true };
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
  return Property(passthroughPropertyOptions());
}

/**
 * Property options for stringifiable types (types with toString() and static parse())
 * Used internally by StringifiableProperty decorator and EntityProps.Stringifiable helper
 */
export function stringifiablePropertyOptions<
  T extends { equals?(other: T): boolean; toString(): string },
  C extends CtorLike<T> & { parse(value: string): T },
>(
  type: () => C,
  options?: Omit<
    PropertyOptions<T, C>,
    'serialize' | 'deserialize' | 'passthrough' | 'type' | 'equals'
  >,
): PropertyOptions<T, C> {
  return {
    ...options,
    type,
    equals: (a, b) => (a.equals ? a.equals(b) : a.toString() === b.toString()),
    serialize: (value) => value.toString(),
    deserialize: (value) => {
      if (typeof value === 'string') {
        return type().parse(value) as InstanceOfCtorLike<C>;
      }
      throw new Error(`Invalid value ${type().name}: ${String(value)}`);
    },
  };
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
  Property<T, C>(stringifiablePropertyOptions(type, data));

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

/**
 * Helper decorator for discriminated entity properties.
 * The entity type is determined at runtime using a discriminator property.
 * Unlike EntityProperty, this does not require the type parameter upfront.
 *
 * @param options - Configuration for the discriminated property
 *
 * @example
 * ```typescript
 * // Define entity types
 * @Entity({ name: 'Circle' })
 * class Circle {
 *   @StringProperty() readonly type = 'Circle';
 *   @NumberProperty() radius!: number;
 *   constructor(data: Partial<Circle>) { Object.assign(this, data); }
 * }
 *
 * @Entity({ name: 'Rectangle' })
 * class Rectangle {
 *   @StringProperty() readonly type = 'Rectangle';
 *   @NumberProperty() width!: number;
 *   @NumberProperty() height!: number;
 *   constructor(data: Partial<Rectangle>) { Object.assign(this, data); }
 * }
 *
 * // Use discriminated property
 * @Entity()
 * class Drawing {
 *   @DiscriminatedEntityProperty()
 *   shape!: Circle | Rectangle;
 *
 *   @DiscriminatedEntityProperty({ discriminatorProperty: 'entityType' })
 *   item!: BaseItem;
 * }
 *
 * // When serialized, the discriminator is included inline:
 * // { shape: { __type: 'Circle', radius: 5 } }
 *
 * // When deserialized, the discriminator is used to determine the type:
 * const drawing = await EntityUtils.parse(Drawing, {
 *   shape: { __type: 'Circle', radius: 5 }
 * });
 * // drawing.shape is a Circle instance
 * ```
 */
/**
 * Creates property options for a discriminated entity property
 * Used internally by DiscriminatedEntityProperty decorator and EntityProps.DiscriminatedEntity helper
 */
export function discriminatedEntityPropertyOptions(
  options?: Omit<PropertyOptions<any, any>, 'type' | 'discriminated'> & {
    discriminatorProperty?: string;
  },
): PropertyOptions<any, any> {
  const discriminatorProperty = options?.discriminatorProperty ?? '__type';

  return {
    ...options,
    discriminated: true,
    discriminatorProperty,
  };
}

export function DiscriminatedEntityProperty(
  options?: Omit<PropertyOptions<any, any>, 'type' | 'discriminated'> & {
    discriminatorProperty?: string;
  },
): PropertyDecorator {
  return Property(discriminatedEntityPropertyOptions(options));
}

/**
 * Decorator that marks a property as a polymorphic discriminator.
 *
 * Used for class hierarchies where an abstract base class has multiple concrete implementations,
 * and the discriminator property value determines which subclass to instantiate.
 *
 * The discriminator is a regular class property (not injected during serialization like @DiscriminatedEntityProperty).
 *
 * This decorator can be used standalone (it will treat the property as a string) or combined
 * with another type decorator for more specific typing.
 *
 * @param enumType - Optional enum, union type, or stringifiable type for the discriminator (used for validation and schema generation)
 *
 * @example
 * ```typescript
 * // With regular enum
 * enum SchemaPropertyType {
 *   STRING = 'string',
 *   NUMBER = 'number',
 * }
 *
 * @Entity()
 * abstract class SchemaProperty {
 *   @StringProperty({ minLength: 1 })
 *   name!: string;
 *
 *   @PolymorphicProperty(SchemaPropertyType)
 *   type!: SchemaPropertyType;
 * }
 *
 * @Entity()
 * @PolymorphicVariant(SchemaProperty, SchemaPropertyType.STRING)
 * class StringSchemaProperty extends SchemaProperty {
 *   type = SchemaPropertyType.STRING;
 *
 *   @IntProperty({ optional: true })
 *   minLength?: number;
 * }
 *
 * // With stringifiable type
 * class Status {
 *   static ACTIVE = new Status('active');
 *   static INACTIVE = new Status('inactive');
 *
 *   constructor(private value: string) {}
 *   toString() { return this.value; }
 *   static parse(value: string) {
 *     if (value === 'active') return Status.ACTIVE;
 *     if (value === 'inactive') return Status.INACTIVE;
 *     throw new Error('Invalid status');
 *   }
 * }
 *
 * @Entity()
 * abstract class Record {
 *   @PolymorphicProperty(() => Status)
 *   status!: Status;
 * }
 *
 * // Parsing automatically instantiates the correct subclass
 * const data = { name: 'age', type: 'string', minLength: 5 };
 * const prop = await EntityUtils.parse(SchemaProperty, data);
 * // prop is StringSchemaProperty instance
 * ```
 */
export function PolymorphicProperty<
  T extends { equals?(other: T): boolean; toString(): string },
  C extends CtorLike<T> & { parse(value: string): T },
>(enumTypeOrFactory?: Record<string, string> | (() => C)): PropertyDecorator {
  return (target: object, propertyKey: string | symbol): void => {
    if (typeof propertyKey !== 'string') {
      return;
    }

    // Store the polymorphic property metadata
    Reflect.defineMetadata(
      POLYMORPHIC_PROPERTY_METADATA_KEY,
      propertyKey,
      target.constructor,
    );

    // Register in PolymorphicRegistry
    PolymorphicRegistry.setDiscriminatorProperty(
      target.constructor,
      propertyKey,
    );

    // Check if property already has options (from another decorator)
    const existingOptions: PropertyOptions | undefined = Reflect.getOwnMetadata(
      PROPERTY_OPTIONS_METADATA_KEY,
      target,
      propertyKey,
    );

    if (existingOptions) {
      // Update existing options to add polymorphic flags
      const updatedOptions: PropertyOptions = {
        ...existingOptions,
        polymorphicDiscriminator: true,
        polymorphicEnumType: enumTypeOrFactory,
      };

      Reflect.defineMetadata(
        PROPERTY_OPTIONS_METADATA_KEY,
        updatedOptions,
        target,
        propertyKey,
      );
    } else {
      // No existing decorator - check if it's a stringifiable type or enum
      const isStringifiable = typeof enumTypeOrFactory === 'function';

      if (isStringifiable) {
        // Apply StringifiableProperty decorator with polymorphic flags
        const stringifiableOpts = stringifiablePropertyOptions(
          enumTypeOrFactory as () => C,
        );
        const options: PropertyOptions = {
          ...stringifiableOpts,
          polymorphicDiscriminator: true,
          polymorphicEnumType: enumTypeOrFactory,
        };

        Property(options)(target, propertyKey);
      } else {
        // Apply Property decorator with string type (for enum discriminators)
        const options: PropertyOptions = {
          type: () => String,
          polymorphicDiscriminator: true,
          polymorphicEnumType: enumTypeOrFactory,
        };

        Property(options)(target, propertyKey);
      }
    }
  };
}
