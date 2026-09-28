import { useEffect, useRef } from "react";

/** Scrolls a newly revealed demo stage into view (respects reduced-motion). */
export function useRevealOnMount<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  useEffect(() => {
    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    const id = window.setTimeout(() => ref.current?.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" }), 60);
    return () => window.clearTimeout(id);
  }, []);
  return ref;
}
