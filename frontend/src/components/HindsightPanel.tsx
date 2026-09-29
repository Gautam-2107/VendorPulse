import { useMemo, useState } from "react";
import type { EvalState } from "../state/AppState";
import type { MemoryEvidence, PurchaseRequest } from "../types/api";
import { extractMemoryFacts } from "../utils/memoryText";
import { useRevealOnMount } from "../utils/useRevealOnMount";
import { Icon } from "./Icon";
import { MemoryCard, memoryHasIssue } from "./MemoryCard";
import { EmptyState, ErrorState, Skeleton } from "./States";

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
  const revealRef = useRevealOnMount<HTMLElement>();
  const evidence = evalState.status === "done" ? evalState.data.memory_evidence : [];

  const { groups, issues, synthetic } = useMemo(() => {
    const m = new Map<string, MemoryEvidence[]>();
    let issueCount = 0;
    let synth = false;
    for (const e of evidence) {
      const list = m.get(e.vendor) ?? [];
      list.push(e);
      m.set(e.vendor, list);
      const f = extractMemoryFacts(e.memory);
      if (memoryHasIssue(f.facts)) issueCount++;
      if (f.synthetic) synth = true;
    }
    return { groups: [...m.entries()], issues: issueCount, synthetic: synth };
  }, [evidence]);

  const [showAll, setShowAll] = useState(false);
  // Recorded outcomes (new learning) first; otherwise keep the backend's order.
  const ordered = useMemo(
    () => [...evidence].map((m, i) => ({ m, i, rec: extractMemoryFacts(m.memory).recordedOutcome })).sort((a, b) => Number(b.rec) - Number(a.rec) || a.i - b.i),
    [evidence],
  );
  const LIMIT = 4;
  const visible = showAll ? ordered : ordered.slice(0, LIMIT);

  return (
    <section
      ref={revealRef}
      className={`panel panel-memory ${evalState.status === "running" ? "is-recalling" : ""}`}
      aria-labelledby="hindsight-title"
      aria-busy={evalState.status === "running"}
    >
      <div className="memory-panel-head">
        <span className="icon-tile icon-tile-purple" aria-hidden="true">
          <Icon name="memory" size={19} />
        </span>
        <div className="memory-panel-titles">
          <h3 id="hindsight-title" className="eyebrow eyebrow-purple">
            Hindsight Memory
          </h3>
          <p>
            Relevant experiences recalled from previous procurement outcomes for <b>{request.material_name}</b>
            {evalState.status === "done" && evidence.length > 0 && (
              <span className="memory-counts">
                {evidence.length} {evidence.length === 1 ? "memory" : "memories"} · {groups.length} {groups.length === 1 ? "vendor" : "vendors"}
                {issues > 0 ? ` · ${issues} with issues` : ""}
              </span>
            )}
          </p>
        </div>
        {evalState.status === "done" && ordered.length > LIMIT && (
          <button type="button" className="link-btn memory-viewall" aria-expanded={showAll} onClick={() => setShowAll((v) => !v)}>
            {showAll ? "Show fewer" : `View all ${ordered.length} memories`} <Icon name={showAll ? "chevronDown" : "arrowRight"} size={14} />
          </button>
        )}
      </div>

      <div className="memory-panel-body">
        {evalState.status === "running" && (
          <div className="recall-loading" role="status" aria-live="polite">
            <div className="recall-line">
              <span className="recall-pulse" aria-hidden="true" />
              <span>
                <b>Searching organizational memory…</b> recalling past experiences for {vendorCount || "all"} candidate vendors
              </span>
            </div>
            <div className="memory-list">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="memory-card memory-skeleton" aria-hidden="true">
                  <Skeleton h={12} w="40%" />
                  <Skeleton h={12} w="75%" />
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

        {evalState.status === "done" && ordered.length > 0 && (
          <div className="memory-list">
            {visible.map(({ m, i }) => (
              <MemoryCard key={`${m.vendor}-${i}`} memory={m} index={i} />
            ))}
          </div>
        )}
        {evalState.status === "done" && synthetic && (
          <p className="memory-footnote">
            <Icon name="info" size={12} /> Qualitative context (reasons, explanations, resolutions) in seeded history is labelled by the dataset as synthetic demo data.
          </p>
        )}
      </div>
    </section>
  );
}

/** Shown before any evaluation: explains what will appear, without inventing memories. */
export function HindsightPlaceholder({ request }: { request: PurchaseRequest }) {
  return (
    <section className="panel panel-memory" aria-labelledby="hindsight-placeholder-title">
      <div className="memory-panel-head">
        <span className="icon-tile icon-tile-purple" aria-hidden="true">
          <Icon name="memory" size={19} />
        </span>
        <div className="memory-panel-titles">
          <h3 id="hindsight-placeholder-title" className="eyebrow eyebrow-purple">
            Hindsight Memory
          </h3>
          <p>Relevant experiences recalled from previous procurement outcomes</p>
        </div>
      </div>
      <div className="memory-panel-body">
        <div className="memory-waiting">
          <p className="memory-waiting-title">No memories recalled yet</p>
          <p>
            <b>Evaluate Vendors</b> queries Hindsight for every candidate vendor with <b>{request.material_name}</b>, and the experiences it recalls appear here.
          </p>
        </div>
      </div>
    </section>
  );
}
