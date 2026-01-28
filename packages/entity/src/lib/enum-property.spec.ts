import { describe, it, expect } from 'vitest';
import { Entity, EnumProperty } from '../index.js';
import { EntityUtils } from './entity-utils.js';

describe('EnumProperty', () => {
  enum Status {
    Active = 'active',
    Inactive = 'inactive',
    Pending = 'pending',
  }

  enum Priority {
    Low = 'low',
    Medium = 'medium',
    High = 'high',
  }

  @Entity()
  class Task {
    @EnumProperty(Status)
    status!: Status;

    @EnumProperty(Priority, { optional: true })
    priority?: Priority;

    constructor(data: Partial<Task>) {
      Object.assign(this, data);
    }
  }

  describe('valid enum values', () => {
    it('should accept valid enum value', async () => {
      const task = await EntityUtils.parse(Task, {
        status: 'active',
      });
      expect(task.status).toBe('active');
      expect(EntityUtils.problems(task)).toHaveLength(0);
    });

    it('should accept all valid enum values', async () => {
      const task1 = await EntityUtils.parse(Task, { status: 'active' });
      const task2 = await EntityUtils.parse(Task, { status: 'inactive' });
      const task3 = await EntityUtils.parse(Task, { status: 'pending' });

      expect(EntityUtils.problems(task1)).toHaveLength(0);
      expect(EntityUtils.problems(task2)).toHaveLength(0);
      expect(EntityUtils.problems(task3)).toHaveLength(0);
    });

    it('should accept valid optional enum value', async () => {
      const task = await EntityUtils.parse(Task, {
        status: 'active',
        priority: 'high',
      });
      expect(task.priority).toBe('high');
      expect(EntityUtils.problems(task)).toHaveLength(0);
    });

    it('should accept undefined for optional enum', async () => {
      const task = await EntityUtils.parse(Task, {
        status: 'active',
      });
      expect(task.priority).toBeUndefined();
      expect(EntityUtils.problems(task)).toHaveLength(0);
    });
  });

  describe('invalid enum values', () => {
    it('should reject invalid enum value', async () => {
      const task = await EntityUtils.parse(Task, {
        status: 'invalid',
      });
      const problems = EntityUtils.problems(task);
      expect(problems).toHaveLength(1);
      expect(problems[0].property).toBe('status');
      expect(problems[0].message).toContain(
        'Expected one of [active, inactive, pending]',
      );
      expect(problems[0].message).toContain('invalid');
    });

    it('should reject number as enum value', async () => {
      await expect(
        EntityUtils.parse(Task, {
          status: 123,
        }),
      ).rejects.toThrow('Expects a string but received number');
    });

    it('should reject invalid optional enum value', async () => {
      const task = await EntityUtils.parse(Task, {
        status: 'active',
        priority: 'urgent',
      });
      const problems = EntityUtils.problems(task);
      expect(problems).toHaveLength(1);
      expect(problems[0].property).toBe('priority');
      expect(problems[0].message).toContain(
        'Expected one of [low, medium, high]',
      );
    });
  });

  describe('with array', () => {
    @Entity()
    class Project {
      @EnumProperty(Status, { array: true })
      statusHistory!: Status[];

      constructor(data: Partial<Project>) {
        Object.assign(this, data);
      }
    }

    it('should accept array of valid enum values', async () => {
      const project = await EntityUtils.parse(Project, {
        statusHistory: ['pending', 'active', 'inactive'],
      });
      expect(project.statusHistory).toEqual(['pending', 'active', 'inactive']);
      expect(EntityUtils.problems(project)).toHaveLength(0);
    });

    it('should reject array with invalid enum value', async () => {
      const project = await EntityUtils.parse(Project, {
        statusHistory: ['active', 'invalid', 'pending'],
      });
      const problems = EntityUtils.problems(project);
      expect(problems).toHaveLength(1);
      expect(problems[0].property).toBe('statusHistory[1]');
      expect(problems[0].message).toContain('Expected one of');
    });
  });

  describe('with additional validators', () => {
    @Entity()
    class User {
      @EnumProperty(Status, {
        validators: [
          ({ value }) => {
            if (value === 'inactive') {
              return [
                {
                  property: '',
                  message: 'Status cannot be inactive',
                },
              ];
            }
            return [];
          },
        ],
      })
      status!: Status;

      constructor(data: Partial<User>) {
        Object.assign(this, data);
      }
    }

    it('should run both enum validator and custom validators', async () => {
      const user = await EntityUtils.parse(User, { status: 'inactive' });
      const problems = EntityUtils.problems(user);
      expect(problems).toHaveLength(1);
      expect(problems[0].property).toBe('status');
      expect(problems[0].message).toBe('Status cannot be inactive');
    });

    it('should still validate enum first', async () => {
      const user = await EntityUtils.parse(User, { status: 'invalid' });
      const problems = EntityUtils.problems(user);
      expect(problems).toHaveLength(1);
      expect(problems[0].property).toBe('status');
      expect(problems[0].message).toContain('Expected one of');
    });
  });
});
