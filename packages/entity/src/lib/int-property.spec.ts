import { describe, it, expect } from 'vitest';
import { Entity, IntProperty } from '../index.js';
import { EntityUtils } from './entity-utils.js';

// Entity class definitions
@Entity({ name: 'IntPropertyUser' })
class IntPropertyUser {
  @IntProperty()
  age!: number;

  @IntProperty({ optional: true })
  score?: number;

  constructor(data: Partial<IntPropertyUser>) {
    Object.assign(this, data);
  }
}

@Entity({ name: 'IntPropertyStats' })
class IntPropertyStats {
  @IntProperty({ array: true })
  scores!: number[];

  constructor(data: Partial<IntPropertyStats>) {
    Object.assign(this, data);
  }
}

@Entity({ name: 'IntPropertyProduct' })
class IntPropertyProduct {
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

  constructor(data: Partial<IntPropertyProduct>) {
    Object.assign(this, data);
  }
}

describe('IntProperty', () => {
  describe('valid integers', () => {
    it('should accept positive integer', async () => {
      const user = await EntityUtils.parse(IntPropertyUser, { age: 25 });
      expect(user.age).toBe(25);
      expect(EntityUtils.getProblems(user)).toHaveLength(0);
    });

    it('should accept zero', async () => {
      const user = await EntityUtils.parse(IntPropertyUser, { age: 0 });
      expect(user.age).toBe(0);
      expect(EntityUtils.getProblems(user)).toHaveLength(0);
    });

    it('should accept negative integer', async () => {
      const user = await EntityUtils.parse(IntPropertyUser, { age: -5 });
      expect(user.age).toBe(-5);
      expect(EntityUtils.getProblems(user)).toHaveLength(0);
    });

    it('should accept large integer', async () => {
      const user = await EntityUtils.parse(IntPropertyUser, { age: 999999 });
      expect(user.age).toBe(999999);
      expect(EntityUtils.getProblems(user)).toHaveLength(0);
    });

    it('should accept optional integer', async () => {
      const user = await EntityUtils.parse(IntPropertyUser, {
        age: 25,
        score: 100,
      });
      expect(user.score).toBe(100);
      expect(EntityUtils.getProblems(user)).toHaveLength(0);
    });

    it('should accept undefined for optional integer', async () => {
      const user = await EntityUtils.parse(IntPropertyUser, { age: 25 });
      expect(user.score).toBeUndefined();
      expect(EntityUtils.getProblems(user)).toHaveLength(0);
    });
  });

  describe('invalid integers', () => {
    it('should reject decimal number', async () => {
      const user = await EntityUtils.parse(IntPropertyUser, { age: 25.5 });
      const problems = EntityUtils.getProblems(user);
      expect(problems).toHaveLength(1);
      expect(problems[0].property).toBe('age');
      expect(problems[0].message).toContain('Expected an integer');
      expect(problems[0].message).toContain('25.5');
    });

    it('should reject small decimal', async () => {
      const user = await EntityUtils.parse(IntPropertyUser, { age: 25.1 });
      const problems = EntityUtils.getProblems(user);
      expect(problems).toHaveLength(1);
      expect(problems[0].property).toBe('age');
      expect(problems[0].message).toContain('Expected an integer');
    });

    it('should reject negative decimal', async () => {
      const user = await EntityUtils.parse(IntPropertyUser, { age: -5.5 });
      const problems = EntityUtils.getProblems(user);
      expect(problems).toHaveLength(1);
      expect(problems[0].property).toBe('age');
    });

    it('should reject string', async () => {
      await expect(
        EntityUtils.parse(IntPropertyUser, { age: '25' }),
      ).rejects.toThrow('Expects a number but received string');
    });

    it('should reject optional decimal', async () => {
      const user = await EntityUtils.parse(IntPropertyUser, {
        age: 25,
        score: 100.5,
      });
      const problems = EntityUtils.getProblems(user);
      expect(problems).toHaveLength(1);
      expect(problems[0].property).toBe('score');
      expect(problems[0].message).toContain('Expected an integer');
    });
  });

  describe('edge cases', () => {
    it('should accept Number.MAX_SAFE_INTEGER', async () => {
      const user = await EntityUtils.parse(IntPropertyUser, {
        age: Number.MAX_SAFE_INTEGER,
      });
      expect(EntityUtils.getProblems(user)).toHaveLength(0);
    });

    it('should accept Number.MIN_SAFE_INTEGER', async () => {
      const user = await EntityUtils.parse(IntPropertyUser, {
        age: Number.MIN_SAFE_INTEGER,
      });
      expect(EntityUtils.getProblems(user)).toHaveLength(0);
    });

    it('should reject NaN', async () => {
      const user = await EntityUtils.parse(IntPropertyUser, { age: NaN });
      const problems = EntityUtils.getProblems(user);
      expect(problems).toHaveLength(1);
      expect(problems[0].property).toBe('age');
    });

    it('should reject Infinity', async () => {
      const user = await EntityUtils.parse(IntPropertyUser, { age: Infinity });
      const problems = EntityUtils.getProblems(user);
      expect(problems).toHaveLength(1);
      expect(problems[0].property).toBe('age');
    });
  });

  describe('with array', () => {
    it('should accept array of integers', async () => {
      const stats = await EntityUtils.parse(IntPropertyStats, {
        scores: [1, 2, 3, 10, 100],
      });
      expect(stats.scores).toEqual([1, 2, 3, 10, 100]);
      expect(EntityUtils.getProblems(stats)).toHaveLength(0);
    });

    it('should reject array with decimal', async () => {
      const stats = await EntityUtils.parse(IntPropertyStats, {
        scores: [1, 2.5, 3],
      });
      const problems = EntityUtils.getProblems(stats);
      expect(problems).toHaveLength(1);
      expect(problems[0].property).toBe('scores[1]');
      expect(problems[0].message).toContain('Expected an integer');
    });
  });

  describe('with additional validators', () => {
    it('should run both integer validator and custom validators', async () => {
      const product = await EntityUtils.parse(IntPropertyProduct, {
        quantity: 500,
      });
      expect(EntityUtils.getProblems(product)).toHaveLength(0);
    });

    it('should fail on decimal even with custom validators', async () => {
      const product = await EntityUtils.parse(IntPropertyProduct, {
        quantity: 50.5,
      });
      const problems = EntityUtils.getProblems(product);
      expect(problems).toHaveLength(1);
      expect(problems[0].property).toBe('quantity');
      expect(problems[0].message).toContain('Expected an integer');
    });

    it('should fail on custom validator', async () => {
      const product = await EntityUtils.parse(IntPropertyProduct, {
        quantity: -5,
      });
      const problems = EntityUtils.getProblems(product);
      expect(problems).toHaveLength(1);
      expect(problems[0].property).toBe('quantity');
      expect(problems[0].message).toBe('Quantity cannot be negative');
    });

    it('should fail on custom validator for max', async () => {
      const product = await EntityUtils.parse(IntPropertyProduct, {
        quantity: 1500,
      });
      const problems = EntityUtils.getProblems(product);
      expect(problems).toHaveLength(1);
      expect(problems[0].property).toBe('quantity');
      expect(problems[0].message).toBe('Quantity cannot exceed 1000');
    });
  });
});
