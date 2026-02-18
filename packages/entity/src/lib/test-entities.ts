import 'reflect-metadata';
import { z } from 'zod';
import {
  Entity,
  CollectionEntity,
  Stringifiable,
  EntityValidator,
} from './entity.js';
import {
  Property,
  StringProperty,
  NumberProperty,
  IntProperty,
  BooleanProperty,
  DateProperty,
  BigIntProperty,
  EnumProperty,
  EntityProperty,
  ArrayProperty,
  PassthroughProperty,
  SerializableProperty,
  StringifiableProperty,
} from './property.js';
import { InjectedProperty } from './injected-property.js';
import { ZodProperty } from './zod-property.js';
import { Problem } from './problem.js';

// ============================================================================
// SIMPLE ENTITIES WITH PRIMITIVES
// ============================================================================

/**
 * Basic entity with common primitive types
 * Features: String, Number, Boolean properties
 */
@Entity()
export class TestUser {
  @StringProperty() name!: string;
  @NumberProperty() age!: number;
  @BooleanProperty() active!: boolean;

  constructor(data: { name: string; age: number; active: boolean }) {
    this.name = data.name;
    this.age = data.age;
    this.active = data.active;
  }
}

/**
 * Entity with different primitive combinations
 * Features: String, Number, Int, Date properties
 */
@Entity()
export class TestProduct {
  @StringProperty() id!: string;
  @StringProperty() name!: string;
  @NumberProperty() price!: number;
  @IntProperty() quantity!: number;
  @DateProperty() createdAt!: Date;

  constructor(data: {
    id: string;
    name: string;
    price: number;
    quantity: number;
    createdAt: Date;
  }) {
    this.id = data.id;
    this.name = data.name;
    this.price = data.price;
    this.quantity = data.quantity;
    this.createdAt = data.createdAt;
  }
}

// ============================================================================
// ENTITIES WITH SPECIAL TYPES
// ============================================================================

/**
 * Entity with Date and BigInt types
 * Features: DateProperty, BigIntProperty
 */
@Entity()
export class EntityWithSpecialTypes {
  @DateProperty() timestamp!: Date;
  @BigIntProperty() largeNumber!: bigint;
  @StringProperty() label!: string;

  constructor(data: { timestamp: Date; largeNumber: bigint; label: string }) {
    this.timestamp = data.timestamp;
    this.largeNumber = data.largeNumber;
    this.label = data.label;
  }
}

// ============================================================================
// ENTITIES WITH VALIDATION
// ============================================================================

/**
 * Entity with property-level validators
 * Features: String validators (minLength, maxLength, pattern)
 */
@Entity()
export class ValidatedEntity {
  @StringProperty({
    minLength: 3,
    maxLength: 20,
  })
  username!: string;

  @StringProperty({
    pattern: /^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$/i,
  })
  email!: string;

  @NumberProperty({ min: 0, max: 150 })
  age!: number;

  constructor(data: { username: string; email: string; age: number }) {
    this.username = data.username;
    this.email = data.email;
    this.age = data.age;
  }
}

/**
 * Entity with cross-property validation
 * Features: @EntityValidator decorator
 */
@Entity()
export class CrossValidatedEntity {
  @StringProperty() password!: string;
  @StringProperty() confirmPassword!: string;
  @DateProperty() startDate!: Date;
  @DateProperty() endDate!: Date;

  constructor(data: {
    password: string;
    confirmPassword: string;
    startDate: Date;
    endDate: Date;
  }) {
    this.password = data.password;
    this.confirmPassword = data.confirmPassword;
    this.startDate = data.startDate;
    this.endDate = data.endDate;
  }

  @EntityValidator()
  validatePasswords(): Problem[] {
    if (this.password !== this.confirmPassword) {
      return [
        new Problem({
          property: 'confirmPassword',
          message: 'Passwords do not match',
        }),
      ];
    }
    return [];
  }

  @EntityValidator()
  validateDates(): Problem[] {
    if (this.startDate >= this.endDate) {
      return [
        new Problem({
          property: 'endDate',
          message: 'End date must be after start date',
        }),
      ];
    }
    return [];
  }
}

// ============================================================================
// ENTITIES WITH OPTIONAL/REQUIRED FIELDS
// ============================================================================

