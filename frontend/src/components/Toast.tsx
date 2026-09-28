import { useAppState } from "../state/AppState";
import { Icon } from "./Icon";

export function Toasts() {
  const { toasts, dismissToast } = useAppState();
  return (
    <div className="toasts" aria-live="polite" aria-atomic="false">
      {toasts.map((t) => (
        <div key={t.id} className={`toast toast-${t.tone}`} role={t.tone === "error" ? "alert" : "status"}>
          <Icon name={t.tone === "success" ? "checkCircle" : t.tone === "error" ? "alert" : "info"} size={16} />
          <div className="toast-body">
            <p className="toast-title">{t.title}</p>
            {t.message && <p className="toast-msg">{t.message}</p>}
          </div>
          <button type="button" className="icon-btn" onClick={() => dismissToast(t.id)} aria-label="Dismiss notification">
            <Icon name="x" size={14} />
          </button>
        </div>
      ))}
    </div>
  );
}
