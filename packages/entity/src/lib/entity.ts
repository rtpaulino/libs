import { ENTITY_METADATA_KEY, ENTITY_VALIDATOR_METADATA_KEY } from './types.js';

/**
 * Decorator that marks a class as an Entity.
 * This allows us to identify entity instances later.
 *
 * @example
 * ```typescript
 * @Entity()
 * class User {
 *   name: string;
 * }
 * ```
 */
export function Entity(): ClassDecorator {
  // eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
  return function (target: Function) {
    // Store metadata on the class constructor
    Reflect.defineMetadata(ENTITY_METADATA_KEY, true, target);
  };
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
