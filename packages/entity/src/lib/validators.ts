import { Problem } from './problem.js';
import type { PropertyValidator } from './types.js';

/**
 * Creates a validator that checks if a string value is one of the allowed enum values
 * @param enumType - The enum object containing valid values
 * @returns A validator function that validates enum values
 * @example
 * enum Status { Active = 'active', Inactive = 'inactive' }
 * const validator = enumValidator(Status);
 */
export function enumValidator<T extends Record<string, string>>(
  enumType: T,
): PropertyValidator<string> {
  const validValues = Object.values(enumType);
  return ({ value }: { value: string }) => {
    if (!validValues.includes(value)) {
      return [
        new Problem({
          property: '',
          message: `Expected one of [${validValues.join(', ')}] but received "${value}"`,
        }),
      ];
    }
    return [];
  };
}

/**
 * Creates a validator that checks if a number is an integer (no decimal places)
 * @returns A validator function that validates integer values
 * @example
 * const validator = intValidator();
 */
export function intValidator(): PropertyValidator<number> {
  return ({ value }: { value: number }) => {
    if (!Number.isInteger(value)) {
      return [
        new Problem({
          property: '',
          message: `Expected an integer but received ${value}`,
        }),
      ];
    }
    return [];
  };
}

/**
 * Creates a validator that checks if a string meets a minimum length requirement
 * @param minLength - The minimum required length
 * @returns A validator function that validates string length
 * @example
 * const validator = minLengthValidator(3);
 */
export function minLengthValidator(
  minLength: number,
): PropertyValidator<string> {
  return ({ value }: { value: string }) => {
    if (value.length < minLength) {
      return [
        new Problem({
          property: '',
          message: `Expected minimum length ${minLength} but received length ${value.length}`,
        }),
      ];
    }
    return [];
  };
}

/**
 * Creates a validator that checks if a string does not exceed a maximum length
 * @param maxLength - The maximum allowed length
 * @returns A validator function that validates string length
 * @example
 * const validator = maxLengthValidator(100);
 */
export function maxLengthValidator(
  maxLength: number,
): PropertyValidator<string> {
  return ({ value }: { value: string }) => {
    if (value.length > maxLength) {
      return [
        new Problem({
          property: '',
          message: `Expected maximum length ${maxLength} but received length ${value.length}`,
        }),
      ];
    }
    return [];
  };
}

/**
 * Creates a validator that checks if a string matches a regular expression pattern
 * @param pattern - The regular expression pattern to match
 * @param message - Optional custom error message
 * @returns A validator function that validates string pattern
 * @example
 * const validator = patternValidator(/^[a-z]+$/, 'Must contain only lowercase letters');
 */
export function patternValidator(
  pattern: RegExp,
  message?: string,
): PropertyValidator<string> {
  return ({ value }: { value: string }) => {
    if (!pattern.test(value)) {
      return [
        new Problem({
          property: '',
          message:
            message ||
            `Expected value to match pattern ${pattern.toString()} but received "${value}"`,
        }),
      ];
    }
    return [];
  };
}

/**
 * Creates a validator that checks if a number meets a minimum value requirement
 * @param min - The minimum allowed value (inclusive)
 * @returns A validator function that validates number minimum
 * @example
 * const validator = minValidator(0);
 */
export function minValidator(min: number): PropertyValidator<number> {
  return ({ value }: { value: number }) => {
    if (value < min) {
      return [
        new Problem({
          property: '',
          message: `Expected minimum value ${min} but received ${value}`,
        }),
      ];
    }
    return [];
  };
}

/**
 * Creates a validator that checks if a number does not exceed a maximum value
 * @param max - The maximum allowed value (inclusive)
 * @returns A validator function that validates number maximum
 * @example
 * const validator = maxValidator(100);
 */
export function maxValidator(max: number): PropertyValidator<number> {
  return ({ value }: { value: number }) => {
    if (value > max) {
      return [
        new Problem({
          property: '',
          message: `Expected maximum value ${max} but received ${value}`,
        }),
      ];
    }
    return [];
  };
}

/**
 * Creates a validator that checks if an array meets a minimum length requirement
 * @param minLength - The minimum required array length
 * @returns A validator function that validates array length
 * @example
 * const validator = arrayMinLengthValidator(1);
 */
export function arrayMinLengthValidator<T>(
  minLength: number,
): PropertyValidator<T[]> {
  return ({ value }: { value: T[] }) => {
    if (value.length < minLength) {
      return [
        new Problem({
          property: '',
          message: `Expected minimum array length ${minLength} but received length ${value.length}`,
        }),
      ];
    }
    return [];
  };
}

/**
 * Creates a validator that checks if an array does not exceed a maximum length
 * @param maxLength - The maximum allowed array length
 * @returns A validator function that validates array length
 * @example
 * const validator = arrayMaxLengthValidator(10);
 */
export function arrayMaxLengthValidator<T>(
  maxLength: number,
): PropertyValidator<T[]> {
  return ({ value }: { value: T[] }) => {
    if (value.length > maxLength) {
      return [
        new Problem({
          property: '',
          message: `Expected maximum array length ${maxLength} but received length ${value.length}`,
        }),
      ];
    }
    return [];
  };
}
