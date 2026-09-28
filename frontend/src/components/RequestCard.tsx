import type { ReactNode } from "react";
import type { PurchaseRequest } from "../types/api";
import { formatDate, formatINR } from "../utils/format";
import { DISPLAY_LABEL } from "../utils/requestStatus";
import type { DisplayStatus } from "../utils/requestStatus";
import { parseNotes, quantityLabel } from "./requestNotes";

export function RequestCard({ request, status, actions }: { request: PurchaseRequest; status: DisplayStatus; actions?: ReactNode }) {
  const { requester, window: window_ } = parseNotes(request.notes, request.quantity);
  const qty = quantityLabel(request);
  const showCategory = request.material_category.trim().toLowerCase() !== request.material_name.trim().toLowerCase();

  return (
    <section className="request-card" aria-labelledby="active-request-title">
      <div className="request-top">
        <div className="request-heading">
          <span className="eyebrow eyebrow-plain">
            Active procurement request · <span className="mono">{request.request_number}</span>
          </span>
          <h2 id="active-request-title">{requester ?? request.material_name}</h2>
          <p className="request-sub">
            {qty} of {request.material_name}
            {window_ ? ` · ${window_} procurement window` : ""}
          </p>
        </div>
        <div className="request-badges">
          <span className={`pill pill-priority-${request.priority.toLowerCase()}`}>{request.priority} priority</span>
          <span className={`pill pill-status-${status}`} data-testid="request-status">
            {DISPLAY_LABEL[status]}
          </span>
        </div>
      </div>

      <dl className="request-grid">
        <div>
          <dt>Material</dt>
          <dd>{request.material_name}</dd>
        </div>
        {showCategory && (
          <div>
            <dt>Category</dt>
            <dd>{request.material_category}</dd>
          </div>
        )}
        <div>
          <dt>Quantity</dt>
          <dd>{qty}</dd>
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
            <dt>Window</dt>
            <dd>{window_}</dd>
          </div>
        )}
      </dl>
      {actions && <div className="request-actions">{actions}</div>}
    </section>
  );
}
