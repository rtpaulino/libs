/* eslint-disable @typescript-eslint/no-unsafe-function-type */

/**
 * Registry for polymorphic entity variants.
 * Maps base classes to their discriminator properties and variant implementations.
 */
export class PolymorphicRegistry {
  /**
   * Maps base class -> discriminator property name
   */
  private static discriminatorProperties = new Map<Function, string>();

  /**
   * Maps base class -> (discriminator value -> variant class)
   */
  private static variants = new Map<Function, Map<unknown, Function>>();

  /**
   * Registers a discriminator property for a base class.
   * @param baseClass - The base class that has a polymorphic discriminator
   * @param propertyName - The name of the discriminator property
   * @throws Error if a discriminator property is already registered for this class
   */
  static setDiscriminatorProperty(
    baseClass: Function,
    propertyName: string,
  ): void {
    const existing = this.discriminatorProperties.get(baseClass);
    if (existing && existing !== propertyName) {
      throw new Error(
        `Base class '${baseClass.name}' already has a polymorphic discriminator property '${existing}'. ` +
          `Cannot register another discriminator '${propertyName}'. ` +
          `Only one discriminator property per class hierarchy is allowed.`,
      );
    }
    this.discriminatorProperties.set(baseClass, propertyName);
  }

  /**
   * Gets the discriminator property name for a base class.
   * @param baseClass - The base class to look up
   * @returns The discriminator property name, or undefined if not found
   */
  static getDiscriminatorProperty(baseClass: Function): string | undefined {
    return this.discriminatorProperties.get(baseClass);
  }

  /**
   * Registers a variant class for a base class and discriminator value.
   * @param baseClass - The base class this variant extends
   * @param discriminatorValue - The value of the discriminator property that identifies this variant
   * @param variantClass - The concrete variant class
   * @throws Error if a variant is already registered for this discriminator value
   */
  static registerVariant(
    baseClass: Function,
    discriminatorValue: unknown,
    variantClass: Function,
  ): void {
    let variantMap = this.variants.get(baseClass);
    if (!variantMap) {
      variantMap = new Map();
      this.variants.set(baseClass, variantMap);
    }

    const existing = variantMap.get(discriminatorValue);
    if (existing && existing !== variantClass) {
      throw new Error(
        `Duplicate polymorphic variant registration for base class '${baseClass.name}' ` +
          `with discriminator value '${String(discriminatorValue)}'. ` +
          `Existing variant: '${existing.name}', attempted: '${variantClass.name}'. ` +
          `Each discriminator value must map to exactly one variant class.`,
      );
    }

    variantMap.set(discriminatorValue, variantClass);
  }

  /**
   * Gets the variant class for a base class and discriminator value.
   * @param baseClass - The base class to look up
   * @param discriminatorValue - The discriminator value to match
   * @returns The variant class, or undefined if not found
   */
  static getVariant(
    baseClass: Function,
    discriminatorValue: unknown,
  ): Function | undefined {
    const variantMap = this.variants.get(baseClass);
    if (!variantMap) return undefined;
    return variantMap.get(discriminatorValue);
  }

  /**
   * Gets all registered variants for a base class.
   * @param baseClass - The base class to look up
   * @returns Array of variant registrations with their discriminator values
   */
  static getAllVariants(baseClass: Function): Array<{
    discriminatorValue: unknown;
    variantClass: Function;
  }> {
    const variantMap = this.variants.get(baseClass);
    if (!variantMap) return [];

    return Array.from(variantMap.entries()).map(
      ([discriminatorValue, variantClass]) => ({
        discriminatorValue,
        variantClass,
      }),
    );
  }

  /**
   * Clears all registrations. Useful for testing.
   * @internal
   */
  static clear(): void {
    this.discriminatorProperties.clear();
    this.variants.clear();
  }
}
