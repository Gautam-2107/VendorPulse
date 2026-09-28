import { useState } from "react";
import type { FormEvent } from "react";
import { ApiError, describeError } from "../api/client";
import { useAppState } from "../state/AppState";
import type { Decision, EvaluationResponse, PurchaseRequest } from "../types/api";
import { formatDateTime, formatRisk } from "../utils/format";
import { Icon } from "./Icon";
import { Spinner } from "./States";

type Mode = "none" | "approve" | "override";

export function DecisionPanel({ request, evaluation, decision }: { request: PurchaseRequest; evaluation: EvaluationResponse; decision: Decision | null }) {
  const { decide, pushToast, refreshAll } = useAppState();
  const [mode, setMode] = useState<Mode>("none");
  const [vendorId, setVendorId] = useState("");
  const [reason, setReason] = useState("");
  const [decider, setDecider] = useState("Procurement Manager");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<{ title: string; message: string } | null>(null);

  const candidates = [...evaluation.vendor_comparison].sort((a, b) => a.combined_risk - b.combined_risk);
  const recId = evaluation.recommended_vendor_id;
  const alternatives = candidates.filter((c) => c.vendor_id !== recId);

  if (decision) {
    const agreed = decision.selected_vendor_id === recId;
    return (
      <section className="decision decision-done" aria-labelledby="decision-title">
        <span className="decision-check" aria-hidden="true">
          <Icon name="check" size={16} strokeWidth={2.5} />
        </span>
        <div>
          <span className="eyebrow">Final procurement decision · recorded</span>
          <h3 id="decision-title">{decision.selected_vendor_name}</h3>
          <p className="muted">
            {agreed ? "Approved the VendorPulse recommendation" : "Human override of the recommendation"} · {decision.decider_name} · {formatDateTime(decision.decided_at)}
          </p>
          <p className="decision-reason">“{decision.decision_reason}”</p>
        </div>
      </section>
    );
  }

  const choose = (m: Mode) => {
    setMode(m);
    setError(null);
    if (m === "approve") {
      setVendorId(recId ?? "");
      setReason("");
    } else {
      setVendorId("");
      setReason("");
    }
  };

  const valid = !!vendorId && reason.trim().length >= 5 && decider.trim().length > 0;

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!valid || busy) return;
    setBusy(true);
    setError(null);
    try {
      const d = await decide({
        purchase_request_id: request.id,
        selected_vendor_id: vendorId,
        decision_type: mode === "approve" ? "approved" : "override",
        decision_reason: reason.trim(),
        decider_name: decider.trim(),
      });
      pushToast({ tone: "success", title: "Decision recorded", message: `${d.selected_vendor_name} selected by ${d.decider_name}.` });
    } catch (err) {
      const desc = describeError(err);
      setError(desc);
      if (err instanceof ApiError && err.status === 400) void refreshAll();
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="decision" aria-labelledby="decision-title">
      <div className="decision-head">
        <div>
          <span className="eyebrow">Human decision</span>
          <h3 id="decision-title">Final procurement decision</h3>
          <p className="muted">VendorPulse does not place orders. A procurement manager must explicitly choose the vendor.</p>
        </div>
      </div>

      <div className="decision-choices" role="radiogroup" aria-label="Decision type">
        <button
          type="button"
          role="radio"
          aria-checked={mode === "approve"}
          className={`choice ${mode === "approve" ? "on" : ""}`}
          onClick={() => choose("approve")}
          disabled={!recId}
        >
          <Icon name="checkCircle" size={18} />
          <span>
            <b>Approve recommended vendor</b>
            <small>{evaluation.recommended_vendor}</small>
          </span>
        </button>
        <button type="button" role="radio" aria-checked={mode === "override"} className={`choice ${mode === "override" ? "on" : ""}`} onClick={() => choose("override")}>
          <Icon name="user" size={18} />
          <span>
            <b>Select another vendor</b>
            <small>Override with your own choice</small>
          </span>
        </button>
      </div>

      {mode !== "none" && (
        <form className="decision-form" onSubmit={submit} noValidate>
          {mode === "override" && (
            <label className="field">
              <span>Vendor *</span>
              <select value={vendorId} onChange={(e) => setVendorId(e.target.value)} required>
                <option value="">Choose a vendor…</option>
                {alternatives.map((c) => (
                  <option key={c.vendor_id} value={c.vendor_id}>
                    {c.vendor_name} — combined risk {formatRisk(c.combined_risk)}
                  </option>
                ))}
              </select>
            </label>
          )}
          <label className="field field-wide">
            <span>Decision justification * <small className="muted">(min. 5 characters)</small></span>
            <textarea
              rows={2}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder={mode === "approve" ? "e.g. Lowest memory-adjusted risk; strong history on structural steel orders." : "e.g. Existing framework contract; accept higher recalled risk with weekly QA checks."}
              required
            />
          </label>
          <label className="field">
            <span>Decided by *</span>
            <input value={decider} onChange={(e) => setDecider(e.target.value)} required />
          </label>
          {error && (
            <p className="form-error" role="alert">
              <Icon name="alert" size={14} /> <b>{error.title}.</b> {error.message}
            </p>
          )}
          <div className="form-actions">
            <button type="button" className="btn btn-ghost" onClick={() => choose("none")} disabled={busy}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={!valid || busy}>
              {busy ? <Spinner size={14} label="Recording…" /> : (<><Icon name="check" size={15} /> Confirm decision</>)}
            </button>
          </div>
        </form>
      )}
    </section>
  );
}
