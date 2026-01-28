import { describe, it, expect } from 'vitest';
import { prependPropertyPath } from './validation-utils.js';
import { ValidationError } from './validation-error.js';
import { Problem } from './problem.js';

describe('prependPropertyPath', () => {
  it('should prepend property path to problem with non-empty property', () => {
    const error = new ValidationError([
      new Problem({ property: 'name', message: 'Required' }),
    ]);
    const problems = prependPropertyPath('user', error);

    expect(problems).toHaveLength(1);
    expect(problems[0].property).toBe('user.name');
    expect(problems[0].message).toBe('Required');
  });

  it('should handle empty property by using path directly', () => {
    const error = new ValidationError([
      new Problem({ property: '', message: 'Invalid type' }),
    ]);
    const problems = prependPropertyPath('user', error);

    expect(problems).toHaveLength(1);
    expect(problems[0].property).toBe('user');
    expect(problems[0].message).toBe('Invalid type');
  });

  it('should handle multiple problems with mixed empty and non-empty properties', () => {
    const error = new ValidationError([
      new Problem({ property: '', message: 'Invalid type' }),
      new Problem({ property: 'name', message: 'Required' }),
      new Problem({ property: 'age', message: 'Must be positive' }),
    ]);
    const problems = prependPropertyPath('user', error);

    expect(problems).toHaveLength(3);
    expect(problems[0].property).toBe('user');
    expect(problems[0].message).toBe('Invalid type');
    expect(problems[1].property).toBe('user.name');
    expect(problems[1].message).toBe('Required');
    expect(problems[2].property).toBe('user.age');
    expect(problems[2].message).toBe('Must be positive');
  });

  it('should work with array index paths', () => {
    const error = new ValidationError([
      new Problem({ property: 'name', message: 'Required' }),
    ]);
    const problems = prependPropertyPath('items[0]', error);

    expect(problems).toHaveLength(1);
    expect(problems[0].property).toBe('items[0].name');
  });

  it('should work with nested array paths', () => {
    const error = new ValidationError([
      new Problem({ property: '[0]', message: 'Invalid' }),
      new Problem({ property: '[1].name', message: 'Required' }),
    ]);
    const problems = prependPropertyPath('items', error);

    expect(problems).toHaveLength(2);
    expect(problems[0].property).toBe('items[0]');
    expect(problems[1].property).toBe('items[1].name');
  });
});
