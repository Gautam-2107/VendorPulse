import { Icon } from "../components/Icon";
import type { PageKey } from "../components/Sidebar";
import { EmptyState, ErrorState, SkeletonRows } from "../components/States";
import { useAppState } from "../state/AppState";
import { formatDate, formatDateTime, formatFractionPct } from "../utils/format";
import { DISPLAY_LABEL } from "../utils/requestStatus";

export function Decisions({ onNavigate }: { onNavigate: (p: PageKey) => void }) {
  const { requests, decisions, outcomes, refreshAll, setActiveRequest } = useAppState();
  const decided = (requests.data ?? []).filter((r) => r.status === "decided" || r.status === "completed");

  return (
    <div className="page">
      <div className="info-strip" role="note">
        <span className="info-strip-icon" aria-hidden="true">
          <Icon name="info" size={15} />
        </span>
        <p>
          Requests come from <code>GET /purchase-requests</code>. Decision and outcome details are re-fetched by ID (<code>GET /decisions/&#123;id&#125;</code>,{" "}
          <code>GET /outcomes/&#123;id&#125;</code>) for decisions made in this browser — the API has no list endpoint for them.
        </p>
      </div>

      {requests.status === "error" && !requests.data ? (
        <ErrorState {...requests.error} onRetry={() => void refreshAll()} />
      ) : !requests.data ? (
        <section className="card">
          <SkeletonRows rows={4} cols={5} />
        </section>
      ) : decided.length === 0 ? (
        <section className="card">
          <EmptyState icon="decisions" title="No procurement decisions recorded yet">
            Evaluate a request and approve a vendor on the dashboard.
          </EmptyState>
        </section>
      ) : (
        <ol className="timeline">
          {decided.map((r) => {
            const d = decisions[r.id];
            const o = outcomes[r.id];
            const shown = r.status === "completed" || o ? "completed" : "decided";
            return (
              <li key={r.id} className="timeline-item decision-card">
                <div className="decision-card-top">
                  <span className={`icon-tile ${o ? "icon-tile-green" : "icon-tile-purple"}`} aria-hidden="true">
                    <Icon name={o ? "memory" : "check"} size={18} />
                  </span>
                  <div className="decision-card-title">
                    <span className="id-pill mono">{r.request_number}</span>
                    <h3>{r.material_name}</h3>
                  </div>
                  <span className={`pill pill-status-${shown}`}>{DISPLAY_LABEL[shown]}</span>
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm decision-open"
                    onClick={() => {
                      setActiveRequest(r.id);
                      onNavigate("dashboard");
                    }}
                  >
                    Open <Icon name="arrowRight" size={14} />
                  </button>
                </div>

                {d ? (
                  <div className="decision-card-body">
                    <p className="decision-who">
                      <b className="decision-vendor">{d.selected_vendor_name}</b>
                      <span className="decision-meta">
                        <span>{d.decision_type === "approved" ? "approved recommendation" : d.decision_type}</span>
                        <span>
                          by <b>{d.decider_name}</b>
                        </span>
                        <span>
                          <Icon name="clock" size={13} /> {formatDateTime(d.decided_at)}
                        </span>
                      </span>
                    </p>
                    <blockquote className="decision-quote">“{d.decision_reason}”</blockquote>
                  </div>
                ) : (
                  <p className="muted decision-card-body">Decision details not available in this browser.</p>
                )}

                {o && (
                  <div className={`timeline-outcome ${o.is_retained_to_hindsight ? "is-retained" : "is-warn"}`}>
                    <span className="eyebrow eyebrow-green">
                      <Icon name="history" size={13} /> Outcome
                    </span>
                    <p className="timeline-outcome-summary">{o.outcome_summary}</p>
                    <ul className="meta-row" aria-label="Outcome details">
                      <li className="meta-chip">delivered {formatDate(o.actual_delivery_date)}</li>
                      <li className="meta-chip">delay {o.delay_days} d</li>
                      <li className="meta-chip">defects {formatFractionPct(o.defect_rate)}</li>
                      <li className={`badge ${o.is_retained_to_hindsight ? "badge-green" : "badge-amber"}`}>
                        <Icon name={o.is_retained_to_hindsight ? "check" : "alert"} size={13} strokeWidth={2.25} />
                        {o.is_retained_to_hindsight ? "retained to Hindsight" : "not retained"}
                      </li>
                    </ul>
                  </div>
                )}
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}
