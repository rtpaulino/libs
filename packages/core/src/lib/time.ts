import { Duration } from './duration';

export function wait(duration: Duration) {
  return new Promise((resolve) => setTimeout(resolve, duration.inMillis));
}

export async function waitUntil(
  condition: () => boolean | Promise<boolean>,
  options: {
    timeout: Duration;
    interval?: Duration;
    throwOnTimeout?: boolean;
  },
): Promise<void> {
  const intervalMs = options.interval ?? Duration.millis(500);
  const timeoutAt = Date.now() + options.timeout.inMillis;
  const throwOnTimeout = options.throwOnTimeout ?? true;

  // eslint-disable-next-line no-constant-condition
  while (!(await condition())) {
    if (Date.now() >= timeoutAt) {
      if (throwOnTimeout) {
        throw new Error('waitUntil: timeout exceeded');
      } else {
        return;
      }
    }

    await wait(intervalMs);
  }
}
