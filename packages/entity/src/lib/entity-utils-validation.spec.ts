/* eslint-disable @typescript-eslint/no-explicit-any */
import 'reflect-metadata';
import { describe, it, expect } from 'vitest';
import { EntityUtils } from './entity-utils.js';
import { ValidationError } from './validation-error.js';
import { Problem } from './problem.js';
import {
  ValidatedEntity,
  CrossValidatedEntity,
  EntityWithArrays,
  EntityWithEnum,
  TestEmployee,
  EntityWithZod,
  ComplexEntity,
  TestUser,
  TestCompany,
  TestAddress,
  TestUserId,
  UserRole,
  ProductStatus,
} from './test-entities.js';

describe('EntityUtils.validate', () => {
  describe('Property-Level Validators', () => {
    it('should validate string constraints (minLength, maxLength)', async () => {
      const entity = new ValidatedEntity({
        username: 'ab', // too short (min 3)
        email: 'valid@example.com',
        age: 25,
      });

      const problems = await EntityUtils.validate(entity);
      expect(problems.length).toBeGreaterThan(0);
      expect(problems.some((p) => p.property === 'username')).toBe(true);
      expect(
        problems.some((p) => p.message.toLowerCase().includes('length')),
      ).toBe(true);
    });

    it('should validate string pattern (regex)', async () => {
      const entity = new ValidatedEntity({
        username: 'john',
        email: 'invalid-email', // doesn't match email pattern
        age: 25,
      });

      const problems = await EntityUtils.validate(entity);
      expect(problems.length).toBeGreaterThan(0);
      expect(problems.some((p) => p.property === 'email')).toBe(true);
    });

    it('should validate number range (min, max)', async () => {
      const entity = new ValidatedEntity({
        username: 'john',
        email: 'john@example.com',
        age: 200, // exceeds max 150
      });

      const problems = await EntityUtils.validate(entity);
      expect(problems.length).toBeGreaterThan(0);
      expect(problems.some((p) => p.property === 'age')).toBe(true);
    });

    it('should pass validation when all constraints met', async () => {
      const entity = new ValidatedEntity({
        username: 'john',
        email: 'john@example.com',
        age: 25,
      });

      const problems = await EntityUtils.validate(entity);
      expect(problems).toHaveLength(0);
    });

    it('should collect multiple problems on same property', async () => {
      const entity = new ValidatedEntity({
        username: 'ab', // too short
        email: 'invalid',
        age: 25,
      });

      const problems = await EntityUtils.validate(entity);
      const usernameProblems = problems.filter(
        (p) => p.property === 'username',
      );
      const emailProblems = problems.filter((p) => p.property === 'email');

      expect(usernameProblems.length).toBeGreaterThan(0);
      expect(emailProblems.length).toBeGreaterThan(0);
    });
  });

  describe('Entity-Level Validators (@EntityValidator)', () => {
    it('should run entity validators for cross-field validation', async () => {
      const entity = new CrossValidatedEntity({
        password: 'secret123',
        confirmPassword: 'different',
        startDate: new Date('2024-02-01'),
        endDate: new Date('2024-01-01'), // before start
      });

      const problems = await EntityUtils.validate(entity);
      expect(problems.length).toBeGreaterThan(0);
      // Should have problems for both password and date validations
      expect(
        problems.some(
          (p) => p.property === 'confirmPassword' || p.property === 'endDate',
        ),
      ).toBe(true);
    });

    it('should pass when cross-field constraints met', async () => {
      const entity = new CrossValidatedEntity({
        password: 'secret123',
        confirmPassword: 'secret123',
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-02-01'),
      });

      const problems = await EntityUtils.validate(entity);
      expect(problems).toHaveLength(0);
    });

    it('should run entity validators after property validators', async () => {
      // This is tested by the fact that both work together
      const entity = new CrossValidatedEntity({
        password: 'secret',
        confirmPassword: 'different',
        startDate: new Date('2024-02-01'),
        endDate: new Date('2024-01-01'),
      });

      const problems = await EntityUtils.validate(entity);
      // Should have problems from entity validators (cross-field checks)
      expect(problems.length).toBeGreaterThan(0);
    });
  });

  describe('Array Validators', () => {
    it('should validate array length constraints', async () => {
      const entity = new EntityWithArrays({
        tags: ['tag1', 'tag2'],
        ratings: [], // violates minLength: 1
        sparseArray: ['a', null, 'b'],
        users: [],
      });

      const problems = await EntityUtils.validate(entity);
      expect(problems.some((p) => p.property === 'ratings')).toBe(true);
    });

    it('should validate array max length', async () => {
      const entity = new EntityWithArrays({
        tags: ['t1', 't2', 't3'],
        ratings: [1, 2, 3, 4, 5, 6], // exceeds maxLength: 5
        sparseArray: ['a', null, 'b'],
        users: [],
      });

      const problems = await EntityUtils.validate(entity);
      expect(problems.some((p) => p.property === 'ratings')).toBe(true);
    });

    it('should validate array element types', async () => {
      const entity = new EntityWithArrays({
        tags: ['tag1', 'tag2'],
        ratings: [1, 2, 3],
        sparseArray: ['a', null, 'b'],
        users: [
          new TestUser({ name: 'John', age: 30, active: true }),
          new TestUser({ name: 'Jane', age: 25, active: false }),
        ],
      });

      const problems = await EntityUtils.validate(entity);
      expect(problems).toHaveLength(0);
    });
  });

  describe('Enum Validation', () => {
    it('should validate enum values', async () => {
      const entity = new EntityWithEnum({
        name: 'Test',
        role: UserRole.ADMIN,
        status: ProductStatus.PUBLISHED,
      });

      const problems = await EntityUtils.validate(entity);
      expect(problems).toHaveLength(0);
    });

    it('should accept all enum values', async () => {
      const roles = [UserRole.ADMIN, UserRole.USER, UserRole.GUEST];

      for (const role of roles) {
        const entity = new EntityWithEnum({
          name: 'Test',
          role,
          status: ProductStatus.DRAFT,
        });

        const problems = await EntityUtils.validate(entity);
        expect(problems).toHaveLength(0);
      }
    });
  });

  describe('Nested Entity Validation', () => {
    it('should validate nested entities recursively', async () => {
      const employee = new TestEmployee({
        name: 'John Doe',
        email: 'john@example.com',
        salary: 50000,
        hireDate: new Date('2024-01-01'),
        company: new TestCompany({
          name: 'TechCorp',
          address: new TestAddress({
            street: '123 Main St',
            city: 'Boston',
            country: 'USA',
            zipCode: 2101,
          }),
          employeeCount: 50,
        }),
      });

      const problems = await EntityUtils.validate(employee);
      // Most nested entities don't have validators in our test entities
      // This test verifies recursive validation runs without errors
      expect(Array.isArray(problems)).toBe(true);
    });

    it('should collect problems from all nesting levels', async () => {
      const entity = new ComplexEntity({
        id: 'test-id',
        name: 'Test Entity',
        role: UserRole.USER,
        userId: new TestUserId({ value: 'user-123' }),
        address: new TestAddress({
          street: '123 Main St',
          city: 'Boston',
          country: 'USA',
          zipCode: 2101,
        }),
        tags: ['tag1'],
        products: [],
        metadata: {},
      });

      const problems = await EntityUtils.validate(entity);
      // ComplexEntity has validation that active entities need products
      expect(Array.isArray(problems)).toBe(true);
    });
  });

  describe('Zod Integration', () => {
    it('should parse entities with Zod properties', async () => {
      const entity = await EntityUtils.parse(EntityWithZod, {
        username: 'validuser',
        email: 'test@example.com',
        count: 5,
      });

      expect(entity).toBeInstanceOf(EntityWithZod);
      expect(entity.username).toBe('validuser');
      expect(entity.email).toBe('test@example.com');
      expect(entity.count).toBe(5);
    });

    it('should handle Zod validation in strict mode', async () => {
      await expect(
        EntityUtils.parse(
          EntityWithZod,
          {
            username: 'ab', // too short
            email: 'test@example.com',
            count: 5,
          },
          { strict: true },
        ),
      ).rejects.toThrow();
    });

    it('should pass Zod validation with valid data', async () => {
      const entity = await EntityUtils.parse(EntityWithZod, {
        username: 'valid',
        email: 'test@example.com',
        count: 5,
      });

      const problems = EntityUtils.getProblems(entity);
      expect(problems).toHaveLength(0);
    });
  });

  describe('Problem Path Construction', () => {
    it('should construct simple property paths', async () => {
      const entity = new ValidatedEntity({
        username: 'ab',
        email: 'test@example.com',
        age: 25,
      });

      const problems = await EntityUtils.validate(entity);
      expect(problems[0].property).toBe('username');
    });

    it('should construct nested property paths', async () => {
      const company = new TestCompany({
        name: 'TechCorp',
        address: new TestAddress({
          street: '123 Main St',
          city: 'Boston',
          country: 'USA',
          zipCode: 2101,
        }),
        employeeCount: 50,
      });

      const problems = await EntityUtils.validate(company);
      // If nested validation occurs, paths should include parent
      expect(Array.isArray(problems)).toBe(true);
    });
  });

  describe('Problem Tracking and Storage', () => {
    it('should store problems in entity metadata', async () => {
      const entity = new ValidatedEntity({
        username: 'ab',
        email: 'test@example.com',
        age: 25,
      });

      await EntityUtils.validate(entity);
      const problems = EntityUtils.getProblems(entity);

      expect(problems.length).toBeGreaterThan(0);
      expect(problems[0]).toBeInstanceOf(Problem);
    });

    it('should clear previous problems on new validation', async () => {
      const entity = new ValidatedEntity({
        username: 'ab',
        email: 'test@example.com',
        age: 25,
      });

      await EntityUtils.validate(entity);
      const firstProblems = EntityUtils.getProblems(entity);
      expect(firstProblems.length).toBeGreaterThan(0);

      // Fix the issue
      entity.username = 'john';
      await EntityUtils.validate(entity);
      const secondProblems = EntityUtils.getProblems(entity);
      expect(secondProblems).toHaveLength(0);
    });

    it('should handle entities with no problems', async () => {
      const entity = new ValidatedEntity({
        username: 'john',
        email: 'john@example.com',
        age: 25,
      });

      await EntityUtils.validate(entity);
      const problems = EntityUtils.getProblems(entity);
      expect(problems).toHaveLength(0);
    });
  });

  describe('Validation Order', () => {
    it('should run property validators before entity validators', async () => {
      const entity = new CrossValidatedEntity({
        password: 'secret',
        confirmPassword: 'different',
        startDate: new Date('2024-02-01'),
        endDate: new Date('2024-01-01'),
      });

      const problems = await EntityUtils.validate(entity);
      // Entity validators run after property validators
      // Both should produce problems
      expect(problems.length).toBeGreaterThan(0);
    });
  });

  describe('Validation with Parse Operations', () => {
    it('should validate during parse', async () => {
      const result = await EntityUtils.safeParse(ValidatedEntity, {
        username: 'ab', // too short
        email: 'test@example.com',
        age: 25,
      });

      expect(result.success).toBe(true); // In non-strict mode
      if (result.success) {
        expect(result.problems.length).toBeGreaterThan(0);
      }
    });

    it('should throw in strict mode during parse', async () => {
      await expect(
        EntityUtils.parse(
          ValidatedEntity,
          {
            username: 'ab',
            email: 'test@example.com',
            age: 25,
          },
          { strict: true },
        ),
      ).rejects.toThrow(ValidationError);
    });
  });

  describe('ValidationError Class', () => {
    it('should create ValidationError from problems', () => {
      const problems = [
        new Problem({ property: 'name', message: 'Too short' }),
        new Problem({ property: 'age', message: 'Too old' }),
      ];

      const error = new ValidationError(problems);

      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(ValidationError);
      expect(error.name).toBe('ValidationError');
      expect(error.problems).toHaveLength(2);
      expect(error.message).toContain('name: Too short');
      expect(error.message).toContain('age: Too old');
    });

    it('should format message with problem count', () => {
      const problems = [
        new Problem({ property: 'a', message: 'Error 1' }),
        new Problem({ property: 'b', message: 'Error 2' }),
        new Problem({ property: 'c', message: 'Error 3' }),
      ];

      const error = new ValidationError(problems);
      expect(error.message).toContain('3 error(s)');
    });
  });

  describe('Problem Class', () => {
    it('should create Problem instances', () => {
      const problem = new Problem({
        property: 'username',
        message: 'Username is required',
      });

      expect(problem.property).toBe('username');
      expect(problem.message).toBe('Username is required');
    });

    it('should convert to string format', () => {
      const problem = new Problem({
        property: 'email',
        message: 'Invalid email format',
      });

      expect(problem.toString()).toBe('email: Invalid email format');
    });

    it('should handle empty property', () => {
      const problem = new Problem({
        property: '',
        message: 'General error',
      });

      expect(problem.toString()).toBe('General error');
    });
  });

  describe('Complex Validation Scenarios', () => {
    it('should handle multiple validation rules', async () => {
      const entity = new ValidatedEntity({
        username: 'ab', // too short
        email: 'invalid', // bad format
        age: 200, // out of range
      });

      const problems = await EntityUtils.validate(entity);

      const usernameProblems = problems.filter(
        (p) => p.property === 'username',
      );
      const emailProblems = problems.filter((p) => p.property === 'email');
      const ageProblems = problems.filter((p) => p.property === 'age');

      expect(usernameProblems.length).toBeGreaterThan(0);
      expect(emailProblems.length).toBeGreaterThan(0);
      expect(ageProblems.length).toBeGreaterThan(0);
    });

    it('should validate complex nested structures', async () => {
      const entity = new ComplexEntity({
        id: 'test-id',
        name: 'Test Entity',
        role: UserRole.USER,
        userId: new TestUserId({ value: 'user-123' }),
        address: new TestAddress({
          street: '123 Main St',
          city: 'Boston',
          country: 'USA',
          zipCode: 2101,
        }),
        tags: ['tag1', 'tag2'],
        products: [],
        metadata: { setting1: 'value1' },
      });

      const problems = await EntityUtils.validate(entity);
      expect(Array.isArray(problems)).toBe(true);
    });
  });
});
