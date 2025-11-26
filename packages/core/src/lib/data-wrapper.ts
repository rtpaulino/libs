import { get, merge } from 'lodash-es';
import { Nullable } from './types.js';

export class DataWrapper {
  constructor(public readonly value: unknown) {}

  get isStrict() {
    return false;
  }

  get nativeType() {
    const result = typeof this.value;

    if (this.value && result === 'object') {
      if (Array.isArray(this.value)) {
        return 'array';
      }

      if (this.value instanceof Date) {
        return 'date';
      }

      if (this.value?.constructor?.name) {
        return `[class ${this.value.constructor.name}]`;
      }
    }

    return result;
  }

  /**
   * @returns a new instance using strict mode.
   */
  strict() {
    return new StrictDataWrapper(this.value);
  }

  /**
   * @returns true if null or undefined
   */
  isNil(): this is DataWrapper & { value: null | undefined } {
    return this.value == null;
  }

  /**
   * @returns true if array
   */
  isArray(): this is DataWrapper & { value: unknown[] } {
    return !this.isNil() && Array.isArray(this.value);
  }

  /**
   * @returns true if object
   */
  isObject(): this is DataWrapper & { value: Record<string, unknown> } {
    return !this.isNil() && !this.isArray() && typeof this.value === 'object';
  }

  /**
   * @returns true if true, 'true', 't', '1' or a number > 0
   */
  asBoolean(): Nullable<boolean> {
    if (this.isNil()) {
      return this.value;
    }

    return (
      this.value === true ||
      (typeof this.value === 'string' &&
        (this.value.trim().toLocaleLowerCase() === 'true' ||
          this.value.trim().toLocaleLowerCase() === 't' ||
          this.value.trim() === '1')) ||
      (typeof this.value === 'number' && this.value > 0)
    );
  }

  /**
   * If string, returns it; otherwise tries to convert it.
   * @returns data as a string.
   */
  asString(): Nullable<string> {
    if (this.isNil()) {
      return this.value;
    }

    if (typeof this.value === 'string') {
      return this.value;
    }

    if (
      this.value &&
      typeof this.value === 'object' &&
      'toString' in this.value
    ) {
      return this.value.toString();
    }

    return String(this.value);
  }

  /**
   * If number, returns it; otherwise tries to convert it.
   * If invalid, returns null.
   * @returns data as a number
   */
  asNumber(): Nullable<number> {
    if (this.isNil()) {
      return this.value;
    }

    if (typeof this.value === 'number') {
      return this.value;
    }

    const parsed = parseFloat(this.asString() || '');
    if (isNaN(parsed)) {
      return null;
    }

    return parsed;
  }

  /**
   * If integer, returns it; otherwise tries to convert it.
   * If invalid, returns null.
   * @returns data as a number
   */
  asInt(): Nullable<number> {
    const numberValue = this.asNumber();
    if (numberValue == null) {
      return numberValue;
    }

    return Math.floor(numberValue);
  }

  asArray(): DataWrapper[] {
    if (this.isNil()) {
      return [];
    }

    if (this.isArray()) {
      return this.value.map((item) => new DataWrapper(item));
    }

    throw new TypeError(`Expected array, got ${this.nativeType}`);
  }

  asStringArray(): string[] {
    return this.asArray()
      .map((dw) => dw.asString())
      .filter((s): s is string => !!s);
  }

  /**
   * Useful to pull data from object.
   * @param key a new DataWrapper instance for a given key within an object.
   */
  get(key: string): DataWrapper {
    return new DataWrapper(this.isObject() ? get(this.value, key) : undefined);
  }

  /**
   * Useful to provide default values for objects.
   * It will set the defaults using lodash merge (deep assign).
   * @param defaultValue U
   * @returns
   */
  withDefault(defaultValue: Record<string, unknown>): DataWrapper {
    if (this.isNil()) {
      return new DataWrapper(defaultValue);
    }

    if (!this.isObject()) {
      throw new TypeError(
        `Expected object to apply default, got ${this.nativeType}`,
      );
    }

    return new DataWrapper(merge({}, defaultValue, this.value));
  }

  /**
   * Parse object using a Zod schema.
   * @param schema
   * @returns
   */
  parseZod<T>(schema: { parse: (data: unknown) => T }): Nullable<T> {
    if (this.isNil()) {
      return this.value;
    }

    return schema.parse(this.value);
  }
}

export class StrictDataWrapper extends DataWrapper {
  constructor(value: unknown) {
    super(value);
  }

  override get isStrict() {
    return true;
  }

  override strict() {
    return this;
  }

  /**
   * @returns the value when undefined, null or boolean. Otherwise, throws.
   * @throws TypeError when value is not a boolean
   */
  override asBoolean(): Nullable<boolean> {
    if (this.isNil()) {
      return this.value;
    }

    if (typeof this.value === 'boolean') {
      return this.value;
    }

    throw new TypeError(`Expected boolean, got ${this.nativeType}`);
  }

  /**
   * @returns the value when undefined, null or string`. Otherwise, throws.
   * @throws TypeError when value is not a string
   */
  override asString(): Nullable<string> {
    if (this.isNil()) {
      return this.value;
    }

    if (typeof this.value === 'string') {
      return this.value;
    }

    throw new TypeError(`Expected string, got ${this.nativeType}`);
  }

  /**
   * @returns the value when undefined, null or number. Otherwise, throws.
   * @throws TypeError when value is not a number
   */
  override asNumber(): Nullable<number> {
    if (this.isNil()) {
      return this.value;
    }

    if (typeof this.value === 'number') {
      return this.value;
    }

    throw new TypeError(`Expected number, got ${this.nativeType}`);
  }

  /**
   * @returns the value when undefined, null or integer. Otherwise, throws.
   * @throws TypeError when value is not an integer
   */
  override asInt(): Nullable<number> {
    if (this.isNil()) {
      return this.value;
    }

    if (typeof this.value === 'number') {
      if (Number.isInteger(this.value)) {
        return this.value;
      }
      throw new TypeError(`Expected integer, got non-integer number`);
    }

    throw new TypeError(`Expected integer, got ${this.nativeType}`);
  }

  /**
   * Useful to pull data from object.
   * @param key a new StrictDataWrapper instance for a given key within an object.
   * Will throw an error if not an object.
   */
  override get(key: string): StrictDataWrapper {
    if (this.isObject()) {
      return new StrictDataWrapper(get(this.value, key));
    } else {
      throw new TypeError(`Expected object, got ${this.nativeType}`);
    }
  }

  override asArray(): DataWrapper[] {
    if (this.isArray()) {
      return this.value.map((item) => new DataWrapper(item));
    }

    throw new TypeError(`Expected array, got ${this.nativeType}`);
  }

  override asStringArray(): string[] {
    if (this.isArray()) {
      const badItemIndex = this.value.findIndex(
        (item) => typeof item !== 'string',
      );
      if (badItemIndex >= 0) {
        throw new TypeError(
          `Expected array to contain only strings, but found ${typeof this.value[badItemIndex]}.`,
        );
      }
      return this.value as string[];
    }

    throw new TypeError(`Expected array, got ${this.nativeType}`);
  }
}
