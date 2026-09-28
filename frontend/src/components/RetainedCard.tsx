import type { Decision, Outcome } from "../types/api";
import { formatAmount, formatDate, formatDateTime, formatFractionPct } from "../utils/format";
import { Icon } from "./Icon";
import { useRevealOnMount } from "../utils/useRevealOnMount";

export function RetainedCard({
  outcome,
  decision,
  onViewMemory,
  onReload,
  onNewRequest,
  reloadedAt,
  reloading,
  requestStatus,
}: {
  outcome: Outcome;
  decision: Decision | null;
  onViewMemory: () => void;
  onReload: () => void;
  onNewRequest: () => void;
  reloadedAt: number | null;
  reloading: boolean;
  requestStatus: string | null;
}) {
  const retained = outcome.is_retained_to_hindsight;
  const revealRef = useRevealOnMount<HTMLElement>();
  return (
    <section ref={revealRef} className={`retained ${retained ? "" : "retained-warn"}`} aria-labelledby="retained-title" aria-live="polite">
      <div className="retained-head">
        <span className="retained-icon" aria-hidden="true">
          <Icon name={retained ? "memory" : "alert"} size={22} />
        </span>
        <div>
          <span className="eyebrow">{retained ? "Learning loop complete" : "Outcome saved"}</span>
          <h3 id="retained-title">{retained ? "Experience retained" : "Outcome recorded — memory not retained"}</h3>
          <p>
            {retained
              ? "VendorPulse has added this procurement outcome to organizational memory."
              : "The outcome is stored in the database, but the backend reported that Hindsight retention did not succeed."}
          </p>
        </div>
      </div>

      <dl className="retained-grid">
        <div>
          <dt>Vendor</dt>
          <dd>{decision?.selected_vendor_name ?? "—"}</dd>
        </div>
        <div>
          <dt>Outcome</dt>
          <dd>{outcome.outcome_summary}</dd>
        </div>
        <div>
          <dt>Delivered</dt>
          <dd>
            {formatDate(outcome.actual_delivery_date)} · {outcome.actual_delivery_days} days{outcome.delay_days > 0 ? ` · ${outcome.delay_days} days late` : ""}
          </dd>
        </div>
        <div>
          <dt>Quality</dt>
          <dd>
            {formatFractionPct(outcome.defect_rate)} defect rate · {outcome.defective_units} defective units
          </dd>
        </div>
        {outcome.additional_cost > 0 && (
          <div>
            <dt>Additional cost</dt>
            <dd>{formatAmount(outcome.additional_cost)}</dd>
          </div>
        )}
        <div>
          <dt>Retention status</dt>
          <dd className={retained ? "text-good" : "text-warn"}>
            <code>is_retained_to_hindsight: {String(retained)}</code>
          </dd>
        </div>
        <div>
          <dt>Outcome ID</dt>
          <dd className="mono small">{outcome.id}</dd>
        </div>
        <div>
          <dt>Recorded</dt>
          <dd>{formatDateTime(outcome.created_at)}</dd>
        </div>
      </dl>

      <div className="retained-actions">
        <button type="button" className="btn btn-primary" onClick={onViewMemory}>
          <Icon name="memory" size={15} /> View Memory
        </button>
        <button type="button" className="btn btn-ghost" onClick={onReload} disabled={reloading}>
          <Icon name="refresh" size={15} className={reloading ? "spin" : ""} /> Reload Demo
        </button>
        <button type="button" className="btn btn-ghost" onClick={onNewRequest}>
          <Icon name="plus" size={15} /> New request — see memory recalled
        </button>
      </div>
      {reloadedAt && (
        <p className="persist-note">
          <Icon name="database" size={13} /> Reloaded from the backend at {new Date(reloadedAt).toLocaleTimeString()} — outcome re-fetched via{" "}
          <code>GET /outcomes/{outcome.id.slice(0, 8)}…</code>{requestStatus && (<>; request status from the API: <b>{requestStatus}</b></>)}.
        </p>
      )}
    </section>
  );
}
