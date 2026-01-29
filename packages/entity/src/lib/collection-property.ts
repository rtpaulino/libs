/* eslint-disable @typescript-eslint/no-explicit-any */
import { AnyCtor, type InstanceOfCtorLike, PropertyOptions } from './types.js';
import { Property } from './property.js';
import { EntityUtils } from './entity-utils.js';

/**
 * Helper decorator for collection properties that wrap arrays in entity classes.
 * The collection entity must have a `collection` property decorated with @ArrayProperty().
 * When serialized with EntityUtils.toJSON(), the collection is unwrapped to just the array.
 *
 * @param type - Function returning the collection entity class constructor
 * @param options - Additional property options
 *
 * @example
 * ```typescript
 * @Entity()
 * class MyCollection {
 *   @ArrayProperty(() => String)
 *   readonly collection: string[];
 *
 *   constructor(data: { collection: string[] }) {
 *     this.collection = data.collection;
 *   }
 * }
 *
 * @Entity()
 * class MyEntity {
 *   @CollectionProperty(() => MyCollection)
 *   myCollection: MyCollection;
 * }
 *
 * const entity = new MyEntity(...);
 * const json = EntityUtils.toJSON(entity);
 * // { myCollection: ["a", "b"] } - unwrapped to array
 * ```
 */
export function CollectionProperty<
  T extends { collection: unknown[] },
  C extends AnyCtor<T> & { new (data: any): T },
>(
  type: () => C,
  options?: Omit<
    PropertyOptions<T, C>,
    'type' | 'collection' | 'array' | 'passthrough'
  >,
): PropertyDecorator {
  const maybeDefaultProperty =
    options?.optional !== true
      ? {
          default: async () =>
            (await EntityUtils.parse(type(), {
              collection: [],
            })) as InstanceOfCtorLike<C>,
        }
      : {};

  return Property<T, C>({
    ...maybeDefaultProperty,
    ...options,
    type,
    collection: true,
  });
}
