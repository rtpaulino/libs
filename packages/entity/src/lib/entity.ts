import {
  ENTITY_METADATA_KEY,
  ENTITY_OPTIONS_METADATA_KEY,
  ENTITY_VALIDATOR_METADATA_KEY,
} from './types.js';

/**
 * Options for Entity decorator
 */
export interface EntityOptions {
  /**
   * Whether this entity represents a collection.
   * Collection entities must have a 'collection' property that is an array.
   * When serialized, collection entities are unwrapped to just their array.
   * When deserialized from an array, the array is wrapped in { collection: [...] }.
   */
  collection?: boolean;
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
    if (options) {
      Reflect.defineMetadata(ENTITY_OPTIONS_METADATA_KEY, options, target);
    }
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
export function CollectionEntity(): ClassDecorator {
  return Entity({ collection: true });
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
