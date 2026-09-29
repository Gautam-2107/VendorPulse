import { useState } from "react";
import type { MemoryEvidence } from "../types/api";
import { extractMemoryFacts } from "../utils/memoryText";
import type { MemoryFact } from "../utils/memoryText";
import { Icon } from "./Icon";

/** Fields shown as compact metrics in the expanded view. */
const METRIC_LABELS = ["Order status", "Compliance", "Delivery", "Delay", "Defect rate", "Additional cost"];
/** Narrative fields shown as labelled lines in the expanded view. */
const STORY_LABELS = ["Problem / reason", "Vendor explanation", "Resolution", "Outcome"];

export function memoryHasIssue(facts: MemoryFact[]): boolean {
  return facts.some((f) => f.tone === "risk");
}

/**
 * One recalled Hindsight memory as a compact row. Every value shown is a fact
 * extracted verbatim from the recalled text; the row expands to the full detail
 * and the original recalled text.
 */
export function MemoryCard({ memory, index, showVendor = true }: { memory: MemoryEvidence; index?: number; showVendor?: boolean }) {
  const { reference, facts, recordedOutcome } = extractMemoryFacts(memory.memory);
  const known = facts.length > 0;
  const [open, setOpen] = useState(false);
  const detailId = `mem-detail-${index ?? 0}-${memory.vendor.replace(/\W+/g, "")}`;
  const issue = memoryHasIssue(facts);
  const fact = (l: string) => facts.find((f) => f.label === l)?.value ?? null;
  const metrics = METRIC_LABELS.map((l) => facts.find((f) => f.label === l)).filter((f): f is MemoryFact => !!f);
  const story = STORY_LABELS.map((l) => facts.find((f) => f.label === l)).filter((f): f is MemoryFact => !!f);

  const delay = fact("Delay");
  const defect = fact("Defect rate");
  const headline = [delay ? `${delay} delay` : fact("Order status"), defect ? `${defect} defects` : null].filter(Boolean).join(" · ");
  const detail = fact("Problem / reason") ?? fact("Outcome") ?? fact("Vendor explanation") ?? fact("Resolution");
  const delivery = fact("Delivery");
  const tone = recordedOutcome ? "new" : !known ? "plain" : issue ? "issue" : "ok";

  return (
    <article
      className={`memory-card ${known ? (issue ? "memory-issue" : "memory-ok") : ""} ${recordedOutcome ? "memory-new" : ""} ${open ? "is-open" : ""}`}
      style={index != null ? { animationDelay: `${Math.min(index, 12) * 40}ms` } : undefined}
    >
      <button type="button" className="memory-row" aria-expanded={open} aria-controls={detailId} onClick={() => setOpen((o) => !o)}>
        <span className={`memory-row-icon memory-row-icon-${tone}`} aria-hidden="true">
          <Icon name={tone === "issue" ? "alert" : tone === "ok" ? "checkCircle" : "memory"} size={17} />
        </span>
        <span className="memory-row-main">
          <span className="memory-row-title">
            {showVendor && <span className="memory-vendor">{memory.vendor}</span>}
            {recordedOutcome ? (
              <span className="mem-state mem-state-new">
                <Icon name="memory" size={11} /> Recorded outcome
              </span>
            ) : known ? (
              <span className={`mem-state ${issue ? "mem-state-issue" : "mem-state-ok"}`}>
                <Icon name={issue ? "alert" : "check"} size={11} strokeWidth={2.25} />
                {issue ? "Issue" : "Successful"}
              </span>
            ) : null}
          </span>
          {headline && <span className="memory-row-headline">{headline}</span>}
          <span className="memory-row-detail">{detail ?? (known ? "" : memory.memory)}</span>
        </span>
        <span className="memory-row-side">
          <span className="mono memory-ref">{reference ?? "Recalled"}</span>
          {delivery && (
            <span className="memory-row-days">
              {delivery}
              {delay ? ` (${delay.replace(/\s*days?/, "d")} late)` : ""}
            </span>
          )}
        </span>
        <Icon name={open ? "chevronDown" : "chevronRight"} size={16} className="memory-row-chevron" />
      </button>

      {open && (
        <div id={detailId} className="memory-detail">
          {metrics.length > 0 && (
            <dl className="memory-metrics">
              {metrics.map((f) => (
                <div key={f.label} className={`fact fact-${f.tone ?? "neutral"}`}>
                  <dt>{f.label}</dt>
                  <dd>{f.value}</dd>
                </div>
              ))}
            </dl>
          )}
          {story.length > 0 && (
            <dl className="memory-story">
              {story.map((f) => (
                <div key={f.label} className={`story-row story-${f.tone ?? "neutral"}`}>
                  <dt>{f.label}</dt>
                  <dd>{f.value}</dd>
                </div>
              ))}
            </dl>
          )}
          <blockquote className="memory-text">{memory.memory}</blockquote>
          {memory.relevance && <p className="memory-rel">{memory.relevance}</p>}
        </div>
      )}
    </article>
  );
}
