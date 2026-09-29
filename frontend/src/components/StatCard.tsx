import type { ReactNode } from "react";
import { Icon } from "./Icon";
import type { IconName } from "./Icon";
import { Skeleton } from "./States";

export function StatCard({
  label,
  value,
  hint,
  icon,
  loading,
  accent,
}: {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  icon: IconName;
  loading?: boolean;
  accent?: boolean;
}) {
  return (
    <div className={`stat ${accent ? "stat-accent" : ""}`}>
      <span className="stat-icon" aria-hidden="true">
        <Icon name={icon} size={24} strokeWidth={1.6} />
      </span>
      <span className="stat-label">{label}</span>
      <div className="stat-value">{loading ? <Skeleton h={26} w={56} /> : value}</div>
      {hint && <div className="stat-hint">{hint}</div>}
    </div>
  );
}
