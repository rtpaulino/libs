import { Problem } from './problem.js';

/**
 * Error thrown when HARD validation errors occur (type mismatches, missing required fields)
 */
export class ValidationError extends Error {
  readonly problems: Problem[];

  constructor(problems: Problem[]) {
    super(
      `Validation failed with ${problems.length} error(s): ${problems.map((p) => p.toString()).join('; ')}`,
    );
    this.name = 'ValidationError';
    this.problems = problems;
    Object.setPrototypeOf(this, ValidationError.prototype);
  }
}
