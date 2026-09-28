import { useState } from "react";
import type { FormEvent } from "react";
import { describeError } from "../api/client";
import { useAppState } from "../state/AppState";
import type { Decision, PurchaseRequest } from "../types/api";
import { formatDate } from "../utils/format";
import { Icon } from "./Icon";
import { Spinner } from "./States";
import { useRevealOnMount } from "../utils/useRevealOnMount";

const EMPTY = {
  actual_delivery_date: "",
  actual_delivery_days: "",
  delay_days: "",
  defect_rate_pct: "",
  defective_units: "",
  delay_reason: "",
  vendor_explanation: "",
  resolution: "",
  additional_cost: "",
  outcome_summary: "",
};

function daysBetween(a: string, b: string): number | null {
  const pa = /^(\d{4})-(\d{2})-(\d{2})$/.exec(a);
  const pb = /^(\d{4})-(\d{2})-(\d{2})$/.exec(b);
  if (!pa || !pb) return null;
  const da = Date.UTC(+pa[1], +pa[2] - 1, +pa[3]);
  const db = Date.UTC(+pb[1], +pb[2] - 1, +pb[3]);
  return Math.round((db - da) / 86_400_000);
}

export function OutcomeForm({ request, decision }: { request: PurchaseRequest; decision: Decision }) {
  const { recordOutcome, pushToast } = useAppState();
  const [f, setF] = useState(EMPTY);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<{ title: string; message: string } | null>(null);
  const revealRef = useRevealOnMount<HTMLFormElement>();
  const set = (k: keyof typeof EMPTY) => (e: { target: { value: string } }) => setF((p) => ({ ...p, [k]: e.target.value }));

  const int = (s: string) => (s.trim() === "" ? null : Number(s));
  const deliveryDays = int(f.actual_delivery_days);
  const delay = int(f.delay_days);
  const defectPct = int(f.defect_rate_pct);
  const defectiveUnits = int(f.defective_units);
  const cost = int(f.additional_cost);

  const lateBy = f.actual_delivery_date ? daysBetween(request.target_delivery_date, f.actual_delivery_date) : null;

  const problems: string[] = [];
  if (!/^\d{4}-\d{2}-\d{2}$/.test(f.actual_delivery_date)) problems.push("actual delivery date");
  if (deliveryDays == null || !Number.isInteger(deliveryDays) || deliveryDays < 0) problems.push("actual delivery days");
  if (delay != null && (!Number.isInteger(delay) || delay < 0)) problems.push("delay days");
  if (defectPct != null && (defectPct < 0 || defectPct > 100)) problems.push("defect rate");
  if (defectiveUnits != null && (!Number.isInteger(defectiveUnits) || defectiveUnits < 0)) problems.push("defective units");
  if (cost != null && cost < 0) problems.push("additional cost");
  if (f.outcome_summary.trim().length < 5) problems.push("outcome summary");
  const valid = problems.length === 0;

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!valid || busy) return;
    setBusy(true);
    setError(null);
    const opt = (s: string) => (s.trim() ? s.trim() : null);
    try {
      const o = await recordOutcome({
        purchase_request_id: request.id,
        vendor_id: decision.selected_vendor_id,
        actual_delivery_date: f.actual_delivery_date,
        actual_delivery_days: deliveryDays as number,
        delay_days: delay ?? 0,
        defect_rate: (defectPct ?? 0) / 100,
        defective_units: defectiveUnits ?? 0,
        delay_reason: opt(f.delay_reason),
        vendor_explanation: opt(f.vendor_explanation),
        resolution: opt(f.resolution),
        additional_cost: cost ?? 0,
        outcome_summary: f.outcome_summary.trim(),
      });
      pushToast({
        tone: o.is_retained_to_hindsight ? "success" : "info",
        title: o.is_retained_to_hindsight ? "Experience retained in Hindsight" : "Outcome saved",
        message: o.is_retained_to_hindsight ? undefined : "The backend reported that Hindsight retention did not succeed.",
      });
    } catch (err) {
      setError(describeError(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <form ref={revealRef} className="outcome-form" onSubmit={submit} noValidate aria-labelledby="outcome-title">
      <div className="form-head">
        <div>
          <span className="eyebrow">After delivery</span>
          <h3 id="outcome-title">Record Procurement Outcome</h3>
          <p className="muted">
            What actually happened with <b>{decision.selected_vendor_name}</b> on {request.request_number}? Target was {formatDate(request.target_delivery_date)}.
          </p>
        </div>
      </div>

      <fieldset className="form-grid">
        <legend className="sr-only">Delivery</legend>
        <label className="field">
          <span>Actual delivery date *</span>
          <input type="date" value={f.actual_delivery_date} onChange={set("actual_delivery_date")} required />
          {lateBy != null && (
            <small className={lateBy > 0 ? "hint-risk" : "hint-good"}>
              {lateBy > 0 ? `${lateBy} days after target` : lateBy === 0 ? "On the target date" : `${-lateBy} days before target`}
              {lateBy > 0 && f.delay_days === "" && (
                <button type="button" className="link-btn" onClick={() => setF((p) => ({ ...p, delay_days: String(lateBy) }))}>
                  Use as delay
                </button>
              )}
            </small>
          )}
        </label>
        <label className="field">
          <span>Actual delivery days *</span>
          <input type="number" min={0} step={1} value={f.actual_delivery_days} onChange={set("actual_delivery_days")} placeholder="e.g. 24" inputMode="numeric" required />
        </label>
        <label className="field">
          <span>Delay days</span>
          <input type="number" min={0} step={1} value={f.delay_days} onChange={set("delay_days")} placeholder="0" inputMode="numeric" />
        </label>
        <label className="field">
          <span>Defect rate (%)</span>
          <input type="number" min={0} max={100} step="any" value={f.defect_rate_pct} onChange={set("defect_rate_pct")} placeholder="e.g. 2.5" inputMode="decimal" />
        </label>
        <label className="field">
          <span>Defective units</span>
          <input type="number" min={0} step={1} value={f.defective_units} onChange={set("defective_units")} placeholder="0" inputMode="numeric" />
        </label>
        <label className="field">
          <span>Additional cost</span>
          <input type="number" min={0} step="any" value={f.additional_cost} onChange={set("additional_cost")} placeholder="0" inputMode="decimal" />
        </label>
      </fieldset>

      <fieldset className="form-grid form-grid-2">
        <legend className="sr-only">Context</legend>
        <label className="field">
          <span>Delay reason</span>
          <textarea rows={2} value={f.delay_reason} onChange={set("delay_reason")} placeholder="e.g. Rolling-mill furnace maintenance delayed dispatch" />
        </label>
        <label className="field">
          <span>Vendor explanation</span>
          <textarea rows={2} value={f.vendor_explanation} onChange={set("vendor_explanation")} placeholder="e.g. Vendor cited unplanned heat-treatment downtime" />
        </label>
        <label className="field">
          <span>Resolution</span>
          <textarea rows={2} value={f.resolution} onChange={set("resolution")} placeholder="e.g. Partial expedited shipment; penalty clause applied" />
        </label>
        <label className="field">
          <span>Outcome summary *</span>
          <textarea rows={2} value={f.outcome_summary} onChange={set("outcome_summary")} placeholder="e.g. Delivered complete but late; quality within tolerance" required />
        </label>
      </fieldset>

      {error && (
        <p className="form-error" role="alert">
          <Icon name="alert" size={14} /> <b>{error.title}.</b> {error.message}
        </p>
      )}

      <div className="outcome-submit">
        <button type="submit" className="btn btn-memory btn-lg" disabled={!valid || busy}>
          {busy ? <Spinner size={15} label="Retaining to Hindsight…" /> : (<><Icon name="memory" size={16} /> Record Outcome &amp; Remember</>)}
        </button>
        <p className="muted small">
          VendorPulse will retain this experience in Hindsight so future procurement decisions can use it.
          {!valid && problems.length > 0 && <span className="hint-risk"> Required: {problems.join(", ")}.</span>}
        </p>
      </div>
    </form>
  );
}
