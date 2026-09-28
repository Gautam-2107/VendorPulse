/**
 * Central API client. Every backend call goes through `request()` so that the
 * base URL, timeouts and error classification live in exactly one place.
 */

const DEFAULT_BASE_URL = "http://127.0.0.1:8000/api/v1";

export const API_BASE_URL: string = (
  (import.meta.env.VITE_API_BASE_URL as string | undefined)?.trim() || DEFAULT_BASE_URL
).replace(/\/+$/, "");

export type ApiErrorKind = "offline" | "timeout" | "http" | "malformed";

export class ApiError extends Error {
  readonly kind: ApiErrorKind;
  readonly status?: number;
  /** Human-readable detail from the backend (FastAPI `detail`), if any. */
  readonly detail?: string;

  constructor(kind: ApiErrorKind, message: string, opts: { status?: number; detail?: string } = {}) {
    super(message);
    this.name = "ApiError";
    this.kind = kind;
    this.status = opts.status;
    this.detail = opts.detail;
  }
}

export const TIMEOUTS = {
  default: 15_000,
  /** Evaluation recalls Hindsight for every vendor and calls the LLM. */
  evaluation: 120_000,
  /** Outcome recording awaits Hindsight retention. */
  outcome: 60_000,
} as const;

interface RequestOptions {
  method?: "GET" | "POST";
  body?: unknown;
  timeoutMs?: number;
}

function extractDetail(payload: unknown): string | undefined {
  if (payload && typeof payload === "object" && "detail" in payload) {
    const detail = (payload as { detail: unknown }).detail;
    if (typeof detail === "string") return detail;
    // FastAPI 422 validation errors: [{loc, msg, type}]
    if (Array.isArray(detail)) {
      const msgs = detail
        .map((d) => {
          if (d && typeof d === "object" && "msg" in d) {
            const loc = Array.isArray((d as { loc?: unknown }).loc)
              ? ((d as { loc: unknown[] }).loc.filter((p) => p !== "body").join("."))
              : "";
            return `${loc ? loc + ": " : ""}${String((d as { msg: unknown }).msg)}`;
          }
          return null;
        })
        .filter(Boolean);
      if (msgs.length) return msgs.join("; ");
    }
  }
  return undefined;
}

export async function request<T>(
  path: string,
  parse: (raw: unknown) => T,
  { method = "GET", body, timeoutMs = TIMEOUTS.default }: RequestOptions = {},
): Promise<T> {
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), timeoutMs);

  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      method,
      headers: body !== undefined ? { "Content-Type": "application/json", Accept: "application/json" } : { Accept: "application/json" },
      body: body !== undefined ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    });
  } catch (err) {
    window.clearTimeout(timer);
    if (err instanceof DOMException && err.name === "AbortError") {
      throw new ApiError("timeout", `The backend did not respond within ${Math.round(timeoutMs / 1000)} seconds.`);
    }
    throw new ApiError("offline", "Cannot reach the VendorPulse backend.");
  }
  window.clearTimeout(timer);

  let payload: unknown = null;
  const text = await response.text().catch(() => "");
  if (text) {
    try {
      payload = JSON.parse(text);
    } catch {
      if (response.ok) throw new ApiError("malformed", "The backend returned a response that is not valid JSON.");
    }
  }

  if (!response.ok) {
    const detail = extractDetail(payload);
    throw new ApiError("http", detail ?? `Request failed with status ${response.status}.`, {
      status: response.status,
      detail,
    });
  }

  try {
    return parse(payload);
  } catch (err) {
    throw new ApiError(
      "malformed",
      `Unexpected response shape from ${path}${err instanceof Error ? ` (${err.message})` : ""}.`,
    );
  }
}

/** Human-readable message for any thrown value — never exposes stack traces. */
export function describeError(err: unknown): { title: string; message: string } {
  if (err instanceof ApiError) {
    switch (err.kind) {
      case "offline":
        return {
          title: "Backend offline",
          message: `VendorPulse cannot reach the API at ${API_BASE_URL}. Start the backend (uvicorn app.main:app) and retry.`,
        };
      case "timeout":
        return { title: "Request timed out", message: err.message };
      case "malformed":
        return { title: "Unexpected response", message: err.message };
      case "http":
        if (err.status === 404) return { title: "Not found", message: err.message };
        if (err.status === 422) return { title: "Invalid input", message: err.message };
        if (err.status && err.status >= 500) return { title: "Backend error", message: err.message };
        return { title: "Request rejected", message: err.message };
    }
  }
  return { title: "Something went wrong", message: "An unexpected error occurred in the interface." };
}
