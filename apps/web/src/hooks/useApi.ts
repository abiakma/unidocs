import { useCallback, useEffect, useRef, useState } from "react";

type Dependency = string | number | boolean | null | undefined;

interface ApiOptions {
  // Silently re-fetch on this interval and when the tab regains focus (queues that others change).
  refreshIntervalMs?: number;
}

interface ApiState<T> {
  data: T | null;
  error: unknown;
  loading: boolean;
  reload: () => void;
}

interface Settled<T> {
  key: string;
  data: T | null;
  error: unknown;
}

// Loads data on mount and whenever deps change; aborts stale requests.
// State is keyed by the deps, so `loading` is derived instead of set inside the effect.
export function useApi<T>(
  loader: (signal: AbortSignal) => Promise<T>,
  deps: Dependency[],
  options: ApiOptions = {},
): ApiState<T> {
  const [version, setVersion] = useState(0);
  const [settled, setSettled] = useState<Settled<T> | null>(null);
  const key = JSON.stringify([...deps, version]);
  const loaderRef = useRef(loader);

  useEffect(() => {
    loaderRef.current = loader;
  });

  useEffect(() => {
    const controller = new AbortController();
    loaderRef.current(controller.signal).then(
      (data) => {
        if (!controller.signal.aborted) setSettled({ key, data, error: null });
      },
      (error: unknown) => {
        if (!controller.signal.aborted) setSettled({ key, data: null, error });
      },
    );
    return () => controller.abort();
  }, [key]);

  // Background refresh keeps the current content on screen and ignores transient errors.
  const { refreshIntervalMs } = options;
  useEffect(() => {
    if (!refreshIntervalMs) return;
    const controller = new AbortController();
    const refresh = () => {
      if (document.visibilityState !== "visible") return;
      loaderRef.current(controller.signal).then(
        (data) => {
          if (!controller.signal.aborted) setSettled((previous) => (previous?.key === key ? { key, data, error: null } : previous));
        },
        () => undefined,
      );
    };
    const timer = window.setInterval(refresh, refreshIntervalMs);
    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", refresh);
    return () => {
      controller.abort();
      window.clearInterval(timer);
      window.removeEventListener("focus", refresh);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, [key, refreshIntervalMs]);

  const reload = useCallback(() => setVersion((current) => current + 1), []);
  const current = settled?.key === key ? settled : null;
  return { data: current?.data ?? null, error: current?.error ?? null, loading: current === null, reload };
}

// Queues that other people change (staff, signer, admin, student status).
export const LIVE_REFRESH = { refreshIntervalMs: 15_000 } as const;
