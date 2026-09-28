import { useMemo, useState } from "react";
import { Icon } from "../components/Icon";
import { EmptyState, ErrorState, SkeletonRows } from "../components/States";
import { HindsightEffect } from "../components/VendorComparison";
import { useAppState } from "../state/AppState";
import { formatDays, formatFractionPct, formatInt, formatRisk } from "../utils/format";

export function Vendors({ onOpenVendor }: { onOpenVendor: (id: string) => void }) {
  const { vendors, refreshAll, activeRequest, evaluations } = useAppState();
  const [q, setQ] = useState("");
  const ev = activeRequest ? evaluations[activeRequest.id] : undefined;
  const evaluation = ev?.status === "done" ? ev.data : null;
  const byId = useMemo(() => new Map(evaluation?.vendor_comparison.map((r) => [r.vendor_id, r]) ?? []), [evaluation]);

  const list = (vendors.data ?? []).filter((v) => v.name.toLowerCase().includes(q.trim().toLowerCase()));

  return (
    <div className="page">
      <div className="page-toolbar">
        <label className="search">
          <Icon name="search" size={14} />
          <span className="sr-only">Search vendors</span>
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search vendors" />
        </label>
        <p className="muted small">
          {evaluation && activeRequest
            ? `Memory-adjusted columns reflect the latest evaluation of ${activeRequest.request_number}.`
            : "Evaluate a request on the dashboard to add memory-adjusted risk columns."}
        </p>
      </div>

      <section className="panel">
        {vendors.status === "error" && !vendors.data ? (
          <ErrorState {...vendors.error} onRetry={() => void refreshAll()} />
        ) : !vendors.data ? (
          <SkeletonRows rows={8} cols={7} />
        ) : vendors.data.length === 0 ? (
          <EmptyState icon="vendors" title="No vendors in the database">Seed the database from Settings.</EmptyState>
        ) : list.length === 0 ? (
          <EmptyState icon="search" title="No vendors match your search" />
        ) : (
          <div className="table-wrap">
            <table className="table">
              <caption className="sr-only">Vendor intelligence</caption>
              <thead>
                <tr>
                  <th scope="col">Vendor</th>
                  <th scope="col" className="num">Orders</th>
                  <th scope="col" className="num">Cancelled</th>
                  <th scope="col" className="num">Avg delivery</th>
                  <th scope="col" className="num">Avg defect rate</th>
                  <th scope="col" className="num">Compliance failures</th>
                  {evaluation && <th scope="col" className="num">Baseline</th>}
                  {evaluation && <th scope="col" className="num">Hindsight</th>}
                  {evaluation && <th scope="col" className="num">Combined</th>}
                </tr>
              </thead>
              <tbody>
                {list.map((v) => {
                  const r = byId.get(v.id);
                  return (
                    <tr key={v.id}>
                      <th scope="row">
                        <button type="button" className="link-btn" onClick={() => onOpenVendor(v.id)}>
                          {v.name}
                        </button>
                      </th>
                      <td className="num">{formatInt(v.total_orders)}</td>
                      <td className="num">{formatInt(v.cancelled_orders)}</td>
                      <td className="num">{formatDays(v.average_delivery_days)}</td>
                      <td className="num">{formatFractionPct(v.average_defect_rate)}</td>
                      <td className="num">{formatFractionPct(v.compliance_failure_rate, 1)}</td>
                      {evaluation && <td className="num mono">{r ? formatRisk(r.baseline_risk) : "—"}</td>}
                      {evaluation && <td className="num">{r ? <HindsightEffect value={r.hindsight_adjustment} /> : "—"}</td>}
                      {evaluation && <td className="num mono">{r ? formatRisk(r.combined_risk) : "—"}</td>}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
