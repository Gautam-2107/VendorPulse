import type { ReactNode } from "react";
import { Icon } from "./Icon";
import type { IconName } from "./Icon";

export type Tone = "blue" | "purple" | "green" | "amber" | "neutral";

/** Shared card heading: tinted icon tile, eyebrow, title, description and optional actions. */
export function SectionHead({
  icon,
  tone = "blue",
  eyebrow,
  title,
  titleId,
  description,
  actions,
}: {
  icon: IconName;
  tone?: Tone;
  eyebrow?: ReactNode;
  title: ReactNode;
  titleId?: string;
  description?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <div className="section-head">
      <span className={`icon-tile icon-tile-${tone}`} aria-hidden="true">
        <Icon name={icon} size={18} />
      </span>
      <div className="section-head-text">
        {eyebrow && <span className={`eyebrow eyebrow-${tone}`}>{eyebrow}</span>}
        <h3 id={titleId}>{title}</h3>
        {description && <p>{description}</p>}
      </div>
      {actions && <div className="section-head-actions">{actions}</div>}
    </div>
  );
}
