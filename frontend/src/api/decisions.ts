import { request } from "./client";
import { parseDecision } from "./parse";
import type { Decision, DecisionCreate } from "../types/api";

export const createDecision = (body: DecisionCreate): Promise<Decision> =>
  request("/decisions", parseDecision, { method: "POST", body });

export const getDecision = (id: string): Promise<Decision> =>
  request(`/decisions/${encodeURIComponent(id)}`, parseDecision);
