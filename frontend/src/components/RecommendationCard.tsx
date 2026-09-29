import { useMemo, useState } from "react";
import type { EvaluationResponse, PurchaseRequest, VendorComparisonRow } from "../types/api";
import { adjustmentTone, formatRisk, formatSigned } from "../utils/format";
import { Icon } from "./Icon";
import { quantityLabel } from "./requestNotes";
import { FlagChips } from "./VendorComparison";

const possessive = (name: string) => (/s$/i.test(name) ? `${name}'` : `${name}'s`);

export function RecommendationCard({
  evaluation,
  row,
  request,
}: {
  evaluation: EvaluationResponse;
  row: VendorComparisonRow | null;
  request: PurchaseRequest;
}) {
  const [showReasoning, setShowReasoning] = useState(false);
  const rows = evaluation.vendor_comparison;

  const insight = useMemo(() => {
    if (!row || rows.length === 0) return null;
    const baselineRank = [...rows].sort((a, b) => a.baseline_risk - b.baseline_risk).findIndex((r) => r.vendor_id === row.vendor_id) + 1;
    const combinedRank = [...rows].sort((a, b) => a.combined_risk - b.combined_risk).findIndex((r) => r.vendor_id === row.vendor_id) + 1;
    const adjusted = rows.filter((r) => adjustmentTone(r.hindsight_adjustment) !== "flat").length;
    const pct = row.baseline_risk !== 0 ? Math.abs(row.hindsight_adjustment / row.baseline_risk) * 100 : 0;
    return { baselineRank, combinedRank, adjusted, pct };
  }, [row, rows]);

  const tone = row ? adjustmentTone(row.hindsight_adjustment) : "flat";

  return (
    <section className="recommendation" aria-labelledby="rec-title">
      <div className="rec-top">
        <span className="eyebrow">
          <Icon name="sparkle" size={14} /> VendorPulse Recommendation
        </span>
        <div className="rec-tags">
          <span className="tag tag-accent">
            <Icon name="plus" size={12} /> AI-assisted recommendation
          </span>
          <span className="tag tag-warn">
            <Icon name="user" size={12} /> Human approval required
          </span>
        </div>
      </div>
      <div className="rec-head">
        <h3 id="rec-title">{evaluation.recommended_vendor}</h3>
        <p className="rec-line">
          Recommended supplier for {quantityLabel(request)} of {request.material_name}
          {row ? ` · lowest combined risk of ${rows.length} vendors` : ""}
        </p>
      </div>

      {row && (
        <div className="equation" role="group" aria-label="Risk calculation">
          <div className="eq-term eq-baseline">
            <span className="eq-label">Baseline risk</span>
            <span className="eq-value mono">{formatRisk(row.baseline_risk)}</span>
            <span className="eq-hint">Current KPIs only</span>
          </div>
          <span className="eq-op" aria-hidden="true">+</span>
          <div className={`eq-term eq-memory eq-${tone}`}>
            <span className="eq-label">
              <Icon name="memory" size={13} /> Hindsight adjustment
            </span>
            <span className="eq-value mono">{formatSigned(row.hindsight_adjustment)}</span>
            <span className="eq-hint">
              {tone === "down" ? "History reduced risk" : tone === "up" ? "History increased risk" : "No adjustment"} · {row.memory_count}{" "}
              {row.memory_count === 1 ? "memory" : "memories"}
            </span>
          </div>
          <span className="eq-op" aria-hidden="true">=</span>
          <div className="eq-term eq-combined">
            <span className="eq-label">Combined risk</span>
            <span className="eq-value mono">{formatRisk(row.combined_risk)}</span>
            <span className="eq-hint">Used for the recommendation</span>
          </div>
        </div>
      )}

      {row && insight && (
        <div className="rec-insight">
          <span className="rec-insight-icon" aria-hidden="true">
            <Icon name="info" size={14} />
          </span>
          <div className="rec-insight-body">
            <p className="rec-insight-lead">Current metrics alone are not the whole story.</p>
            <ul>
              <li>
                {tone === "flat"
                  ? `No recalled experience changed ${possessive(row.vendor_name)} risk.`
                  : `Recalled history ${tone === "down" ? "lowered" : "raised"} ${possessive(row.vendor_name)} risk by ${Math.abs(row.hindsight_adjustment).toFixed(2)} points (${insight.pct.toFixed(0)}% of baseline).`}
              </li>
              <li>
                {insight.baselineRank === insight.combinedRank
                  ? `Ranked #${insight.combinedRank} on current KPIs and #${insight.combinedRank} with memory.`
                  : `Ranked #${insight.baselineRank} on current KPIs alone → #${insight.combinedRank} with Hindsight memory.`}
              </li>
              {insight.adjusted > 0 && (
                <li>
                  Recalled history adjusted the risk of {insight.adjusted} of {rows.length} vendors.
                </li>
              )}
            </ul>
            {row.memory_flags.length > 0 && <FlagChips flags={row.memory_flags} max={5} />}
          </div>
        </div>
      )}

      <div className="rec-foot">
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
      </div>
      {!evaluation.recommended_vendor_id && !row && <p className="rec-caveat">The backend did not return a recommendable vendor.</p>}
    </section>
  );
}
