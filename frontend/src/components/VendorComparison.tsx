import { useMemo, useState } from "react";
import type { VendorComparisonRow } from "../types/api";
import { adjustmentTone, formatRisk, formatSigned } from "../utils/format";
import { Icon } from "./Icon";
import { isPositiveFlag } from "./signals";

const INITIAL_ROWS = 8;

export function HindsightEffect({ value }: { value: number }) {
  const tone = adjustmentTone(value);
  const label = tone === "up" ? "History increased risk" : tone === "down" ? "History reduced risk" : "No meaningful adjustment";
  return (
    <span className={`effect effect-${tone}`} title={label}>
      <Icon name={tone === "up" ? "arrowUp" : tone === "down" ? "arrowDown" : "minus"} size={12} strokeWidth={2.25} />
      <span className="mono">{formatSigned(value)}</span>
      <span className="sr-only">{label}</span>
    </span>
  );
}

export function FlagChips({ flags, max = 3 }: { flags: string[]; max?: number }) {
  if (!flags.length) return <span className="muted small">No memory signals</span>;
  const shown = flags.slice(0, max);
  return (
    <span className="flags">
      {shown.map((f) => (
        <span key={f} className={`flag ${isPositiveFlag(f) ? "flag-good" : "flag-risk"}`}>
          {f}
        </span>
      ))}
      {flags.length > max && (
        <span className="flag flag-more" title={flags.slice(max).join(", ")}>
          +{flags.length - max}
        </span>
      )}
    </span>
  );
}

export function VendorComparison({
  rows,
  recommendedId,
  recommendedName,
  onOpenVendor,
}: {
  rows: VendorComparisonRow[];
  recommendedId: string | null;
  recommendedName: string;
  onOpenVendor: (id: string) => void;
}) {
  const [showAll, setShowAll] = useState(false);

  const ranked = useMemo(() => {
    const byBaseline = [...rows].sort((a, b) => a.baseline_risk - b.baseline_risk).map((r) => r.vendor_id);
    return [...rows]
      .sort((a, b) => a.combined_risk - b.combined_risk)
      .map((r, i) => ({ row: r, rank: i + 1, baselineRank: byBaseline.indexOf(r.vendor_id) + 1 }));
  }, [rows]);

  const maxRisk = Math.max(1, ...rows.map((r) => r.combined_risk), ...rows.map((r) => r.baseline_risk));
  const visible = showAll ? ranked : ranked.slice(0, INITIAL_ROWS);
  const isRec = (r: VendorComparisonRow) => (recommendedId ? r.vendor_id === recommendedId : r.vendor_name === recommendedName);
  const adjusted = rows.filter((r) => adjustmentTone(r.hindsight_adjustment) !== "flat").length;

  return (
    <section className="panel" aria-labelledby="comparison-title">
      <div className="panel-head">
        <div>
          <span className="eyebrow eyebrow-plain">Vendor comparison</span>
          <h3 id="comparison-title">Baseline risk + Hindsight effect = combined risk</h3>
          <p className="muted">Lower is better. Ranked by combined risk; {adjusted} of {rows.length} vendors had their risk changed by recalled history.</p>
        </div>
        <div className="legend" aria-label="Hindsight effect legend">
          <span className="effect effect-down"><Icon name="arrowDown" size={11} /> reduced risk</span>
          <span className="effect effect-up"><Icon name="arrowUp" size={11} /> increased risk</span>
          <span className="effect effect-flat"><Icon name="minus" size={11} /> no change</span>
        </div>
      </div>

      <div className="table-wrap">
        <table className="table table-compare">
          <caption className="sr-only">Vendor comparison with baseline risk, Hindsight adjustment and combined risk</caption>
          <thead>
            <tr>
              <th scope="col" className="rank-col">#</th>
              <th scope="col">Vendor</th>
              <th scope="col" className="num">Baseline risk</th>
              <th scope="col" className="num">Hindsight effect</th>
              <th scope="col">Combined risk</th>
              <th scope="col">Memory signals</th>
              <th scope="col" className="num">Action</th>
            </tr>
          </thead>
          <tbody>
            {visible.map(({ row, rank, baselineRank }) => {
              const moved = baselineRank - rank;
              return (
                <tr key={row.vendor_id} className={isRec(row) ? "row-recommended" : ""}>
                  <td className="rank-col mono">{rank}</td>
                  <th scope="row">
                    <div className="vendor-cell">
                      <span className="vendor-name">{row.vendor_name}</span>
                      <span className="vendor-meta">
                        {isRec(row) && <span className="tag tag-accent">Recommended</span>}
                        <span className="tag tag-memory" title="Hindsight memories used for this vendor">
                          <Icon name="memory" size={11} /> {row.memory_count}
                        </span>
                        {moved !== 0 && (
                          <span className={`rank-move ${moved > 0 ? "up" : "down"}`} title={`Rank by baseline only: #${baselineRank}`}>
                            {moved > 0 ? "▲" : "▼"} {Math.abs(moved)} vs baseline
                          </span>
                        )}
                      </span>
                    </div>
                  </th>
                  <td className="num mono">{formatRisk(row.baseline_risk)}</td>
                  <td className="num">
                    <HindsightEffect value={row.hindsight_adjustment} />
                  </td>
                  <td>
                    <div className="risk-cell">
                      <span className="mono risk-val">{formatRisk(row.combined_risk)}</span>
                      <span className="risk-bar" aria-hidden="true">
                        <span className="risk-bar-base" style={{ width: `${(row.baseline_risk / maxRisk) * 100}%` }} />
                        <span className="risk-bar-fill" style={{ width: `${(Math.max(0, row.combined_risk) / maxRisk) * 100}%` }} />
                      </span>
                    </div>
                  </td>
                  <td>
                    <FlagChips flags={row.memory_flags} />
                  </td>
                  <td className="num">
                    <button type="button" className="btn btn-ghost btn-sm" onClick={() => onOpenVendor(row.vendor_id)} aria-label={`Open intelligence for ${row.vendor_name}`}>
                      Details <Icon name="chevronRight" size={13} />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {ranked.length > INITIAL_ROWS && (
        <button type="button" className="link-btn table-more" onClick={() => setShowAll((s) => !s)} aria-expanded={showAll}>
          <Icon name={showAll ? "chevronDown" : "chevronRight"} size={12} /> {showAll ? "Show top vendors only" : `Show all ${ranked.length} vendors`}
        </button>
      )}
    </section>
  );
}
