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
