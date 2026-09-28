import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import { describeError } from "../api/client";
import { createDecision, getDecision } from "../api/decisions";
import { evaluatePurchaseRequest } from "../api/evaluations";
import { getOutcome, recordOutcome as postOutcome } from "../api/outcomes";
import { createPurchaseRequest, listPurchaseRequests } from "../api/requests";
import { listVendors } from "../api/vendors";
import type {
  Decision,
  DecisionCreate,
  EvaluationResponse,
  Outcome,
  OutcomeCreate,
  PurchaseRequest,
  PurchaseRequestCreate,
  Vendor,
} from "../types/api";
import { getActiveRequestId, getAllRefs, saveRefs, setActiveRequestId } from "../utils/refs";

export type LoadState<T> =
  | { status: "loading"; data?: T }
  | { status: "ready"; data: T }
  | { status: "error"; error: { title: string; message: string }; data?: T };

export type EvalState =
  | { status: "idle" }
  | { status: "running"; startedAt: number }
  | { status: "done"; data: EvaluationResponse; at: number }
  | { status: "error"; error: { title: string; message: string } };

export type Connection = "checking" | "online" | "offline";

export interface Toast {
  id: number;
  tone: "success" | "error" | "info";
  title: string;
  message?: string;
}

interface AppStateValue {
  connection: Connection;
  vendors: LoadState<Vendor[]>;
  requests: LoadState<PurchaseRequest[]>;
  lastSync: number | null;
  activeRequestId: string | null;
  activeRequest: PurchaseRequest | null;
  evaluations: Record<string, EvalState>;
  decisions: Record<string, Decision>;
  outcomes: Record<string, Outcome>;
  toasts: Toast[];
  refreshAll: () => Promise<void>;
  setActiveRequest: (id: string | null) => void;
  createRequest: (body: PurchaseRequestCreate) => Promise<PurchaseRequest>;
  evaluate: (requestId: string) => Promise<void>;
  decide: (body: DecisionCreate) => Promise<Decision>;
  recordOutcome: (body: OutcomeCreate) => Promise<Outcome>;
  pushToast: (t: Omit<Toast, "id">) => void;
  dismissToast: (id: number) => void;
}

const Ctx = createContext<AppStateValue | null>(null);

/** Keeps the "Searching organizational memory…" state readable on fast backends. */
const MIN_RECALL_MS = 900;