/**
 * Entity with mix of optional and required properties
 * Features: optional flag
 */
@Entity()
export class OptionalFieldsEntity {
  @StringProperty() requiredField!: string;
  @StringProperty({ optional: true }) optionalField?: string;
  @NumberProperty({ optional: true }) optionalNumber?: number;
  @BooleanProperty() requiredBoolean!: boolean;

  constructor(data: {
    requiredField: string;
    optionalField?: string;
    optionalNumber?: number;
    requiredBoolean: boolean;
  }) {
    this.requiredField = data.requiredField;
    this.optionalField = data.optionalField;
    this.optionalNumber = data.optionalNumber;
    this.requiredBoolean = data.requiredBoolean;
  }
}

// ============================================================================
// ENTITIES WITH DEFAULT VALUES
// ============================================================================

let factoryCallCount = 0;

/**
 * Entity with various default value strategies
 * Features: Static defaults, factory defaults, async factory defaults
 */
@Entity()
export class EntityWithDefaults {
  @StringProperty({ default: 'default-name' })
  name!: string;

  @NumberProperty({ default: () => factoryCallCount++ })
  counter!: number;

  @DateProperty({ default: () => new Date('2025-01-01') })
  timestamp!: Date;

  @StringProperty({ default: async () => 'async-value' })
  asyncField!: string;

  @BooleanProperty({ default: true })
  enabled!: boolean;

  constructor(data: {
    name?: string;
    counter?: number;
    timestamp?: Date;
    asyncField?: string;
    enabled?: boolean;
  }) {
    this.name = data.name!;
    this.counter = data.counter!;
    this.timestamp = data.timestamp!;
    this.asyncField = data.asyncField!;
    this.enabled = data.enabled!;
  }
}

// ============================================================================
// ENTITIES WITH ARRAYS
// ============================================================================

/**
 * Entity with various array configurations
 * Features: Regular arrays, sparse arrays, array validators
 */
@Entity()
export class EntityWithArrays {
  @ArrayProperty(() => String)
  tags!: string[];

  @ArrayProperty(() => Number, {
    minLength: 1,
    maxLength: 5,
  })
  ratings!: number[];

  @ArrayProperty(() => String, { sparse: true })
  sparseArray!: (string | null | undefined)[];

  @ArrayProperty(() => TestUser)
  users!: TestUser[];

  constructor(data: {
    tags: string[];
    ratings: number[];
    sparseArray: (string | null | undefined)[];
    users: TestUser[];
  }) {
    this.tags = data.tags;
    this.ratings = data.ratings;
    this.sparseArray = data.sparseArray;
    this.users = data.users;
  }
}

// ============================================================================
// ENTITIES WITH ENUMS
// ============================================================================

export enum UserRole {
  ADMIN = 'admin',
  USER = 'user',
  GUEST = 'guest',
}

export enum ProductStatus {
  DRAFT = 'draft',
  PUBLISHED = 'published',
  ARCHIVED = 'archived',
}

/**
 * Entity with enum properties
 * Features: EnumProperty decorator
 */
@Entity()
export class EntityWithEnum {
  @StringProperty() name!: string;
  @EnumProperty(UserRole) role!: UserRole;
  @EnumProperty(ProductStatus) status!: ProductStatus;

  constructor(data: { name: string; role: UserRole; status: ProductStatus }) {
    this.name = data.name;
    this.role = data.role;
    this.status = data.status;
  }
}

// ============================================================================
// NESTED ENTITIES (2-3 LEVELS)
// ============================================================================

/**
 * Level 1: Simple address entity
 * Features: Basic nested entity
 */
@Entity()
export class TestAddress {
  @StringProperty() street!: string;
  @StringProperty() city!: string;
  @StringProperty() country!: string;
  @IntProperty() zipCode!: number;

  constructor(data: {
    street: string;
    city: string;
    country: string;
    zipCode: number;
  }) {
    this.street = data.street;
    this.city = data.city;
    this.country = data.country;
    this.zipCode = data.zipCode;
  }
}

/**
 * Level 2: Company with nested address
 * Features: 1-level nesting
 */
@Entity()
export class TestCompany {
  @StringProperty() name!: string;
  @EntityProperty(() => TestAddress) address!: TestAddress;
  @IntProperty() employeeCount!: number;

