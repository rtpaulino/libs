import {
  ENTITY_METADATA_KEY,
  PROPERTY_METADATA_KEY,
  PROPERTY_OPTIONS_METADATA_KEY,
  PropertyOptions,
} from './types.js';
import { isEqualWith } from 'lodash-es';

export class EntityUtils {
  /**
   * Checks if a given object is an instance of a class decorated with @Entity()
   * or if the provided value is an entity class itself
   *
   * @param obj - The object or class to check
   * @returns true if the object is an entity instance or entity class, false otherwise
   *
   * @example
   * ```typescript
   * @Entity()
   * class User {
   *   name: string;
   * }
   *
   * const user = new User();
   * console.log(EntityUtils.isEntity(user)); // true
   * console.log(EntityUtils.isEntity(User)); // true
   * console.log(EntityUtils.isEntity({})); // false
   * ```
   */
  static isEntity(obj: unknown): obj is object {
    if (obj == null) {
      return false;
    }

    // Check if obj is a constructor function (class)
    if (typeof obj === 'function') {
      return Reflect.hasMetadata(ENTITY_METADATA_KEY, obj);
    }

    // Check if obj is an object instance
    if (typeof obj !== 'object' || Array.isArray(obj)) {
      return false;
    }

    const constructor = Object.getPrototypeOf(obj).constructor;
    return Reflect.hasMetadata(ENTITY_METADATA_KEY, constructor);
  }

  static sameEntity(a: object, b: object): boolean {
    if (!this.isEntity(a) || !this.isEntity(b)) {
      return false;
    }

    return Object.getPrototypeOf(a) === Object.getPrototypeOf(b);
  }

  static getPropertyKeys(target: object): string[] {
    // Determine if we're dealing with a prototype or an instance
    let currentProto: any;

    // Check if target is a prototype by checking if it has a constructor property
    // and if target === target.constructor.prototype
    if (target.constructor && target === target.constructor.prototype) {
      // target is already a prototype
      currentProto = target;
    } else {
      // target is an instance, get its prototype
      currentProto = Object.getPrototypeOf(target);
    }

    const keys: string[] = [];
    const seen = new Set<string>();

    // Walk the prototype chain to collect all inherited properties
    while (currentProto && currentProto !== Object.prototype) {
      // Use getOwnMetadata to only get metadata directly on this prototype
      const protoKeys: string[] =
        Reflect.getOwnMetadata(PROPERTY_METADATA_KEY, currentProto) || [];

      for (const key of protoKeys) {
        if (!seen.has(key)) {
          seen.add(key);
          keys.push(key);
        }
      }

      currentProto = Object.getPrototypeOf(currentProto);
    }

    return keys;
  }

  static getPropertyOptions(
    target: object,
    propertyKey: string,
  ): PropertyOptions | undefined {
    // Determine if we're dealing with a prototype or an instance
    let currentProto: any;

    // Check if target is a prototype by checking if it has a constructor property
    // and if target === target.constructor.prototype
    if (target.constructor && target === target.constructor.prototype) {
      // target is already a prototype
      currentProto = target;
    } else {
      // target is an instance, get its prototype
      currentProto = Object.getPrototypeOf(target);
    }

    // Walk the prototype chain to find the property options
    while (currentProto && currentProto !== Object.prototype) {
      const protoOptions: Record<string, PropertyOptions> =
        Reflect.getOwnMetadata(PROPERTY_OPTIONS_METADATA_KEY, currentProto) ||
        {};

      if (protoOptions[propertyKey]) {
        return protoOptions[propertyKey];
      }

      currentProto = Object.getPrototypeOf(currentProto);
    }

    return undefined;
  }

  static equals(a: unknown, b: unknown): boolean {
    return isEqualWith(a, b, (val1, val2) => {
      if (this.isEntity(val1)) {
        if (!this.sameEntity(val1, val2)) {
          return false;
        }

        const diff = this.diff(val1, val2);

        return diff.length === 0;
      }
      return undefined;
    });
  }

  static diff<T extends object>(
    oldEntity: T,
    newEntity: T,
  ): { property: string; oldValue: unknown; newValue: unknown }[] {
    if (!this.sameEntity(oldEntity, newEntity)) {
      throw new Error('Entities must be of the same type to compute diff');
    }

    const diffs: { property: string; oldValue: unknown; newValue: unknown }[] =
      [];

    const keys = this.getPropertyKeys(oldEntity);

    for (const key of keys) {
      const oldValue = (oldEntity as any)[key];
      const newValue = (newEntity as any)[key];

      // Check if there's a custom equals function for this property
      const propertyOptions = this.getPropertyOptions(oldEntity, key);
      const areEqual = propertyOptions?.equals
        ? propertyOptions.equals(oldValue, newValue)
        : this.equals(oldValue, newValue);

      if (!areEqual) {
        diffs.push({ property: key, oldValue, newValue });
      }
    }

    return diffs;
  }

  static changes<T extends object>(oldEntity: T, newEntity: T): Partial<T> {
    if (!this.sameEntity(oldEntity, newEntity)) {
      throw new Error('Entities must be of the same type to compute changes');
    }

    const diff = this.diff(oldEntity, newEntity);

    return diff.reduce((acc, { property, newValue }) => {
      (acc as any)[property] = newValue;
      return acc;
    }, {} as Partial<T>);
  }
}
