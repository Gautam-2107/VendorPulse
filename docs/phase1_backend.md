# VendorPulse Phase 1 Backend Documentation

## Overview

Phase 1 establishes the core **FastAPI REST API** and **SQLite Database Foundation** for VendorPulse. It defines the structured domain data models and provides REST endpoints for candidate vendor metrics, purchase request creation, human procurement decisions, and actual fulfillment outcome recording.

---

## 1. Architecture & Unified Directory Layout

The backend follows clean architecture conventions under `backend/app/`:

```text
backend/app/
├── main.py                 # FastAPI application & startup lifespan
├── api/                    # REST API Endpoint Routers
│   ├── router.py           # Master API router (/api/v1)
│   ├── vendors.py          # /api/v1/vendors
│   ├── requests.py         # /api/v1/purchase-requests
│   ├── decisions.py        # /api/v1/decisions
│   └── outcomes.py         # /api/v1/outcomes
├── core/                   # Application settings & configuration
│   └── config.py           # Pydantic Settings
├── db/                     # Database Session & Base setup
│   ├── base.py             # SQLAlchemy DeclarativeBase
│   └── session.py          # SessionLocal factory & get_db dependency
├── models/                 # SQLAlchemy ORM & Pydantic Schemas
│   ├── vendor.py           # Vendor ORM model
│   ├── purchase_order.py   # Historical Purchase Order ORM model
│   ├── purchase_request.py # Purchase Request ORM model
│   ├── decision.py         # Procurement Decision ORM model
│   ├── outcome.py          # Procurement Outcome ORM model
│   └── schemas.py          # Pydantic API schemas
└── services/               # Business Logic & Seeding Service
    ├── data_service.py     # Phase 0 dataset processing
    └── seed_service.py     # SQLite seeding from Phase 0 dataset
```

---

## 2. Database Models (SQLite)

1. **`vendors`**: Stores supplier profile and baseline KPI aggregates (total orders, delivered/cancelled counts, average delivery days, defect rate, compliance failure rate, savings).
2. **`purchase_orders`**: Stores historical purchase order records from Phase 0 dataset (canonical fields, derived metrics, and labeled synthetic context).
3. **`purchase_requests`**: Stores newly created purchase requests created by procurement managers.
4. **`procurement_decisions`**: Records human vendor selection choices, justification reasons, and decider identity.
5. **`procurement_outcomes`**: Records actual fulfillment outcomes (delivery delay, defect rate, vendor explanations, additional financial cost).

---

## 3. REST API Endpoints

All endpoints are prefixed with `/api/v1`:

### Health Check
- `GET /`: Returns API health status.

### Vendors
- `GET /api/v1/vendors`: Returns list of candidate vendors with baseline KPI metrics.
- `GET /api/v1/vendors/{vendor_id}`: Returns detailed vendor profile.
- `GET /api/v1/vendors/{vendor_id}/history`: Returns historical purchase orders for a specific vendor.

### Purchase Requests
- `POST /api/v1/purchase-requests`: Creates a new purchase request (`status: "pending"`).
- `GET /api/v1/purchase-requests`: Lists all purchase requests.
- `GET /api/v1/purchase-requests/{request_id}`: Retrieves purchase request details.

### Decisions
- `POST /api/v1/decisions`: Records human procurement decision (updates request `status` to `"decided"`).
- `GET /api/v1/decisions/{decision_id}`: Retrieves decision details.

### Outcomes
- `POST /api/v1/outcomes`: Records order fulfillment outcome (updates request `status` to `"completed"`).
- `GET /api/v1/outcomes/{outcome_id}`: Retrieves outcome details.

### Database Seeding
- `POST /api/v1/seed`: Triggers database seeding from Phase 0 processed datasets.

---

## 4. Local Running & Testing

### Running the API Server

From the `backend/` directory:

```bash
uvicorn app.main:app --reload --port 8000
```

Access Interactive Swagger Documentation at: `http://localhost:8000/docs`

### Running Integration Unit Tests

From the repository root:

```bash
PYTHONPATH=backend pytest backend/app/tests
```
