import { request, TIMEOUTS } from "./client";
import { parseOutcome } from "./parse";
import type { Outcome, OutcomeCreate } from "../types/api";

export const recordOutcome = (body: OutcomeCreate): Promise<Outcome> =>
  request("/outcomes", parseOutcome, { method: "POST", body, timeoutMs: TIMEOUTS.outcome });

export const getOutcome = (id: string): Promise<Outcome> =>
  request(`/outcomes/${encodeURIComponent(id)}`, parseOutcome);
