/**
 * Types mirroring the VendorPulse backend contract.
 *
 * Source of truth:
 *   backend/app/models/schemas.py          (Vendor, PurchaseOrder, PurchaseRequest, Decision, Outcome)
 *   backend/app/api/evaluations.py         (EvaluationResponse)
 *   backend/app/agent/procurement_agent.py (shape of memory_evidence / vendor_comparison items)
 *   backend/app/services/seed_service.py   (POST /seed result)
 *
 * Numeric conventions (from the backend source):
 *   - average_defect_rate, compliance_failure_rate, PurchaseOrder.defect_rate and
 *     outcome defect_rate are FRACTIONS (0.017 === 1.7%).
 *   - baseline_risk / hindsight_adjustment / combined_risk are unitless risk points.
 */

export interface Vendor {
  id: string;
  name: string;
  total_orders: number;
  delivered_orders: number;
  cancelled_orders: number;
  pending_orders: number;
  partially_delivered_orders: number;
  average_delivery_days: number | null;
  average_defect_rate: number | null;
  compliance_failure_rate: number | null;
  total_negotiated_savings: number | null;
  average_negotiated_savings: number | null;
}

/** Historical purchase order — GET /vendors/{id}/history */
export interface PurchaseOrder {
  id: string;
  po_id: string;
  vendor_id: string | null;
  vendor_name: string;
  material_category: string;
  order_date: string | null;
  delivery_date: string | null;
  order_status: string;
  quantity: number;
  unit_price: number;
  negotiated_price: number;
  defective_units: number;
  compliance: string;
  delivery_days: number | null;
  delay_days: number | null;
  defect_rate: number | null;
  unit_savings: number | null;
  negotiated_savings: number | null;
  delay_reason: string | null;
  vendor_explanation: string | null;
  resolution: string | null;
  procurement_decision: string | null;
  outcome: string | null;
  additional_cost: number | null;
  context_source: string;
  is_synthetic_context: boolean;
}

export type Priority = "low" | "medium" | "high";

export interface PurchaseRequestCreate {
  material_name: string;
  material_category: string;
  quantity: number;
  target_delivery_date: string; // YYYY-MM-DD
  budget: number;
  priority: Priority;
  notes?: string | null;
}

/** status values written by the backend: pending → evaluated → decided → completed */
export interface PurchaseRequest {
  id: string;
  request_number: string;
  material_name: string;
  material_category: string;
  quantity: number;
  target_delivery_date: string;
  budget: number;
  status: string;
  priority: string;
  notes: string | null;
  created_at: string;
}

/** Item of EvaluationResponse.memory_evidence (procurement_agent.py) */
export interface MemoryEvidence {
  vendor: string;
  memory: string;
  relevance: string;
}

/** Item of EvaluationResponse.vendor_comparison (procurement_agent.py) */
export interface VendorComparisonRow {
  vendor_id: string;
  vendor_name: string;
  /** NOTE: the backend populates this with vendor.total_orders */
  delivered_orders: number | null;
  average_delivery_days: number | null;
  average_defect_rate: number | null;
  memory_count: number;
  baseline_risk: number;
  hindsight_adjustment: number;
  combined_risk: number;
  memory_flags: string[];
}

export interface EvaluationResponse {
  purchase_request_id: string;
  recommended_vendor: string;
  recommended_vendor_id: string | null;
  recommendation: string;
  reasoning: string;
  risk_summary: string;
  memory_evidence: MemoryEvidence[];
  vendor_comparison: VendorComparisonRow[];
  important_caveats: string;
}

export type DecisionType = "approved" | "override";

export interface DecisionCreate {
  purchase_request_id: string;
  selected_vendor_id: string;
  decision_type: DecisionType;
  decision_reason: string; // min length 5
  decider_name: string;
}

export interface Decision {
  id: string;
  purchase_request_id: string;
  selected_vendor_id: string;
  selected_vendor_name: string;
  decision_type: string;
  decision_reason: string;
  decider_name: string;
  decided_at: string;
}

export interface OutcomeCreate {
  purchase_request_id: string;
  vendor_id: string;
  actual_delivery_date: string;
  actual_delivery_days: number;
  delay_days: number;
  defect_rate: number; // fraction
  defective_units: number;
  delay_reason: string | null;
  vendor_explanation: string | null;
  resolution: string | null;
  additional_cost: number;
  outcome_summary: string; // min length 5
}

export interface Outcome {
  id: string;
  purchase_request_id: string;
  vendor_id: string;
  actual_delivery_date: string;
  actual_delivery_days: number;
  delay_days: number;
  defect_rate: number;
  defective_units: number;
  delay_reason: string | null;
  vendor_explanation: string | null;
  resolution: string | null;
  additional_cost: number;
  outcome_summary: string;
  is_retained_to_hindsight: boolean;
  created_at: string;
}

/** POST /seed returns a free-form summary dict */
export type SeedResult = Record<string, unknown>;
