# VendorPulse Phase 2 Documentation — Hindsight Memory & Groq Agent

## Overview

Phase 2 implements the core intelligence and persistent memory layer of VendorPulse:
1. **Hindsight Memory Integration** (`hindsight-client` SDK, bank `vendorpulse-procurement`).
2. **Groq LLM Integration** (`groq` SDK, model `openai/gpt-oss-120b`).
3. **Procurement Agent Orchestration** (`ProcurementAgent` evaluating purchase requests against DB stats and recalled Hindsight memories).
4. **Learning Loop (Outcome -> Retain -> Recall)**: Retaining order fulfillment outcomes in Hindsight to dynamically alter future vendor risk evaluations.

---

## 1. Why Hindsight is Essential to VendorPulse

Standard procurement dashboards rely exclusively on static aggregate statistics (e.g. "Vendor A: 92% on-time delivery"). However, numbers obscure critical qualitative context:
- *Why* was a delivery delayed? (e.g. Unannounced raw material bottleneck vs. seasonal port congestion).
- *How* did the vendor resolve the issue? (e.g. Provided expedited air freight at own expense vs. failed to notify buyer).

Hindsight provides persistent memory that **materially changes agent recommendations over time**:
- **Without Memory**: VendorPulse recommends Vendor A based solely on static baseline averages.
- **With Hindsight**: VendorPulse recalls prior seasonal delays and unannounced defects for Vendor A, elevating risk severity and recommending additional lead time buffers or alternative suppliers.

---

## 2. Hindsight Integration Architecture

All Hindsight memory calls are encapsulated inside `app.services.hindsight_service.HindsightService`:

- **SDK Dependency**: `hindsight-client`
- **Default Base URL**: `https://api.hindsight.vectorize.io`
- **Default Bank ID**: `vendorpulse-procurement` (configurable via `HINDSIGHT_BANK_ID`)

### Retain Flow
When a purchase order outcome is logged via `POST /api/v1/outcomes`:
1. Outcome details (delay days, defect rate, vendor explanation, resolution) are formatted into a qualitative narrative.
2. `hindsight_service.retain_procurement_outcome(...)` is invoked.
3. Upon successful memory retention, `is_retained_to_hindsight = True` is saved in SQLite.

### Recall Flow
When a purchase request is evaluated via `POST /api/v1/evaluations`:
1. `ProcurementAgent` retrieves candidate vendors from SQLite.
2. For each candidate vendor, `hindsight_service.recall_vendor_experience(vendor_name, query)` retrieves relevant memories.
3. Recalled memories are synthesized into the evidence payload passed to Groq LLM.

---

## 3. Groq LLM & Procurement Agent Workflow

- **Provider**: Groq Python SDK (`groq`).
- **Default Model**: `openai/gpt-oss-120b`.
- **Mock Fallback**: Deterministic mock response generator when `HINDSIGHT_MOCK_MODE=true` or API keys are unavailable.

---

## 4. Environment Variables

Configure environment variables in `.env` (refer to `.env.example`):

```env
GROQ_API_KEY=your_groq_api_key_here
LLM_PROVIDER=groq
LLM_MODEL=openai/gpt-oss-120b

HINDSIGHT_API_KEY=your_hindsight_api_key_here
HINDSIGHT_API_URL=https://api.hindsight.vectorize.io
HINDSIGHT_BANK_ID=vendorpulse-procurement
HINDSIGHT_MOCK_MODE=true
```

---

## 5. Seeding Hindsight Memories

To seed Phase 0 historical purchase experiences into the Hindsight memory bank:

```bash
python scripts/seed_hindsight.py
```

---

## 6. API Evaluation Endpoint Example

### Request
```http
POST /api/v1/evaluations
Content-Type: application/json

{
  "purchase_request_id": "pr-uuid-1234"
}
```

### Response
```json
{
  "purchase_request_id": "pr-uuid-1234",
  "recommended_vendor": "Acme Industrial Supplies",
  "recommended_vendor_id": "v-101",
  "recommendation": "Recommend approving order with 'Acme Industrial Supplies' for 500 units of Aluminum Sheets.",
  "reasoning": "Selected Acme based on superior historical quality metrics and favorable Hindsight memory context.",
  "risk_summary": "Low-to-Medium Risk. Baseline defect rate: 1.5%. Average lead time: 12.0 days.",
  "memory_evidence": [
    {
      "vendor": "Acme Industrial Supplies",
      "memory": "Purchase Order PO-1001 for 100 units experienced 12 days delivery duration...",
      "relevance": "Relevance score: 0.85 for Raw Metals"
    }
  ],
  "vendor_comparison": [
    {
      "vendor_id": "v-101",
      "vendor_name": "Acme Industrial Supplies",
      "delivered_orders": 10,
      "average_delivery_days": 12.0,
      "average_defect_rate": 0.015,
      "memory_count": 1
    }
  ],
  "important_caveats": "Human procurement manager must perform final approval before issuing formal purchase order."
}
```

---

## 7. Running Tests

Execute the complete test suite (Phase 0 + Phase 1 + Phase 2):

```bash
pytest
```
