import { Problem } from './problem.js';
import { ValidationError } from './validation-error.js';

/**
 * Combines a property path prefix with a suffix according to deterministic rules:
 * - If suffix is empty, returns prefix
 * - If suffix starts with '[', concatenates without separator (e.g., 'items' + '[0]' → 'items[0]')
 * - Otherwise, concatenates with dot separator (e.g., 'user' + 'name' → 'user.name')
 *
 * @param prefix - The property path to prepend
 * @param suffix - The property path to append
 * @returns The combined property path
 *
 * @example
 * ```typescript
 * combinePropertyPaths('user', '') // 'user'
 * combinePropertyPaths('user', 'name') // 'user.name'
 * combinePropertyPaths('items', '[0]') // 'items[0]'
 * combinePropertyPaths('[0]', 'name') // '[0].name'
 * ```
 */
export function combinePropertyPaths(prefix: string, suffix: string): string {
  if (suffix === '') {
    return prefix;
  }
  if (suffix.startsWith('[')) {
    return `${prefix}${suffix}`;
  }
  return `${prefix}.${suffix}`;
}

/**
 * Creates a ValidationError with a single problem that has an empty property.
 * This is used when reporting errors at the current scope level, where the caller
 * will prepend the appropriate context path.
 *
 * @param message - The error message
 * @returns A ValidationError with a single problem with empty property
 *
 * @example
 * ```typescript
 * throw createValidationError('Expects a string but received number');
 * // Creates: ValidationError([{ property: '', message: 'Expects a string but received number' }])
 * ```
 */
export function createValidationError(message: string): ValidationError {
  return new ValidationError([
    new Problem({
      property: '',
      message,
    }),
  ]);
}

/**
 * Prepends a property path to all problems.
 * Problems with empty property names get the path directly.
 * Problems starting with '[' get the path without a dot separator.
 * Other problems get the path with a dot separator.
 *
 * @param propertyPath - The property path to prepend (e.g., 'user', 'items[0]')
 * @param problems - The array of Problems to process
 * @returns Array of Problems with the property path prepended
 *
 * @example
 * ```typescript
 * const problems = [
 *   new Problem({ property: '', message: 'Invalid type' }),
 *   new Problem({ property: 'name', message: 'Required' }),
 *   new Problem({ property: '[0]', message: 'Invalid element' })
 * ];
 * const result = prependPropertyPath('user', problems);
 * // [
 * //   { property: 'user', message: 'Invalid type' },
 * //   { property: 'user.name', message: 'Required' },
 * //   { property: 'user[0]', message: 'Invalid element' }
 * // ]
 * ```
 */
export function prependPropertyPath(
  propertyPath: string,
  problems: Problem[],
): Problem[] {
  return problems.map((problem) => {
    return new Problem({
      property: combinePropertyPaths(propertyPath, problem.property),
      message: problem.message,
    });
  });
}

/**
 * Prepends an array index to all problems in a ValidationError.
 * Problems with empty property get `[index]` directly.
 * Problems with non-empty property get `[index].property` format.
 *
 * @param index - The array index to prepend
 * @param error - The ValidationError containing problems to process
 * @returns Array of Problems with the array index prepended
 *
 * @example
 * ```typescript
 * const error = new ValidationError([
 *   new Problem({ property: '', message: 'Invalid type' }),
 *   new Problem({ property: 'name', message: 'Required' })
 * ]);
 * const problems = prependArrayIndex(0, error);
 * // [
 * //   { property: '[0]', message: 'Invalid type' },
 * //   { property: '[0].name', message: 'Required' }
 * // ]
 * ```
 */
export function prependArrayIndex(
  index: number,
  error: ValidationError,
): Problem[] {
  return error.problems.map((problem) => {
    return new Problem({
      property: combinePropertyPaths(`[${index}]`, problem.property),
      message: problem.message,
    });
  });
}
