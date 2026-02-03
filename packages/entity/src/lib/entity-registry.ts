/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unsafe-function-type */

/**
 * Registry for entity classes decorated with @Entity()
 * Stores entity constructors by name for discriminated entity deserialization
 */
export class EntityRegistry {
  private static readonly registry = new Map<string, Function>();

  /**
   * Registers an entity class with a name
   * @param name - The name to register the entity under
   * @param entityClass - The entity class constructor
   * @throws Error if an entity with this name is already registered
   */
  static register(name: string, entityClass: Function): void {
    const existing = this.registry.get(name);
    if (existing && existing !== entityClass) {
      throw new Error(
        `Entity name conflict: An entity with name '${name}' is already registered. ` +
          `Existing: ${existing.name}, New: ${entityClass.name}`,
      );
    }
    this.registry.set(name, entityClass);
  }

  /**
   * Gets an entity class by name
   * @param name - The name of the entity to retrieve
   * @returns The entity class constructor, or undefined if not found
   */
  static get(name: string): Function | undefined {
    return this.registry.get(name);
  }

  /**
   * Checks if an entity with the given name is registered
   * @param name - The name to check
   * @returns true if an entity with this name is registered
   */
  static has(name: string): boolean {
    return this.registry.has(name);
  }

  /**
   * Gets all registered entity names
   * @returns Array of all registered entity names
   */
  static getAllNames(): string[] {
    return Array.from(this.registry.keys());
  }
}
