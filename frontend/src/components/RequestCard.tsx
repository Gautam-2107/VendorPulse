import type { ReactNode } from "react";
import type { PurchaseRequest } from "../types/api";
import { formatDate, formatINR, formatInt, statusLabel } from "../utils/format";
import { Icon } from "./Icon";
import { parseNotes } from "./requestNotes";

export function RequestCard({ request, actions }: { request: PurchaseRequest; actions?: ReactNode }) {
  const { pairs, rest } = parseNotes(request.notes);
  const requester = pairs["requester"];
  const unit = pairs["unit"];
  const window_ = pairs["procurement window"];

  return (
    <section className="request-card" aria-labelledby="active-request-title">
      <div className="request-top">
        <div>
          <span className="eyebrow">
            Active procurement request · <span className="mono">{request.request_number}</span>
          </span>
          <h2 id="active-request-title">{requester ?? request.material_name}</h2>
          {requester && <p className="request-sub">{request.material_name}</p>}
        </div>
        <div className="request-badges">
          <span className={`pill pill-priority-${request.priority.toLowerCase()}`}>{request.priority.toUpperCase()} PRIORITY</span>
          <span className={`pill pill-status-${request.status}`}>{statusLabel(request.status)}</span>
        </div>
      </div>

      <dl className="request-grid">
        <div>
          <dt>Material</dt>
          <dd>{request.material_name}</dd>
        </div>
        <div>
          <dt>Category</dt>
          <dd>{request.material_category}</dd>
        </div>
        <div>
          <dt>Quantity</dt>
          <dd>
            {formatInt(request.quantity)} {unit ?? "units"}
          </dd>
        </div>
        <div>
          <dt>Target delivery</dt>
          <dd>{formatDate(request.target_delivery_date)}</dd>
        </div>
        <div>
          <dt>Budget</dt>
          <dd>{formatINR(request.budget)}</dd>
        </div>
        {window_ && (
          <div>
            <dt>Procurement window</dt>
            <dd>{window_}</dd>
          </div>
        )}
      </dl>
      {rest && (
        <p className="request-notes">
          <Icon name="info" size={13} /> {rest}
        </p>
      )}
      {actions && <div className="request-actions">{actions}</div>}
    </section>
  );
}
