import { Icon } from "./Icon";
import type { IconName } from "./Icon";

export type PageKey = "dashboard" | "requests" | "vendors" | "decisions" | "memory" | "settings";

const NAV: { key: PageKey; label: string; icon: IconName }[] = [
  { key: "dashboard", label: "Dashboard", icon: "dashboard" },
  { key: "requests", label: "Purchase Requests", icon: "requests" },
  { key: "vendors", label: "Vendor Intelligence", icon: "vendors" },
  { key: "decisions", label: "Decision History", icon: "decisions" },
  { key: "memory", label: "Memory", icon: "memory" },
  { key: "settings", label: "Settings", icon: "settings" },
];

export function Sidebar({ page, onNavigate }: { page: PageKey; onNavigate: (p: PageKey) => void }) {
  return (
    <aside className="sidebar" aria-label="Primary">
      <div className="brand">
        <span className="brand-mark" aria-hidden="true">
          <Icon name="pulse" size={18} strokeWidth={2.25} />
        </span>
        <div className="brand-text">
          <span className="brand-name">VendorPulse</span>
          <span className="brand-sub">Vendor risk memory</span>
        </div>
      </div>
      <nav aria-label="Main">
        <p className="nav-label">Workspace</p>
        <ul className="nav">
          {NAV.map((n) => (
            <li key={n.key}>
              <a
                href={`#/${n.key}`}
                className={`nav-item ${page === n.key ? "active" : ""}`}
                aria-current={page === n.key ? "page" : undefined}
                aria-label={n.label}
                title={n.label}
                onClick={(e) => {
                  e.preventDefault();
                  onNavigate(n.key);
                }}
              >
                <Icon name={n.icon} size={16} />
                <span>{n.label}</span>
              </a>
            </li>
          ))}
        </ul>
      </nav>
      <div className="sidebar-foot">
        <div className="hindsight-badge">
          <span className="hindsight-badge-icon" aria-hidden="true">
            <Icon name="memory" size={17} />
          </span>
          <span className="hindsight-badge-text">
            <small>Powered by</small> <b>Hindsight memory</b>
          </span>
        </div>
        <p>Human approval required for every procurement decision.</p>
      </div>
    </aside>
  );
}
