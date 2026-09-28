import { useState } from "react";
import type { EvaluationResponse, VendorComparisonRow } from "../types/api";
import { formatRisk } from "../utils/format";
import { Icon } from "./Icon";
import { FlagChips, HindsightEffect } from "./VendorComparison";

export function RecommendationCard({ evaluation, row }: { evaluation: EvaluationResponse; row: VendorComparisonRow | null }) {
  const [showReasoning, setShowReasoning] = useState(false);
  const none = !evaluation.recommended_vendor_id && !row;

  return (
    <section className="recommendation" aria-labelledby="rec-title">
      <div className="rec-head">
        <div>
          <span className="eyebrow">VendorPulse Recommendation</span>
          <h3 id="rec-title">{evaluation.recommended_vendor}</h3>
          {evaluation.recommendation && <p className="rec-line">{evaluation.recommendation}</p>}
        </div>
        <div className="rec-tags">
          <span className="tag tag-accent">
            <Icon name="sparkle" size={12} /> AI-assisted recommendation
          </span>
          <span className="tag tag-warn">
            <Icon name="user" size={12} /> Human approval required
          </span>
        </div>
      </div>

      {row && (
        <div className="rec-metrics">
          <div className="rec-metric">
            <span className="rec-metric-label">Baseline risk</span>
            <span className="rec-metric-value mono">{formatRisk(row.baseline_risk)}</span>
            <span className="rec-metric-hint">Current KPIs</span>
          </div>
          <span className="rec-op" aria-hidden="true">+</span>
          <div className="rec-metric rec-metric-memory">
            <span className="rec-metric-label">Hindsight adjustment</span>
            <span className="rec-metric-value">
              <HindsightEffect value={row.hindsight_adjustment} />
            </span>
            <span className="rec-metric-hint">{row.memory_count} recalled {row.memory_count === 1 ? "memory" : "memories"}</span>
          </div>
          <span className="rec-op" aria-hidden="true">=</span>
          <div className="rec-metric rec-metric-total">
            <span className="rec-metric-label">Combined risk</span>
            <span className="rec-metric-value mono">{formatRisk(row.combined_risk)}</span>
            <span className="rec-metric-hint">Lowest among candidates</span>
          </div>
        </div>
      )}

      {row && row.memory_flags.length > 0 && (
        <div className="rec-flags">
          <span className="small muted">Memory signals</span>
          <FlagChips flags={row.memory_flags} max={6} />
        </div>
      )}

      {evaluation.risk_summary && (
        <p className="rec-summary">
          <Icon name="shield" size={14} /> {evaluation.risk_summary}
        </p>
      )}

      {evaluation.reasoning && (
        <div className="rec-reasoning">
          <button type="button" className="link-btn" aria-expanded={showReasoning} onClick={() => setShowReasoning((s) => !s)}>
            <Icon name={showReasoning ? "chevronDown" : "chevronRight"} size={12} /> {showReasoning ? "Hide" : "Show"} agent reasoning
          </button>
          {showReasoning && <div className="reasoning-text">{evaluation.reasoning}</div>}
        </div>
      )}

      {evaluation.important_caveats && (
        <p className="rec-caveat">
          <Icon name="info" size={13} /> {evaluation.important_caveats}
        </p>
      )}
      {none && <p className="rec-caveat">The backend did not return a recommendable vendor.</p>}
    </section>
  );
}
