import { API_BASE_URL } from "../api/client";
import { useAppState } from "../state/AppState";
import { Icon } from "./Icon";

export function Header({ title, subtitle }: { title: string; subtitle: string }) {
  const { connection, activeRequest, refreshAll, requests, vendors } = useAppState();
  const syncing = requests.status === "loading" || vendors.status === "loading";
  const connLabel = connection === "online" ? "API connected" : connection === "offline" ? "API offline" : "Connecting…";

  return (
    <header className="header">
      <div className="header-titles">
        <h1>{title}</h1>
        <p>{subtitle}</p>
      </div>
      <div className="header-meta">
        {activeRequest && (
          <div className="chip chip-request" title="Current procurement request">
            <Icon name="requests" size={13} />
            <span className="mono">{activeRequest.request_number}</span>
            <span className="chip-sep" aria-hidden="true" />
            <span>{activeRequest.material_name}</span>
          </div>
        )}
        <div className={`chip chip-conn conn-${connection}`} title={API_BASE_URL}>
          <span className="dot" aria-hidden="true" />
          <span>{connLabel}</span>
        </div>
        <button
          type="button"
          className="icon-btn"
          onClick={() => void refreshAll()}
          aria-label="Reload data from backend"
          title="Reload data from backend"
          disabled={syncing}
        >
          <Icon name="refresh" size={15} className={syncing ? "spin" : ""} />
        </button>
      </div>
    </header>
  );
}
