/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect } from 'vitest';
import { z } from 'zod';
import { Entity } from './entity.js';
import { ZodProperty } from './zod-property.js';
import { EntityUtils } from './entity-utils.js';
import { Problem } from './problem.js';
import { ValidationError } from './validation-error.js';

describe('ZodProperty', () => {
  it('should validate a simple string schema', async () => {
    @Entity()
    class TestEntity {
      @ZodProperty(z.string().min(3))
      name!: string;

      constructor(data: any) {
        Object.assign(this, data);
      }
    }

    const result = await EntityUtils.parse(TestEntity, { name: 'John' });
    expect(result.name).toBe('John');
    expect(EntityUtils.problems(result)).toHaveLength(0);
  });

  it('should create problems for invalid string', async () => {
    @Entity()
    class TestEntity {
      @ZodProperty(z.string().min(3))
      name!: string;

      constructor(data: any) {
        Object.assign(this, data);
      }
    }

    await expect(EntityUtils.parse(TestEntity, { name: 'Jo' })).rejects.toThrow(
      ValidationError,
    );

    try {
      await EntityUtils.parse(TestEntity, { name: 'Jo' });
    } catch (error) {
      expect(error).toBeInstanceOf(ValidationError);
      const problems = (error as ValidationError).problems;
      expect(problems.length).toBeGreaterThan(0);
      expect(problems[0].property).toBe('name');
    }
  });

  it('should allow optional properties', async () => {
    @Entity()
    class TestEntity {
      @ZodProperty(z.string().email(), { optional: true })
      email?: string;

      constructor(data: any) {
        Object.assign(this, data);
      }
    }

    const result = await EntityUtils.parse(TestEntity, {});
    expect(result.email).toBeUndefined();
    expect(EntityUtils.problems(result)).toHaveLength(0);
  });

  it('should throw ValidationError when validation fails', async () => {
    @Entity()
    class TestEntity {
      @ZodProperty(z.string().email())
      email!: string;

      constructor(data: any) {
        Object.assign(this, data);
      }
    }

    const invalidEmail = 'not-an-email';

    await expect(
      EntityUtils.parse(TestEntity, { email: invalidEmail }),
    ).rejects.toThrow(ValidationError);

    try {
      await EntityUtils.parse(TestEntity, { email: invalidEmail });
    } catch (error) {
      expect(error).toBeInstanceOf(ValidationError);
      const problems = (error as ValidationError).problems;
      expect(problems.length).toBeGreaterThan(0);
      expect(problems[0].property).toBe('email');
    }
  });

  it('should handle transformations', async () => {
    const schema = z.string().transform((val) => val.toUpperCase());

    @Entity()
    class TestEntity {
      @ZodProperty(schema)
      name!: string;

      constructor(data: any) {
        Object.assign(this, data);
      }
    }

    const result = await EntityUtils.parse(TestEntity, { name: 'john' });
    expect(result.name).toBe('JOHN');
    expect(EntityUtils.problems(result)).toHaveLength(0);
  });

  it('should combine with custom validators', async () => {
    @Entity()
    class TestEntity {
      @ZodProperty(z.string().min(3), {
        validators: [
          ({ value }) =>
            value === 'forbidden'
              ? [
                  new Problem({
                    property: '',
                    message: 'This value is forbidden',
                  }),
                ]
              : [],
        ],
      })
      name!: string;

      constructor(data: any) {
        Object.assign(this, data);
      }
    }

    const result = await EntityUtils.parse(TestEntity, { name: 'forbidden' });
    const problems = EntityUtils.problems(result);

    expect(problems.length).toBeGreaterThan(0);
    const forbiddenProblem = problems.find((p) =>
      p.message.includes('forbidden'),
    );
    expect(forbiddenProblem).toBeDefined();
  });
});
