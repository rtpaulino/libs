import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { wait, waitFor } from './time';

describe('time', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(0);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('wait', () => {
    it('should return a promise', () => {
      const result = wait(10);
      expect(result).toBeInstanceOf(Promise);
    });

    it('should resolve after the specified milliseconds', async () => {
      const promise = wait(50);
      vi.advanceTimersByTime(50);
      await promise;
      expect(vi.getTimerCount()).toBe(0);
    });

    it('should handle zero milliseconds', async () => {
      const promise = wait(0);
      vi.runAllTimers();
      const result = await promise;
      expect(result).toBeUndefined();
    });

    it('should handle large millisecond values', async () => {
      const promise = wait(100000);
      vi.advanceTimersByTime(100000);
      await promise;
      expect(vi.getTimerCount()).toBe(0);
    });
  });

  describe('waitFor', () => {
    it('should return the result when condition is immediately true', async () => {
      const action = vi.fn(async () => 'success');
      const condition = vi.fn(() => true);

      const promise = waitFor(action, condition, { timeoutMs: 1000 });
      await vi.runAllTimersAsync();
      const result = await promise;

      expect(result).toBe('success');
      expect(action).toHaveBeenCalledOnce();
      expect(condition).toHaveBeenCalledOnce();
    });

    it('should retry the action until condition is true', async () => {
      let callCount = 0;
      const action = vi.fn(async () => {
        callCount++;
        return callCount;
      });
      const condition = vi.fn((result) => result >= 3);

      const promise = waitFor(action, condition, {
        timeoutMs: 5000,
        intervalMs: 10,
      });
      await vi.runAllTimersAsync();
      const result = await promise;

      expect(result).toBe(3);
      expect(action).toHaveBeenCalledTimes(3);
      expect(condition).toHaveBeenCalledTimes(3);
    });

    it('should throw error on timeout by default', async () => {
      const action = vi.fn(async () => 'never');
      const condition = vi.fn(() => false);

      const promise = waitFor(action, condition, {
        timeoutMs: 50,
        intervalMs: 10,
      });

      // Attach rejection handler before running timers to prevent unhandled rejection
      const expectation = expect(promise).rejects.toThrow(
        'waitFor: timeout exceeded',
      );
      await vi.runAllTimersAsync();
      await expectation;
    });

    it('should return null on timeout with returnNull action', async () => {
      const action = vi.fn(async () => 'result');
      const condition = vi.fn(() => false);

      const promise = waitFor(action, condition, {
        timeoutMs: 50,
        intervalMs: 10,
        timeoutAction: 'returnNull',
      });
      await vi.runAllTimersAsync();
      const result = await promise;

      expect(result).toBeNull();
    });

    it('should return the last result on timeout with returnResult action', async () => {
      const action = vi.fn(async () => 'last-result');
      const condition = vi.fn(() => false);

      const promise = waitFor(action, condition, {
        timeoutMs: 50,
        intervalMs: 10,
        timeoutAction: 'returnResult',
      });
      await vi.runAllTimersAsync();
      const result = await promise;

      expect(result).toBe('last-result');
    });

    it('should use default intervalMs when not provided', async () => {
      let callCount = 0;
      const action = vi.fn(async () => {
        callCount++;
        return callCount;
      });
      const condition = vi.fn((result) => result >= 1);

      const promise = waitFor(action, condition, { timeoutMs: 10000 });
      await vi.runAllTimersAsync();
      const result = await promise;

      expect(result).toBe(1);
      expect(action).toHaveBeenCalledTimes(1);
    });

    it('should work with different data types', async () => {
      const action = vi.fn(async () => ({ data: 'test', value: 42 }));
      const condition = vi.fn((result) => result.value === 42);

      const promise = waitFor(action, condition, { timeoutMs: 1000 });
      await vi.runAllTimersAsync();
      const result = await promise;

      expect(result).toEqual({ data: 'test', value: 42 });
    });

    it('should work with array results', async () => {
      const action = vi.fn(async () => [1, 2, 3]);
      const condition = vi.fn((result) => result.length === 3);

      const promise = waitFor(action, condition, { timeoutMs: 1000 });
      await vi.runAllTimersAsync();
      const result = await promise;

      expect(result).toEqual([1, 2, 3]);
    });

    it('should handle errors thrown by action', async () => {
      const action = vi.fn(async () => {
        throw new Error('Action failed');
      });
      const condition = vi.fn();

      const promise = waitFor(action, condition, { timeoutMs: 1000 });

      // Attach rejection handler before running timers to prevent unhandled rejection
      const expectation = expect(promise).rejects.toThrow('Action failed');
      await vi.runAllTimersAsync();
      await expectation;
    });

    it('should handle errors thrown by condition', async () => {
      const action = vi.fn(async () => 'result');
      const condition = vi.fn(() => {
        throw new Error('Condition failed');
      });

      const promise = waitFor(action, condition, { timeoutMs: 1000 });

      // Attach rejection handler before running timers to prevent unhandled rejection
      const expectation = expect(promise).rejects.toThrow('Condition failed');
      await vi.runAllTimersAsync();
      await expectation;
    });

    it('should respect the throw timeout action explicitly', async () => {
      const action = vi.fn(async () => 'result');
      const condition = vi.fn(() => false);

      const promise = waitFor(action, condition, {
        timeoutMs: 50,
        intervalMs: 10,
        timeoutAction: 'throw',
      });

      // Attach rejection handler before running timers to prevent unhandled rejection
      const expectation = expect(promise).rejects.toThrow(
        'waitFor: timeout exceeded',
      );
      await vi.runAllTimersAsync();
      await expectation;
    });

    it('should handle conditions that alternate between true and false', async () => {
      let callCount = 0;
      const action = vi.fn(async () => {
        callCount++;
        return callCount;
      });
      const condition = vi.fn((result) => result === 3);

      const promise = waitFor(action, condition, {
        timeoutMs: 5000,
        intervalMs: 10,
      });
      await vi.runAllTimersAsync();
      const result = await promise;

      expect(result).toBe(3);
    });

    it('should work with async action that has delays', async () => {
      const action = vi.fn(async () => {
        await wait(10);
        return 'delayed-result';
      });
      const condition = vi.fn((result) => result === 'delayed-result');

      const promise = waitFor(action, condition, {
        timeoutMs: 5000,
        intervalMs: 10,
      });
      await vi.runAllTimersAsync();
      const result = await promise;

      expect(result).toBe('delayed-result');
    });

    it('should advance time correctly and stop at timeout', async () => {
      let callCount = 0;
      const action = vi.fn(async () => {
        callCount++;
        return callCount;
      });
      const condition = vi.fn(() => false);

      const promise = waitFor(action, condition, {
        timeoutMs: 100,
        intervalMs: 25,
      });

      // Attach rejection handler before running timers to prevent unhandled rejection
      const expectation = expect(promise).rejects.toThrow(
        'waitFor: timeout exceeded',
      );
      await vi.runAllTimersAsync();
      await expectation;
    });
  });
});
