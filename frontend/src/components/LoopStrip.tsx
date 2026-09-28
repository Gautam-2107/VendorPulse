import { Icon } from "./Icon";

export type Stage = "request" | "recall" | "compare" | "decide" | "outcome" | "retained";

const STEPS: { key: Stage; label: string }[] = [
  { key: "request", label: "Request" },
  { key: "recall", label: "Hindsight recall" },
  { key: "compare", label: "Recommendation" },
  { key: "decide", label: "Human decision" },
  { key: "outcome", label: "Outcome" },
  { key: "retained", label: "New memory" },
];

export function LoopStrip({ stage, busy }: { stage: Stage; busy?: boolean }) {
  const idx = STEPS.findIndex((s) => s.key === stage);
  return (
    <ol className="loop" aria-label="Procurement learning loop">
      {STEPS.map((s, i) => {
        const state = i < idx || (stage === "retained" && i === idx) ? "done" : i === idx ? "current" : "todo";
        return (
          <li key={s.key} className={`loop-step loop-${state}`} aria-current={state === "current" ? "step" : undefined}>
            <span className="loop-dot">
              {state === "done" ? <Icon name="check" size={12} strokeWidth={2.5} /> : state === "current" && busy ? <span className="spinner spinner-xs" /> : i + 1}
            </span>
            <span className="loop-label">{s.label}</span>
            {i < STEPS.length - 1 && <span className="loop-bar" aria-hidden="true" />}
          </li>
        );
      })}
    </ol>
  );
}

export function StoryBanner() {
  return (
    <section className="story" aria-label="What VendorPulse does">
      <div className="story-q story-old">
        <span className="eyebrow">Traditional procurement asks</span>
        <p>Which vendor looks good now?</p>
      </div>
      <Icon name="arrowRight" size={18} className="story-arrow" />
      <div className="story-q story-new">
        <span className="eyebrow">VendorPulse asks</span>
        <p>What happened the last time we worked with this vendor?</p>
      </div>
      <div className="story-flow" aria-label="Learning loop">
        <span>Current data</span>
        <b>+</b>
        <span className="accent">Organizational memory</span>
        <Icon name="arrowRight" size={12} />
        <span>Context-aware recommendation</span>
        <Icon name="arrowRight" size={12} />
        <span>Human decision</span>
        <Icon name="arrowRight" size={12} />
        <span className="accent">New memory</span>
      </div>
    </section>
  );
}
