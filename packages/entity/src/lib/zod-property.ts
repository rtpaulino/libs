/* eslint-disable @typescript-eslint/no-explicit-any */
import { Property } from './property.js';
import type { PropertyOptions, PropertyValidator } from './types.js';
import { Problem } from './problem.js';
import { ValidationError } from './validation-error.js';
import type { z } from 'zod';

/**
 * Converts Zod issues to Problem array
 * @param issues - Zod validation issues
 * @returns Array of Problems with proper property paths
 */
function zodIssuesToProblems(issues: z.core.$ZodIssue[]): Problem[] {
  return issues.map((issue: any) => {
    const path = issue.path || [];

    let propertyPath = '';
    for (const segment of path) {
      if (typeof segment === 'number') {
        propertyPath += `[${segment}]`;
      } else if (propertyPath === '') {
        propertyPath = segment;
      } else {
        propertyPath += `.${segment}`;
      }
    }

    return new Problem({
      property: propertyPath,
      message: issue.message || 'Validation failed',
    });
  });
}

/**
 * Helper decorator for Zod schema properties.
 * Validates values using a Zod schema during deserialization.
 * Validation failures throw ValidationError (hard errors).
 *
 * When validation succeeds, applies any Zod transformations to the value.
 *
 * @param schema - The Zod schema to validate against
 * @param options - Additional property options (optional, array, etc.)
 *
 * @example
 * ```typescript
 * import { z } from 'zod';
 *
 * const UserSchema = z.object({
 *   name: z.string().min(3),
 *   age: z.number().int().min(0)
 * });
 *
 * @Entity()
 * class User {
 *   @ZodProperty(UserSchema)
 *   data!: z.infer<typeof UserSchema>;
 *
 *   @ZodProperty(z.string().email(), { optional: true })
 *   email?: string;
 * }
 * ```
 */
export function ZodProperty<T = any>(
  schema: z.ZodTypeAny,
  options?: Omit<
    PropertyOptions<T, any>,
    'type' | 'deserialize' | 'serialize' | 'passthrough' | 'validators'
  > & {
    validators?: PropertyValidator<T>[];
  },
): PropertyDecorator {
  return Property({
    ...options,
    type: () => Object,
    serialize: (value: any) => value,
    deserialize: (value: unknown): any => {
      const result = schema.safeParse(value);

      if (result.success) {
        return result.data as T;
      } else {
        const problems = zodIssuesToProblems(result.error.issues);
        throw new ValidationError(problems);
      }
    },
    validators: options?.validators as any,
  });
}
