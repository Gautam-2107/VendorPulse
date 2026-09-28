import { useMemo } from "react";
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

  let cardIndex = 0;

  return (
    <section
      ref={revealRef}
      className={`panel panel-memory ${evalState.status === "running" ? "is-recalling" : ""}`}
      aria-labelledby="hindsight-title"
      aria-busy={evalState.status === "running"}
    >
      <div className="memory-panel-head">
        <span className="memory-badge" aria-hidden="true">
          <Icon name="memory" size={20} />
        </span>
        <div className="memory-panel-titles">
          <span className="eyebrow eyebrow-memory">Recalled from Hindsight</span>
          <h3 id="hindsight-title">Hindsight Memory</h3>
          <p>
            Relevant experiences recalled from previous procurement outcomes for <b>{request.material_name}</b> — what actually happened, not predictions.
          </p>
        </div>
        {evalState.status === "done" && evidence.length > 0 && (
          <dl className="memory-summary">
            <div>
              <dt>Memories</dt>
              <dd>{evidence.length}</dd>
            </div>
            <div>
              <dt>Vendors</dt>
              <dd>{groups.length}</dd>
            </div>
            <div>
              <dt>With issues</dt>
              <dd className={issues ? "text-warn" : ""}>{issues}</dd>
            </div>
          </dl>
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
                <Skeleton h={12} w="40%" />
                <Skeleton h={34} />
                <Skeleton h={10} w="85%" />
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

      {evalState.status === "done" && groups.length > 0 && (
        <div className="memory-groups">
          {groups.map(([vendor, list]) => {
            const vendorIssues = list.filter((e) => memoryHasIssue(extractMemoryFacts(e.memory).facts)).length;
            return (
              <div key={vendor} className="memory-group">
                <div className="memory-group-head">
                  <b>{vendor}</b>
                  <span className="muted small">
                    {list.length} {list.length === 1 ? "experience" : "experiences"}
                    {vendorIssues > 0 ? ` · ${vendorIssues} with issues` : " · no issues recorded"}
                  </span>
                </div>
                <div className="memory-grid">
                  {list.map((m) => (
                    <MemoryCard key={`${m.vendor}-${cardIndex}`} memory={m} index={cardIndex++} showVendor={false} />
                  ))}
                </div>
              </div>
            );
          })}
          {synthetic && (
            <p className="memory-footnote">
              <Icon name="info" size={12} /> Qualitative context (reasons, explanations, resolutions) in seeded history is labelled by the dataset as synthetic demo data.
            </p>
          )}
        </div>
      )}
    </section>
  );
}
