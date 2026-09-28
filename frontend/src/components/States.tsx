import type { ReactNode } from "react";
import { Icon } from "./Icon";
import type { IconName } from "./Icon";

export function Spinner({ size = 16, label }: { size?: number; label?: string }) {
  return (
    <span className="spinner-wrap" role="status" aria-live="polite">
      <span className="spinner" style={{ width: size, height: size }} aria-hidden="true" />
      {label ? <span>{label}</span> : <span className="sr-only">Loading</span>}
    </span>
  );
}

export function Skeleton({ h = 14, w = "100%", className = "" }: { h?: number; w?: number | string; className?: string }) {
  return <span className={`skeleton ${className}`} style={{ height: h, width: w }} aria-hidden="true" />;
}

export function SkeletonRows({ rows = 5, cols = 5 }: { rows?: number; cols?: number }) {
  return (
    <div className="skeleton-table" aria-busy="true" aria-label="Loading">
      {Array.from({ length: rows }).map((_, r) => (
        <div key={r} className="skeleton-row" style={{ gridTemplateColumns: `2fr repeat(${cols - 1}, 1fr)` }}>
          {Array.from({ length: cols }).map((__, c) => (
            <Skeleton key={c} h={12} w={c === 0 ? "70%" : "55%"} />
          ))}
        </div>
      ))}
    </div>
  );
}

export function ErrorState({
  title,
  message,
  onRetry,
  compact = false,
}: {
  title: string;
  message: string;
  onRetry?: () => void;
  compact?: boolean;
}) {
  const offline = title === "Backend offline";
  return (
    <div className={`state state-error ${compact ? "state-compact" : ""}`} role="alert">
      <span className="state-icon">
        <Icon name={offline ? "wifiOff" : "alert"} size={18} />
      </span>
      <div className="state-body">
        <p className="state-title">{title}</p>
        <p className="state-msg">{message}</p>
      </div>
      {onRetry && (
        <button type="button" className="btn btn-ghost btn-sm" onClick={onRetry}>
          <Icon name="refresh" size={14} /> Retry
        </button>
      )}
    </div>
  );
}

export function EmptyState({ icon = "info", title, children }: { icon?: IconName; title: string; children?: ReactNode }) {
  return (
    <div className="state state-empty">
      <span className="state-icon">
        <Icon name={icon} size={18} />
      </span>
      <div className="state-body">
        <p className="state-title">{title}</p>
        {children && <div className="state-msg">{children}</div>}
      </div>
    </div>
  );
}
