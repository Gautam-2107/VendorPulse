import { useState } from "react";
import { CreateRequestForm } from "../components/CreateRequestForm";
import { Icon } from "../components/Icon";
import type { PageKey } from "../components/Sidebar";
import { EmptyState, ErrorState, SkeletonRows } from "../components/States";
import { useAppState } from "../state/AppState";
import { formatDate, formatDateTime, formatINR, formatInt, statusLabel } from "../utils/format";

const FILTERS = ["all", "pending", "evaluated", "decided", "completed"] as const;

export function Requests({ onNavigate }: { onNavigate: (p: PageKey) => void }) {
  const { requests, refreshAll, setActiveRequest, activeRequestId } = useAppState();
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>("all");
  const [creating, setCreating] = useState(false);
  const list = requests.data ?? [];
  const shown = filter === "all" ? list : list.filter((r) => r.status === filter);

  return (
    <div className="page">
      <div className="page-toolbar">
        <div className="filter-row" role="group" aria-label="Filter by status">
          {FILTERS.map((f) => (
            <button key={f} type="button" className={`filter-chip ${filter === f ? "on" : ""}`} aria-pressed={filter === f} onClick={() => setFilter(f)}>
              {f === "all" ? "All" : statusLabel(f)} <span>{f === "all" ? list.length : list.filter((r) => r.status === f).length}</span>
            </button>
          ))}
        </div>
        <button type="button" className="btn btn-primary" onClick={() => setCreating((c) => !c)} aria-expanded={creating}>
          <Icon name={creating ? "x" : "plus"} size={15} /> {creating ? "Close" : "New request"}
        </button>
      </div>

      {creating && (
        <CreateRequestForm
          onCreated={() => {
            setCreating(false);
            onNavigate("dashboard");
          }}
          onCancel={() => setCreating(false)}
        />
      )}

      <section className="panel">
        {requests.status === "error" && !requests.data ? (
          <ErrorState {...requests.error} onRetry={() => void refreshAll()} />
        ) : !requests.data ? (
          <SkeletonRows rows={5} cols={6} />
        ) : shown.length === 0 ? (
          <EmptyState icon="requests" title={list.length ? "No requests with this status" : "No purchase requests yet"}>
            {!list.length && "Create the first request to start the procurement memory loop."}
          </EmptyState>
        ) : (
          <div className="table-wrap">
            <table className="table">
              <caption className="sr-only">Purchase requests</caption>
              <thead>
                <tr>
                  <th scope="col">Request</th>
                  <th scope="col">Material</th>
                  <th scope="col" className="num">Quantity</th>
                  <th scope="col">Target</th>
                  <th scope="col" className="num">Budget</th>
                  <th scope="col">Priority</th>
                  <th scope="col">Status</th>
                  <th scope="col">Created</th>
                  <th scope="col" className="num">Action</th>
                </tr>
              </thead>
              <tbody>
                {shown.map((r) => (
                  <tr key={r.id} className={r.id === activeRequestId ? "row-active" : ""}>
                    <th scope="row" className="mono">{r.request_number}</th>
                    <td>
                      {r.material_name}
                      <div className="muted small">{r.material_category}</div>
                    </td>
                    <td className="num">{formatInt(r.quantity)}</td>
                    <td>{formatDate(r.target_delivery_date)}</td>
                    <td className="num">{formatINR(r.budget)}</td>
                    <td><span className={`pill pill-sm pill-priority-${r.priority.toLowerCase()}`}>{r.priority}</span></td>
                    <td><span className={`pill pill-sm pill-status-${r.status}`}>{statusLabel(r.status)}</span></td>
                    <td className="small muted">{formatDateTime(r.created_at)}</td>
                    <td className="num">
                      <button
                        type="button"
                        className="btn btn-ghost btn-sm"
                        onClick={() => {
                          setActiveRequest(r.id);
                          onNavigate("dashboard");
                        }}
                      >
                        Open <Icon name="chevronRight" size={13} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
