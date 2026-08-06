/**
 * Deduplicate concurrent async work by key (Strict Mode + multi-caller safe).
 * Second caller awaits the same in-flight promise instead of starting a new request.
 */
const inflight = new Map<string, Promise<unknown>>();

export function asyncOnce<T>(key: string, fn: () => Promise<T>): Promise<T> {
  const existing = inflight.get(key);
  if (existing) return existing as Promise<T>;

  const promise = Promise.resolve()
    .then(fn)
    .finally(() => {
      if (inflight.get(key) === promise) {
        inflight.delete(key);
      }
    });

  inflight.set(key, promise);
  return promise as Promise<T>;
}

/**
 * Like asyncOnce, but keeps the settled promise until clearAsyncOnce().
 * Prevents React Strict Mode remount from firing the same GET twice in a row.
 */
export function stickyOnce<T>(key: string, fn: () => Promise<T>): Promise<T> {
  const existing = inflight.get(key);
  if (existing) return existing as Promise<T>;

  const promise = Promise.resolve()
    .then(fn)
    .catch((err) => {
      if (inflight.get(key) === promise) {
        inflight.delete(key);
      }
      throw err;
    });

  inflight.set(key, promise);
  return promise as Promise<T>;
}

/** Drop a gate early (e.g. after store reset) so the next call runs fresh. */
export function clearAsyncOnce(key: string): void {
  inflight.delete(key);
}

export function clearAsyncOncePrefix(prefix: string): void {
  for (const key of inflight.keys()) {
    if (key.startsWith(prefix)) inflight.delete(key);
  }
}
