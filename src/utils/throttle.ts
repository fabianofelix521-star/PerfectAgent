export function throttle<T extends (...args: any[]) => void>(
  fn: T,
  limitMs: number,
): T {
  let lastCall = 0;
  let timeout: ReturnType<typeof setTimeout> | null = null;
  let trailingArgs: Parameters<T> | null = null;

  return ((...args: Parameters<T>) => {
    const now = Date.now();
    const elapsed = now - lastCall;

    if (elapsed >= limitMs) {
      lastCall = now;
      trailingArgs = null;
      fn(...args);
      return;
    }

    trailingArgs = args;
    if (timeout) clearTimeout(timeout);

    timeout = setTimeout(() => {
      lastCall = Date.now();
      const next = trailingArgs;
      trailingArgs = null;
      timeout = null;
      if (next) {
        fn(...next);
      }
    }, Math.max(0, limitMs - elapsed));
  }) as T;
}
