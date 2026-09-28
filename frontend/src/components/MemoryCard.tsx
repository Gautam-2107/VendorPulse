import { useState } from "react";
import type { MemoryEvidence } from "../types/api";
import { extractMemoryFacts } from "../utils/memoryText";
import { Icon } from "./Icon";

export function MemoryCard({ memory, index }: { memory: MemoryEvidence; index?: number }) {
  const { reference, facts, synthetic, recordedOutcome } = extractMemoryFacts(memory.memory);
  const [open, setOpen] = useState(facts.length === 0);
  const textId = `mem-text-${index ?? 0}-${memory.vendor.replace(/\W+/g, "")}`;

  return (
    <article className="memory-card" style={index != null ? { animationDelay: `${Math.min(index, 12) * 45}ms` } : undefined}>
      <header className="memory-head">
        <span className="memory-icon" aria-hidden="true">
          <Icon name="history" size={14} />
        </span>
        <div className="memory-title">
          <span className="memory-vendor">{memory.vendor}</span>
          {reference && <span className="mono memory-ref">{reference}</span>}
        </div>
        <div className="memory-tags">
          <span className="tag tag-memory">Past experience</span>
          {recordedOutcome && <span className="tag tag-good">Recorded outcome</span>}
          {synthetic && (
            <span className="tag tag-neutral" title="Qualitative context in this memory is labelled as synthetic demo data by the dataset">
              Synthetic context
            </span>
          )}
        </div>
      </header>

      {facts.length > 0 && (
        <dl className="memory-facts">
          {facts.map((f) => (
            <div key={f.label} className={`fact fact-${f.tone ?? "neutral"}`}>
              <dt>{f.label}</dt>
              <dd>{f.value}</dd>
            </div>
          ))}
        </dl>
      )}

      {facts.length > 0 && (
        <button type="button" className="link-btn memory-toggle" aria-expanded={open} aria-controls={textId} onClick={() => setOpen((o) => !o)}>
          <Icon name={open ? "chevronDown" : "chevronRight"} size={12} /> {open ? "Hide" : "Show"} recalled text
        </button>
      )}
      {open && (
        <blockquote id={textId} className="memory-text">
          {memory.memory}
        </blockquote>
      )}

      {memory.relevance && (
        <footer className="memory-foot">
          <Icon name="search" size={12} /> {memory.relevance}
        </footer>
      )}
    </article>
  );
}
