import { useState } from "react";
import { API_BASE_URL, TIMEOUTS, describeError } from "../api/client";
import { seedDatabase } from "../api/vendors";
import { Icon } from "../components/Icon";
import { Spinner } from "../components/States";
import { useAppState } from "../state/AppState";

export function Settings() {
  const { connection, refreshAll, lastSync, pushToast, vendors, requests } = useAppState();
  const [seeding, setSeeding] = useState(false);
  const [seedResult, setSeedResult] = useState<string | null>(null);
  const [testing, setTesting] = useState(false);

  async function seed() {
    setSeeding(true);
    setSeedResult(null);
    try {
      const res = await seedDatabase();
      setSeedResult(JSON.stringify(res, null, 2));
      pushToast({ tone: "success", title: "Seed request completed" });
      await refreshAll();
    } catch (err) {
      const d = describeError(err);
      pushToast({ tone: "error", title: d.title, message: d.message });
    } finally {
      setSeeding(false);
    }
  }

  async function test() {
    setTesting(true);
    await refreshAll();
    setTesting(false);
  }

  return (
    <div className="page page-narrow">
      <section className="panel">
        <div className="panel-head">
          <div>
            <span className="eyebrow eyebrow-plain">Backend connection</span>
            <h3>API</h3>
          </div>
          <span className={`chip chip-conn conn-${connection}`}>
            <span className="dot" aria-hidden="true" />
            {connection === "online" ? "Connected" : connection === "offline" ? "Offline" : "Checking…"}
          </span>
        </div>
        <dl className="kv-grid kv-grid-2">
          <div><dt>Base URL</dt><dd className="mono small">{API_BASE_URL}</dd></div>
          <div><dt>Configured via</dt><dd className="mono small">VITE_API_BASE_URL</dd></div>
          <div><dt>Last sync</dt><dd>{lastSync ? new Date(lastSync).toLocaleTimeString() : "—"}</dd></div>
          <div><dt>Loaded</dt><dd>{vendors.data?.length ?? 0} vendors · {requests.data?.length ?? 0} requests</dd></div>
          <div><dt>Default timeout</dt><dd>{TIMEOUTS.default / 1000}s (evaluation {TIMEOUTS.evaluation / 1000}s)</dd></div>
        </dl>
        <div className="form-actions form-actions-left">
          <button type="button" className="btn btn-ghost" onClick={() => void test()} disabled={testing}>
            {testing ? <Spinner size={14} label="Testing…" /> : (<><Icon name="refresh" size={14} /> Test connection</>)}
          </button>
        </div>
      </section>

      <section className="panel">
        <div className="panel-head">
          <div>
            <span className="eyebrow eyebrow-plain">Data</span>
            <h3>Seed database</h3>
            <p className="muted">
              Calls <code>POST /seed</code>, which loads the processed procurement datasets into the backend database. The backend skips seeding if data already exists.
              This does not write Hindsight memories.
            </p>
          </div>
        </div>
        <div className="form-actions form-actions-left">
          <button type="button" className="btn btn-ghost" onClick={() => void seed()} disabled={seeding}>
            {seeding ? <Spinner size={14} label="Seeding…" /> : (<><Icon name="database" size={14} /> Seed database</>)}
          </button>
        </div>
        {seedResult && <pre className="code-block">{seedResult}</pre>}
      </section>

      <section className="panel">
        <div className="panel-head">
          <div>
            <span className="eyebrow eyebrow-plain">About</span>
            <h3>How VendorPulse decides</h3>
          </div>
        </div>
        <ul className="about-list">
          <li><b>Baseline risk</b> — computed by the backend from current vendor KPIs (defect rate, compliance failures, delivery days).</li>
          <li><b>Hindsight adjustment</b> — bounded risk change derived from experiences recalled from Hindsight memory.</li>
          <li><b>Combined risk</b> — baseline + adjustment; the lowest combined risk is recommended.</li>
          <li><b>Human decision</b> — nothing is ordered automatically; a procurement manager records the final choice.</li>
          <li><b>Browser storage</b> — only decision/outcome IDs returned by the API are kept locally so records can be re-fetched after reload.</li>
        </ul>
      </section>
    </div>
  );
}
