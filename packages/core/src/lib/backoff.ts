import { Duration } from './duration.js';
import { wait } from './time.js';

export type BackoffConfig = {
  initialDelay?: Duration;
  maxDelay?: Duration;
  factor?: number;
  jitter?: boolean;
};

export function backoff<T>(
  fn: (attempt: number) => Promise<T>,
  config: BackoffConfig = {},
) {
  const {
    initialDelay = Duration.millis(100),
    maxDelay = Duration.minutes(1),
    factor = 2,
    jitter = true,
  } = config;

  let attempt = 0;

  return async (): Promise<T> => {
    const delay =
      Math.min(
        initialDelay.inMillis * Math.pow(factor, attempt - 1),
        maxDelay.inMillis,
      ) * (jitter ? 0.5 + Math.random() * 0.5 : 1);

    if (delay > 0) {
      await wait(Duration.millis(delay));
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
