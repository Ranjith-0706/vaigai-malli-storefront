import type { ApiFieldError } from "./types";

export class ApiError extends Error {
  status: number;
  code: string;
  details: unknown;
  constructor(status: number, code: string, message: string, details?: unknown) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details;
  }
  /** Map of field name (last path segment) to message for 422 responses. */
  get fieldErrors(): Record<string, string> {
    const out: Record<string, string> = {};
    if (Array.isArray(this.details)) {
      for (const d of this.details as ApiFieldError[]) {
        if (d && typeof d.field === "string") out[d.field.split(".").pop() ?? d.field] = d.message;
      }
    }
    return out;
  }
}

async function parse<T>(res: Response): Promise<T> {
  if (res.status === 204) return undefined as T;
  let body: unknown = null;
  try {
    body = await res.json();
  } catch {
    /* non-JSON body */
  }
  if (!res.ok) {
    const err = (body as { error?: { code: string; message: string; details?: unknown } } | null)?.error;
    throw new ApiError(res.status, err?.code ?? "error", err?.message ?? `Request failed (${res.status})`, err?.details);
  }
  return body as T;
}

/** Browser-side request (same-origin through the Next.js rewrite). */
export async function api<T>(path: string, init: RequestInit & { json?: unknown } = {}): Promise<T> {
  const { json, headers, ...rest } = init;
  const res = await fetch(`/api/v1${path}`, {
    credentials: "same-origin",
    ...rest,
    headers: { ...(json !== undefined ? { "Content-Type": "application/json" } : {}), ...headers },
    body: json !== undefined ? JSON.stringify(json) : rest.body,
  });
  return parse<T>(res);
}

/** Server-component request straight to the API. */
export async function serverApi<T>(path: string): Promise<T> {
  const base = process.env.API_URL ?? "http://localhost:8010";
  const res = await fetch(`${base}/api/v1${path}`, { cache: "no-store" });
  return parse<T>(res);
}
