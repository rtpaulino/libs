/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect } from 'vitest';
import { z } from 'zod';
import { Entity } from './entity.js';
import { ZodProperty } from './zod-property.js';
import { EntityUtils } from './entity-utils.js';
import { Problem } from './problem.js';
import { ValidationError } from './validation-error.js';

// Entity class definitions
@Entity({ name: 'ZodStringValidationEntity' })
class ZodStringValidationEntity {
  @ZodProperty(z.string().min(3))
  name!: string;

  constructor(data: any) {
    Object.assign(this, data);
  }
}

@Entity({ name: 'ZodOptionalEmailEntity' })
class ZodOptionalEmailEntity {
  @ZodProperty(z.string().email(), { optional: true })
  email?: string;

  constructor(data: any) {
    Object.assign(this, data);
  }
}

@Entity({ name: 'ZodEmailValidationEntity' })
class ZodEmailValidationEntity {
  @ZodProperty(z.string().email())
  email!: string;

  constructor(data: any) {
    Object.assign(this, data);
  }
}

@Entity({ name: 'ZodTransformEntity' })
class ZodTransformEntity {
  @ZodProperty(z.string().transform((val) => val.toUpperCase()))
  name!: string;

  constructor(data: any) {
    Object.assign(this, data);
  }
}

@Entity({ name: 'ZodCustomValidatorEntity' })
class ZodCustomValidatorEntity {
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

describe('ZodProperty', () => {
  it('should validate a simple string schema', async () => {
    const result = await EntityUtils.parse(ZodStringValidationEntity, {
      name: 'John',
    });
    expect(result.name).toBe('John');
    expect(EntityUtils.getProblems(result)).toHaveLength(0);
  });

  it('should create problems for invalid string', async () => {
    await expect(
      EntityUtils.parse(ZodStringValidationEntity, { name: 'Jo' }),
    ).rejects.toThrow(ValidationError);

    try {
      await EntityUtils.parse(ZodStringValidationEntity, { name: 'Jo' });
    } catch (error) {
      expect(error).toBeInstanceOf(ValidationError);
      const problems = (error as ValidationError).problems;
      expect(problems.length).toBeGreaterThan(0);
      expect(problems[0].property).toBe('name');
    }
  });

  it('should allow optional properties', async () => {
    const result = await EntityUtils.parse(ZodOptionalEmailEntity, {});
    expect(result.email).toBeUndefined();
    expect(EntityUtils.getProblems(result)).toHaveLength(0);
  });

  it('should throw ValidationError when validation fails', async () => {
    const invalidEmail = 'not-an-email';

    await expect(
      EntityUtils.parse(ZodEmailValidationEntity, { email: invalidEmail }),
    ).rejects.toThrow(ValidationError);

    try {
      await EntityUtils.parse(ZodEmailValidationEntity, {
        email: invalidEmail,
      });
    } catch (error) {
      expect(error).toBeInstanceOf(ValidationError);
      const problems = (error as ValidationError).problems;
      expect(problems.length).toBeGreaterThan(0);
      expect(problems[0].property).toBe('email');
    }
  });

  it('should handle transformations', async () => {
    const result = await EntityUtils.parse(ZodTransformEntity, {
      name: 'john',
    });
    expect(result.name).toBe('JOHN');
    expect(EntityUtils.getProblems(result)).toHaveLength(0);
  });

  it('should combine with custom validators', async () => {
    const result = await EntityUtils.parse(ZodCustomValidatorEntity, {
      name: 'forbidden',
    });
    const problems = EntityUtils.getProblems(result);

    expect(problems.length).toBeGreaterThan(0);
    const forbiddenProblem = problems.find((p) =>
      p.message.includes('forbidden'),
    );
    expect(forbiddenProblem).toBeDefined();
  });
});
