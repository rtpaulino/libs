import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { wait, waitUntil } from './time';
import { Duration } from './duration';

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
      const result = wait(Duration.millis(10));
      expect(result).toBeInstanceOf(Promise);
    });

    it('should resolve after the specified milliseconds', async () => {
      const promise = wait(Duration.millis(50));
      vi.advanceTimersByTime(50);
      await promise;
      expect(vi.getTimerCount()).toBe(0);
    });

    it('should handle zero milliseconds', async () => {
      const promise = wait(Duration.millis(0));
      vi.runAllTimers();
      const result = await promise;
      expect(result).toBeUndefined();
    });

    it('should handle large millisecond values', async () => {
      const promise = wait(Duration.millis(100000));
      vi.advanceTimersByTime(100000);
      await promise;
      expect(vi.getTimerCount()).toBe(0);
    });
  });

  describe('waitUntil', () => {
    it('should resolve when condition is immediately true', async () => {
      const condition = vi.fn(() => true);

      const promise = waitUntil(condition, { timeout: Duration.millis(1000) });
      await vi.runAllTimersAsync();
      await promise;

      expect(condition).toHaveBeenCalledOnce();
    });

    it('should retry until condition is true', async () => {
      let callCount = 0;
      const condition = vi.fn(() => {
        callCount++;
        return callCount >= 3;
      });

      const promise = waitUntil(condition, {
        timeout: Duration.millis(5000),
        interval: Duration.millis(10),
      });
      await vi.runAllTimersAsync();
      await promise;

      expect(condition).toHaveBeenCalledTimes(3);
    });

    it('should throw error on timeout by default', async () => {
      const condition = vi.fn(() => false);

      const promise = waitUntil(condition, {
        timeout: Duration.millis(50),
        interval: Duration.millis(10),
      });

      // Attach rejection handler before running timers to prevent unhandled rejection
      const expectation = expect(promise).rejects.toThrow(
        'waitUntil: timeout exceeded',
      );
      await vi.runAllTimersAsync();
      await expectation;
    });

    it('should return without throwing on timeout with throwOnTimeout false', async () => {
      const condition = vi.fn(() => false);

      const promise = waitUntil(condition, {
        timeout: Duration.millis(50),
        interval: Duration.millis(10),
        throwOnTimeout: false,
      });
      await vi.runAllTimersAsync();
      await promise;

      // Should complete without error
    });

    it('should support async condition functions', async () => {
      let callCount = 0;
      const condition = vi.fn(async () => {
        callCount++;
        return callCount >= 2;
      });

      const promise = waitUntil(condition, {
        timeout: Duration.millis(5000),
        interval: Duration.millis(10),
      });
      await vi.runAllTimersAsync();
      await promise;

      expect(condition).toHaveBeenCalledTimes(2);
    });

    it('should use default intervalMs when not provided', async () => {
      const condition = vi.fn(() => true);

      const promise = waitUntil(condition, { timeout: Duration.millis(10000) });
      await vi.runAllTimersAsync();
      await promise;

      expect(condition).toHaveBeenCalledTimes(1);
    });

    it('should handle conditions that check external state', async () => {
      const state = { value: 0 };
      const condition = vi.fn(() => {
        state.value++;
        return state.value >= 3;
      });

      const promise = waitUntil(condition, {
        timeout: Duration.millis(5000),
        interval: Duration.millis(10),
      });
      await vi.runAllTimersAsync();
      await promise;

      expect(state.value).toBe(3);
      expect(condition).toHaveBeenCalledTimes(3);
    });

    it('should work with boolean results', async () => {
      const condition = vi.fn(() => true);

      const promise = waitUntil(condition, { timeout: Duration.millis(1000) });
      await vi.runAllTimersAsync();
      await promise;

      expect(condition).toHaveBeenCalled();
    });

    it('should handle errors thrown by condition', async () => {
      const condition = vi.fn(() => {
        throw new Error('Condition failed');
      });

      const promise = waitUntil(condition, { timeout: Duration.millis(1000) });

      // Attach rejection handler before running timers to prevent unhandled rejection
      const expectation = expect(promise).rejects.toThrow('Condition failed');
      await vi.runAllTimersAsync();
      await expectation;
    });

    it('should respect throwOnTimeout true explicitly', async () => {
      const condition = vi.fn(() => false);

      const promise = waitUntil(condition, {
        timeout: Duration.millis(50),
        interval: Duration.millis(10),
        throwOnTimeout: true,
      });

      // Attach rejection handler before running timers to prevent unhandled rejection
      const expectation = expect(promise).rejects.toThrow(
        'waitUntil: timeout exceeded',
      );
      await vi.runAllTimersAsync();
      await expectation;
    });

    it('should resolve as soon as condition becomes true', async () => {
      let callCount = 0;
      const condition = vi.fn(() => {
        callCount++;
        return callCount === 3;
      });

      const promise = waitUntil(condition, {
        timeout: Duration.millis(5000),
        interval: Duration.millis(10),
      });
      await vi.runAllTimersAsync();
      await promise;

      expect(callCount).toBe(3);
      expect(condition).toHaveBeenCalledTimes(3);
    });

    it('should work with async condition that has delays', async () => {
      const condition = vi.fn(async () => {
        await wait(Duration.millis(10));
        return true;
      });

      const promise = waitUntil(condition, {
        timeout: Duration.millis(5000),
        interval: Duration.millis(10),
      });
      await vi.runAllTimersAsync();
      await promise;

      expect(condition).toHaveBeenCalled();
    });

    it('should advance time correctly and stop at timeout', async () => {
      const condition = vi.fn(() => {
        return false;
      });

      const promise = waitUntil(condition, {
        timeout: Duration.millis(100),
        interval: Duration.millis(25),
      });

      // Attach rejection handler before running timers to prevent unhandled rejection
      const expectation = expect(promise).rejects.toThrow(
        'waitUntil: timeout exceeded',
      );
      await vi.runAllTimersAsync();
      await expectation;
    });
  });
});
