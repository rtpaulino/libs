import { vi, describe, it, expect, beforeEach } from 'vitest';
import { backoff } from './backoff.js';
import * as timeModule from './time.js';
import { Duration } from './duration.js';

vi.mock('./time.js');

describe('backoff', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return a function', () => {
    const fn = vi.fn().mockResolvedValue('result');
    const backoffFn = backoff(fn);
    expect(typeof backoffFn).toBe('function');
  });

  it('should execute the function and apply delay on first attempt', async () => {
    const fn = vi.fn().mockResolvedValue('success');
    const backoffFn = backoff(fn, {
      initialDelay: Duration.millis(100),
      jitter: false,
    });

    const result = await backoffFn();

    expect(result).toBe('success');
    expect(fn).toHaveBeenCalledWith(0);
    expect(timeModule.wait).toHaveBeenCalledWith(Duration.millis(50)); // 100 * 2^(-1) = 50
  });

  it('should retry after failure and wait between attempts', async () => {
    const fn = vi
      .fn()
      .mockRejectedValueOnce(new Error('fail1'))
      .mockResolvedValueOnce('success');

    const backoffFn = backoff(fn, {
      initialDelay: Duration.millis(100),
      jitter: false,
    });

    // First attempt - fails
    await expect(backoffFn()).rejects.toThrow('fail1');
    expect(fn).toHaveBeenCalledWith(0);
    expect(timeModule.wait).toHaveBeenCalledWith(Duration.millis(50)); // 100 * 2^(-1) = 50

    // Second attempt - succeeds
    const result = await backoffFn();
    expect(result).toBe('success');
    expect(fn).toHaveBeenCalledWith(1);
    expect(timeModule.wait).toHaveBeenCalledWith(Duration.millis(100)); // 100 * 2^0 = 100
  });

  it('should reset attempt counter on success', async () => {
    const fn = vi
      .fn()
      .mockResolvedValueOnce('success1')
      .mockResolvedValueOnce('success2');

    const backoffFn = backoff(fn);

    await backoffFn();
    expect(fn).toHaveBeenLastCalledWith(0);

    await backoffFn();
    expect(fn).toHaveBeenLastCalledWith(0); // Counter should reset
  });

  it('should use exponential backoff with default factor of 2', async () => {
    const fn = vi
      .fn()
      .mockRejectedValueOnce(new Error('fail1'))
      .mockRejectedValueOnce(new Error('fail2'))
      .mockResolvedValueOnce('success');

    const backoffFn = backoff(fn, {
      initialDelay: Duration.millis(100),
      jitter: false,
    });

    await expect(backoffFn()).rejects.toThrow();
    await expect(backoffFn()).rejects.toThrow();
    await backoffFn();

    const waitMock = vi.mocked(timeModule.wait);
    expect((waitMock.mock.calls[0][0] as unknown as Duration).inMillis).toBe(
      50,
    ); // 100 * 2^(-1) = 50
    expect((waitMock.mock.calls[1][0] as unknown as Duration).inMillis).toBe(
      100,
    ); // 100 * 2^0 = 100
    expect((waitMock.mock.calls[2][0] as unknown as Duration).inMillis).toBe(
      200,
    ); // 100 * 2^1 = 200
  });

  it('should respect maxDelayMs cap', async () => {
    const fn = vi
      .fn()
      .mockRejectedValueOnce(new Error('fail1'))
      .mockRejectedValueOnce(new Error('fail2'))
      .mockRejectedValueOnce(new Error('fail3'))
      .mockResolvedValueOnce('success');

    const backoffFn = backoff(fn, {
      initialDelay: Duration.millis(100),
      maxDelay: Duration.millis(150),
      jitter: false,
    });

    await expect(backoffFn()).rejects.toThrow();
    await expect(backoffFn()).rejects.toThrow();
    await expect(backoffFn()).rejects.toThrow();
    await backoffFn();

    const waitMock = vi.mocked(timeModule.wait);
    expect((waitMock.mock.calls[0][0] as unknown as Duration).inMillis).toBe(
      50,
    ); // 100 * 2^(-1) = 50
    expect((waitMock.mock.calls[1][0] as unknown as Duration).inMillis).toBe(
      100,
    ); // 100 * 2^0 = 100
    expect((waitMock.mock.calls[2][0] as unknown as Duration).inMillis).toBe(
      150,
    ); // min(100 * 2^1, 150) = 150
    expect((waitMock.mock.calls[3][0] as unknown as Duration).inMillis).toBe(
      150,
    ); // min(100 * 2^2, 150) = 150
  });

  it('should apply jitter when enabled', async () => {
    const fn = vi
      .fn()
      .mockRejectedValueOnce(new Error('fail'))
      .mockResolvedValueOnce('success');

    const backoffFn = backoff(fn, {
      initialDelay: Duration.millis(100),
      jitter: true,
    });

    await expect(backoffFn()).rejects.toThrow();
    await backoffFn();

    const waitMock = vi.mocked(timeModule.wait);
    const delay = (waitMock.mock.calls[0][0] as unknown as Duration).inMillis;
    // With jitter on attempt 0: 50 * (0.5 + Math.random() * 0.5), range [25, 50]
    expect(delay).toBeGreaterThanOrEqual(25);
    expect(delay).toBeLessThanOrEqual(50);
  });

  it('should not apply jitter when disabled', async () => {
    const fn = vi
      .fn()
      .mockRejectedValueOnce(new Error('fail'))
      .mockResolvedValueOnce('success');

    const backoffFn = backoff(fn, {
      initialDelay: Duration.millis(100),
      jitter: false,
    });

    await expect(backoffFn()).rejects.toThrow();
    await backoffFn();

    const waitMock = vi.mocked(timeModule.wait);
    const delay = (waitMock.mock.calls[0][0] as unknown as Duration).inMillis;
    expect(delay).toBe(50); // 100 * 2^(-1) = 50
  });

  it('should use custom factor', async () => {
    const fn = vi
      .fn()
      .mockRejectedValueOnce(new Error('fail1'))
      .mockRejectedValueOnce(new Error('fail2'))
      .mockResolvedValueOnce('success');

    const backoffFn = backoff(fn, {
      initialDelay: Duration.millis(100),
      factor: 3,
      jitter: false,
    });

    await expect(backoffFn()).rejects.toThrow();
    await expect(backoffFn()).rejects.toThrow();
    await backoffFn();

    const waitMock = vi.mocked(timeModule.wait);
    // With factor 3:
    // attempt 0: 100 * 3^(-1) = 33.33...
    // attempt 1: 100 * 3^0 = 100
    // attempt 2: 100 * 3^1 = 300
    expect(
      (waitMock.mock.calls[0][0] as unknown as Duration).inMillis,
    ).toBeCloseTo(33.33, 1);
    expect((waitMock.mock.calls[1][0] as unknown as Duration).inMillis).toBe(
      100,
    );
    expect((waitMock.mock.calls[2][0] as unknown as Duration).inMillis).toBe(
      300,
    );
  });

  it('should pass attempt number to the function', async () => {
    const fn = vi
      .fn()
      .mockRejectedValueOnce(new Error('fail'))
      .mockRejectedValueOnce(new Error('fail'))
      .mockResolvedValueOnce('success');

    const backoffFn = backoff(fn);

    await expect(backoffFn()).rejects.toThrow();
    expect(fn).toHaveBeenLastCalledWith(0);

    await expect(backoffFn()).rejects.toThrow();
    expect(fn).toHaveBeenLastCalledWith(1);

    await backoffFn();
    expect(fn).toHaveBeenLastCalledWith(2);
  });

  it('should throw the original error on failure', async () => {
    const customError = new Error('custom error message');
    const fn = vi.fn().mockRejectedValueOnce(customError);

    const backoffFn = backoff(fn);

    await expect(backoffFn()).rejects.toThrow('custom error message');
  });
});
