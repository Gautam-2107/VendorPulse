/** Small inline stroke-icon set (no icon dependency). */
const PATHS = {
  dashboard: ["M3 3h7v9H3z", "M14 3h7v5h-7z", "M14 12h7v9h-7z", "M3 16h7v5H3z"],
  requests: ["M9 2h6a1 1 0 0 1 1 1v2H8V3a1 1 0 0 1 1-1z", "M8 4H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2h-2", "M9 12h6", "M9 16h4"],
  vendors: ["M3 21h18", "M5 21V8l7-5 7 5v13", "M9 21v-6h6v6"],
  decisions: ["M9 11l3 3 8-8", "M20 12v6a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h9"],
  memory: ["M12 5a3 3 0 1 0-5.99.13A4 4 0 0 0 4 12a4 4 0 0 0 2 7h1", "M12 5a3 3 0 1 1 5.99.13A4 4 0 0 1 20 12a4 4 0 0 1-2 7h-1", "M12 5v16", "M8 13h1", "M15 13h1"],
  settings: ["M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z", "M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"],
  pulse: ["M3 12h4l3-8 4 16 3-8h4"],
  search: ["M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16z", "M21 21l-4.3-4.3"],
  history: ["M3 12a9 9 0 1 0 3-6.7L3 8", "M3 3v5h5", "M12 7v5l4 2"],
  arrowRight: ["M5 12h14", "M12 5l7 7-7 7"],
  arrowUp: ["M12 19V5", "M5 12l7-7 7 7"],
  arrowDown: ["M12 5v14", "M19 12l-7 7-7-7"],
  minus: ["M5 12h14"],
  check: ["M20 6L9 17l-5-5"],
  checkCircle: ["M22 11.1V12a10 10 0 1 1-5.9-9.1", "M22 4L12 14l-3-3"],
  alert: ["M10.3 3.9L1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z", "M12 9v4", "M12 17h.01"],
  x: ["M18 6L6 18", "M6 6l12 12"],
  refresh: ["M21 12a9 9 0 0 1-15.5 6.3L3 16", "M3 12a9 9 0 0 1 15.5-6.3L21 8", "M21 3v5h-5", "M3 21v-5h5"],
  plus: ["M12 5v14", "M5 12h14"],
  user: ["M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2", "M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z"],
  database: ["M12 8c4.4 0 8-1.3 8-3s-3.6-3-8-3-8 1.3-8 3 3.6 3 8 3z", "M4 5v14c0 1.7 3.6 3 8 3s8-1.3 8-3V5", "M4 12c0 1.7 3.6 3 8 3s8-1.3 8-3"],
  shield: ["M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"],
  sparkle: ["M12 3l1.9 5.8L20 11l-6.1 2.2L12 19l-1.9-5.8L4 11l6.1-2.2z"],
  chevronRight: ["M9 18l6-6-6-6"],
  chevronDown: ["M6 9l6 6 6-6"],
  box: ["M21 16V8a2 2 0 0 0-1-1.7l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.7l7 4a2 2 0 0 0 2 0l7-4a2 2 0 0 0 1-1.7z", "M3.3 7L12 12l8.7-5", "M12 22V12"],
  clock: ["M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20z", "M12 6v6l4 2"],
  wifiOff: ["M2 2l20 20", "M8.5 16.5a5 5 0 0 1 7 0", "M5 12.9a10 10 0 0 1 5.2-2.8", "M19 12.9a10 10 0 0 0-2.3-1.7", "M12 20h.01"],
  barChart: ["M3 3v18h18", "M8 17v-5", "M13 17V8", "M18 17v-8"],
  calendar: ["M5 4h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z", "M16 2v4", "M8 2v4", "M3 10h18"],
  wallet: ["M20 7H5a2 2 0 0 1 0-4h13v4", "M3 5v14a2 2 0 0 0 2 2h15v-4", "M20 13h-4a2 2 0 0 0 0 4h4v-4z"],
  scale: ["M12 3v18", "M5 21h14", "M3 7h18", "M6 7l-3 7a3 3 0 0 0 6 0L6 7", "M18 7l-3 7a3 3 0 0 0 6 0l-3-7"],
  diamond: ["M12 2l10 10-10 10L2 12z"],
  info: ["M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20z", "M12 16v-4", "M12 8h.01"],
} satisfies Record<string, string[]>;

export type IconName = keyof typeof PATHS;

export function Icon({ name, size = 16, className, strokeWidth = 1.75 }: { name: IconName; size?: number; className?: string; strokeWidth?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
      focusable="false"
    >
      {PATHS[name].map((d, i) => (
        <path key={i} d={d} />
      ))}
    </svg>
  );
}
