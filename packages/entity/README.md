# @rtpaulino/entity

A TypeScript entity framework with decorators for metadata-driven serialization and deserialization.

## Features

- **Type-safe decorators** for entity properties
- **Serialization** via `EntityUtils.toJSON()`
- **Deserialization** via `EntityUtils.parse()`
- **Helper decorators** for common types (String, Number, Boolean, Date, BigInt, Entity, Array)
- **Nested entities** with automatic recursive handling
- **Optional properties** with null/undefined support
- **Sparse arrays** for arrays with null/undefined elements
- **Passthrough mode** for generic types like `Record<string, unknown>`

## Installation

```bash
npm install @rtpaulino/entity reflect-metadata
```

Make sure to enable decorators in your `tsconfig.json`:

```json
{
  "compilerOptions": {
    "experimentalDecorators": true,
    "emitDecoratorMetadata": true
  }
}
```

## Basic Usage

```typescript
import 'reflect-metadata';
import {
  Entity,
  StringProperty,
  NumberProperty,
  EntityUtils,
} from '@rtpaulino/entity';

@Entity()
class User {
  @StringProperty()
  name!: string;

  @NumberProperty()
  age!: number;
}

// Serialization
const user = new User();
user.name = 'Alice';
user.age = 30;

const json = EntityUtils.toJSON(user);
// { name: 'Alice', age: 30 }

// Deserialization
const parsed = EntityUtils.parse(User, json);
// parsed is a User instance with name='Alice' and age=30
```

## Property Decorators

### Basic Types

```typescript
@Entity()
class Example {
  @StringProperty()
  text!: string;

  @NumberProperty()
  count!: number;

  @BooleanProperty()
  active!: boolean;

  @DateProperty()
  createdAt!: Date;

  @BigIntProperty()
  largeNumber!: bigint;
}
```

### Optional Properties

Use `optional: true` to allow `null` or `undefined`:

```typescript
@Entity()
class User {
  @StringProperty()
  name!: string;

  @StringProperty({ optional: true })
  email?: string | null;
}
```

### Nested Entities

```typescript
@Entity()
class Address {
  @StringProperty()
  city!: string;

  @StringProperty()
  country!: string;
}

@Entity()
class User {
  @StringProperty()
  name!: string;

  @EntityProperty(() => Address)
  address!: Address;
}
```

### Arrays

```typescript
@Entity()
class Team {
  @ArrayProperty(() => String)
  members!: string[];

  @ArrayProperty(() => Number)
  scores!: number[];
}
```

### Sparse Arrays

Use `sparse: true` to allow `null` or `undefined` elements in arrays:

```typescript
@Entity()
class Data {
  @ArrayProperty(() => String, { sparse: true })
  values!: (string | null)[];
}

const data = new Data();
data.values = ['a', null, 'b', undefined, 'c'];

const json = EntityUtils.toJSON(data);
// { values: ['a', null, 'b', null, 'c'] }

const parsed = EntityUtils.parse(Data, json);
// parsed.values is ['a', null, 'b', null, 'c']
```

### Passthrough for Generic Types

By default, the library throws errors for unknown types to prevent accidental misuse. Use `@PassthroughProperty()` decorator or `passthrough: true` option to explicitly handle generic types like `Record<string, unknown>`, `any`, or custom objects:

```typescript
@Entity()
class Config {
  @StringProperty()
  name!: string;

  @PassthroughProperty()
  metadata!: Record<string, unknown>;

  @PassthroughProperty()
  customData!: any;
}

const config = new Config();
config.name = 'MyConfig';
config.metadata = {
  version: '1.0.0',
  tags: ['production', 'stable'],
  nested: { deeply: { nested: { value: 42 } } },
};

// Serialization - data passes through as-is
const json = EntityUtils.toJSON(config);

// Deserialization - data passes through as-is
const parsed = EntityUtils.parse(Config, json);
// parsed.metadata is exactly what was in the JSON
```

**Important:** Passthrough cannot be combined with `array`, `optional`, or `sparse` options. Use `@PassthroughProperty()` for the cleanest API.

**Without passthrough, unknown types throw errors:**

```typescript
@Entity()
class BadExample {
  @Property({ type: () => Symbol }) // Symbol is not supported
  value!: symbol;
}

// This will throw:
// "Property 'value' has unknown type constructor. Supported types are: String, Number, Boolean, Date, BigInt, and @Entity() classes."
```

## Advanced Patterns

### Arrays of Entities

```typescript
@Entity()
class Comment {
  @StringProperty()
  text!: string;

  @DateProperty()
  createdAt!: Date;
}

@Entity()
class Post {
  @StringProperty()
  title!: string;

  @ArrayProperty(() => Comment)
  comments!: Comment[];
}
```

### Complex Nested Structures

```typescript
@Entity()
class Organization {
  @StringProperty()
  name!: string;

  @ArrayProperty(() => User)
  admins!: User[];

  @Property({ passthrough: true })
  settings!: Record<string, unknown>;
}
```

## API Reference

### `EntityUtils.toJSON(entity)`

Serializes an entity to a plain JavaScript object.

- Throws error for properties with unknown types (unless `passthrough: true`)
- Handles nested entities recursively
- Converts Date to ISO string, BigInt to string
- Preserves null/undefined for optional properties

### `EntityUtils.parse<T>(entityClass, plainObject)`

Deserializes a plain object to an entity instance.

- Validates all required properties are present
- Validates property types match metadata
- Throws error for unknown types (unless `passthrough: true`)
- Handles nested entities recursively
- Converts ISO strings back to Date, strings back to BigInt

### Property Options

The `@Property()` decorator requires configuration options. Available options are:

- `type: () => any` - **Required.** Type constructor for the property
- `array?: boolean` - Whether the property is an array
- `optional?: boolean` - Allow null/undefined values
- `sparse?: boolean` - Allow null/undefined in array elements (requires `array: true`)
- `passthrough?: boolean` - Bypass type validation for generic types (cannot be combined with array, optional, or sparse)
- `equals?: (a, b) => boolean` - Custom equality function for this property

**Note:** Use helper decorators like `@StringProperty()`, `@PassthroughProperty()`, etc. for cleaner, more readable code. These helpers automatically provide the required `type` parameter.

## Error Handling

The library validates configuration at decorator time and throws descriptive errors for common mistakes:

```typescript
// Missing required property
EntityUtils.parse(User, {});
// Error: Property 'name' is required but missing from input

// Null/undefined on required property
EntityUtils.parse(User, { name: null, age: 30 });
// Error: Property 'name' cannot be null or undefined

// Sparse without array (fails at decorator time)
@Property({ type: () => String, sparse: true }) // Missing array: true
values!: string[];
// Error: Property 'values' has sparse: true but array is not true

// Passthrough combined with other options (fails at decorator time)
@Property({ type: () => Object, passthrough: true, array: true })
data!: any;
// Error: Property 'data' has passthrough: true and array: true. Passthrough cannot be combined with array

// Unknown type without passthrough
@Property({ type: () => WeakMap })
map!: WeakMap<any, any>;
// Error: Property 'map' has unknown type constructor
```

## TypeScript Integration

All methods are fully typed:

```typescript
const user = EntityUtils.parse(User, json); // user is typed as User
const json = EntityUtils.toJSON(user); // json is Record<string, unknown>
```

## License

MIT

```

```
