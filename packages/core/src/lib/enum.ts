import { Nullable } from './types.js';

export function isEnumValue<T extends Record<string, string>>(
  enumType: T,
  value: Nullable<string>,
): value is T[keyof T] {
  return value != null && Object.values(enumType).includes(value);
}

export function toEnum<T extends Record<string, string>>(
  enumType: T,
  value: Nullable<string>,
): T[keyof T] {
  if (isEnumValue(enumType, value)) {
    return value;
  } else {
    throw new Error(`${value} is not a valid enum value`);
  }
}
