/**
 * The backend exposes GET /decisions/{id} and GET /outcomes/{id} but no list
 * endpoints. We keep ONLY the IDs returned by the backend here so that, after
 * a reload, the full records are fetched again from the API. No business data
 * is stored in the browser.
 */
export interface RequestRefs {
  decisionId?: string;
  outcomeId?: string;
}

const KEY = "vendorpulse.refs.v1";
const ACTIVE_KEY = "vendorpulse.activeRequest.v1";

function readAll(): Record<string, RequestRefs> {
  try {
    const raw = window.localStorage.getItem(KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : {};
    return parsed && typeof parsed === "object" ? (parsed as Record<string, RequestRefs>) : {};
  } catch {
    return {};
  }
}

export function getRefs(requestId: string): RequestRefs {
  return readAll()[requestId] ?? {};
}

export function getAllRefs(): Record<string, RequestRefs> {
  return readAll();
}

export function saveRefs(requestId: string, patch: RequestRefs): void {
  try {
    const all = readAll();
    all[requestId] = { ...all[requestId], ...patch };
    window.localStorage.setItem(KEY, JSON.stringify(all));
  } catch {
    /* storage unavailable — records remain retrievable only during this session */
  }
}

export function getActiveRequestId(): string | null {
  try {
    return window.localStorage.getItem(ACTIVE_KEY);
  } catch {
    return null;
  }
}

export function setActiveRequestId(id: string | null): void {
  try {
    if (id) window.localStorage.setItem(ACTIVE_KEY, id);
    else window.localStorage.removeItem(ACTIVE_KEY);
  } catch {
    /* ignore */
  }
}
