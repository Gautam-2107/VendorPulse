import { request, TIMEOUTS } from "./client";
import { parseEvaluation } from "./parse";
import type { EvaluationResponse } from "../types/api";

export const evaluatePurchaseRequest = (purchaseRequestId: string): Promise<EvaluationResponse> =>
  request("/evaluations", parseEvaluation, {
    method: "POST",
    body: { purchase_request_id: purchaseRequestId },
    timeoutMs: TIMEOUTS.evaluation,
  });
