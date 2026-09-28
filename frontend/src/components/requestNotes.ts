import type { PurchaseRequest } from "../types/api";
import { formatInt } from "../utils/format";

/**
 * Presentation details read from a request's free-text `notes` (the backend
 * has no unit / requester / window fields). Two formats are understood:
 *   - "Requester: Apex Manufacturing · Unit: kg · Procurement window: 3 weeks"  (this app's form)
 *   - "Apex Manufacturing requires 10,000 kg of structural steel within a 3-week procurement window."
 * Only text actually present in the notes is used; the unit is accepted only
 * when it directly follows the request's own quantity.
 */
export interface RequestDetails {
  requester: string | null;
  unit: string | null;
  window: string | null;
  rest: string;
}

const UNIT_WORDS = "kg|kgs|kilograms?|tonnes?|tons?|t|mt|g|lbs?|pounds?|units?|pcs|pieces?|litres?|liters?|l|m|metres?|meters?|boxes|pallets?|rolls?|sheets?|sets?";

export function parseNotes(notes: string | null, quantity?: number): RequestDetails {
  const out: RequestDetails = { requester: null, unit: null, window: null, rest: "" };
  if (!notes) return out;

  const pairs: Record<string, string> = {};
  const rest: string[] = [];
  for (const part of notes.split(/\s·\s|\n/)) {
    const m = /^\s*([A-Za-z][A-Za-z ]{1,30}):\s*(.+?)\s*$/.exec(part);
    if (m) pairs[m[1].trim().toLowerCase()] = m[2];
    else if (part.trim()) rest.push(part.trim());
  }
  out.requester = pairs["requester"] ?? null;
  out.unit = pairs["unit"] ?? null;
  out.window = pairs["procurement window"] ?? null;

  const sentence = rest.join(" ");
  if (!out.unit && quantity != null) {
    // "<quantity> <unit>" where the number equals the request quantity (with or without separators)
    const re = new RegExp(`(\\d[\\d,. ]*)\\s*(${UNIT_WORDS})\\b`, "gi");
    for (const m of sentence.matchAll(re)) {
      if (Number(m[1].replace(/[, ]/g, "")) === quantity) {
        out.unit = m[2];
        break;
      }
    }
  }
  if (!out.window) {
    const w = /(\d+)[\s-](day|week|month)s?\s+procurement window/i.exec(sentence) ?? /procurement window of\s+(\d+)\s+(day|week|month)s?/i.exec(sentence);
    if (w) out.window = `${w[1]} ${w[2].toLowerCase()}${w[1] === "1" ? "" : "s"}`;
  }
  if (!out.requester) {
    const r = /^\s*([A-Z][\w&.'-]*(?:\s+[A-Z][\w&.'-]*){0,4})\s+(?:requires|needs|requests|is requesting)\b/.exec(sentence);
    if (r) out.requester = r[1];
  }
  out.rest = sentence;
  return out;
}

export function quantityLabel(request: Pick<PurchaseRequest, "quantity" | "notes">): string {
  const { unit } = parseNotes(request.notes, request.quantity);
  return `${formatInt(request.quantity)} ${unit ?? "units"}`;
}

export function buildNotes(fields: { requester?: string; unit?: string; window?: string; extra?: string }): string | null {
  const parts: string[] = [];
  if (fields.requester?.trim()) parts.push(`Requester: ${fields.requester.trim()}`);
  if (fields.unit?.trim()) parts.push(`Unit: ${fields.unit.trim()}`);
  if (fields.window?.trim()) parts.push(`Procurement window: ${fields.window.trim()}`);
  if (fields.extra?.trim()) parts.push(fields.extra.trim());
  return parts.length ? parts.join(" · ") : null;
}
