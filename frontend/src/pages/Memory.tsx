import { useEffect, useMemo, useState } from "react";
import { describeError } from "../api/client";
import { getVendorHistory } from "../api/vendors";
import { Icon } from "../components/Icon";
import { MemoryCard } from "../components/MemoryCard";
import { SectionHead } from "../components/SectionHead";
import { EmptyState, ErrorState, SkeletonRows } from "../components/States";
import { useAppState } from "../state/AppState";
import type { PurchaseOrder } from "../types/api";
import { formatDate, formatFractionPct } from "../utils/format";

type HistState = { status: "idle" | "loading" } | { status: "ready"; data: Record<string, PurchaseOrder[]>; failed: number } | { status: "error"; error: { title: string; message: string } };

const hasContext = (p: PurchaseOrder) => !!(p.delay_reason || p.vendor_explanation || p.resolution || p.outcome);

export function Memory({ onOpenVendor }: { onOpenVendor: (id: string) => void }) {
  const { vendors, outcomes, decisions, activeRequest, evaluations } = useAppState();
  const [hist, setHist] = useState<HistState>({ status: "idle" });
  const [category, setCategory] = useState<string>(activeRequest?.material_category ?? "all");
  const [open, setOpen] = useState<string | null>(null);
  const [nonce, setNonce] = useState(0);

  const vendorList = vendors.data;
  useEffect(() => {
    if (!vendorList) return;
    let alive = true;
    setHist({ status: "loading" });
    (async () => {
      const out: Record<string, PurchaseOrder[]> = {};
      let failed = 0;
      // Small concurrency window to stay gentle on the backend.
      const queue = [...vendorList];
      const worker = async () => {
        while (queue.length) {
          const v = queue.shift()!;
          try {
            out[v.id] = await getVendorHistory(v.id);
          } catch {
            failed++;
          }
        }
      };
      try {
        await Promise.all([worker(), worker(), worker(), worker()]);
        if (!alive) return;
        if (failed === vendorList.length && vendorList.length > 0) throw new Error("all failed");
        setHist({ status: "ready", data: out, failed });
      } catch (err) {
        if (alive) setHist({ status: "error", error: describeError(err) });
      }
    })();
    return () => {
      alive = false;
    };
  }, [vendorList, nonce]);

  const categories = useMemo(() => {
    if (hist.status !== "ready") return [];
    const s = new Set<string>();
    Object.values(hist.data).forEach((l) => l.forEach((p) => s.add(p.material_category)));
    return [...s].sort();
  }, [hist]);

  const grouped = useMemo(() => {
    if (hist.status !== "ready" || !vendorList) return [];
    return vendorList
      .map((v) => {
        const all = (hist.data[v.id] ?? []).filter((p) => category === "all" || p.material_category === category);
        const experiences = all.filter(hasContext).sort((a, b) => (b.order_date ?? "").localeCompare(a.order_date ?? ""));
        return { vendor: v, total: all.length, experiences };
      })
      .filter((g) => g.total > 0)
      .sort((a, b) => b.experiences.length - a.experiences.length || a.vendor.name.localeCompare(b.vendor.name));
  }, [hist, vendorList, category]);

  const recorded = Object.entries(outcomes);
  const ev = activeRequest ? evaluations[activeRequest.id] : undefined;
  const lastRecall = ev?.status === "done" ? ev.data.memory_evidence : null;
  const vendorName = (id: string) => vendorList?.find((v) => v.id === id)?.name ?? "Unknown vendor";

  const withHistory = hist.status === "ready" ? Object.values(hist.data).filter((l) => l.length > 0).length : null;

  return (
    <div className="page">
      <section className="org-memory" aria-labelledby="org-memory-title">
        <div className="org-memory-main">
          <span className="icon-tile icon-tile-purple icon-tile-lg" aria-hidden="true">
            <Icon name="memory" size={22} />
          </span>
          <div className="org-memory-text">
            <span className="eyebrow eyebrow-purple">Organizational memory</span>
            <h2 id="org-memory-title">What happened the last time we worked with this vendor?</h2>
            <p className="lead">
              Memory is retrieved contextually during vendor evaluation. Hindsight is queried per vendor with the material of the request being evaluated.
            </p>
            <p className="org-memory-note">
              <Icon name="info" size={14} />
              <span>
                The backend does not expose an endpoint that lists every Hindsight memory, so this page shows the experiences that <i>are</i> available through
                the API: outcomes recorded here, the most recent contextual recall, and the historical procurement records per vendor.
              </span>
            </p>
          </div>
        </div>
        <dl className="org-memory-stats">
          <div>
            <dt>Outcomes recorded here</dt>
            <dd>{recorded.length}</dd>
          </div>
          <div>
            <dt>Memories in latest recall</dt>
            <dd>{lastRecall ? lastRecall.length : "—"}</dd>
          </div>
          <div>
            <dt>Vendors with history</dt>
            <dd>{withHistory ?? "—"}</dd>
          </div>
        </dl>
      </section>

      <section className="card" aria-labelledby="newest-title">
        <SectionHead
          icon="history"
          tone="green"
          eyebrow="Newest memories"
          title="Outcomes recorded in VendorPulse"
          titleId="newest-title"
          description={
            <>
              Each outcome was sent to Hindsight when recorded (<code>POST /outcomes</code>). Future evaluations can recall it.
            </>
          }
        />
        {recorded.length === 0 ? (
          <EmptyState icon="history" title="No outcomes recorded from this browser yet">
            Complete the loop on the dashboard: evaluate → decide → record outcome.
          </EmptyState>
        ) : (
          <ul className="recorded-list">
            {recorded.map(([reqId, o]) => (
              <li key={o.id} className={`outcome-item ${o.is_retained_to_hindsight ? "is-retained" : "is-warn"}`}>
                <span className="outcome-check" aria-hidden="true">
                  <Icon name={o.is_retained_to_hindsight ? "check" : "alert"} size={15} strokeWidth={2.25} />
                </span>
                <div className="outcome-body">
                  <p className="outcome-title">
                    <button type="button" className="link-btn outcome-vendor" onClick={() => onOpenVendor(o.vendor_id)}>
                      {decisions[reqId]?.selected_vendor_name ?? vendorName(o.vendor_id)}
                    </button>
                    <span className="outcome-dash" aria-hidden="true">
                      —
                    </span>
                    <span>{o.outcome_summary}</span>
                  </p>
                  <ul className="meta-row" aria-label="Outcome details">
                    <li className="meta-chip">
                      <Icon name="clock" size={12} /> Delivered {formatDate(o.actual_delivery_date)}
                    </li>
                    <li className="meta-chip">{o.actual_delivery_days} days</li>
                    <li className="meta-chip">delay {o.delay_days} d</li>
                    <li className="meta-chip">defects {formatFractionPct(o.defect_rate)}</li>
                  </ul>
                  {o.delay_reason && <p className="outcome-reason">{o.delay_reason}</p>}
                </div>
                <span className={`badge ${o.is_retained_to_hindsight ? "badge-green" : "badge-amber"}`}>
                  <Icon name={o.is_retained_to_hindsight ? "memory" : "alert"} size={13} />
                  {o.is_retained_to_hindsight ? "retained to Hindsight" : "Hindsight retention failed"}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      {lastRecall && activeRequest && (
        <section className="card card-purple panel-memory" aria-labelledby="recall-title">
          <SectionHead
            icon="memory"
            tone="purple"
            eyebrow="Latest contextual recall"
            title={
              <>
                Recalled for {activeRequest.request_number} · {activeRequest.material_name}
              </>
            }
            titleId="recall-title"
            actions={<span className="badge badge-purple">{lastRecall.length} memories</span>}
          />
          {lastRecall.length ? (
            <div className="memory-grid">
              {lastRecall.map((m, i) => (
                <MemoryCard key={i} memory={m} index={i} />
              ))}
            </div>
          ) : (
            <EmptyState icon="memory" title="No memories were recalled in the latest evaluation" />
          )}
        </section>
      )}

      <section className="card" aria-labelledby="history-title">
        <SectionHead
          icon="database"
          tone="blue"
          eyebrow="Procurement experience by vendor"
          title="Historical purchase records"
          titleId="history-title"
          description={
            <>
              From <code>GET /vendors/&#123;id&#125;/history</code>. Orders with a recorded reason, explanation, resolution or outcome are listed as experiences.
            </>
          }
          actions={
            categories.length > 0 && (
              <label className="inline-select">
                <span className="inline-select-label">Category</span>
                <select value={category} onChange={(e) => setCategory(e.target.value)}>
                  <option value="all">All categories</option>
                  {categories.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </label>
            )
          }
        />

        {vendors.status === "error" && !vendors.data ? (
          <ErrorState {...vendors.error} />
        ) : hist.status === "error" ? (
          <ErrorState {...hist.error} onRetry={() => setNonce((n) => n + 1)} />
        ) : hist.status !== "ready" ? (
          <SkeletonRows rows={6} cols={4} />
        ) : grouped.length === 0 ? (
          <EmptyState icon="history" title="No purchase history for this category" />
        ) : (
          <>
            {hist.failed > 0 && <p className="hint-risk small">History could not be loaded for {hist.failed} vendor(s).</p>}
            <div className="vendor-mem-table">
              <div className="vendor-mem-cols" aria-hidden="true">
                <span>Vendor</span>
                <span>Orders</span>
                <span>Experiences</span>
                <span>Issues</span>
              </div>
              <ul className="vendor-mem-list">
                {grouped.map(({ vendor, total, experiences }) => {
                  const isOpen = open === vendor.id;
                  const problems = experiences.filter((p) => (p.delay_days ?? 0) > 0 || /cancel|partial/i.test(p.order_status) || /non-?compliant/i.test(p.compliance)).length;
                  return (
                    <li key={vendor.id} className={`vendor-mem ${isOpen ? "is-open" : ""}`}>
                      <button type="button" className="vendor-mem-row" aria-expanded={isOpen} onClick={() => setOpen(isOpen ? null : vendor.id)}>
                        <span className="vendor-mem-name">
                          <Icon name={isOpen ? "chevronDown" : "chevronRight"} size={15} className="vendor-mem-chevron" />
                          <span className="avatar" aria-hidden="true">
                            {vendor.name.slice(0, 2).toUpperCase()}
                          </span>
                          <b>{vendor.name}</b>
                        </span>
                        <span className="vendor-mem-orders">{total} orders</span>
                        <span>
                          <span className="badge badge-purple">{experiences.length} experiences</span>
                        </span>
                        <span>{problems > 0 ? <span className="badge badge-amber">{problems} with issues</span> : <span className="vendor-mem-none">No issues</span>}</span>
                      </button>
                      {isOpen && (
                        <div className="vendor-mem-body">
                          {experiences.length === 0 ? (
                            <p className="muted small">No qualitative context recorded for these orders.</p>
                          ) : (
                            <ul className="exp-list">
                              {experiences.slice(0, 12).map((p) => (
                                <li key={p.id}>
                                  <div className="exp-head">
                                    <span className="mono exp-id">{p.po_id}</span>
                                    <span className="muted small">
                                      {formatDate(p.order_date)} · {p.material_category} · {p.order_status} · {p.compliance}
                                    </span>
                                    {p.is_synthetic_context && <span className="badge badge-neutral">Synthetic context</span>}
                                  </div>
                                  <dl className="exp-facts">
                                    {p.delay_reason && (
                                      <div>
                                        <dt>Problem</dt>
                                        <dd>{p.delay_reason}</dd>
                                      </div>
                                    )}
                                    {p.vendor_explanation && (
                                      <div>
                                        <dt>Vendor explanation</dt>
                                        <dd>{p.vendor_explanation}</dd>
                                      </div>
                                    )}
                                    {p.resolution && (
                                      <div>
                                        <dt>Resolution</dt>
                                        <dd>{p.resolution}</dd>
                                      </div>
                                    )}
                                    {p.outcome && (
                                      <div>
                                        <dt>Outcome</dt>
                                        <dd>{p.outcome}</dd>
                                      </div>
                                    )}
                                  </dl>
                                </li>
                              ))}
                            </ul>
                          )}
                          {experiences.length > 12 && <p className="muted small">Showing 12 of {experiences.length}. Open the vendor for the full history.</p>}
                          <button type="button" className="btn btn-ghost btn-sm" onClick={() => onOpenVendor(vendor.id)}>
                            Open vendor intelligence <Icon name="chevronRight" size={13} />
                          </button>
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
            </div>
          </>
        )}
      </section>
    </div>
  );
}