  constructor(data: {
    name: string;
    address: TestAddress;
    employeeCount: number;
  }) {
    this.name = data.name;
    this.address = data.address;
    this.employeeCount = data.employeeCount;
  }
}

/**
 * Level 3: Employee with nested company (which has nested address)
 * Features: 2-level nesting
 */
@Entity()
export class TestEmployee {
  @StringProperty() name!: string;
  @StringProperty() email!: string;
  @EntityProperty(() => TestCompany) company!: TestCompany;
  @NumberProperty() salary!: number;
  @DateProperty() hireDate!: Date;

  constructor(data: {
    name: string;
    email: string;
    company: TestCompany;
    salary: number;
    hireDate: Date;
  }) {
    this.name = data.name;
    this.email = data.email;
    this.company = data.company;
    this.salary = data.salary;
    this.hireDate = data.hireDate;
  }
}

/**
 * Entity with optional nested entities
 * Features: Optional nested entities
 */
@Entity()
export class EntityWithOptionalNested {
  @StringProperty() id!: string;
  @EntityProperty(() => TestAddress, { optional: true })
  billingAddress?: TestAddress;
  @EntityProperty(() => TestAddress, { optional: true })
  shippingAddress?: TestAddress;

  constructor(data: {
    id: string;
    billingAddress?: TestAddress;
    shippingAddress?: TestAddress;
  }) {
    this.id = data.id;
    this.billingAddress = data.billingAddress;
    this.shippingAddress = data.shippingAddress;
  }
}

// ============================================================================
// COLLECTION ENTITIES
// ============================================================================

/**
 * Collection entity wrapping string array
 * Features: @CollectionEntity decorator, unwraps to array
 */
@CollectionEntity()
export class TestTags {
  @ArrayProperty(() => String)
  readonly collection: string[];

  constructor(data: { collection: string[] }) {
    this.collection = data.collection;
  }
}

/**
 * Collection entity wrapping number array
 * Features: @CollectionEntity with numbers
 */
@CollectionEntity()
export class TestIdList {
  @ArrayProperty(() => Number)
  readonly collection: number[];

  constructor(data: { collection: number[] }) {
    this.collection = data.collection;
  }
}

/**
 * Collection entity with entity items
 * Features: @CollectionEntity with nested entities
 */
@CollectionEntity()
export class TestUserCollection {
  @ArrayProperty(() => TestUser)
  readonly collection: TestUser[];

  constructor(data: { collection: TestUser[] }) {
    this.collection = data.collection;
  }
}

// ============================================================================
// STRINGIFIABLE ENTITIES
// ============================================================================

/**
 * Stringifiable entity for user IDs
 * Features: @Stringifiable decorator, unwraps to string
 */
@Stringifiable()
export class TestUserId {
  @StringProperty() readonly value: string;

  constructor(data: { value: string }) {
    this.value = data.value;
  }
}

/**
 * Stringifiable entity for emails with validation
 * Features: @Stringifiable with validation
 */
@Stringifiable()
export class TestEmail {
  @StringProperty({
    pattern: /^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$/i,
  })
  readonly value: string;

  constructor(data: { value: string }) {
    this.value = data.value;
  }
}

/**
 * Entity using stringifiable properties
 * Features: Properties that are stringifiable entities
 */
@Entity()
export class EntityWithStringifiable {
  @EntityProperty(() => TestUserId) userId!: TestUserId;
  @EntityProperty(() => TestEmail) email!: TestEmail;
  @StringProperty() name!: string;

  constructor(data: { userId: TestUserId; email: TestEmail; name: string }) {
    this.userId = data.userId;
    this.email = data.email;
    this.name = data.name;
  }
}

// ============================================================================
// ENTITIES WITH DEPENDENCY INJECTION
// ============================================================================

export interface ILogger {
  log(message: string): void;
}

export const LOGGER_TOKEN = Symbol('Logger');

/**
 * Entity with injected properties
 * Features: @InjectedProperty decorator
 */
@Entity()
export class EntityWithDI {
  @StringProperty() name!: string;
  @InjectedProperty(LOGGER_TOKEN) logger!: ILogger;

  constructor(data: { name: string; logger?: ILogger }) {
    this.name = data.name;
    if (data.logger) {
      this.logger = data.logger;
    }
  }

