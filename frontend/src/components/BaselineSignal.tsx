import { useMemo, useState } from "react";
import { useAppState } from "../state/AppState";
import { formatDays, formatFractionPct, formatInt } from "../utils/format";
import { Icon } from "./Icon";
import { EmptyState, ErrorState, SkeletonRows } from "./States";

type SortKey = "name" | "average_delivery_days" | "average_defect_rate" | "compliance_failure_rate" | "total_orders";

export function BaselineSignal({ onOpenVendor, dimmed }: { onOpenVendor: (id: string) => void; dimmed?: boolean }) {
  const { vendors, refreshAll } = useAppState();
  const [sort, setSort] = useState<{ key: SortKey; dir: 1 | -1 }>({ key: "name", dir: 1 });

  const rows = useMemo(() => {
    const list = [...(vendors.data ?? [])];
    list.sort((a, b) => {
      const av = a[sort.key];
      const bv = b[sort.key];
      if (av == null && bv == null) return 0;
      if (av == null) return 1;
      if (bv == null) return -1;
      return (typeof av === "string" ? av.localeCompare(bv as string) : (av as number) - (bv as number)) * sort.dir;
    });
    return list;
  }, [vendors.data, sort]);

  const th = (key: SortKey, label: string, numeric = true) => (
    <th scope="col" className={numeric ? "num" : ""} aria-sort={sort.key === key ? (sort.dir === 1 ? "ascending" : "descending") : "none"}>
      <button type="button" className="th-btn" onClick={() => setSort((s) => ({ key, dir: s.key === key ? ((-s.dir) as 1 | -1) : 1 }))}>
        {label}
        {sort.key === key && <Icon name={sort.dir === 1 ? "arrowUp" : "arrowDown"} size={11} />}
      </button>
    </th>
  );

  return (
    <section className={`panel ${dimmed ? "panel-dimmed" : ""}`} aria-labelledby="baseline-title">
      <div className="panel-head">
        <div>
          <span className="eyebrow eyebrow-plain">Current procurement signal</span>
          <h3 id="baseline-title">Vendor KPIs — before memory</h3>
          <p className="muted">Aggregate supplier metrics from the vendor database — what traditional procurement sees. No Hindsight memory applied yet.</p>
        </div>
        <span className="tag tag-neutral">
          <Icon name="database" size={12} /> Structured data only
        </span>
      </div>

      {vendors.status === "error" && !vendors.data ? (
        <ErrorState {...vendors.error} onRetry={() => void refreshAll()} />
      ) : !vendors.data ? (
        <SkeletonRows rows={6} cols={5} />
      ) : rows.length === 0 ? (
        <EmptyState icon="vendors" title="No vendors in the database">
          Seed the processed datasets from <b>Settings → Seed database</b>, then reload.
        </EmptyState>
      ) : (
        <div className="table-wrap table-scroll">
          <table className="table">
            <caption className="sr-only">Current vendor KPIs without memory</caption>
            <thead>
              <tr>
                {th("name", "Vendor", false)}
                {th("total_orders", "Orders")}
                {th("average_delivery_days", "Avg delivery")}
                {th("average_defect_rate", "Avg defect rate")}
                {th("compliance_failure_rate", "Compliance failures")}
              </tr>
            </thead>
            <tbody>
              {rows.map((v) => (
                <tr key={v.id}>
                  <th scope="row">
                    <button type="button" className="link-btn" onClick={() => onOpenVendor(v.id)}>
                      {v.name}
                    </button>
                  </th>
                  <td className="num">{formatInt(v.total_orders)}</td>
                  <td className="num">{formatDays(v.average_delivery_days)}</td>
                  <td className="num">{formatFractionPct(v.average_defect_rate)}</td>
                  <td className="num">{formatFractionPct(v.compliance_failure_rate, 1)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
