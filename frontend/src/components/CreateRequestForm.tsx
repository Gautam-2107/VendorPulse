import { useState } from "react";
import type { FormEvent } from "react";
import { describeError } from "../api/client";
import { useAppState } from "../state/AppState";
import type { Priority } from "../types/api";
import { Icon } from "./Icon";
import { Spinner } from "./States";
import { buildNotes } from "./requestNotes";

/** The hackathon demo scenario, used only as editable starting values for a new request. */
const DEMO = {
  requester: "Apex Manufacturing",
  material_name: "Structural Steel",
  material_category: "Structural Steel",
  quantity: "10000",
  unit: "kg",
  window: "3 weeks",
  target_delivery_date: "2026-10-19",
  budget: "1000000",
  priority: "high" as Priority,
};

const CATEGORY_SUGGESTIONS = [
  "Structural Steel",
  "Raw Metals",
  "Electronics",
  "Fasteners",
  "Logistics Equipment",
  "Machinery Parts",
  "Packaging",
  "Chemicals",
  "Plastics",
];

export function CreateRequestForm({ onCreated, onCancel }: { onCreated?: () => void; onCancel?: () => void }) {
  const { createRequest, pushToast } = useAppState();
  const [f, setF] = useState({ ...DEMO });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<{ title: string; message: string } | null>(null);

  const set = (k: keyof typeof DEMO) => (e: { target: { value: string } }) => setF((p) => ({ ...p, [k]: e.target.value }));

  const qty = Number(f.quantity);
  const budget = Number(f.budget);
  const invalid =
    !f.material_name.trim() ||
    !f.material_category.trim() ||
    !Number.isInteger(qty) ||
    qty <= 0 ||
    !(budget > 0) ||
    !/^\d{4}-\d{2}-\d{2}$/.test(f.target_delivery_date);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (invalid || busy) return;
    setBusy(true);
    setError(null);
    try {
      const pr = await createRequest({
        material_name: f.material_name.trim(),
        material_category: f.material_category.trim(),
        quantity: qty,
        target_delivery_date: f.target_delivery_date,
        budget,
        priority: f.priority,
        notes: buildNotes({ requester: f.requester, unit: f.unit, window: f.window }),
      });
      pushToast({ tone: "success", title: "Purchase request created", message: `${pr.request_number} is ready for evaluation.` });
      onCreated?.();
    } catch (err) {
      setError(describeError(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="form-card" onSubmit={submit} aria-labelledby="create-req-title" noValidate>
      <div className="form-head">
        <div>
          <span className="eyebrow">Step 1 · Procurement request</span>
          <h2 id="create-req-title">Create a purchase request</h2>
          <p className="muted">Pre-filled with the Apex Manufacturing demo scenario. Every value is editable and is stored by the backend.</p>
        </div>
      </div>
      <div className="form-grid">
        <label className="field">
          <span>Requesting organisation</span>
          <input value={f.requester} onChange={set("requester")} placeholder="e.g. Apex Manufacturing" />
        </label>
        <label className="field">
          <span>Material *</span>
          <input value={f.material_name} onChange={set("material_name")} required />
        </label>
        <label className="field">
          <span>Material category *</span>
          <input value={f.material_category} onChange={set("material_category")} list="category-options" required />
          <datalist id="category-options">
            {CATEGORY_SUGGESTIONS.map((c) => (
              <option key={c} value={c} />
            ))}
          </datalist>
        </label>
        <div className="field-pair">
          <label className="field">
            <span>Quantity *</span>
            <input type="number" min={1} step={1} value={f.quantity} onChange={set("quantity")} required inputMode="numeric" />
          </label>
          <label className="field field-narrow">
            <span>Unit</span>
            <input value={f.unit} onChange={set("unit")} placeholder="kg" />
          </label>
        </div>
        <label className="field">
          <span>Target delivery date *</span>
          <input type="date" value={f.target_delivery_date} onChange={set("target_delivery_date")} required />
        </label>
        <label className="field">
          <span>Procurement window</span>
          <input value={f.window} onChange={set("window")} placeholder="e.g. 3 weeks" />
        </label>
        <label className="field">
          <span>Budget (₹) *</span>
          <input type="number" min={1} step="any" value={f.budget} onChange={set("budget")} required inputMode="decimal" />
        </label>
        <label className="field">
          <span>Priority</span>
          <select value={f.priority} onChange={set("priority")}>
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
          </select>
        </label>
      </div>
      {error && (
        <p className="form-error" role="alert">
          <Icon name="alert" size={14} /> <b>{error.title}.</b> {error.message}
        </p>
      )}
      <div className="form-actions">
        {onCancel && (
          <button type="button" className="btn btn-ghost" onClick={onCancel} disabled={busy}>
            Cancel
          </button>
        )}
        <button type="submit" className="btn btn-primary" disabled={invalid || busy}>
          {busy ? <Spinner size={14} label="Creating…" /> : (<><Icon name="plus" size={15} /> Create purchase request</>)}
        </button>
      </div>
    </form>
  );
}
