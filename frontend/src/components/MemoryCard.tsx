import { useState } from "react";
import type { MemoryEvidence } from "../types/api";
import { extractMemoryFacts } from "../utils/memoryText";
import type { MemoryFact } from "../utils/memoryText";
import { Icon } from "./Icon";

/** Fields shown as compact metrics at the top of a card. */
const METRIC_LABELS = ["Order status", "Compliance", "Delivery", "Delay", "Defect rate", "Additional cost"];
/** Narrative fields shown as labelled lines. */
const STORY_LABELS = ["Problem / reason", "Vendor explanation", "Resolution", "Outcome"];

export function memoryHasIssue(facts: MemoryFact[]): boolean {
  return facts.some((f) => f.tone === "risk");
}

export function MemoryCard({ memory, index, showVendor = true }: { memory: MemoryEvidence; index?: number; showVendor?: boolean }) {
  const { reference, facts, recordedOutcome } = extractMemoryFacts(memory.memory);
  const [open, setOpen] = useState(facts.length === 0);
  const textId = `mem-text-${index ?? 0}-${memory.vendor.replace(/\W+/g, "")}`;
  const issue = memoryHasIssue(facts);
  const metrics = METRIC_LABELS.map((l) => facts.find((f) => f.label === l)).filter((f): f is MemoryFact => !!f);
  const story = STORY_LABELS.map((l) => facts.find((f) => f.label === l)).filter((f): f is MemoryFact => !!f);
  const known = facts.length > 0;

  return (
    <article
      className={`memory-card ${known ? (issue ? "memory-issue" : "memory-ok") : ""} ${recordedOutcome ? "memory-new" : ""}`}
      style={index != null ? { animationDelay: `${Math.min(index, 12) * 40}ms` } : undefined}
    >
      <header className="memory-head">
        <div className="memory-title">
          {showVendor && <span className="memory-vendor">{memory.vendor}</span>}
          <span className="mono memory-ref">{reference ?? "Recalled experience"}</span>
        </div>
        {recordedOutcome ? (
          <span className="mem-state mem-state-new">
            <Icon name="memory" size={11} /> Recorded outcome
          </span>
        ) : known ? (
          <span className={`mem-state ${issue ? "mem-state-issue" : "mem-state-ok"}`}>
            <span className="mem-dot" aria-hidden="true" />
            {issue ? "Issue recorded" : "Clean delivery"}
          </span>
        ) : null}
      </header>

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

      <footer className="memory-foot">
        {known && (
          <button type="button" className="link-btn memory-toggle" aria-expanded={open} aria-controls={textId} onClick={() => setOpen((o) => !o)}>
            <Icon name={open ? "chevronDown" : "chevronRight"} size={12} /> Recalled text
          </button>
        )}
        {memory.relevance && <span className="memory-rel">{memory.relevance}</span>}
      </footer>
      {open && (
        <blockquote id={textId} className="memory-text">
          {memory.memory}
        </blockquote>
      )}
    </article>
  );
}
