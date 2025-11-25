import { wait } from './time.js';

export type BackoffConfig = {
  initialDelayMs?: number;
  maxDelayMs?: number;
  factor?: number;
  jitter?: boolean;
};

export function backoff<T>(
  fn: (attempt: number) => Promise<T>,
  config: BackoffConfig = {},
) {
  const {
    initialDelayMs = 100,
    maxDelayMs = 60000,
    factor = 2,
    jitter = true,
  } = config;

  let attempt = 0;

  return async (): Promise<T> => {
    const delay =
      Math.min(initialDelayMs * Math.pow(factor, attempt - 1), maxDelayMs) *
      (jitter ? 0.5 + Math.random() * 0.5 : 1);

    if (delay > 0) {
      await wait(delay);
    }

    try {
      const result = await fn(attempt);
      attempt = 0;
      return result;
    } catch (err) {
      attempt++;
      throw err;
    }
  };
}
