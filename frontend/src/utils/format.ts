const inr = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 });
const intFmt = new Intl.NumberFormat("en-IN");

export const formatINR = (v: number | null | undefined): string => (v == null ? "—" : inr.format(v));
export const formatInt = (v: number | null | undefined): string => (v == null ? "—" : intFmt.format(v));

/** Backend stores rates as fractions (0.017 === 1.7%). */
export const formatFractionPct = (v: number | null | undefined, digits = 2): string =>
  v == null ? "—" : `${(v * 100).toFixed(digits)}%`;

export const formatDays = (v: number | null | undefined): string =>
  v == null ? "—" : `${Number.isInteger(v) ? v : v.toFixed(1)} d`;

export const formatRisk = (v: number): string => v.toFixed(2);

export const formatSigned = (v: number): string => (v > 0 ? `+${v.toFixed(2)}` : v < 0 ? `−${Math.abs(v).toFixed(2)}` : "0.00");

export function formatDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  // YYYY-MM-DD is rendered without timezone shifts.
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  const d = m ? new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])) : new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

export function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return "—";
  // Backend datetimes are naive UTC.
  const d = new Date(/[zZ]|[+-]\d\d:?\d\d$/.test(iso) ? iso : `${iso}Z`);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString("en-GB", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

export const STATUS_LABEL: Record<string, string> = {
  pending: "Pending evaluation",
  evaluated: "Evaluated",
  decided: "Decision recorded",
  completed: "Outcome recorded",
};

export const statusLabel = (s: string): string => STATUS_LABEL[s] ?? s;

export function adjustmentTone(v: number): "up" | "down" | "flat" {
  if (v > 0.005) return "up";
  if (v < -0.005) return "down";
  return "flat";
}

const amountFmt = new Intl.NumberFormat("en-IN", { maximumFractionDigits: 2 });
/** Amounts whose currency the backend does not specify (historical dataset values, outcome costs). */
export const formatAmount = (v: number | null | undefined): string => (v == null ? "—" : amountFmt.format(v));
