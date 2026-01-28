import { describe, it, expect } from 'vitest';
import { Entity, IntProperty } from '../index.js';
import { EntityUtils } from './entity-utils.js';

describe('IntProperty', () => {
  @Entity()
  class User {
    @IntProperty()
    age!: number;

    @IntProperty({ optional: true })
    score?: number;

    constructor(data: Partial<User>) {
      Object.assign(this, data);
    }
  }

  describe('valid integers', () => {
    it('should accept positive integer', async () => {
      const user = await EntityUtils.parse(User, { age: 25 });
      expect(user.age).toBe(25);
      expect(EntityUtils.problems(user)).toHaveLength(0);
    });

    it('should accept zero', async () => {
      const user = await EntityUtils.parse(User, { age: 0 });
      expect(user.age).toBe(0);
      expect(EntityUtils.problems(user)).toHaveLength(0);
    });

    it('should accept negative integer', async () => {
      const user = await EntityUtils.parse(User, { age: -5 });
      expect(user.age).toBe(-5);
      expect(EntityUtils.problems(user)).toHaveLength(0);
    });

    it('should accept large integer', async () => {
      const user = await EntityUtils.parse(User, { age: 999999 });
      expect(user.age).toBe(999999);
      expect(EntityUtils.problems(user)).toHaveLength(0);
    });

    it('should accept optional integer', async () => {
      const user = await EntityUtils.parse(User, { age: 25, score: 100 });
      expect(user.score).toBe(100);
      expect(EntityUtils.problems(user)).toHaveLength(0);
    });

    it('should accept undefined for optional integer', async () => {
      const user = await EntityUtils.parse(User, { age: 25 });
      expect(user.score).toBeUndefined();
      expect(EntityUtils.problems(user)).toHaveLength(0);
    });
  });

  describe('invalid integers', () => {
    it('should reject decimal number', async () => {
      const user = await EntityUtils.parse(User, { age: 25.5 });
      const problems = EntityUtils.problems(user);
      expect(problems).toHaveLength(1);
      expect(problems[0].property).toBe('age');
      expect(problems[0].message).toContain('Expected an integer');
      expect(problems[0].message).toContain('25.5');
    });

    it('should reject small decimal', async () => {
      const user = await EntityUtils.parse(User, { age: 25.1 });
      const problems = EntityUtils.problems(user);
      expect(problems).toHaveLength(1);
      expect(problems[0].property).toBe('age');
      expect(problems[0].message).toContain('Expected an integer');
    });

    it('should reject negative decimal', async () => {
      const user = await EntityUtils.parse(User, { age: -5.5 });
      const problems = EntityUtils.problems(user);
      expect(problems).toHaveLength(1);
      expect(problems[0].property).toBe('age');
    });

    it('should reject string', async () => {
      await expect(EntityUtils.parse(User, { age: '25' })).rejects.toThrow(
        'Expects a number but received string',
      );
    });

    it('should reject optional decimal', async () => {
      const user = await EntityUtils.parse(User, { age: 25, score: 100.5 });
      const problems = EntityUtils.problems(user);
      expect(problems).toHaveLength(1);
      expect(problems[0].property).toBe('score');
      expect(problems[0].message).toContain('Expected an integer');
    });
  });

  describe('edge cases', () => {
    it('should accept Number.MAX_SAFE_INTEGER', async () => {
      const user = await EntityUtils.parse(User, {
        age: Number.MAX_SAFE_INTEGER,
      });
      expect(EntityUtils.problems(user)).toHaveLength(0);
    });

    it('should accept Number.MIN_SAFE_INTEGER', async () => {
      const user = await EntityUtils.parse(User, {
        age: Number.MIN_SAFE_INTEGER,
      });
      expect(EntityUtils.problems(user)).toHaveLength(0);
    });

    it('should reject NaN', async () => {
      const user = await EntityUtils.parse(User, { age: NaN });
      const problems = EntityUtils.problems(user);
      expect(problems).toHaveLength(1);
      expect(problems[0].property).toBe('age');
    });

    it('should reject Infinity', async () => {
      const user = await EntityUtils.parse(User, { age: Infinity });
      const problems = EntityUtils.problems(user);
      expect(problems).toHaveLength(1);
      expect(problems[0].property).toBe('age');
    });
  });

  describe('with array', () => {
    @Entity()
    class Stats {
      @IntProperty({ array: true })
      scores!: number[];

      constructor(data: Partial<Stats>) {
        Object.assign(this, data);
      }
    }

    it('should accept array of integers', async () => {
      const stats = await EntityUtils.parse(Stats, {
        scores: [1, 2, 3, 10, 100],
      });
      expect(stats.scores).toEqual([1, 2, 3, 10, 100]);
      expect(EntityUtils.problems(stats)).toHaveLength(0);
    });

    it('should reject array with decimal', async () => {
      const stats = await EntityUtils.parse(Stats, {
        scores: [1, 2.5, 3],
      });
      const problems = EntityUtils.problems(stats);
      expect(problems).toHaveLength(1);
      expect(problems[0].property).toBe('scores[1]');
      expect(problems[0].message).toContain('Expected an integer');
    });
  });

  describe('with additional validators', () => {
    @Entity()
    class Product {
      @IntProperty({
        validators: [
          ({ value }) => {
            if (value < 0) {
              return [
                {
                  property: '',
                  message: 'Quantity cannot be negative',
                },
              ];
            }
            return [];
          },
          ({ value }) => {
            if (value > 1000) {
              return [
                {
                  property: '',
                  message: 'Quantity cannot exceed 1000',
                },
              ];
            }
            return [];
          },
        ],
      })
      quantity!: number;

      constructor(data: Partial<Product>) {
        Object.assign(this, data);
      }
    }

    it('should run both integer validator and custom validators', async () => {
      const product = await EntityUtils.parse(Product, { quantity: 500 });
      expect(EntityUtils.problems(product)).toHaveLength(0);
    });

    it('should fail on decimal even with custom validators', async () => {
      const product = await EntityUtils.parse(Product, { quantity: 50.5 });
      const problems = EntityUtils.problems(product);
      expect(problems).toHaveLength(1);
      expect(problems[0].property).toBe('quantity');
      expect(problems[0].message).toContain('Expected an integer');
    });

    it('should fail on custom validator', async () => {
      const product = await EntityUtils.parse(Product, { quantity: -5 });
      const problems = EntityUtils.problems(product);
      expect(problems).toHaveLength(1);
      expect(problems[0].property).toBe('quantity');
      expect(problems[0].message).toBe('Quantity cannot be negative');
    });

    it('should fail on custom validator for max', async () => {
      const product = await EntityUtils.parse(Product, { quantity: 1500 });
      const problems = EntityUtils.problems(product);
      expect(problems).toHaveLength(1);
      expect(problems[0].property).toBe('quantity');
      expect(problems[0].message).toBe('Quantity cannot exceed 1000');
    });
  });
});
