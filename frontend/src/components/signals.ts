/** Classify backend memory_flags using the vocabulary in procurement_agent._memory_risk. */
export function isPositiveFlag(flag: string): boolean {
  const f = flag.toLowerCase();
  if (f.includes("non-compliant")) return false;
  return /strong historical quality|efficient historical fulfillment|historically compliant|successful historical delivery/.test(f);
}
