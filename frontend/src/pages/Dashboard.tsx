import { useState } from "react";
import { BaselineSignal } from "../components/BaselineSignal";
import { CreateRequestForm } from "../components/CreateRequestForm";
import { DecisionPanel } from "../components/DecisionPanel";
import { HindsightPanel, HindsightPlaceholder } from "../components/HindsightPanel";
import { Icon } from "../components/Icon";
import { LoopStrip, StoryBanner } from "../components/LoopStrip";
import type { Stage } from "../components/LoopStrip";
import { OutcomeForm } from "../components/OutcomeForm";
import { RecommendationCard } from "../components/RecommendationCard";
import { RequestCard } from "../components/RequestCard";
import { RetainedCard } from "../components/RetainedCard";
import { StatCard } from "../components/StatCard";
import { EmptyState, ErrorState, Skeleton, Spinner } from "../components/States";
import { VendorComparison } from "../components/VendorComparison";
import type { PageKey } from "../components/Sidebar";
import { useAppState } from "../state/AppState";
import { DISPLAY_LABEL, displayStatus } from "../utils/requestStatus";

export function Dashboard({ onOpenVendor, onNavigate }: { onOpenVendor: (id: string) => void; onNavigate: (p: PageKey) => void }) {
  const { requests, vendors, activeRequest, evaluations, decisions, outcomes, evaluate, refreshAll, setActiveRequest, pushToast } = useAppState();
  const [showCreate, setShowCreate] = useState(false);
  const [reloadedAt, setReloadedAt] = useState<number | null>(null);
  const [reloading, setReloading] = useState(false);

  const list = requests.data ?? [];
  const evalState = activeRequest ? evaluations[activeRequest.id] ?? { status: "idle" as const } : { status: "idle" as const };
  const evaluation = evalState.status === "done" ? evalState.data : null;
  const decision = activeRequest ? decisions[activeRequest.id] ?? null : null;
  const outcome = activeRequest ? outcomes[activeRequest.id] ?? null : null;
  const recRow = evaluation
    ? evaluation.vendor_comparison.find((r) => (evaluation.recommended_vendor_id ? r.vendor_id === evaluation.recommended_vendor_id : r.vendor_name === evaluation.recommended_vendor)) ?? null
    : null;

  const status = activeRequest?.status;
  const shown = activeRequest ? displayStatus(activeRequest, evalState, !!decision, !!outcome) : "pending";
  const stage: Stage = !activeRequest
    ? "request"
    : shown === "completed"
      ? "retained"
      : shown === "decided"
        ? "outcome"
        : shown === "evaluated"
          ? "decide"
          : "recall";

  const activeCount = list.filter((r) => r.status !== "completed").length;
  const decidedCount = list.filter((r) => r.status === "decided" || r.status === "completed").length;
  const loadingLists = requests.status === "loading" && !requests.data;

  async function reloadDemo() {
    setReloading(true);
    await refreshAll();
    setReloading(false);
    setReloadedAt(Date.now());
    pushToast({ tone: "info", title: "Reloaded from backend", message: "Requests, vendors, decisions and outcomes were fetched again from the API." });
  }

  const evaluateButton = activeRequest && (
    <button
      type="button"
      className="btn btn-primary btn-lg"
      onClick={() => void evaluate(activeRequest.id)}
      disabled={evalState.status === "running" || vendors.data?.length === 0}
    >
      {evalState.status === "running" ? (
        <Spinner size={15} label="Recalling Hindsight memory…" />
      ) : (
        <>
          <Icon name="search" size={17} /> {evalState.status === "done" ? "Re-run evaluation" : "Evaluate Vendors"}
        </>
      )}
    </button>
  );

  const preEval = !!activeRequest && evalState.status === "idle" && !decision && status !== "decided" && status !== "completed";

  const statsRow = (
    <div className="stats">
      <StatCard label="Active procurement requests" icon="requests" value={activeCount} loading={loadingLists} hint={`${list.length} total in backend`} />
      <StatCard
        label="Vendors evaluated"
        icon="vendors"
        value={evaluation ? evaluation.vendor_comparison.length : "—"}
        hint={evaluation && activeRequest ? `for ${activeRequest.request_number}` : "Awaiting evaluation"}
      />
      <StatCard label="Decisions recorded" icon="decisions" value={decidedCount} loading={loadingLists} hint="Human-approved requests" />
      <StatCard
        label="Hindsight memories"
        icon="memory"
        accent
        value={evaluation ? evaluation.memory_evidence.length : "—"}
        hint={evaluation ? "Recalled for the active request" : "Recalled during evaluation"}
      />
    </div>
  );

  return (
    <div className="page">
      <StoryBanner />

      <LoopStrip stage={stage} busy={evalState.status === "running"} />

      {requests.status === "error" && !requests.data ? (
        <ErrorState {...requests.error} onRetry={() => void refreshAll()} />
      ) : loadingLists ? (
        <div className="request-card" aria-busy="true">
          <Skeleton h={12} w={180} />
          <Skeleton h={26} w={280} />
          <div className="request-grid">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} h={32} />
            ))}
          </div>
        </div>
      ) : showCreate || !activeRequest ? (
        <CreateRequestForm onCreated={() => setShowCreate(false)} onCancel={activeRequest ? () => setShowCreate(false) : undefined} />
      ) : (
        <>
          <RequestCard
            request={activeRequest}
            status={shown}
            actions={
              <>
                {!decision && status !== "decided" && status !== "completed" && (
                  <div className="evaluate-cta">
                    {evaluateButton}
                    {evalState.status !== "done" && evalState.status !== "running" && (
                      <span className="muted small">Recalls past experiences from Hindsight for every candidate vendor</span>
                    )}
                  </div>
                )}
                <div className="request-actions-right">
                  {list.length > 1 && (
                    <label className="inline-select">
                      <span className="sr-only">Switch request</span>
                      <select value={activeRequest.id} onChange={(e) => setActiveRequest(e.target.value)} aria-label="Switch active request">
                        {list.map((r) => (
                          <option key={r.id} value={r.id}>
                            {r.request_number} · {r.material_name} · {DISPLAY_LABEL[displayStatus(r, evaluations[r.id], !!decisions[r.id], !!outcomes[r.id])]}
                          </option>
                        ))}
                      </select>
                    </label>
                  )}
                  <button type="button" className="btn btn-ghost" onClick={() => setShowCreate(true)}>
                    <Icon name="plus" size={15} /> New request
                  </button>
                </div>
              </>
            }
          />

          {preEval && (
            <div className="intel-grid">
              <HindsightPlaceholder request={activeRequest} />
              <section className="rec-placeholder" aria-label="Recommendation">
                <span className="eyebrow eyebrow-blue">
                  <Icon name="sparkle" size={14} /> VendorPulse Recommendation
                </span>
                <h3>Awaiting evaluation</h3>
                <p>The recommendation combines each vendor's baseline risk with the Hindsight adjustment from recalled experiences, once you evaluate vendors.</p>
                <dl className="rec-placeholder-terms" aria-hidden="true">
                  <div className="eq-baseline">
                    <dt>Baseline risk</dt>
                    <dd>—</dd>
                  </div>
                  <div className="eq-memory">
                    <dt>Hindsight adjustment</dt>
                    <dd>—</dd>
                  </div>
                  <div className="eq-combined">
                    <dt>Combined risk</dt>
                    <dd>—</dd>
                  </div>
                </dl>
              </section>
            </div>
          )}

          {evalState.status !== "idle" && (
            <div className="intel-grid">
              <HindsightPanel evalState={evalState} request={activeRequest} vendorCount={vendors.data?.length ?? 0} onRetry={() => void evaluate(activeRequest.id)} />
              {evaluation ? (
                <RecommendationCard evaluation={evaluation} row={recRow} request={activeRequest} />
              ) : (
                <section className="rec-placeholder" aria-live="polite">
                  <span className="eyebrow eyebrow-blue">
                    <Icon name="sparkle" size={14} /> VendorPulse Recommendation
                  </span>
                  <h3>{evalState.status === "running" ? "Waiting for Hindsight recall…" : "No recommendation available"}</h3>
                  <p>
                    {evalState.status === "running"
                      ? "The recommendation is produced from current KPIs combined with the memories being recalled."
                      : "The evaluation did not complete, so there is no recommendation for this request yet."}
                  </p>
                </section>
              )}
            </div>
          )}

          {statsRow}

          {vendors.data?.length === 0 && (
            <EmptyState icon="vendors" title="No vendors available to evaluate">
              The vendor table is empty. Seed the database from <b>Settings</b>, then reload.
            </EmptyState>
          )}

          {preEval && <BaselineSignal onOpenVendor={onOpenVendor} />}

          {evaluation &&
            (evaluation.vendor_comparison.length > 0 ? (
              <VendorComparison
                rows={evaluation.vendor_comparison}
                recommendedId={evaluation.recommended_vendor_id}
                recommendedName={evaluation.recommended_vendor}
                onOpenVendor={onOpenVendor}
              />
            ) : (
              <EmptyState icon="vendors" title="The evaluation returned no vendor comparison" />
            ))}

          {evaluation && !decision && status !== "decided" && status !== "completed" && (
            <DecisionPanel request={activeRequest} evaluation={evaluation} decision={null} />
          )}

          {decision && evaluation && <DecisionPanel request={activeRequest} evaluation={evaluation} decision={decision} />}
          {decision && !evaluation && (
            <section className="decision decision-done">
              <span className="decision-check" aria-hidden="true">
                <Icon name="check" size={16} strokeWidth={2.5} />
              </span>
              <div>
                <span className="eyebrow">Final procurement decision · recorded</span>
                <h3>{decision.selected_vendor_name}</h3>
                <p className="muted">
                  {decision.decision_type} · {decision.decider_name}
                </p>
                <p className="decision-reason">“{decision.decision_reason}”</p>
              </div>
            </section>
          )}

          {!decision && (status === "decided" || status === "completed") && (
            <EmptyState icon="decisions" title={`${activeRequest.request_number} already has a recorded decision`}>
              The decision was recorded outside this browser. The backend has no endpoint to list decisions, so its details can't be shown here.
            </EmptyState>
          )}

          {decision && !outcome && status !== "completed" && <OutcomeForm request={activeRequest} decision={decision} />}

          {outcome && (
            <RetainedCard
              outcome={outcome}
              decision={decision}
              onViewMemory={() => onNavigate("memory")}
              onReload={() => void reloadDemo()}
              onNewRequest={() => setShowCreate(true)}
              reloadedAt={reloadedAt}
              reloading={reloading}
              requestStatus={status ?? null}
            />
          )}

          {(evalState.status !== "idle" || decision) && status !== "completed" && (
            <details className="panel-details">
              <summary>
                <Icon name="database" size={13} /> Current procurement signal (before memory)
              </summary>
              <BaselineSignal onOpenVendor={onOpenVendor} dimmed />
            </details>
          )}
        </>
      )}
    </div>
  );
}