  logName(): void {
    this.logger.log(`Name is: ${this.name}`);
  }
}

// ============================================================================
// ENTITIES WITH PASSTHROUGH
// ============================================================================

/**
 * Entity with passthrough properties
 * Features: @PassthroughProperty for unknown types
 */
@Entity()
export class EntityWithPassthrough {
  @StringProperty() id!: string;
  @PassthroughProperty() metadata!: Record<string, unknown>;
  @PassthroughProperty() config!: unknown;

  constructor(data: {
    id: string;
    metadata: Record<string, unknown>;
    config: unknown;
  }) {
    this.id = data.id;
    this.metadata = data.metadata;
    this.config = data.config;
  }
}

// ============================================================================
// ENTITIES WITH CUSTOM SERIALIZATION
// ============================================================================

/**
 * Custom serializable class
 */
export class CustomValue {
  constructor(
    public x: number,
    public y: number,
  ) {}

  toData() {
    return { x: this.x, y: this.y };
  }

  static fromData(data: { x: number; y: number }): CustomValue {
    return new CustomValue(data.x, data.y);
  }
}

/**
 * Entity with custom serialize/deserialize
 * Features: Custom serialization functions
 */
@Entity()
export class EntityWithCustomSerialization {
  @StringProperty() name!: string;

  @Property({
    type: () => CustomValue,
    serialize: (v: CustomValue) => v.toData(),
    deserialize: (d: unknown) =>
      CustomValue.fromData(d as { x: number; y: number }),
  })
  position!: CustomValue;

  constructor(data: { name: string; position: CustomValue }) {
    this.name = data.name;
    this.position = data.position;
  }
}

/**
 * Custom class with equals method
 */
export class CustomPoint {
  constructor(
    public x: number,
    public y: number,
  ) {}

  equals(other: CustomPoint): boolean {
    return this.x === other.x && this.y === other.y;
  }

  toString(): string {
    return `${this.x},${this.y}`;
  }

  static fromString(str: string): CustomPoint {
    const [x, y] = str.split(',').map(Number);
    return new CustomPoint(x, y);
  }
}

/**
 * Entity with custom equals function
 * Features: Custom equality comparison
 */
@Entity()
export class EntityWithCustomEquals {
  @StringProperty() id!: string;

  @Property({
    type: () => CustomPoint,
    serialize: (v: CustomPoint) => v.toString(),
    deserialize: (d: unknown) => CustomPoint.fromString(d as string),
    equals: (a: CustomPoint, b: CustomPoint) => a.equals(b),
  })
  location!: CustomPoint;

  constructor(data: { id: string; location: CustomPoint }) {
    this.id = data.id;
    this.location = data.location;
  }
}

// ============================================================================
// ENTITIES WITH SERIALIZABLE/PARSEABLE PROPERTIES
// ============================================================================

/**
 * Custom class implementing Serializable interface
 */
export class SerializableValue {
  constructor(public data: string) {}

  toJSON(): string {
    return this.data;
  }

  equals(other: SerializableValue): boolean {
    return this.data === other.data;
  }

  static parse(json: unknown): SerializableValue {
    return new SerializableValue(json as string);
  }
}

/**
 * Entity using SerializableProperty
 * Features: @SerializableProperty decorator
 */
@Entity()
export class EntityWithSerializable {
  @StringProperty() name!: string;
  @SerializableProperty(() => SerializableValue)
  value!: SerializableValue;

  constructor(data: { name: string; value: SerializableValue }) {
    this.name = data.name;
    this.value = data.value;
  }
}

/**
 * Custom class implementing Parseable interface
 */
export class ParseableValue {
  constructor(public data: number) {}

  toString(): string {
    return String(this.data);
  }

  equals(other: ParseableValue): boolean {
    return this.data === other.data;
  }

  static parse(str: string): ParseableValue {
    return new ParseableValue(Number(str));
  }
}

/**
 * Entity using StringifiableProperty
 * Features: @StringifiableProperty decorator
 */
@Entity()
export class EntityWithParseable {
  @StringProperty() label!: string;
  @StringifiableProperty(() => ParseableValue)
  value!: ParseableValue;

  constructor(data: { label: string; value: ParseableValue }) {
    this.label = data.label;
    this.value = data.value;
  }
}

