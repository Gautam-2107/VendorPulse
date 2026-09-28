import { Icon } from "../components/Icon";
import type { PageKey } from "../components/Sidebar";
import { EmptyState, ErrorState, SkeletonRows } from "../components/States";
import { useAppState } from "../state/AppState";
import { formatDate, formatDateTime, formatFractionPct, statusLabel } from "../utils/format";

export function Decisions({ onNavigate }: { onNavigate: (p: PageKey) => void }) {
  const { requests, decisions, outcomes, refreshAll, setActiveRequest } = useAppState();
  const decided = (requests.data ?? []).filter((r) => r.status === "decided" || r.status === "completed");

  return (
    <div className="page">
      <p className="page-note">
        <Icon name="info" size={14} /> Requests come from <code>GET /purchase-requests</code>. Decision and outcome details are re-fetched by ID
        (<code>GET /decisions/&#123;id&#125;</code>, <code>GET /outcomes/&#123;id&#125;</code>) for decisions made in this browser — the API has no list endpoint for them.
      </p>
      <section className="panel">
        {requests.status === "error" && !requests.data ? (
          <ErrorState {...requests.error} onRetry={() => void refreshAll()} />
        ) : !requests.data ? (
          <SkeletonRows rows={4} cols={5} />
        ) : decided.length === 0 ? (
          <EmptyState icon="decisions" title="No procurement decisions recorded yet">
            Evaluate a request and approve a vendor on the dashboard.
          </EmptyState>
        ) : (
          <ol className="timeline">
            {decided.map((r) => {
              const d = decisions[r.id];
              const o = outcomes[r.id];
              return (
                <li key={r.id} className="timeline-item">
                  <span className={`timeline-dot ${o ? "done" : ""}`} aria-hidden="true">
                    <Icon name={o ? "memory" : "check"} size={13} />
                  </span>
                  <div className="timeline-body">
                    <div className="timeline-head">
                      <span className="mono">{r.request_number}</span>
                      <b>{r.material_name}</b>
                      <span className={`pill pill-sm pill-status-${r.status}`}>{statusLabel(r.status)}</span>
                      <button
                        type="button"
                        className="link-btn"
                        onClick={() => {
                          setActiveRequest(r.id);
                          onNavigate("dashboard");
                        }}
                      >
                        Open <Icon name="chevronRight" size={12} />
                      </button>
                    </div>
                    {d ? (
                      <p>
                        <b>{d.selected_vendor_name}</b> · {d.decision_type === "approved" ? "approved recommendation" : d.decision_type} by {d.decider_name} ·{" "}
                        <span className="muted">{formatDateTime(d.decided_at)}</span>
                        <br />
                        <span className="muted">“{d.decision_reason}”</span>
                      </p>
                    ) : (
                      <p className="muted small">Decision details not available in this browser.</p>
                    )}
                    {o && (
                      <p className="timeline-outcome">
                        <Icon name="history" size={12} /> {o.outcome_summary} · delivered {formatDate(o.actual_delivery_date)} · delay {o.delay_days} d · defects{" "}
                        {formatFractionPct(o.defect_rate)} ·{" "}
                        <span className={o.is_retained_to_hindsight ? "text-good" : "text-warn"}>{o.is_retained_to_hindsight ? "retained to Hindsight" : "not retained"}</span>
                      </p>
                    )}
                  </div>
                </li>
              );
            })}
          </ol>
        )}
      </section>
    </div>
  );
}
