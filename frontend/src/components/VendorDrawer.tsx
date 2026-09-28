import { useEffect, useMemo, useRef, useState } from "react";
import { describeError } from "../api/client";
import { getVendorHistory } from "../api/vendors";
import { useAppState } from "../state/AppState";
import type { PurchaseOrder } from "../types/api";
import { formatAmount, formatDate, formatDays, formatFractionPct, formatInt, formatRisk } from "../utils/format";
import { Icon } from "./Icon";
import { MemoryCard } from "./MemoryCard";
import { EmptyState, ErrorState, SkeletonRows } from "./States";
import { isPositiveFlag } from "./signals";
import { HindsightEffect } from "./VendorComparison";

type HistoryState = { status: "loading" } | { status: "ready"; data: PurchaseOrder[] } | { status: "error"; error: { title: string; message: string } };

function isProblem(po: PurchaseOrder): boolean {
  return (
    /cancel|partial/i.test(po.order_status) ||
    /non-?compliant/i.test(po.compliance) ||
    (po.delay_days ?? 0) > 0 ||
    (po.defect_rate ?? 0) >= 0.05
  );
}

export function VendorDrawer({ vendorId, onClose }: { vendorId: string; onClose: () => void }) {
  const { vendors, activeRequest, evaluations, outcomes, decisions } = useAppState();
  const vendor = vendors.data?.find((v) => v.id === vendorId) ?? null;
  const [history, setHistory] = useState<HistoryState>({ status: "loading" });
  const [reload, setReload] = useState(0);
  const [categoryOnly, setCategoryOnly] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    let alive = true;
    setHistory({ status: "loading" });
    getVendorHistory(vendorId)
      .then((data) => alive && setHistory({ status: "ready", data }))
      .catch((err) => alive && setHistory({ status: "error", error: describeError(err) }));
    return () => {
      alive = false;
    };
  }, [vendorId, reload]);

  useEffect(() => {
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const ev = activeRequest ? evaluations[activeRequest.id] : undefined;
  const evaluation = ev?.status === "done" ? ev.data : null;
  const row = evaluation?.vendor_comparison.find((r) => r.vendor_id === vendorId) ?? null;
  const memories = evaluation?.memory_evidence.filter((m) => m.vendor === (vendor?.name ?? row?.vendor_name)) ?? [];
  const positive = row?.memory_flags.filter(isPositiveFlag) ?? [];
  const negative = row?.memory_flags.filter((f) => !isPositiveFlag(f)) ?? [];

  const category = activeRequest?.material_category ?? null;
  const allHistory = history.status === "ready" ? history.data : [];
  const filtered = useMemo(() => {
    const list = categoryOnly && category ? allHistory.filter((p) => p.material_category === category) : allHistory;
    return [...list].sort((a, b) => (b.order_date ?? "").localeCompare(a.order_date ?? ""));
  }, [allHistory, categoryOnly, category]);

  const recorded = Object.entries(outcomes).filter(([, o]) => o.vendor_id === vendorId);
  const name = vendor?.name ?? row?.vendor_name ?? "Vendor";

  return (
    <div className="drawer-root" role="presentation">
      <button type="button" className="drawer-scrim" aria-label="Close vendor intelligence" onClick={onClose} tabIndex={-1} />
      <aside className="drawer" role="dialog" aria-modal="true" aria-labelledby="drawer-title">
        <header className="drawer-head">
          <div>
            <span className="eyebrow eyebrow-plain">Vendor intelligence</span>
            <h2 id="drawer-title">{name}</h2>
          </div>
          <button ref={closeRef} type="button" className="icon-btn" onClick={onClose} aria-label="Close">
            <Icon name="x" size={16} />
          </button>
        </header>

        <div className="drawer-body">
          <section>
            <h4 className="section-label">Baseline metrics</h4>
            {vendor ? (
              <dl className="kv-grid">
                <div><dt>Total orders</dt><dd>{formatInt(vendor.total_orders)}</dd></div>
                <div><dt>Delivered</dt><dd>{formatInt(vendor.delivered_orders)}</dd></div>
                <div><dt>Cancelled</dt><dd>{formatInt(vendor.cancelled_orders)}</dd></div>
                <div><dt>Partially delivered</dt><dd>{formatInt(vendor.partially_delivered_orders)}</dd></div>
                <div><dt>Avg delivery</dt><dd>{formatDays(vendor.average_delivery_days)}</dd></div>
                <div><dt>Avg defect rate</dt><dd>{formatFractionPct(vendor.average_defect_rate)}</dd></div>
                <div><dt>Compliance failures</dt><dd>{formatFractionPct(vendor.compliance_failure_rate, 1)}</dd></div>
                <div><dt>Avg negotiated savings</dt><dd>{formatAmount(vendor.average_negotiated_savings)}</dd></div>
              </dl>
            ) : (
              <p className="muted small">Vendor record not loaded.</p>
            )}
          </section>

          <section>
            <h4 className="section-label">Risk signals {activeRequest && <span className="muted">· {activeRequest.request_number}</span>}</h4>
            {row ? (
              <>
                <div className="drawer-risk">
                  <div><span>Baseline</span><b className="mono">{formatRisk(row.baseline_risk)}</b></div>
                  <div><span>Hindsight effect</span><HindsightEffect value={row.hindsight_adjustment} /></div>
                  <div><span>Combined</span><b className="mono">{formatRisk(row.combined_risk)}</b></div>
                </div>
                <div className="signal-cols">
                  <div>
                    <p className="signal-title text-good"><Icon name="arrowDown" size={12} /> Positive historical signals</p>
                    {positive.length ? (
                      <ul className="signal-list">{positive.map((f) => <li key={f} className="flag flag-good">{f}</li>)}</ul>
                    ) : (
                      <p className="muted small">None recalled</p>
                    )}
                  </div>
                  <div>
                    <p className="signal-title text-warn"><Icon name="arrowUp" size={12} /> Negative historical signals</p>
                    {negative.length ? (
                      <ul className="signal-list">{negative.map((f) => <li key={f} className="flag flag-risk">{f}</li>)}</ul>
                    ) : (
                      <p className="muted small">None recalled</p>
                    )}
                  </div>
                </div>
              </>
            ) : (
              <p className="muted small">Evaluate the active request to see memory-adjusted risk for this vendor.</p>
            )}
          </section>

          {evaluation && (
            <section>
              <h4 className="section-label">Hindsight memories used in this evaluation · {memories.length}</h4>
              {memories.length ? (
                <div className="memory-grid memory-grid-1">
                  {memories.map((m, i) => <MemoryCard key={i} memory={m} index={i} />)}
                </div>
              ) : (
                <p className="muted small">No memories were recalled for this vendor.</p>
              )}
            </section>
          )}

          {recorded.length > 0 && (
            <section>
              <h4 className="section-label">Outcomes recorded in VendorPulse</h4>
              <ul className="recorded-list">
                {recorded.map(([reqId, o]) => (
                  <li key={o.id}>
                    <Icon name="memory" size={13} />
                    <span>
                      <b>{o.outcome_summary}</b>
                      <small className="muted">
                        {" "}· {formatDate(o.actual_delivery_date)} · delay {o.delay_days} d · defects {formatFractionPct(o.defect_rate)}
                        {decisions[reqId] ? ` · decided by ${decisions[reqId].decider_name}` : ""}
                        {o.is_retained_to_hindsight ? " · retained to Hindsight" : ""}
                      </small>
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          <section>
            <div className="section-row">
              <h4 className="section-label">
                Purchase history {history.status === "ready" && <span className="muted">· {filtered.length} of {allHistory.length}</span>}
              </h4>
              {category && (
                <label className="switch">
                  <input type="checkbox" checked={categoryOnly} onChange={(e) => setCategoryOnly(e.target.checked)} />
                  <span>{category} only</span>
                </label>
              )}
            </div>
            {history.status === "loading" && <SkeletonRows rows={4} cols={5} />}
            {history.status === "error" && <ErrorState {...history.error} compact onRetry={() => setReload((n) => n + 1)} />}
            {history.status === "ready" && filtered.length === 0 && (
              <EmptyState icon="history" title="No purchase orders">
                {categoryOnly && category ? `No ${category} orders on record for this vendor.` : "This vendor has no purchase history."}
              </EmptyState>
            )}
            {history.status === "ready" && filtered.length > 0 && (
              <ul className="po-list">
                {filtered.map((po) => {
                  const open = expanded === po.id;
                  const hasContext = po.delay_reason || po.vendor_explanation || po.resolution || po.outcome;
                  return (
                    <li key={po.id} className={`po ${isProblem(po) ? "po-problem" : ""}`}>
                      <button type="button" className="po-row" onClick={() => setExpanded(open ? null : po.id)} aria-expanded={open} disabled={!hasContext}>
                        <span className="mono po-id">{po.po_id}</span>
                        <span className="po-date">{formatDate(po.order_date)}</span>
                        <span className="po-cat">{po.material_category}</span>
                        <span className={`pill pill-sm ${/cancel/i.test(po.order_status) ? "pill-risk" : /partial/i.test(po.order_status) ? "pill-warn" : "pill-ok"}`}>{po.order_status}</span>
                        <span className="po-metric">{formatDays(po.delivery_days)}</span>
                        <span className="po-metric">{formatFractionPct(po.defect_rate)}</span>
                        <span className={`po-metric ${/non-?compliant/i.test(po.compliance) ? "text-warn" : ""}`}>{po.compliance || "—"}</span>
                        {hasContext && <Icon name={open ? "chevronDown" : "chevronRight"} size={13} />}
                      </button>
                      {open && (
                        <dl className="po-detail">
                          {po.delay_days != null && po.delay_days > 0 && <div><dt>Delay</dt><dd>{po.delay_days} days</dd></div>}
                          {po.delay_reason && <div><dt>Reason</dt><dd>{po.delay_reason}</dd></div>}
                          {po.vendor_explanation && <div><dt>Vendor explanation</dt><dd>{po.vendor_explanation}</dd></div>}
                          {po.resolution && <div><dt>Resolution</dt><dd>{po.resolution}</dd></div>}
                          {po.procurement_decision && <div><dt>Decision</dt><dd>{po.procurement_decision}</dd></div>}
                          {po.outcome && <div><dt>Outcome</dt><dd>{po.outcome}</dd></div>}
                          {po.additional_cost != null && po.additional_cost > 0 && <div><dt>Additional cost</dt><dd>{formatAmount(po.additional_cost)}</dd></div>}
                          {po.is_synthetic_context && <div><dt>Source</dt><dd className="muted">Qualitative context is synthetic demo data ({po.context_source})</dd></div>}
                        </dl>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        </div>
      </aside>
    </div>
  );
}