// ============================================================================
// ENTITIES WITH ZOD VALIDATION
// ============================================================================

const emailSchema = z.string().email();
const positiveIntSchema = z.number().int().positive();

/**
 * Entity with Zod validation
 * Features: @ZodProperty decorator
 */
@Entity()
export class EntityWithZod {
  @ZodProperty(z.string().min(3).max(20))
  username!: string;

  @ZodProperty(emailSchema)
  email!: string;

  @ZodProperty(positiveIntSchema)
  count!: number;

  constructor(data: { username: string; email: string; count: number }) {
    this.username = data.username;
    this.email = data.email;
    this.count = data.count;
  }
}

// ============================================================================
// ENTITIES WITH IMMUTABLE PROPERTIES
// ============================================================================

/**
 * Entity with immutable (preventUpdates) properties
 * Features: preventUpdates flag
 */
@Entity()
export class EntityWithImmutable {
  @StringProperty({ preventUpdates: true })
  readonly id: string;

  @StringProperty() name!: string;

  @DateProperty({ preventUpdates: true })
  readonly createdAt: Date;

  @NumberProperty() value!: number;

  constructor(data: {
    id: string;
    name: string;
    createdAt: Date;
    value: number;
  }) {
    this.id = data.id;
    this.name = data.name;
    this.createdAt = data.createdAt;
    this.value = data.value;
  }
}

// ============================================================================
// COMPLEX ENTITY (COMBINING MULTIPLE FEATURES)
// ============================================================================

/**
 * Complex entity combining multiple features
 * Features: All common features in one entity
 * - Primitives, enums, nested entities, arrays
 * - Optional fields, defaults, validation
 * - Custom serialization, stringifiable properties
 */
@Entity()
export class ComplexEntity {
  @StringProperty({ preventUpdates: true })
  readonly id: string;

  @StringProperty({ minLength: 2, maxLength: 50 })
  name!: string;

  @EnumProperty(UserRole)
  role!: UserRole;

  @EntityProperty(() => TestUserId)
  userId!: TestUserId;

  @EntityProperty(() => TestAddress)
  address!: TestAddress;

  @ArrayProperty(() => String, { minLength: 0, maxLength: 10 })
  tags!: string[];

  @ArrayProperty(() => TestProduct)
  products!: TestProduct[];

  @NumberProperty({ optional: true, min: 0 })
  score?: number;

  @DateProperty({ default: () => new Date() })
  createdAt!: Date;

  @DateProperty({ optional: true })
  updatedAt?: Date;

  @BooleanProperty({ default: true })
  active!: boolean;

  @PassthroughProperty()
  metadata!: Record<string, unknown>;

  constructor(data: {
    id: string;
    name: string;
    role: UserRole;
    userId: TestUserId;
    address: TestAddress;
    tags: string[];
    products: TestProduct[];
    score?: number;
    createdAt?: Date;
    updatedAt?: Date;
    active?: boolean;
    metadata: Record<string, unknown>;
  }) {
    this.id = data.id;
    this.name = data.name;
    this.role = data.role;
    this.userId = data.userId;
    this.address = data.address;
    this.tags = data.tags;
    this.products = data.products;
    this.score = data.score;
    this.createdAt = data.createdAt!;
    this.updatedAt = data.updatedAt;
    this.active = data.active!;
    this.metadata = data.metadata;
  }

  @EntityValidator()
  validateProducts(): Problem[] {
    if (this.products.length === 0 && this.active) {
      return [
        new Problem({
          property: 'products',
          message: 'Active entity must have at least one product',
        }),
      ];
    }
    return [];
  }
}

// ============================================================================
// HELPER TO RESET FACTORY COUNTER (FOR TESTING)
// ============================================================================

export function resetFactoryCallCount(): void {
  factoryCallCount = 0;
}

// ============================================================================
// ENTITIES FOR parseBigInt TESTING
// ============================================================================

/**
 * Entity with NumberProperty and IntProperty configured with parseBigInt: true
 * Features: coercion from bigint / integer string to number
 */
@Entity()
export class EntityWithParseBigInt {
  @NumberProperty({ parseBigInt: true }) amount!: number;
  @IntProperty({ parseBigInt: true }) count!: number;

  constructor(data: { amount: number; count: number }) {
    this.amount = data.amount;
    this.count = data.count;
  }
}
