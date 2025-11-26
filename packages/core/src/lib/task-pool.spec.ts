import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  TaskPool,
  TaskPoolFullError,
  TaskPoolBlockedError,
} from './task-pool.js';
import { Duration } from './duration.js';
import type { Logger } from './types.js';

describe('TaskPool', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  describe('constructor', () => {
    it('should create a task pool with valid size', () => {
      const handler = vi.fn().mockResolvedValue(undefined);
      const pool = new TaskPool({ size: 5, handler });

      expect(pool.config.size).toBe(5);
      expect(pool.active).toBe(0);
      expect(pool.idle).toBe(5);
    });

    it('should throw error when size is 0', () => {
      const handler = vi.fn().mockResolvedValue(undefined);
      expect(() => new TaskPool({ size: 0, handler })).toThrow(
        'Task pool size must be greater than 0',
      );
    });

    it('should throw error when size is negative', () => {
      const handler = vi.fn().mockResolvedValue(undefined);
      expect(() => new TaskPool({ size: -1, handler })).toThrow(
        'Task pool size must be greater than 0',
      );
    });
  });

  describe('execute', () => {
    it('should execute a task', async () => {
      const handler = vi.fn().mockResolvedValue(undefined);
      const pool = new TaskPool({ size: 2, handler });

      pool.execute('task1');

      expect(pool.active).toBe(1);
      expect(pool.idle).toBe(1);

      await vi.runAllTimersAsync();
      expect(handler).toHaveBeenCalledWith('task1');
    });

    it('should execute multiple tasks concurrently', async () => {
      const handler = vi.fn().mockResolvedValue(undefined);
      const pool = new TaskPool({ size: 3, handler });

      pool.execute('task1');
      pool.execute('task2');
      pool.execute('task3');

      expect(pool.active).toBe(3);
      expect(pool.idle).toBe(0);

      await vi.runAllTimersAsync();
      expect(handler).toHaveBeenCalledTimes(3);
      expect(handler).toHaveBeenCalledWith('task1');
      expect(handler).toHaveBeenCalledWith('task2');
      expect(handler).toHaveBeenCalledWith('task3');
    });

    it('should throw TaskPoolFullError when pool is full', () => {
      const handler = vi.fn().mockImplementation(
        () =>
          new Promise(() => {
            /* Never resolves */
          }),
      );
      const pool = new TaskPool({ size: 2, handler });

      pool.execute('task1');
      pool.execute('task2');

      expect(() => pool.execute('task3')).toThrow(TaskPoolFullError);
      expect(() => pool.execute('task3')).toThrow(
        'Task pool is full. Pool size: 2, Active tasks: 2',
      );
    });

    it('should free up slots when tasks complete', async () => {
      const handler = vi.fn().mockResolvedValue(undefined);
      const pool = new TaskPool({ size: 2, handler });

      pool.execute('task1');
      pool.execute('task2');

      expect(pool.active).toBe(2);

      await vi.runAllTimersAsync();

      expect(pool.active).toBe(0);
      expect(pool.idle).toBe(2);

      // Should be able to execute new tasks
      pool.execute('task3');
      expect(pool.active).toBe(1);
    });

    it('should call onSuccess callback when task succeeds', async () => {
      const handler = vi.fn().mockResolvedValue(undefined);
      const onSuccess = vi.fn();
      const pool = new TaskPool({ size: 2, handler, onSuccess });

      pool.execute('task1');

      await vi.runAllTimersAsync();

      expect(onSuccess).toHaveBeenCalledWith('task1');
      expect(onSuccess).toHaveBeenCalledTimes(1);
    });

    it('should call onError callback when task fails', async () => {
      const error = new Error('Task failed');
      const handler = vi.fn().mockRejectedValue(error);
      const onError = vi.fn();
      const pool = new TaskPool({ size: 2, handler, onError });

      pool.execute('task1');

      await vi.runAllTimersAsync();

      expect(onError).toHaveBeenCalledWith(error, 'task1');
      expect(onError).toHaveBeenCalledTimes(1);
    });

    it('should convert non-Error rejections to Error in onError', async () => {
      const handler = vi.fn().mockRejectedValue('string error');
      const onError = vi.fn();
      const pool = new TaskPool({ size: 2, handler, onError });

      pool.execute('task1');

      await vi.runAllTimersAsync();

      expect(onError).toHaveBeenCalledTimes(1);
      const [[error]] = onError.mock.calls;
      expect(error).toBeInstanceOf(Error);
      expect(error.message).toBe('string error');
    });

    it('should call onStatusChange when tasks are added and completed', async () => {
      const handler = vi.fn().mockResolvedValue(undefined);
      const onStatusChange = vi.fn();
      const pool = new TaskPool({ size: 3, handler, onStatusChange });

      pool.execute('task1');
      expect(onStatusChange).toHaveBeenCalledWith({ active: 1, idle: 2 });

      pool.execute('task2');
      expect(onStatusChange).toHaveBeenCalledWith({ active: 2, idle: 1 });

      await vi.runAllTimersAsync();

      expect(onStatusChange).toHaveBeenCalledWith({ active: 1, idle: 2 });
      expect(onStatusChange).toHaveBeenCalledWith({ active: 0, idle: 3 });
      expect(onStatusChange).toHaveBeenCalledTimes(4);
    });

    it('should throw TaskPoolBlockedError when pool is blocked', () => {
      const handler = vi.fn().mockResolvedValue(undefined);
      const pool = new TaskPool({ size: 2, handler });

      pool.block();

      expect(() => pool.execute('task1')).toThrow(TaskPoolBlockedError);
      expect(() => pool.execute('task1')).toThrow(
        'Task pool is blocked and not accepting new tasks',
      );
    });
  });

  describe('hasCapacity', () => {
    it('should return true when pool has capacity', () => {
      const handler = vi.fn().mockResolvedValue(undefined);
      const pool = new TaskPool({ size: 2, handler });

      expect(pool.hasCapacity).toBe(true);

      pool.execute('task1');
      expect(pool.hasCapacity).toBe(true);
    });

    it('should return false when pool is full', () => {
      const handler = vi.fn().mockImplementation(
        () =>
          new Promise(() => {
            /* Never resolves */
          }),
      );
      const pool = new TaskPool({ size: 2, handler });

      pool.execute('task1');
      pool.execute('task2');

      expect(pool.hasCapacity).toBe(false);
    });
  });

  describe('blocking', () => {
    it('should block and unblock the pool', () => {
      const handler = vi.fn().mockResolvedValue(undefined);
      const pool = new TaskPool({ size: 2, handler });

      expect(pool.isBlocked).toBe(false);

      pool.block();
      expect(pool.isBlocked).toBe(true);

      pool.unblock();
      expect(pool.isBlocked).toBe(false);
    });

    it('should allow existing tasks to complete when blocked', async () => {
      const handler = vi.fn().mockResolvedValue(undefined);
      const onSuccess = vi.fn();
      const pool = new TaskPool({ size: 2, handler, onSuccess });

      pool.execute('task1');
      pool.block();

      await vi.runAllTimersAsync();

      expect(onSuccess).toHaveBeenCalledWith('task1');
      expect(pool.active).toBe(0);
    });

    it('should accept new tasks after unblocking', () => {
      const handler = vi.fn().mockResolvedValue(undefined);
      const pool = new TaskPool({ size: 2, handler });

      pool.block();
      expect(() => pool.execute('task1')).toThrow(TaskPoolBlockedError);

      pool.unblock();
      expect(() => pool.execute('task1')).not.toThrow();
    });
  });

  describe('heartbeat', () => {
    it('should call heartbeat callback at specified intervals', async () => {
      const handler = vi.fn().mockImplementation(
        () =>
          new Promise((resolve) => {
            setTimeout(resolve, 5000);
          }),
      );
      const onHeartbeat = vi.fn().mockResolvedValue(undefined);
      const pool = new TaskPool({
        size: 2,
        handler,
        heartbeat: {
          enabled: true,
          interval: Duration.seconds(1),
          onHeartbeat,
        },
      });

      pool.execute('task1');

      // First heartbeat after 1 second
      await vi.advanceTimersByTimeAsync(1000);
      expect(onHeartbeat).toHaveBeenCalledWith('task1');
      expect(onHeartbeat).toHaveBeenCalledTimes(1);

      // Second heartbeat after another second
      await vi.advanceTimersByTimeAsync(1000);
      expect(onHeartbeat).toHaveBeenCalledTimes(2);

      // Third heartbeat
      await vi.advanceTimersByTimeAsync(1000);
      expect(onHeartbeat).toHaveBeenCalledTimes(3);

      // Complete the task
      await vi.advanceTimersByTimeAsync(2000);

      // No more heartbeats after task completes
      await vi.advanceTimersByTimeAsync(1000);
      expect(onHeartbeat).toHaveBeenCalledTimes(5);
    });

    it('should stop heartbeat when task completes', async () => {
      const handler = vi.fn().mockResolvedValue(undefined);
      const onHeartbeat = vi.fn().mockResolvedValue(undefined);
      const pool = new TaskPool({
        size: 2,
        handler,
        heartbeat: {
          enabled: true,
          interval: Duration.seconds(1),
          onHeartbeat,
        },
      });

      pool.execute('task1');

      await vi.runAllTimersAsync();

      // Task completes immediately, so heartbeat should be stopped
      // Even if we advance time, heartbeat should not be called
      await vi.advanceTimersByTimeAsync(5000);
      expect(onHeartbeat).toHaveBeenCalledTimes(0);
    });

    it('should handle heartbeat callback errors gracefully', async () => {
      const handler = vi.fn().mockImplementation(
        () =>
          new Promise((resolve) => {
            setTimeout(resolve, 3000);
          }),
      );
      const onHeartbeat = vi
        .fn()
        .mockRejectedValue(new Error('Heartbeat error'));
      const logger: Logger = {
        log: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
      };
      const pool = new TaskPool({
        size: 2,
        handler,
        logger,
        heartbeat: {
          enabled: true,
          interval: Duration.seconds(1),
          onHeartbeat,
        },
      });

      pool.execute('task1');

      await vi.advanceTimersByTimeAsync(1000);
      expect(onHeartbeat).toHaveBeenCalledTimes(1);

      // Wait for the heartbeat promise to reject
      await vi.runOnlyPendingTimersAsync();

      expect(logger.warn).toHaveBeenCalledWith(
        'Heartbeat callback failed: Heartbeat error',
      );

      // Heartbeat should continue despite error
      await vi.advanceTimersByTimeAsync(1000);
      expect(onHeartbeat).toHaveBeenCalledTimes(3);
    });

    it('should not start heartbeat when disabled', async () => {
      const handler = vi.fn().mockImplementation(
        () =>
          new Promise((resolve) => {
            setTimeout(resolve, 3000);
          }),
      );
      const onHeartbeat = vi.fn().mockResolvedValue(undefined);
      const pool = new TaskPool({
        size: 2,
        handler,
        heartbeat: {
          enabled: false,
          interval: Duration.seconds(1),
          onHeartbeat,
        },
      });

      pool.execute('task1');

      await vi.advanceTimersByTimeAsync(5000);
      expect(onHeartbeat).not.toHaveBeenCalled();
    });

    it('should track separate heartbeats for multiple tasks', async () => {
      const handler = vi.fn().mockImplementation(
        () =>
          new Promise((resolve) => {
            setTimeout(resolve, 3000);
          }),
      );
      const onHeartbeat = vi.fn().mockResolvedValue(undefined);
      const pool = new TaskPool({
        size: 3,
        handler,
        heartbeat: {
          enabled: true,
          interval: Duration.seconds(1),
          onHeartbeat,
        },
      });

      pool.execute('task1');
      pool.execute('task2');

      await vi.advanceTimersByTimeAsync(1000);
      expect(onHeartbeat).toHaveBeenCalledWith('task1');
      expect(onHeartbeat).toHaveBeenCalledWith('task2');
      expect(onHeartbeat).toHaveBeenCalledTimes(2);

      await vi.advanceTimersByTimeAsync(1000);
      expect(onHeartbeat).toHaveBeenCalledTimes(4);
    });
  });

  describe('waitUntilIdle', () => {
    it('should resolve immediately when pool is already idle', async () => {
      const handler = vi.fn().mockResolvedValue(undefined);
      const pool = new TaskPool({ size: 2, handler });

      const promise = pool.waitUntilIdle(Duration.seconds(5));
      await vi.runAllTimersAsync();

      await expect(promise).resolves.toBeUndefined();
    });

    it('should wait for active tasks to complete', async () => {
      const handler = vi.fn().mockImplementation(
        () =>
          new Promise((resolve) => {
            setTimeout(resolve, 2000);
          }),
      );
      const pool = new TaskPool({ size: 2, handler });

      pool.execute('task1');
      pool.execute('task2');

      const promise = pool.waitUntilIdle(Duration.seconds(5));

      // Advance time to complete tasks
      await vi.advanceTimersByTimeAsync(2000);
      await vi.runAllTimersAsync();

      await expect(promise).resolves.toBeUndefined();
      expect(pool.active).toBe(0);
    });

    it('should timeout and log warning when tasks take too long', async () => {
      const handler = vi.fn().mockImplementation(
        () =>
          new Promise(() => {
            /* Never resolves */
          }),
      );
      const logger: Logger = {
        log: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
      };
      const pool = new TaskPool({ size: 2, handler, logger });

      pool.execute('task1');

      const promise = pool.waitUntilIdle(Duration.seconds(2));

      await vi.runAllTimersAsync();

      await expect(promise).resolves.toBeUndefined();
      expect(pool.active).toBe(1);
      expect(logger.warn).toHaveBeenCalledWith(
        expect.stringContaining('TaskPool.waitUntilIdle() timeout reached'),
      );
      expect(logger.warn).toHaveBeenCalledWith(
        expect.stringContaining('1 active tasks remaining'),
      );
    });

    it('should use default timeout of 1 minute', async () => {
      const handler = vi.fn().mockImplementation(
        () =>
          new Promise(() => {
            /* Never resolves */
          }),
      );
      const logger: Logger = {
        log: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
      };
      const pool = new TaskPool({ size: 2, handler, logger });

      pool.execute('task1');

      const promise = pool.waitUntilIdle();

      await vi.runAllTimersAsync();

      await expect(promise).resolves.toBeUndefined();
      expect(logger.warn).toHaveBeenCalledWith(
        expect.stringContaining('1 minute'),
      );
    });
  });

  describe('integration scenarios', () => {
    it('should handle rapid task submission and completion', async () => {
      let completedCount = 0;
      const handler = vi.fn().mockImplementation(async () => {
        await new Promise((resolve) => setTimeout(resolve, 100));
        completedCount++;
      });
      const pool = new TaskPool({ size: 5, handler });

      // Submit 5 tasks
      for (let i = 0; i < 5; i++) {
        pool.execute(`task${i}`);
      }

      expect(pool.active).toBe(5);
      expect(pool.idle).toBe(0);

      // Complete tasks
      await vi.advanceTimersByTimeAsync(100);
      await vi.runAllTimersAsync();

      expect(completedCount).toBe(5);
      expect(pool.active).toBe(0);
      expect(pool.idle).toBe(5);
    });

    it('should handle mixed success and failure scenarios', async () => {
      const handler = vi.fn().mockImplementation(async (task: string) => {
        if (task.includes('fail')) {
          throw new Error(`${task} failed`);
        }
      });
      const onSuccess = vi.fn();
      const onError = vi.fn();
      const pool = new TaskPool({ size: 3, handler, onSuccess, onError });

      pool.execute('task1-success');
      pool.execute('task2-fail');
      pool.execute('task3-success');

      await vi.runAllTimersAsync();

      expect(onSuccess).toHaveBeenCalledTimes(2);
      expect(onSuccess).toHaveBeenCalledWith('task1-success');
      expect(onSuccess).toHaveBeenCalledWith('task3-success');

      expect(onError).toHaveBeenCalledTimes(1);
      expect(onError).toHaveBeenCalledWith(
        expect.objectContaining({ message: 'task2-fail failed' }),
        'task2-fail',
      );

      expect(pool.active).toBe(0);
    });

    it('should properly manage capacity across task lifecycle', async () => {
      const handler = vi.fn().mockImplementation(
        () =>
          new Promise((resolve) => {
            setTimeout(resolve, 1000);
          }),
      );
      const pool = new TaskPool({ size: 2, handler });

      // Pool starts with capacity
      expect(pool.hasCapacity).toBe(true);

      // Add first task
      pool.execute('task1');
      expect(pool.hasCapacity).toBe(true);
      expect(pool.active).toBe(1);

      // Add second task - pool is now full
      pool.execute('task2');
      expect(pool.hasCapacity).toBe(false);
      expect(pool.active).toBe(2);

      // Wait for first task to complete
      await vi.advanceTimersByTimeAsync(1000);
      await vi.runOnlyPendingTimersAsync();

      expect(pool.hasCapacity).toBe(true);
      expect(pool.active).toBe(0);
    });
  });
});
