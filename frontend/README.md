# VendorPulse — Frontend

Procurement intelligence console for VendorPulse. It consumes the FastAPI backend in `../backend` and makes the Hindsight memory loop visible:

**Request → Hindsight recall → Recommendation → Human decision → Outcome → New memory**

Stack: React 18 · TypeScript (strict) · Vite 5 · plain CSS (no UI framework, no icon dependency).

## Run

```bash
# 1. Backend (from repo root)
cd backend && uvicorn app.main:app --reload --port 8000

# 2. Frontend
cd frontend
cp .env.example .env          # optional — defaults to http://127.0.0.1:8000/api/v1
npm install
npm run dev                   # http://127.0.0.1:5173
```

`npm run build` type-checks (`tsc --noEmit`) and produces `dist/`. `npm run typecheck` runs the type check only.

## Configuration

| Variable            | Default                         | Purpose                                       |
| ------------------- | ------------------------------- | --------------------------------------------- |
| `VITE_API_BASE_URL` | `http://127.0.0.1:8000/api/v1`  | Backend base URL, including the `/api/v1` prefix |

All HTTP calls go through `src/api/client.ts` (timeouts, error classification). No URLs are hard-coded elsewhere.

## API endpoints used

| Endpoint | Used for |
| --- | --- |
| `GET /purchase-requests` | Request list, stats, persistence after reload |
| `POST /purchase-requests` | Creating the demo request (pre-filled Apex values; user clicks Create) |
| `GET /vendors` | Before-memory KPI table, vendor pages, connection check |
| `GET /vendors/{id}/history` | Vendor drawer, Memory page |
| `POST /evaluations` | Hindsight recall, vendor comparison, recommendation |
| `POST /decisions` · `GET /decisions/{id}` | Explicit human decision; re-fetch after reload |
| `POST /outcomes` · `GET /outcomes/{id}` | Outcome recording + Hindsight retention; re-fetch after reload |
| `POST /seed` | Settings → Seed database |

Types in `src/types/api.ts` mirror `backend/app/models/schemas.py`, `backend/app/api/evaluations.py` and the dict shapes produced by `backend/app/agent/procurement_agent.py`. Every response is validated at runtime (`src/api/parse.ts`); a shape mismatch shows an "Unexpected response" state instead of crashing.

## Data integrity notes

- Nothing is hard-coded: memories, risk scores, flags and the recommendation are rendered from the `POST /evaluations` response.
- Memory cards show the recalled text verbatim. Labelled fields (PO, status, defect rate, reason, explanation, resolution, outcome) are only shown when that exact phrase appears in the text (`src/utils/memoryText.ts`).
- Rates from the backend are fractions (`0.017` → `1.70%`). The outcome form accepts a percentage and sends a fraction.
- The backend has no list endpoint for decisions, outcomes or Hindsight memories. The browser stores only the decision/outcome **IDs** returned by the API so they can be re-fetched after a reload. The Memory page says that memory is retrieved contextually during evaluation and does not claim to list every Hindsight memory.
- The backend's evaluation response is not persisted server-side, so after a reload the request status, decision and outcome come back from the API, but the recall panel needs a fresh evaluation.
- Historical amounts are shown without a currency symbol, because the dataset does not specify one; only the request budget is shown in ₹.
