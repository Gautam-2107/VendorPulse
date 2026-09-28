/**
 * Extract labelled facts from a recalled Hindsight memory string.
 *
 * Only exact substrings present in the text are returned — nothing is inferred
 * or invented. Patterns follow the narratives written by the backend:
 *   - data_service.convert_record_to_hindsight_experience (seeded history)
 *   - hindsight_service._build_outcome (recorded outcomes)
 * Live Hindsight may rephrase facts; unmatched fields are simply omitted and
 * the full recalled text is always shown alongside.
 */
export interface MemoryFact {
  label: string;
  value: string;
  tone?: "risk" | "good" | "neutral";
}

const clean = (s: string) => s.replace(/\s+/g, " ").trim().replace(/[.|]+$/, "").trim();

function first(text: string, re: RegExp): string | null {
  const m = re.exec(text);
  return m && m[1] ? clean(m[1]) : null;
}

export function extractMemoryFacts(text: string): { reference: string | null; facts: MemoryFact[]; synthetic: boolean; recordedOutcome: boolean } {
  const facts: MemoryFact[] = [];
  const reference = first(text, /\b((?:PO|PR)-\d{3,})\b/);

  const status = first(text, /Order Status:\s*([^.|]+)/i);
  if (status) facts.push({ label: "Order status", value: status, tone: /cancel|partial/i.test(status) ? "risk" : "neutral" });

  const compliance = first(text, /Compliance Status:\s*([^.|]+)/i);
  if (compliance) facts.push({ label: "Compliance", value: compliance, tone: /non-?compliant/i.test(compliance) ? "risk" : "good" });

  const duration = first(text, /delivery duration was\s*(\d+\s*days)/i);
  if (duration) facts.push({ label: "Delivery", value: duration, tone: "neutral" });

  const delay = first(text, /delivery delay of\s*(\d+\s*days)/i);
  if (delay) facts.push({ label: "Delay", value: delay, tone: "risk" });

  const defect = first(text, /defect rate (?:recorded at|of)\s*([\d.]+%)/i);
  if (defect) facts.push({ label: "Defect rate", value: defect, tone: parseFloat(defect) >= 5 ? "risk" : "neutral" });

  const reason = first(text, /Delay Root Cause:\s*([^|]+?)(?=\s*\||\s*Vendor Explanation:|\s*Resolution|$)/i);
  if (reason) facts.push({ label: "Problem / reason", value: reason, tone: "risk" });

  const explanation = first(text, /Vendor Explanation:\s*([^|]+?)(?=\s*\||\s*Resolution|\s*Additional Financial|$)/i);
  if (explanation) facts.push({ label: "Vendor explanation", value: explanation });

  const resolution = first(text, /Resolution(?: Action| \/ Action Taken)?:\s*([^|]+?)(?=\s*\||\s*Additional Financial|$)/i);
  if (resolution) facts.push({ label: "Resolution", value: resolution });

  const outcome =
    first(text, /Recorded Outcome:\s*([^|[]+?)(?=\s*\[|\s*\||$)/i) ?? first(text, /Fulfillment Status Summary:\s*([^|]+?)(?=\.\s|$)/i);
  if (outcome) facts.push({ label: "Outcome", value: outcome });

  const cost = first(text, /Additional Financial Impact:\s*([^\s|]+)/i);
  if (cost) facts.push({ label: "Additional cost", value: cost, tone: "risk" });

  return {
    reference,
    facts,
    synthetic: /synthetic demo data/i.test(text),
    recordedOutcome: /procurement outcome for vendor/i.test(text),
  };
}
