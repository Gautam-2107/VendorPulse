/** Notes are free text stored by the backend. The demo form writes "Key: value" pairs separated by " · ". */
export function parseNotes(notes: string | null): { pairs: Record<string, string>; rest: string } {
  const pairs: Record<string, string> = {};
  const rest: string[] = [];
  if (!notes) return { pairs, rest: "" };
  for (const part of notes.split(/\s·\s|\n/)) {
    const m = /^\s*([A-Za-z][A-Za-z ]{1,30}):\s*(.+?)\s*$/.exec(part);
    if (m) pairs[m[1].trim().toLowerCase()] = m[2];
    else if (part.trim()) rest.push(part.trim());
  }
  return { pairs, rest: rest.join(" ") };
}

export function buildNotes(fields: { requester?: string; unit?: string; window?: string; extra?: string }): string | null {
  const parts: string[] = [];
  if (fields.requester?.trim()) parts.push(`Requester: ${fields.requester.trim()}`);
  if (fields.unit?.trim()) parts.push(`Unit: ${fields.unit.trim()}`);
  if (fields.window?.trim()) parts.push(`Procurement window: ${fields.window.trim()}`);
  if (fields.extra?.trim()) parts.push(fields.extra.trim());
  return parts.length ? parts.join(" · ") : null;
}
