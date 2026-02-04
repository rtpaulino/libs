import {
  ENTITY_METADATA_KEY,
  ENTITY_OPTIONS_METADATA_KEY,
  ENTITY_VALIDATOR_METADATA_KEY,
} from './types.js';
import { EntityRegistry } from './entity-registry.js';

/**
 * Options for Entity decorator
 */
export interface EntityOptions {
  /**
   * Optional name for the entity. Used for discriminated entity deserialization.
   * If not specified, the class name will be used.
   * Must be unique across all entities - conflicts will throw an error.
   */
  name?: string;
  /**
   * Whether this entity represents a collection.
   * Collection entities must have a 'collection' property that is an array.
   * When serialized, collection entities are unwrapped to just their array.
   * When deserialized from an array, the array is wrapped in { collection: [...] }.
   */
  collection?: boolean;
  /**
   * Whether this entity represents a stringifiable value.
   * Stringifiable classes must have a 'value' property that is a string.
   * When serialized, stringifiable instances are unwrapped to just their string.
   * When deserialized from a string, the string is wrapped in { value: "..." }.
   */
  stringifiable?: boolean;
  /**
   * The name of the single "wrapper" property for entities that act as transparent wrappers.
   * When set, this property name is excluded from error paths during validation.
   * Used by @CollectionEntity ('collection') and @Stringifiable ('value').
   */
  wrapperProperty?: string;
}

/**
 * Decorator that marks a class as an Entity.
 * This allows us to identify entity instances later.
 *
 * @param options - Optional configuration for the entity
 *
 * @example
 * ```typescript
 * @Entity()
 * class User {
 *   name: string;
 * }
 *
 * @Entity({ name: 'CustomUser' })
 * class User {
 *   name: string;
 * }
 *
 * @Entity({ collection: true })
 * class Tags {
 *   @ArrayProperty(() => String)
 *   collection: string[];
 * }
 * ```
 */
export function Entity(options: EntityOptions = {}): ClassDecorator {
  // eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
  return function (target: Function) {
    // Store metadata on the class constructor
    Reflect.defineMetadata(ENTITY_METADATA_KEY, true, target);

    // Determine the entity name - use provided name or fall back to class name
    const entityName = options.name ?? target.name;

    // Register the entity in the global registry
    EntityRegistry.register(entityName, target);

    // Store the name in options for later retrieval
    const optionsWithName = { ...options, name: entityName };

    Reflect.defineMetadata(
      ENTITY_OPTIONS_METADATA_KEY,
      optionsWithName,
      target,
    );
  };
}

/**
 * Decorator that marks a class as a Collection Entity.
 * This is syntax sugar for @Entity({ collection: true }).
 *
 * Collection entities must have a 'collection' property that is an array.
 * When serialized with EntityUtils.toJSON(), they are unwrapped to just the array.
 * When deserialized from an array, the array is wrapped in { collection: [...] }.
 *
 * @example
 * ```typescript
 * @CollectionEntity()
 * class Tags {
 *   @ArrayProperty(() => String)
 *   readonly collection: string[];
 *
 *   constructor(data: { collection: string[] }) {
 *     this.collection = data.collection;
 *   }
 * }
 *
 * @Entity()
 * class Article {
 *   @EntityProperty(() => Tags)
 *   tags!: Tags;
 * }
 *
 * const article = new Article(...);
 * const json = EntityUtils.toJSON(article);
 * // { tags: ["tag1", "tag2"] } - unwrapped to array
 *
 * // Also works when serializing the collection directly:
 * const tagsJson = EntityUtils.toJSON(tags);
 * // ["tag1", "tag2"] - unwrapped to array
 * ```
 */
export function CollectionEntity(
  options: Pick<EntityOptions, 'name'> = {},
): ClassDecorator {
  return Entity({
    collection: true,
    wrapperProperty: 'collection',
    ...options,
  });
}

/**
 * Decorator that marks a class as Stringifiable.
 * This is syntax sugar for @Entity({ stringifiable: true }).
 *
 * Stringifiable classes must have a 'value' property that is a string.
 * When serialized with EntityUtils.toJSON(), they are unwrapped to just the string.
 * When deserialized from a string, the string is wrapped in { value: "..." }.
 *
 * @example
 * ```typescript
 * @Stringifiable()
 * class UserId {
 *   @StringProperty()
 *   readonly value: string;
 *
 *   constructor(data: { value: string }) {
 *     this.value = data.value;
 *   }
 * }
 *
 * @Entity()
 * class User {
 *   @EntityProperty(() => UserId)
 *   id!: UserId;
 * }
 *
 * const user = new User(...);
 * const json = EntityUtils.toJSON(user);
 * // { id: "user-123" } - unwrapped to string
 *
 * // Also works when serializing the stringifiable directly:
 * const userId = new UserId({ value: "user-123" });
 * const idJson = EntityUtils.toJSON(userId);
 * // "user-123" - unwrapped to string
 *
 * // Parse from string:
 * const parsed = await EntityUtils.parse(UserId, "user-456");
 * // UserId { value: "user-456" }
 * ```
 */
export function Stringifiable(
  options: Pick<EntityOptions, 'name'> = {},
): ClassDecorator {
  return Entity({ stringifiable: true, wrapperProperty: 'value', ...options });
}

/**
 * Decorator that marks a method as an entity validator.
 * The method should return an array of Problems.
 *
 * @example
 * ```typescript
 * @Entity()
 * class User {
 *   @Property({ type: () => String }) firstName!: string;
 *   @Property({ type: () => String }) lastName!: string;
 *
 *   @EntityValidator()
 *   validateNames(): Problem[] {
 *     const problems: Problem[] = [];
 *     if (this.firstName === this.lastName) {
 *       problems.push(new Problem({
 *         property: 'firstName',
 *         message: 'First and last name cannot be the same'
 *       }));
 *     }
 *     return problems;
 *   }
 * }
 * ```
 */
export function EntityValidator(): MethodDecorator {
  return (target: object, propertyKey: string | symbol): void => {
    if (typeof propertyKey !== 'string') {
      return;
    }

    const existingValidators: string[] =
      Reflect.getOwnMetadata(ENTITY_VALIDATOR_METADATA_KEY, target) || [];

    if (!existingValidators.includes(propertyKey)) {
      existingValidators.push(propertyKey);
    }

    Reflect.defineMetadata(
      ENTITY_VALIDATOR_METADATA_KEY,
      existingValidators,
      target,
    );
  };
}
