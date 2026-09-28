import { Icon } from "./Icon";
import type { IconName } from "./Icon";

/** The step the user is currently on (everything before it is complete). */
export type Stage = "request" | "recall" | "decide" | "outcome" | "retained";

const STEPS: { label: string }[] = [
  { label: "Request" },
  { label: "Hindsight recall" },
  { label: "Recommendation" },
  { label: "Human decision" },
  { label: "Outcome" },
  { label: "New memory" },
];

const CURRENT_INDEX: Record<Stage, number> = { request: 0, recall: 1, decide: 3, outcome: 4, retained: 6 };

export function LoopStrip({ stage, busy }: { stage: Stage; busy?: boolean }) {
  const idx = CURRENT_INDEX[stage];
  return (
    <ol className="loop" aria-label="Procurement learning loop">
      {STEPS.map((s, i) => {
        const state = i < idx ? "done" : i === idx ? "current" : "todo";
        return (
          <li key={s.label} className={`loop-step loop-${state}`} aria-current={state === "current" ? "step" : undefined}>
            <span className="loop-dot">
              {state === "done" ? (
                <Icon name="check" size={12} strokeWidth={2.5} />
              ) : state === "current" && busy ? (
                <span className="spinner spinner-xs" />
              ) : (
                i + 1
              )}
            </span>
            <span className="loop-label">{s.label}</span>
            {i < STEPS.length - 1 && <span className="loop-bar" aria-hidden="true" />}
          </li>
        );
      })}
    </ol>
  );
}

function FlowNode({ icon, title, sub, tone }: { icon: IconName; title: string; sub: string; tone: "data" | "memory" | "ai" | "human" | "learn" }) {
  return (
    <div className={`flow-node flow-${tone}`}>
      <span className="flow-icon" aria-hidden="true">
        <Icon name={icon} size={15} />
      </span>
      <span className="flow-text">
        <b>{title}</b>
        <small>{sub}</small>
      </span>
    </div>
  );
}

const Arrow = () => (
  <span className="flow-arrow" aria-hidden="true">
    <Icon name="arrowRight" size={14} />
  </span>
);

export function StoryBanner() {
  return (
    <section className="hero" aria-labelledby="hero-title">
      <div className="hero-copy">
        <div className="hero-q hero-old">
          <span className="eyebrow eyebrow-plain">Traditional procurement asks</span>
          <p>Which vendor looks good now?</p>
        </div>
        <div className="hero-q hero-new">
          <span className="eyebrow eyebrow-memory">VendorPulse asks</span>
          <h2 id="hero-title">What happened the last time we worked with this vendor?</h2>
        </div>
      </div>

      <div className="hero-flow" role="img" aria-label="Current data plus organizational memory leads to a context-aware recommendation, then a human decision, then new memory that feeds future evaluations.">
        <div className="flow-inputs">
          <FlowNode icon="database" title="Current data" sub="Vendor KPIs" tone="data" />
          <span className="flow-plus" aria-hidden="true">+</span>
          <FlowNode icon="memory" title="Organizational memory" sub="Recalled from Hindsight" tone="memory" />
        </div>
        <Arrow />
        <FlowNode icon="sparkle" title="Context-aware recommendation" sub="AI-assisted" tone="ai" />
        <Arrow />
        <FlowNode icon="user" title="Human decision" sub="Manager approves" tone="human" />
        <Arrow />
        <FlowNode icon="history" title="New memory" sub="Outcome retained" tone="learn" />
        <p className="flow-return">
          <Icon name="refresh" size={12} /> Every recorded outcome is retained and recalled in future evaluations
        </p>
      </div>
    </section>
  );
}
