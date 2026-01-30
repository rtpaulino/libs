/* eslint-disable @typescript-eslint/no-explicit-any */
import 'reflect-metadata';
import { describe, it, expect } from 'vitest';
import { EntityUtils } from './entity-utils.js';
import {
  StringProperty,
  NumberProperty,
  EntityProperty,
  ArrayProperty,
} from './property.js';
import { Entity } from './entity.js';
import { ValidationError } from './validation-error.js';
import { minLengthValidator, minValidator } from './validators.js';

describe('EntityUtils', () => {
  describe('partialParse', () => {
    describe('basic behavior', () => {
      it('should return a plain object, not an entity instance', async () => {
        @Entity()
        class User {
          @StringProperty()
          name!: string;

          @NumberProperty()
          age!: number;

          constructor(data: Partial<User>) {
            Object.assign(this, data);
          }
        }

        const result = await EntityUtils.partialParse(User, {
          name: 'John',
          age: 30,
        });

        expect(result).not.toBeInstanceOf(User);
        expect(result).toEqual({ name: 'John', age: 30 });
      });

      it('should ignore missing properties', async () => {
        @Entity()
        class User {
          @StringProperty()
          name!: string;

          @NumberProperty()
          age!: number;

          @StringProperty({ optional: true })
          email?: string;

          constructor(data: Partial<User>) {
            Object.assign(this, data);
          }
        }

        const result = await EntityUtils.partialParse(User, {
          name: 'John',
        });

        expect(result).toEqual({ name: 'John' });
        expect('age' in result).toBe(false);
        expect('email' in result).toBe(false);
      });

      it('should NOT apply default values to missing properties', async () => {
        @Entity()
        class User {
          @StringProperty()
          name!: string;

          @NumberProperty({ default: 0 })
          age!: number;

          @StringProperty({ default: 'active' })
          status!: string;

          constructor(data: Partial<User>) {
            Object.assign(this, data);
          }
        }

        const result = await EntityUtils.partialParse(User, {
          name: 'John',
        });

        expect(result).toEqual({ name: 'John' });
        expect('age' in result).toBe(false);
        expect('status' in result).toBe(false);
      });
    });

    describe('deserialization of present properties', () => {
      it('should deserialize primitive types correctly', async () => {
        @Entity()
        class User {
          @StringProperty()
          name!: string;

          @NumberProperty()
          age!: number;

          constructor(data: Partial<User>) {
            Object.assign(this, data);
          }
        }

        const result = await EntityUtils.partialParse(User, {
          name: 'John',
          age: 30,
        });

        expect(result).toEqual({ name: 'John', age: 30 });
      });

      it('should deserialize nested entities', async () => {
        @Entity()
        class Address {
          @StringProperty()
          street!: string;

          constructor(data: Partial<Address>) {
            Object.assign(this, data);
          }
        }

        @Entity()
        class User {
          @StringProperty()
          name!: string;

          @EntityProperty(() => Address)
          address!: Address;

          constructor(data: Partial<User>) {
            Object.assign(this, data);
          }
        }

        const result = await EntityUtils.partialParse(User, {
          name: 'John',
          address: { street: '123 Main St' },
        });

        expect(result.name).toBe('John');
        expect(result.address).toBeInstanceOf(Address);
        expect(result.address!.street).toBe('123 Main St');
      });

      it('should deserialize arrays', async () => {
        @Entity()
        class User {
          @StringProperty()
          name!: string;

          @ArrayProperty(() => String)
          tags!: string[];

          constructor(data: Partial<User>) {
            Object.assign(this, data);
          }
        }

        const result = await EntityUtils.partialParse(User, {
          name: 'John',
          tags: ['admin', 'user'],
        });

        expect(result).toEqual({ name: 'John', tags: ['admin', 'user'] });
      });
    });

    describe('strict mode', () => {
      it('should throw ValidationError in strict mode when a property has HARD problems', async () => {
        @Entity()
        class User {
          @StringProperty()
          name!: string;

          @NumberProperty()
          age!: number;

          constructor(data: Partial<User>) {
            Object.assign(this, data);
          }
        }

        await expect(
          EntityUtils.partialParse(
            User,
            { name: 'John', age: 'invalid' },
            { strict: true },
          ),
        ).rejects.toThrow(ValidationError);
      });

      it('should throw ValidationError in strict mode for missing required properties', async () => {
        @Entity()
        class User {
          @StringProperty()
          name!: string;

          @NumberProperty()
          age!: number;

          constructor(data: Partial<User>) {
            Object.assign(this, data);
          }
        }

        // In partialParse, missing properties should be skipped, not cause errors
        // So this should NOT throw even in strict mode
        const result = await EntityUtils.partialParse(
          User,
          { name: 'John' },
          { strict: true },
        );

        expect(result).toEqual({ name: 'John' });
      });
    });

    describe('non-strict mode (default)', () => {
      it('should exclude properties with HARD problems from result', async () => {
        @Entity()
        class User {
          @StringProperty()
          name!: string;

          @NumberProperty()
          age!: number;

          constructor(data: Partial<User>) {
            Object.assign(this, data);
          }
        }

        const result = await EntityUtils.partialParse(User, {
          name: 'John',
          age: 'invalid',
        });

        expect(result).toEqual({ name: 'John' });
        expect('age' in result).toBe(false);
      });

      it('should exclude multiple properties with HARD problems', async () => {
        @Entity()
        class User {
          @StringProperty()
          name!: string;

          @NumberProperty()
          age!: number;

          @NumberProperty()
          score!: number;

          constructor(data: Partial<User>) {
            Object.assign(this, data);
          }
        }

        const result = await EntityUtils.partialParse(User, {
          name: 'John',
          age: 'invalid',
          score: 'also-invalid',
        });

        expect(result).toEqual({ name: 'John' });
        expect('age' in result).toBe(false);
        expect('score' in result).toBe(false);
      });

      it('should handle partial objects with some valid and some invalid properties', async () => {
        @Entity()
        class User {
          @StringProperty()
          name!: string;

          @NumberProperty()
          age!: number;

          @StringProperty()
          email!: string;

          @NumberProperty()
          score!: number;

          constructor(data: Partial<User>) {
            Object.assign(this, data);
          }
        }

        const result = await EntityUtils.partialParse(User, {
          name: 'John',
          age: 'invalid',
          email: 'john@example.com',
          score: 100,
        });

        expect(result).toEqual({
          name: 'John',
          email: 'john@example.com',
          score: 100,
        });
        expect('age' in result).toBe(false);
      });
    });

    describe('nested entities with errors', () => {
      it('should exclude nested entity property if it has HARD problems', async () => {
        @Entity()
        class Address {
          @StringProperty()
          street!: string;

          @NumberProperty()
          zipCode!: number;

          constructor(data: Partial<Address>) {
            Object.assign(this, data);
          }
        }

        @Entity()
        class User {
          @StringProperty()
          name!: string;

          @EntityProperty(() => Address)
          address!: Address;

          constructor(data: Partial<User>) {
            Object.assign(this, data);
          }
        }

        const result = await EntityUtils.partialParse(User, {
          name: 'John',
          address: { street: '123 Main St', zipCode: 'invalid' },
        });

        expect(result).toEqual({ name: 'John' });
        expect('address' in result).toBe(false);
      });

      it('should include nested entity if it is valid', async () => {
        @Entity()
        class Address {
          @StringProperty()
          street!: string;

          @NumberProperty()
          zipCode!: number;

          constructor(data: Partial<Address>) {
            Object.assign(this, data);
          }
        }

        @Entity()
        class User {
          @StringProperty()
          name!: string;

          @EntityProperty(() => Address)
          address!: Address;

          constructor(data: Partial<User>) {
            Object.assign(this, data);
          }
        }

        const result = await EntityUtils.partialParse(User, {
          name: 'John',
          address: { street: '123 Main St', zipCode: 12345 },
        });

        expect(result.name).toBe('John');
        expect(result.address).toBeInstanceOf(Address);
        expect(result.address!.street).toBe('123 Main St');
        expect(result.address!.zipCode).toBe(12345);
      });
    });

    describe('arrays with errors', () => {
      it('should exclude array property if any element has HARD problems', async () => {
        @Entity()
        class User {
          @StringProperty()
          name!: string;

          @ArrayProperty(() => Number)
          scores!: number[];

          constructor(data: Partial<User>) {
            Object.assign(this, data);
          }
        }

        const result = await EntityUtils.partialParse(User, {
          name: 'John',
          scores: [100, 'invalid', 200],
        });

        expect(result).toEqual({ name: 'John' });
        expect('scores' in result).toBe(false);
      });

      it('should include array if all elements are valid', async () => {
        @Entity()
        class User {
          @StringProperty()
          name!: string;

          @ArrayProperty(() => Number)
          scores!: number[];

          constructor(data: Partial<User>) {
            Object.assign(this, data);
          }
        }

        const result = await EntityUtils.partialParse(User, {
          name: 'John',
          scores: [100, 200, 300],
        });

        expect(result).toEqual({ name: 'John', scores: [100, 200, 300] });
      });
    });
  });

  describe('safePartialParse', () => {
    describe('success cases', () => {
      it('should return success with data when all properties are valid', async () => {
        @Entity()
        class User {
          @StringProperty()
          name!: string;

          @NumberProperty()
          age!: number;

          constructor(data: Partial<User>) {
            Object.assign(this, data);
          }
        }

        const result = await EntityUtils.safePartialParse(User, {
          name: 'John',
          age: 30,
        });

        expect(result.success).toBe(true);
        expect(result.data).toEqual({ name: 'John', age: 30 });
        expect(result.problems).toEqual([]);
      });

      it('should return success with data and problems when some properties have HARD errors (non-strict)', async () => {
        @Entity()
        class User {
          @StringProperty()
          name!: string;

          @NumberProperty()
          age!: number;

          constructor(data: Partial<User>) {
            Object.assign(this, data);
          }
        }

        const result = await EntityUtils.safePartialParse(User, {
          name: 'John',
          age: 'invalid',
        });

        expect(result.success).toBe(true);
        expect(result.data).toEqual({ name: 'John' });
        expect(result.problems.length).toBeGreaterThan(0);
        expect(result.problems[0].property).toContain('age');
      });

      it('should skip missing properties without errors', async () => {
        @Entity()
        class User {
          @StringProperty()
          name!: string;

          @NumberProperty()
          age!: number;

          @StringProperty({ optional: true })
          email?: string;

          constructor(data: Partial<User>) {
            Object.assign(this, data);
          }
        }

        const result = await EntityUtils.safePartialParse(User, {
          name: 'John',
        });

        expect(result.success).toBe(true);
        expect(result.data).toEqual({ name: 'John' });
        expect(result.problems).toEqual([]);
      });
    });

    describe('strict mode', () => {
      it('should return failure when there are HARD problems in strict mode', async () => {
        @Entity()
        class User {
          @StringProperty()
          name!: string;

          @NumberProperty()
          age!: number;

          constructor(data: Partial<User>) {
            Object.assign(this, data);
          }
        }

        const result = await EntityUtils.safePartialParse(
          User,
          { name: 'John', age: 'invalid' },
          { strict: true },
        );

        expect(result.success).toBe(false);
        expect(result.data).toBeUndefined();
        expect(result.problems.length).toBeGreaterThan(0);
      });

      it('should return success in strict mode when all present properties are valid', async () => {
        @Entity()
        class User {
          @StringProperty()
          name!: string;

          @NumberProperty()
          age!: number;

          constructor(data: Partial<User>) {
            Object.assign(this, data);
          }
        }

        const result = await EntityUtils.safePartialParse(
          User,
          { name: 'John', age: 30 },
          { strict: true },
        );

        expect(result.success).toBe(true);
        expect(result.data).toEqual({ name: 'John', age: 30 });
        expect(result.problems).toEqual([]);
      });
    });

    describe('non-strict mode', () => {
      it('should always return success in non-strict mode even with HARD problems', async () => {
        @Entity()
        class User {
          @StringProperty()
          name!: string;

          @NumberProperty()
          age!: number;

          constructor(data: Partial<User>) {
            Object.assign(this, data);
          }
        }

        const result = await EntityUtils.safePartialParse(User, {
          name: 'John',
          age: 'invalid',
        });

        expect(result.success).toBe(true);
        expect(result.data).toEqual({ name: 'John' });
        expect(result.problems.length).toBeGreaterThan(0);
      });

      it('should report problems for all excluded properties', async () => {
        @Entity()
        class User {
          @StringProperty()
          name!: string;

          @NumberProperty()
          age!: number;

          @NumberProperty()
          score!: number;

          constructor(data: Partial<User>) {
            Object.assign(this, data);
          }
        }

        const result = await EntityUtils.safePartialParse(User, {
          name: 'John',
          age: 'invalid',
          score: 'also-invalid',
        });

        expect(result.success).toBe(true);
        expect(result.data).toEqual({ name: 'John' });
        expect(result.problems.length).toBeGreaterThanOrEqual(2);

        const problemProperties = result.problems.map((p) => {
          const match = p.property.match(/^[^.[]+/);
          return match ? match[0] : '';
        });
        expect(problemProperties).toContain('age');
        expect(problemProperties).toContain('score');
      });
    });

    describe('defaults behavior', () => {
      it('should NOT apply defaults in safePartialParse', async () => {
        @Entity()
        class User {
          @StringProperty()
          name!: string;

          @NumberProperty({ default: 0 })
          age!: number;

          @StringProperty({ default: 'active' })
          status!: string;

          constructor(data: Partial<User>) {
            Object.assign(this, data);
          }
        }

        const result = await EntityUtils.safePartialParse(User, {
          name: 'John',
        });

        expect(result.success).toBe(true);
        expect(result.data).toEqual({ name: 'John' });
        expect('age' in result.data!).toBe(false);
        expect('status' in result.data!).toBe(false);
      });
    });

    describe('property validation', () => {
      describe('partialParse', () => {
        it('should run property validators on successfully parsed properties', async () => {
          @Entity()
          class User {
            @StringProperty({ validators: [minLengthValidator(3)] })
            name!: string;

            @NumberProperty({ validators: [minValidator(18)] })
            age!: number;

            constructor(data: Partial<User>) {
              Object.assign(this, data);
            }
          }

          const result = await EntityUtils.partialParse(User, {
            name: 'John',
            age: 25,
          });

          expect(result).toEqual({ name: 'John', age: 25 });
          const problems = EntityUtils.getProblems(result as any);
          expect(problems).toEqual([]);
        });

        it('should collect validation problems in non-strict mode', async () => {
          @Entity()
          class User {
            @StringProperty({ validators: [minLengthValidator(5)] })
            name!: string;

            @NumberProperty({ validators: [minValidator(18)] })
            age!: number;

            constructor(data: Partial<User>) {
              Object.assign(this, data);
            }
          }

          const result = await EntityUtils.partialParse(User, {
            name: 'Jo',
            age: 15,
          });

          expect(result).toEqual({ name: 'Jo', age: 15 });
          const problems = EntityUtils.getProblems(result as any);
          expect(problems.length).toBe(2);
          expect(problems.some((p) => p.property === 'name')).toBe(true);
          expect(problems.some((p) => p.property === 'age')).toBe(true);
        });

        it('should throw validation errors in strict mode', async () => {
          @Entity()
          class User {
            @StringProperty({ validators: [minLengthValidator(5)] })
            name!: string;

            @NumberProperty()
            age!: number;

            constructor(data: Partial<User>) {
              Object.assign(this, data);
            }
          }

          await expect(
            EntityUtils.partialParse(
              User,
              { name: 'Jo', age: 25 },
              { strict: true },
            ),
          ).rejects.toThrow(ValidationError);
        });

        it('should validate only present properties, not missing ones', async () => {
          @Entity()
          class User {
            @StringProperty()
            name!: string;

            @NumberProperty({ validators: [minValidator(18)] })
            age!: number;

            constructor(data: Partial<User>) {
              Object.assign(this, data);
            }
          }

          // age is missing, so its validator should not run
          const result = await EntityUtils.partialParse(User, {
            name: 'John',
          });

          expect(result).toEqual({ name: 'John' });
          const problems = EntityUtils.getProblems(result as any);
          expect(problems).toEqual([]);
        });

        it('should validate nested entities', async () => {
          @Entity()
          class Address {
            @StringProperty({ validators: [minLengthValidator(5)] })
            street!: string;

            constructor(data: Partial<Address>) {
              Object.assign(this, data);
            }
          }

          @Entity()
          class User {
            @StringProperty()
            name!: string;

            @EntityProperty(() => Address)
            address!: Address;

            constructor(data: Partial<User>) {
              Object.assign(this, data);
            }
          }

          const result = await EntityUtils.partialParse(User, {
            name: 'John',
            address: { street: 'St' },
          });

          expect(result.name).toBe('John');
          expect(result.address).toBeInstanceOf(Address);

          const problems = EntityUtils.getProblems(result as any);
          expect(problems.length).toBeGreaterThan(0);
          expect(problems.some((p) => p.property.includes('address'))).toBe(
            true,
          );
        });

        it('should validate array elements', async () => {
          @Entity()
          class User {
            @StringProperty()
            name!: string;

            @ArrayProperty(() => Number, { validators: [minValidator(0)] })
            scores!: number[];

            constructor(data: Partial<User>) {
              Object.assign(this, data);
            }
          }

          const result = await EntityUtils.partialParse(User, {
            name: 'John',
            scores: [10, -5, 20],
          });

          expect(result).toEqual({ name: 'John', scores: [10, -5, 20] });
          const problems = EntityUtils.getProblems(result as any);
          expect(problems.length).toBeGreaterThan(0);
          expect(problems.some((p) => p.property.includes('scores'))).toBe(
            true,
          );
        });

        it('should combine hard problems and validation problems', async () => {
          @Entity()
          class User {
            @StringProperty({ validators: [minLengthValidator(5)] })
            name!: string;

            @NumberProperty()
            age!: number;

            @StringProperty()
            email!: string;

            constructor(data: Partial<User>) {
              Object.assign(this, data);
            }
          }

          // name has validation problem, age has type problem
          const result = await EntityUtils.partialParse(User, {
            name: 'Jo',
            age: 'invalid' as any,
            email: 'test@example.com',
          });

          // age should be excluded due to hard problem, name should be included but have validation problem
          expect(result).toEqual({ name: 'Jo', email: 'test@example.com' });
          const problems = EntityUtils.getProblems(result as any);
          expect(problems.length).toBeGreaterThanOrEqual(2);
          expect(problems.some((p) => p.property === 'name')).toBe(true);
          expect(problems.some((p) => p.property === 'age')).toBe(true);
        });
      });

      describe('safePartialParse', () => {
        it('should return validation problems in the result', async () => {
          @Entity()
          class User {
            @StringProperty({ validators: [minLengthValidator(5)] })
            name!: string;

            @NumberProperty({ validators: [minValidator(18)] })
            age!: number;

            constructor(data: Partial<User>) {
              Object.assign(this, data);
            }
          }

          const result = await EntityUtils.safePartialParse(User, {
            name: 'Jo',
            age: 15,
          });

          expect(result.success).toBe(true);
          expect(result.data).toEqual({ name: 'Jo', age: 15 });
          expect(result.problems.length).toBe(2);
          expect(result.problems.some((p) => p.property === 'name')).toBe(true);
          expect(result.problems.some((p) => p.property === 'age')).toBe(true);
        });

        it('should return failure in strict mode with validation problems', async () => {
          @Entity()
          class User {
            @StringProperty({ validators: [minLengthValidator(5)] })
            name!: string;

            @NumberProperty()
            age!: number;

            constructor(data: Partial<User>) {
              Object.assign(this, data);
            }
          }

          const result = await EntityUtils.safePartialParse(
            User,
            { name: 'Jo', age: 25 },
            { strict: true },
          );

          expect(result.success).toBe(false);
          expect(result.data).toBeUndefined();
          expect(result.problems.length).toBeGreaterThan(0);
          expect(result.problems.some((p) => p.property === 'name')).toBe(true);
        });

        it('should return success in strict mode when all validations pass', async () => {
          @Entity()
          class User {
            @StringProperty({ validators: [minLengthValidator(3)] })
            name!: string;

            @NumberProperty({ validators: [minValidator(18)] })
            age!: number;

            constructor(data: Partial<User>) {
              Object.assign(this, data);
            }
          }

          const result = await EntityUtils.safePartialParse(
            User,
            { name: 'John', age: 25 },
            { strict: true },
          );

          expect(result.success).toBe(true);
          expect(result.data).toEqual({ name: 'John', age: 25 });
          expect(result.problems).toEqual([]);
        });

        it('should include both hard and validation problems', async () => {
          @Entity()
          class User {
            @StringProperty({ validators: [minLengthValidator(5)] })
            name!: string;

            @NumberProperty()
            age!: number;

            constructor(data: Partial<User>) {
              Object.assign(this, data);
            }
          }

          const result = await EntityUtils.safePartialParse(User, {
            name: 'Jo',
            age: 'invalid' as any,
          });

          expect(result.success).toBe(true);
          expect(result.data).toEqual({ name: 'Jo' });
          expect(result.problems.length).toBeGreaterThanOrEqual(2);

          const problemProperties = result.problems.map((p) => p.property);
          expect(problemProperties).toContain('name');
          expect(problemProperties).toContain('age');
        });
      });
    });
  });
});
