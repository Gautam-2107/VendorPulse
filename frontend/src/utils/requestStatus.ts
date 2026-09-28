import type { EvalState } from "../state/AppState";
import type { PurchaseRequest } from "../types/api";

export type DisplayStatus = "pending" | "evaluating" | "evaluated" | "decided" | "completed";

export const DISPLAY_LABEL: Record<DisplayStatus, string> = {
  pending: "Pending evaluation",
  evaluating: "Evaluating…",
  evaluated: "Evaluated",
  decided: "Decision recorded",
  completed: "Outcome recorded",
};

/**
 * Status shown in the UI. "Evaluated" is only shown after a successful
 * POST /evaluations in this session — a backend status of "evaluated" left by
 * an earlier run does not count, because its results are not available here.
 * Decision / outcome states come from the backend (or records created here).
 */
export function displayStatus(
  request: Pick<PurchaseRequest, "status">,
  evalState: EvalState | undefined,
  hasDecision = false,
  hasOutcome = false,
): DisplayStatus {
  if (hasOutcome || request.status === "completed") return "completed";
  if (hasDecision || request.status === "decided") return "decided";
  if (evalState?.status === "running") return "evaluating";
  if (evalState?.status === "done") return "evaluated";
  return "pending";
}
