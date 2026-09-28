/**
 * Minimal runtime validation for backend responses. Required fields must be
 * present with the right primitive type; optional fields fall back to null.
 * A failure throws, which the client converts into a "malformed" ApiError.
 */
import type {
  Decision,
  EvaluationResponse,
  MemoryEvidence,
  Outcome,
  PurchaseOrder,
  PurchaseRequest,
  Vendor,
  VendorComparisonRow,
} from "../types/api";

type Obj = Record<string, unknown>;

function obj(v: unknown, what: string): Obj {
  if (!v || typeof v !== "object" || Array.isArray(v)) throw new Error(`${what} is not an object`);
  return v as Obj;
}
export function arr<T>(v: unknown, what: string, item: (x: unknown) => T): T[] {
  if (!Array.isArray(v)) throw new Error(`${what} is not a list`);
  return v.map(item);
}
function str(o: Obj, k: string): string {
  const v = o[k];
  if (typeof v !== "string") throw new Error(`missing field "${k}"`);
  return v;
}
function num(o: Obj, k: string): number {
  const v = o[k];
  if (typeof v !== "number" || Number.isNaN(v)) throw new Error(`missing numeric field "${k}"`);
  return v;
}
function optStr(o: Obj, k: string): string | null {
  const v = o[k];
  return typeof v === "string" ? v : null;
}
function optNum(o: Obj, k: string): number | null {
  const v = o[k];
  return typeof v === "number" && !Number.isNaN(v) ? v : null;
}
function numOr(o: Obj, k: string, d: number): number {
  return optNum(o, k) ?? d;
}
function bool(o: Obj, k: string, d = false): boolean {
  const v = o[k];
  return typeof v === "boolean" ? v : d;
}

export function parseVendor(raw: unknown): Vendor {
  const o = obj(raw, "vendor");
  return {
    id: str(o, "id"),
    name: str(o, "name"),
    total_orders: numOr(o, "total_orders", 0),
    delivered_orders: numOr(o, "delivered_orders", 0),
    cancelled_orders: numOr(o, "cancelled_orders", 0),
    pending_orders: numOr(o, "pending_orders", 0),
    partially_delivered_orders: numOr(o, "partially_delivered_orders", 0),
    average_delivery_days: optNum(o, "average_delivery_days"),
    average_defect_rate: optNum(o, "average_defect_rate"),
    compliance_failure_rate: optNum(o, "compliance_failure_rate"),
    total_negotiated_savings: optNum(o, "total_negotiated_savings"),
    average_negotiated_savings: optNum(o, "average_negotiated_savings"),
  };
}

export function parsePurchaseOrder(raw: unknown): PurchaseOrder {
  const o = obj(raw, "purchase order");
  return {
    id: str(o, "id"),
    po_id: str(o, "po_id"),
    vendor_id: optStr(o, "vendor_id"),
    vendor_name: str(o, "vendor_name"),
    material_category: str(o, "material_category"),
    order_date: optStr(o, "order_date"),
    delivery_date: optStr(o, "delivery_date"),
    order_status: str(o, "order_status"),
    quantity: numOr(o, "quantity", 0),
    unit_price: numOr(o, "unit_price", 0),
    negotiated_price: numOr(o, "negotiated_price", 0),
    defective_units: numOr(o, "defective_units", 0),
    compliance: optStr(o, "compliance") ?? "",
    delivery_days: optNum(o, "delivery_days"),
    delay_days: optNum(o, "delay_days"),
    defect_rate: optNum(o, "defect_rate"),
    unit_savings: optNum(o, "unit_savings"),
    negotiated_savings: optNum(o, "negotiated_savings"),
    delay_reason: optStr(o, "delay_reason"),
    vendor_explanation: optStr(o, "vendor_explanation"),
    resolution: optStr(o, "resolution"),
    procurement_decision: optStr(o, "procurement_decision"),
    outcome: optStr(o, "outcome"),
    additional_cost: optNum(o, "additional_cost"),
    context_source: optStr(o, "context_source") ?? "",
    is_synthetic_context: bool(o, "is_synthetic_context", false),
  };
}

