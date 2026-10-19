/* eslint-disable @typescript-eslint/no-explicit-any */
import type { PrimitiveConstructor } from './types.js';
import { createValidationError } from './validation-utils.js';

/**
 * Checks if a constructor is a supported primitive type constructor
 */
export function isPrimitiveConstructor(
  constructor: any,
): constructor is PrimitiveConstructor {
  return (
    constructor === String ||
    constructor === Number ||
    constructor === Boolean ||
    constructor === BigInt ||
    constructor === Date ||
    (typeof Buffer !== 'undefined' && constructor === Buffer)
  );
}

/**
 * Deserializes a string value
 */
function deserializeString(value: unknown): string {
  if (typeof value !== 'string') {
    throw createValidationError(
      `Expects a string but received ${typeof value}`,
    );
  }
  return value;
}

/**
 * Deserializes a number value
 */
export function deserializeNumber(value: unknown): number {
  if (typeof value !== 'number') {
    throw createValidationError(
      `Expects a number but received ${typeof value}`,
    );
  }
  return value;
}

/**
 * Deserializes a number from a `bigint` or an integer-formatted string.
 *
 * Accepts:
 * - `number` — returned as-is (delegates to `deserializeNumber`)
 * - `bigint` — converted via `Number(value)`
 * - `string` — must consist solely of an optional leading `-` followed by digits;
 *   parsed as a bigint first and then converted to a number
 *
 * @warning Information may be lost if the `BigInt` value exceeds the safe integer
 * range for `number` (`Number.MAX_SAFE_INTEGER` / `Number.MIN_SAFE_INTEGER`).
 */
export function deserializeNumberFromBigInt(value: unknown): number {
  if (typeof value === 'number') {
    return deserializeNumber(value);
  }
  if (typeof value === 'bigint') {
    return Number(value);
  }
  if (typeof value === 'string' && /^-?\d+$/.test(value)) {
    return Number(BigInt(value));
  }
  throw createValidationError(
    `Expects a number, bigint, or integer string but received ${typeof value === 'string' ? `string '${value}'` : typeof value}`,
  );
}

/**
 * Deserializes a boolean value
 */
function deserializeBoolean(value: unknown): boolean {
  if (typeof value !== 'boolean') {
    throw createValidationError(
      `Expects a boolean but received ${typeof value}`,
    );
  }
  return value;
}

/**
 * Deserializes a BigInt value (accepts bigint or string)
 */
function deserializeBigInt(value: unknown): bigint {
  if (typeof value === 'bigint') {
    return value;
  }
  if (typeof value === 'string') {
    try {
      return BigInt(value);
    } catch {
      throw createValidationError(`Cannot parse '${value}' as BigInt`);
    }
  }
  throw createValidationError(
    `Expects a bigint or string but received ${typeof value}`,
  );
}

/**
 * Deserializes a Date value (accepts Date instance or ISO string)
 */
function deserializeDate(value: unknown): Date {
  if (value instanceof Date) {
    return value;
  }
  if (typeof value === 'string') {
    const date = new Date(value);
    if (isNaN(date.getTime())) {
      throw createValidationError(`Cannot parse '${value}' as Date`);
    }
    return date;
  }
  throw createValidationError(
    `Expects a Date or ISO string but received ${typeof value}`,
  );
}

const BASE64_PATTERN =
  /^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}(?:==)?|[A-Za-z0-9+/]{3}=?)?$/;

/**
 * Deserializes a Buffer value (accepts Buffer, Uint8Array or a base64 string)
 */
function deserializeBuffer(value: unknown): Buffer {
  if (Buffer.isBuffer(value)) {
    return value;
  }
  if (value instanceof Uint8Array) {
    return Buffer.from(value);
  }
  if (typeof value === 'string') {
    if (!BASE64_PATTERN.test(value)) {
      throw createValidationError('Cannot parse value as a base64 string');
    }
    return Buffer.from(value, 'base64');
  }
  throw createValidationError(
    `Expects a Buffer or base64 string but received ${typeof value}`,
  );
}

/**
 * Deserializes a primitive value based on its type constructor
 *
 * @param value - The value to deserialize
 * @param typeConstructor - The primitive type constructor (String, Number, Boolean, BigInt, Date, Buffer)
 * @returns The deserialized value
 * @throws ValidationError with empty property if type mismatch or parse error
 */
export function deserializePrimitive(
  value: unknown,
  typeConstructor: PrimitiveConstructor,
): string | number | boolean | bigint | Date | Buffer {
  if (typeConstructor === String) {
    return deserializeString(value);
  }
  if (typeConstructor === Number) {
    return deserializeNumber(value);
  }
  if (typeConstructor === Boolean) {
    return deserializeBoolean(value);
  }
  if (typeConstructor === BigInt) {
    return deserializeBigInt(value);
  }
  if (typeConstructor === Date) {
    return deserializeDate(value);
  }
  if (typeof Buffer !== 'undefined' && typeConstructor === Buffer) {
    return deserializeBuffer(value);
  }

  throw createValidationError(`Unknown primitive type constructor`);
}
