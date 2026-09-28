import { useMemo, useState } from "react";
import type { EvalState } from "../state/AppState";
import type { PurchaseRequest } from "../types/api";
import { Icon } from "./Icon";
import { MemoryCard } from "./MemoryCard";
import { EmptyState, ErrorState, Skeleton } from "./States";
import { useRevealOnMount } from "../utils/useRevealOnMount";

export function HindsightPanel({
  evalState,
  request,
  vendorCount,
  onRetry,
}: {
  evalState: EvalState;
  request: PurchaseRequest;
  vendorCount: number;
  onRetry: () => void;
}) {
  const [filter, setFilter] = useState<string>("all");
  const revealRef = useRevealOnMount<HTMLElement>();
  const evidence = evalState.status === "done" ? evalState.data.memory_evidence : [];

  const byVendor = useMemo(() => {
    const m = new Map<string, number>();
    for (const e of evidence) m.set(e.vendor, (m.get(e.vendor) ?? 0) + 1);
    return [...m.entries()];
  }, [evidence]);

  const shown = filter === "all" ? evidence : evidence.filter((e) => e.vendor === filter);

  return (
    <section ref={revealRef} className={`panel panel-memory ${evalState.status === "running" ? "is-recalling" : ""}`} aria-labelledby="hindsight-title" aria-busy={evalState.status === "running"}>
      <div className="panel-head">
        <div>
          <span className="eyebrow eyebrow-memory">
            <Icon name="memory" size={12} /> Hindsight Memory
          </span>
          <h3 id="hindsight-title">Relevant experiences recalled from previous procurement outcomes</h3>
          <p className="muted">
            Historical experiences — what actually happened on past orders — not predictions. Query: <b>{request.material_name}</b>
            {request.material_category !== request.material_name && <> · {request.material_category}</>}
          </p>
        </div>
        {evalState.status === "done" && (
          <span className="tag tag-memory">
            {evidence.length} {evidence.length === 1 ? "memory" : "memories"} · {byVendor.length} {byVendor.length === 1 ? "vendor" : "vendors"}
          </span>
        )}
      </div>

      {evalState.status === "running" && (
        <div className="recall-loading" role="status" aria-live="polite">
          <div className="recall-line">
            <span className="recall-pulse" aria-hidden="true" />
            <span>
              <b>Searching organizational memory…</b> recalling past experiences for {vendorCount || "all"} candidate vendors
            </span>
          </div>
          <div className="memory-grid">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="memory-card memory-skeleton" aria-hidden="true">
                <Skeleton h={12} w="45%" />
                <Skeleton h={10} w="90%" />
                <Skeleton h={10} w="80%" />
                <Skeleton h={10} w="60%" />
              </div>
            ))}
          </div>
        </div>
      )}

      {evalState.status === "error" && <ErrorState title={`Evaluation failed — ${evalState.error.title}`} message={evalState.error.message} onRetry={onRetry} />}

      {evalState.status === "done" && evidence.length === 0 && (
        <EmptyState icon="memory" title={`No relevant memories were recalled for ${request.material_category}`}>
          Hindsight returned no matching experiences, so every vendor's Hindsight effect is zero and the recommendation relies on current KPIs only.
          Recording outcomes builds this memory over time.
        </EmptyState>
      )}

      {evalState.status === "done" && evidence.length > 0 && (
        <>
          {byVendor.length > 1 && (
            <div className="filter-row" role="group" aria-label="Filter memories by vendor">
              <button type="button" className={`filter-chip ${filter === "all" ? "on" : ""}`} aria-pressed={filter === "all"} onClick={() => setFilter("all")}>
                All <span>{evidence.length}</span>
              </button>
              {byVendor.map(([v, n]) => (
                <button key={v} type="button" className={`filter-chip ${filter === v ? "on" : ""}`} aria-pressed={filter === v} onClick={() => setFilter(v)}>
                  {v} <span>{n}</span>
                </button>
              ))}
            </div>
          )}
          <div className="memory-grid">
            {shown.map((m, i) => (
              <MemoryCard key={`${m.vendor}-${i}`} memory={m} index={i} />
            ))}
          </div>
        </>
      )}
    </section>
  );
}
