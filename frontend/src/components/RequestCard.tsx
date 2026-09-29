import type { ReactNode } from "react";
import type { PurchaseRequest } from "../types/api";
import { formatDate, formatINR } from "../utils/format";
import { DISPLAY_LABEL } from "../utils/requestStatus";
import { Icon } from "./Icon";
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
          <span className={`pill pill-priority-${request.priority.toLowerCase()}`}>
            <Icon name="diamond" size={11} /> {request.priority} priority
          </span>
          <span className={`pill pill-status-${status}`} data-testid="request-status">
            {DISPLAY_LABEL[status]}
          </span>
        </div>
      </div>

      <dl className="request-grid">
        <div>
          <dt>
            <span className="req-icon" aria-hidden="true">
              <Icon name="box" size={17} />
            </span>
            <span className="req-label">Material</span>
          </dt>
          <dd>{request.material_name}</dd>
        </div>
        {showCategory && (
          <div>
            <dt>
            <span className="req-icon" aria-hidden="true">
              <Icon name="requests" size={17} />
            </span>
            <span className="req-label">Category</span>
          </dt>
            <dd>{request.material_category}</dd>
          </div>
        )}
        <div>
          <dt>
            <span className="req-icon" aria-hidden="true">
              <Icon name="scale" size={17} />
            </span>
            <span className="req-label">Quantity</span>
          </dt>
          <dd>{qty}</dd>
        </div>
        <div>
          <dt>
            <span className="req-icon" aria-hidden="true">
              <Icon name="calendar" size={17} />
            </span>
            <span className="req-label">Target delivery</span>
          </dt>
          <dd>{formatDate(request.target_delivery_date)}</dd>
        </div>
        <div>
          <dt>
            <span className="req-icon" aria-hidden="true">
              <Icon name="wallet" size={17} />
            </span>
            <span className="req-label">Budget</span>
          </dt>
          <dd>{formatINR(request.budget)}</dd>
        </div>
        {window_ && (
          <div>
            <dt>
            <span className="req-icon" aria-hidden="true">
              <Icon name="clock" size={17} />
            </span>
            <span className="req-label">Window</span>
          </dt>
            <dd>{window_}</dd>
          </div>
        )}
      </dl>
      {actions && <div className="request-actions">{actions}</div>}
    </section>
  );
}
