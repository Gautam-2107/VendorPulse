import { useEffect, useMemo, useState } from "react";
import { describeError } from "../api/client";
import { getVendorHistory } from "../api/vendors";
import { Icon } from "../components/Icon";
import { MemoryCard } from "../components/MemoryCard";
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

  return (
    <div className="page">
      <section className="memory-hero">
        <span className="eyebrow eyebrow-memory">
          <Icon name="memory" size={12} /> Organizational Memory
        </span>
        <h2>What happened the last time we worked with this vendor?</h2>
        <p>
          <b>Memory is retrieved contextually during vendor evaluation.</b> Hindsight is queried per vendor with the material of the request being evaluated. The
          backend does not expose an endpoint that lists every Hindsight memory, so this page shows the experiences that <i>are</i> available through the API:
          outcomes recorded here, the most recent contextual recall, and the historical procurement records per vendor.
        </p>
      </section>

      <section className="panel">
        <div className="panel-head">
          <div>
            <span className="eyebrow eyebrow-plain">Newest memories</span>
            <h3>Outcomes recorded in VendorPulse</h3>
            <p className="muted">Each outcome was sent to Hindsight when recorded (POST /outcomes). Future evaluations can recall it.</p>
          </div>
        </div>
        {recorded.length === 0 ? (
          <EmptyState icon="history" title="No outcomes recorded from this browser yet">
            Complete the loop on the dashboard: evaluate → decide → record outcome.
          </EmptyState>
        ) : (
          <ul className="recorded-list recorded-list-lg">
            {recorded.map(([reqId, o]) => (
              <li key={o.id}>
                <span className={`retained-dot ${o.is_retained_to_hindsight ? "ok" : "warn"}`} aria-hidden="true">
                  <Icon name={o.is_retained_to_hindsight ? "check" : "alert"} size={12} />
                </span>
                <div>
                  <p>
                    <button type="button" className="link-btn" onClick={() => onOpenVendor(o.vendor_id)}>
                      {decisions[reqId]?.selected_vendor_name ?? vendorName(o.vendor_id)}
                    </button>{" "}
                    — {o.outcome_summary}
                  </p>
                  <p className="muted small">
                    Delivered {formatDate(o.actual_delivery_date)} · {o.actual_delivery_days} days · delay {o.delay_days} d · defects {formatFractionPct(o.defect_rate)}
                    {o.delay_reason ? ` · ${o.delay_reason}` : ""} ·{" "}
                    <span className={o.is_retained_to_hindsight ? "text-good" : "text-warn"}>
                      {o.is_retained_to_hindsight ? "retained to Hindsight" : "Hindsight retention failed"}
                    </span>
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {lastRecall && activeRequest && (
        <section className="panel panel-memory">
          <div className="panel-head">
            <div>
              <span className="eyebrow eyebrow-memory">Latest contextual recall</span>
              <h3>
                Recalled for {activeRequest.request_number} · {activeRequest.material_name}
              </h3>
            </div>
            <span className="tag tag-memory">{lastRecall.length} memories</span>
          </div>
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

      <section className="panel">
        <div className="panel-head">
          <div>
            <span className="eyebrow eyebrow-plain">Procurement experience by vendor</span>
            <h3>Historical purchase records</h3>
            <p className="muted">From <code>GET /vendors/&#123;id&#125;/history</code>. Orders with a recorded reason, explanation, resolution or outcome are listed as experiences.</p>
          </div>
          {categories.length > 0 && (
            <label className="inline-select">
              <span className="small muted">Category</span>
              <select value={category} onChange={(e) => setCategory(e.target.value)}>
                <option value="all">All categories</option>
                {categories.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </label>
          )}
        </div>

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
            <ul className="vendor-mem-list">
              {grouped.map(({ vendor, total, experiences }) => {
                const isOpen = open === vendor.id;
                const problems = experiences.filter((p) => (p.delay_days ?? 0) > 0 || /cancel|partial/i.test(p.order_status) || /non-?compliant/i.test(p.compliance)).length;
                return (
                  <li key={vendor.id} className="vendor-mem">
                    <button type="button" className="vendor-mem-row" aria-expanded={isOpen} onClick={() => setOpen(isOpen ? null : vendor.id)}>
                      <Icon name={isOpen ? "chevronDown" : "chevronRight"} size={14} />
                      <b>{vendor.name}</b>
                      <span className="muted small">{total} orders</span>
                      <span className="tag tag-memory">{experiences.length} experiences</span>
                      {problems > 0 && <span className="tag tag-warn">{problems} with issues</span>}
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
                                  <span className="mono">{p.po_id}</span>
                                  <span className="muted small">{formatDate(p.order_date)} · {p.material_category} · {p.order_status} · {p.compliance}</span>
                                  {p.is_synthetic_context && <span className="tag tag-neutral">Synthetic context</span>}
                                </div>
                                <dl className="exp-facts">
                                  {p.delay_reason && <div><dt>Problem</dt><dd>{p.delay_reason}</dd></div>}
                                  {p.vendor_explanation && <div><dt>Vendor explanation</dt><dd>{p.vendor_explanation}</dd></div>}
                                  {p.resolution && <div><dt>Resolution</dt><dd>{p.resolution}</dd></div>}
                                  {p.outcome && <div><dt>Outcome</dt><dd>{p.outcome}</dd></div>}
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
          </>
        )}
      </section>
    </div>
  );
}
