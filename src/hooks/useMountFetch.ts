import { useEffect, useRef } from 'react';

/**
 * Run an async effect once when `deps` change, with:
 * - cancellation so Strict Mode's first run doesn't commit stale state
 * - stable identity: does not re-fire just because callback identity changed
 *
 * Pass the loader via ref update each render; the effect only depends on `deps`.
 */
export function useMountFetch(
  loader: (signal: { cancelled: boolean }) => void | Promise<void>,
  deps: readonly unknown[]
): void {
  const loaderRef = useRef(loader);
  loaderRef.current = loader;

  useEffect(() => {
    const signal = { cancelled: false };
    void Promise.resolve(loaderRef.current(signal));
    return () => {
      signal.cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional: deps array is the caller's contract
  }, deps);
}
