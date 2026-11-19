"use client";

import { useCallback, useEffect, useState } from "react";
import { api, ApiError } from "./api";

/** Admin request: any 401 sends the user to the login page (the API is the real gatekeeper). */
export async function adminApi<T>(path: string, init: RequestInit & { json?: unknown } = {}): Promise<T> {
  try {
    return await api<T>(path, init);
  } catch (e) {
    if (e instanceof ApiError && e.status === 401 && typeof window !== "undefined" && !window.location.pathname.startsWith("/admin/login")) {
      // full navigation on purpose: drops any stale admin state
      // eslint-disable-next-line @next/next/no-location-assign-relative-destination
      window.location.href = "/admin/login";
    }
    throw e;
  }
}

type State<T> = { key: string; data: T | null; error: string | null };

export function useAdminData<T>(path: string | null) {
  const [tick, setTick] = useState(0);
  const [state, setState] = useState<State<T> | null>(null);
  const key = `${path}#${tick}`;

  useEffect(() => {
    if (path === null) return;
    let alive = true;
    adminApi<T>(path)
      .then((data) => alive && setState({ key, data, error: null }))
      .catch((e) => alive && setState((s) => ({ key, data: s?.data ?? null, error: e instanceof ApiError ? e.message : "Could not reach the API" })));
    return () => {
      alive = false;
    };
  }, [path, key]);

  const reload = useCallback(async () => setTick((t) => t + 1), []);
  const setData = useCallback((data: T) => setState((s) => ({ key: s?.key ?? "", data, error: null })), []);
  const current = state?.key === key;
  return {
    data: state?.data ?? null,
    error: current ? state.error : null,
    loading: path !== null && !current,
    reload,
    setData,
  };
}

export function errorMessage(e: unknown): string {
  if (e instanceof ApiError) {
    const fe = Object.entries(e.fieldErrors);
    return fe.length ? fe.map(([k, v]) => `${k}: ${v}`).join("; ") : e.message;
  }
  return "Could not reach the API";
}
