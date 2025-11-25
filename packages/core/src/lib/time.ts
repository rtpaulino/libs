export function wait(millis: number) {
  return new Promise((resolve) => setTimeout(resolve, millis));
}

export async function waitFor<T>(
  action: () => Promise<T>,
  condition: (result: T) => boolean,
  options: {
    timeoutMs: number;
    intervalMs?: number;
    timeoutAction?: 'throw' | 'returnNull' | 'returnResult';
  },
): Promise<T | null> {
  const intervalMs = options.intervalMs ?? 5000;
  const timeoutAt = Date.now() + options.timeoutMs;
  const timeoutAction = options.timeoutAction ?? 'throw';

  // eslint-disable-next-line no-constant-condition
  while (true) {
    const result = await action();

    if (condition(result)) {
      return result;
    }

    if (Date.now() >= timeoutAt) {
      switch (timeoutAction) {
        case 'throw':
          throw new Error('waitFor: timeout exceeded');
        case 'returnResult':
          return result;
        default:
          return null;
      }
    }

    await wait(intervalMs);
  }
}