export function AppStateProvider({ children }: { children: ReactNode }) {
  const [connection, setConnection] = useState<Connection>("checking");
  const [vendors, setVendors] = useState<LoadState<Vendor[]>>({ status: "loading" });
  const [requests, setRequests] = useState<LoadState<PurchaseRequest[]>>({ status: "loading" });
  const [lastSync, setLastSync] = useState<number | null>(null);
  const [activeRequestId, setActiveId] = useState<string | null>(() => getActiveRequestId());
  const [evaluations, setEvaluations] = useState<Record<string, EvalState>>({});
  const [decisions, setDecisions] = useState<Record<string, Decision>>({});
  const [outcomes, setOutcomes] = useState<Record<string, Outcome>>({});
  const [toasts, setToasts] = useState<Toast[]>([]);
  const toastSeq = useRef(0);

  const pushToast = useCallback((t: Omit<Toast, "id">) => {
    const id = ++toastSeq.current;
    setToasts((prev) => [...prev.slice(-3), { ...t, id }]);
    window.setTimeout(() => setToasts((prev) => prev.filter((x) => x.id !== id)), t.tone === "error" ? 8000 : 5000);
  }, []);
  const dismissToast = useCallback((id: number) => setToasts((prev) => prev.filter((x) => x.id !== id)), []);

  /** Re-fetch decision/outcome records (by ID) from the backend. */
  const loadLinkedRecords = useCallback(async () => {
    const refs = getAllRefs();
    const decEntries: [string, Decision][] = [];
    const outEntries: [string, Outcome][] = [];
    await Promise.all(
      Object.entries(refs).map(async ([reqId, r]) => {
        if (r.decisionId) {
          try {
            decEntries.push([reqId, await getDecision(r.decisionId)]);
          } catch {
            /* record no longer on this backend (e.g. database reset) */
          }
        }
        if (r.outcomeId) {
          try {
            outEntries.push([reqId, await getOutcome(r.outcomeId)]);
          } catch {
            /* ignore */
          }
        }
      }),
    );
    setDecisions(Object.fromEntries(decEntries));
    setOutcomes(Object.fromEntries(outEntries));
  }, []);

  const refreshAll = useCallback(async () => {
    setConnection((c) => (c === "online" ? c : "checking"));
    setVendors((s) => ({ status: "loading", data: s.data }));
    setRequests((s) => ({ status: "loading", data: s.data }));

    const [v, r] = await Promise.allSettled([listVendors(), listPurchaseRequests()]);
    let anyOnline = false;

    if (v.status === "fulfilled") {
      anyOnline = true;
      setVendors({ status: "ready", data: v.value });
    } else setVendors((s) => ({ status: "error", error: describeError(v.reason), data: s.data }));

    if (r.status === "fulfilled") {
      anyOnline = true;
      setRequests({ status: "ready", data: r.value });
    } else setRequests((s) => ({ status: "error", error: describeError(r.reason), data: s.data }));

    const offline = [v, r].every(
      (x) => x.status === "rejected" && describeError(x.reason).title === "Backend offline",
    );
    setConnection(anyOnline ? "online" : offline ? "offline" : "online");
    if (anyOnline) {
      await loadLinkedRecords();
      setLastSync(Date.now());
    }
  }, [loadLinkedRecords]);

  useEffect(() => {
    void refreshAll();
  }, [refreshAll]);

  const requestList = requests.data ?? [];
  const activeRequest = useMemo(() => {
    if (!requestList.length) return null;
    return requestList.find((r) => r.id === activeRequestId) ?? null;
  }, [requestList, activeRequestId]);

  // Default to the newest request that is not yet completed.
  useEffect(() => {
    if (requests.status !== "ready") return;
    const list = requests.data;
    if (activeRequestId && list.some((r) => r.id === activeRequestId)) return;
    const next = list.find((r) => r.status !== "completed") ?? list[0] ?? null;
    setActiveId(next?.id ?? null);
    setActiveRequestId(next?.id ?? null);
  }, [requests, activeRequestId]);

  const setActiveRequest = useCallback((id: string | null) => {
    setActiveId(id);
    setActiveRequestId(id);
  }, []);

  const upsertRequest = useCallback((pr: PurchaseRequest) => {
    setRequests((s) => {
      const list = s.data ?? [];
      const exists = list.some((x) => x.id === pr.id);
      const next = exists ? list.map((x) => (x.id === pr.id ? pr : x)) : [pr, ...list];
      return { status: "ready", data: next };
    });
  }, []);

  const patchRequestStatus = useCallback((id: string, status: string) => {
    setRequests((s) =>
      s.data ? { ...s, data: s.data.map((x) => (x.id === id ? { ...x, status } : x)) } as LoadState<PurchaseRequest[]> : s,
    );
  }, []);

  const createRequest = useCallback(
    async (body: PurchaseRequestCreate) => {
      const pr = await createPurchaseRequest(body);
      upsertRequest(pr);
      setActiveRequest(pr.id);
      return pr;
    },
    [upsertRequest, setActiveRequest],
  );

  const evaluate = useCallback(
    async (requestId: string) => {
      const startedAt = Date.now();
      setEvaluations((e) => ({ ...e, [requestId]: { status: "running", startedAt } }));
      try {
        const data = await evaluatePurchaseRequest(requestId);
        const wait = MIN_RECALL_MS - (Date.now() - startedAt);
        if (wait > 0) await new Promise((res) => window.setTimeout(res, wait));
        setEvaluations((e) => ({ ...e, [requestId]: { status: "done", data, at: Date.now() } }));
        setConnection("online");
        // Backend moves pending → evaluated; reflect it without inventing anything else.
        setRequests((s) =>
          s.data
            ? ({ ...s, data: s.data.map((x) => (x.id === requestId && x.status === "pending" ? { ...x, status: "evaluated" } : x)) } as LoadState<PurchaseRequest[]>)
            : s,
        );
      } catch (err) {
        const d = describeError(err);
        if (d.title === "Backend offline") setConnection("offline");
        setEvaluations((e) => ({ ...e, [requestId]: { status: "error", error: d } }));
      }
    },
    [],
  );

  const decide = useCallback(
    async (body: DecisionCreate) => {
      const d = await createDecision(body);
      saveRefs(body.purchase_request_id, { decisionId: d.id });
      setDecisions((m) => ({ ...m, [body.purchase_request_id]: d }));
      patchRequestStatus(body.purchase_request_id, "decided");
      return d;
    },
    [patchRequestStatus],
  );

  const recordOutcome = useCallback(
    async (body: OutcomeCreate) => {
      const o = await postOutcome(body);
      saveRefs(body.purchase_request_id, { outcomeId: o.id });
      setOutcomes((m) => ({ ...m, [body.purchase_request_id]: o }));
      patchRequestStatus(body.purchase_request_id, "completed");
      return o;
    },
    [patchRequestStatus],
  );

  const value: AppStateValue = {
    connection,
    vendors,
    requests,
    lastSync,
    activeRequestId,
    activeRequest,
    evaluations,
    decisions,
    outcomes,
    toasts,
    refreshAll,
    setActiveRequest,
    createRequest,
    evaluate,
    decide,
    recordOutcome,
    pushToast,
    dismissToast,
  };

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAppState(): AppStateValue {
  const v = useContext(Ctx);
  if (!v) throw new Error("useAppState must be used inside AppStateProvider");
  return v;
}