export function parsePurchaseRequest(raw: unknown): PurchaseRequest {
  const o = obj(raw, "purchase request");
  return {
    id: str(o, "id"),
    request_number: str(o, "request_number"),
    material_name: str(o, "material_name"),
    material_category: str(o, "material_category"),
    quantity: num(o, "quantity"),
    target_delivery_date: str(o, "target_delivery_date"),
    budget: num(o, "budget"),
    status: str(o, "status"),
    priority: str(o, "priority"),
    notes: optStr(o, "notes"),
    created_at: str(o, "created_at"),
  };
}

function parseMemoryEvidence(raw: unknown): MemoryEvidence {
  const o = obj(raw, "memory evidence");
  return {
    vendor: str(o, "vendor"),
    memory: str(o, "memory"),
    relevance: optStr(o, "relevance") ?? "",
  };
}

function parseComparisonRow(raw: unknown): VendorComparisonRow {
  const o = obj(raw, "vendor comparison row");
  const flags = Array.isArray(o.memory_flags) ? o.memory_flags.filter((f): f is string => typeof f === "string") : [];
  return {
    vendor_id: str(o, "vendor_id"),
    vendor_name: str(o, "vendor_name"),
    delivered_orders: optNum(o, "delivered_orders"),
    average_delivery_days: optNum(o, "average_delivery_days"),
    average_defect_rate: optNum(o, "average_defect_rate"),
    memory_count: numOr(o, "memory_count", 0),
    baseline_risk: num(o, "baseline_risk"),
    hindsight_adjustment: num(o, "hindsight_adjustment"),
    combined_risk: num(o, "combined_risk"),
    memory_flags: flags,
  };
}

export function parseEvaluation(raw: unknown): EvaluationResponse {
  const o = obj(raw, "evaluation");
  return {
    purchase_request_id: str(o, "purchase_request_id"),
    recommended_vendor: str(o, "recommended_vendor"),
    recommended_vendor_id: optStr(o, "recommended_vendor_id"),
    recommendation: optStr(o, "recommendation") ?? "",
    reasoning: optStr(o, "reasoning") ?? "",
    risk_summary: optStr(o, "risk_summary") ?? "",
    memory_evidence: arr(o.memory_evidence, "memory_evidence", parseMemoryEvidence),
    vendor_comparison: arr(o.vendor_comparison, "vendor_comparison", parseComparisonRow),
    important_caveats: optStr(o, "important_caveats") ?? "",
  };
}

export function parseDecision(raw: unknown): Decision {
  const o = obj(raw, "decision");
  return {
    id: str(o, "id"),
    purchase_request_id: str(o, "purchase_request_id"),
    selected_vendor_id: str(o, "selected_vendor_id"),
    selected_vendor_name: str(o, "selected_vendor_name"),
    decision_type: str(o, "decision_type"),
    decision_reason: str(o, "decision_reason"),
    decider_name: str(o, "decider_name"),
    decided_at: str(o, "decided_at"),
  };
}

export function parseOutcome(raw: unknown): Outcome {
  const o = obj(raw, "outcome");
  return {
    id: str(o, "id"),
    purchase_request_id: str(o, "purchase_request_id"),
    vendor_id: str(o, "vendor_id"),
    actual_delivery_date: str(o, "actual_delivery_date"),
    actual_delivery_days: num(o, "actual_delivery_days"),
    delay_days: numOr(o, "delay_days", 0),
    defect_rate: numOr(o, "defect_rate", 0),
    defective_units: numOr(o, "defective_units", 0),
    delay_reason: optStr(o, "delay_reason"),
    vendor_explanation: optStr(o, "vendor_explanation"),
    resolution: optStr(o, "resolution"),
    additional_cost: numOr(o, "additional_cost", 0),
    outcome_summary: str(o, "outcome_summary"),
    is_retained_to_hindsight: bool(o, "is_retained_to_hindsight", false),
    created_at: str(o, "created_at"),
  };
}

export function parseRecord(raw: unknown): Record<string, unknown> {
  return obj(raw, "response");
}
