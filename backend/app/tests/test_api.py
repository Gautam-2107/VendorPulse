"""Integration unit tests for FastAPI REST endpoints and database CRUD operations."""

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.main import app
from app.db.base import Base
from app.db.session import get_db
from app.models.vendor import Vendor
from app.models.purchase_order import PurchaseOrder


# Setup in-memory SQLite database for test isolation
SQLALCHEMY_DATABASE_URL = "sqlite:///:memory:"

engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def override_get_db():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()


app.dependency_overrides[get_db] = override_get_db


@pytest.fixture(autouse=True)
def setup_test_database():
    """Creates database tables and seeds a sample vendor before each test."""
    Base.metadata.create_all(bind=engine)
    db = TestingSessionLocal()

    # Seed sample vendor
    vendor = Vendor(
        id="v-101",
        name="Test Acme Corp",
        total_orders=10,
        delivered_orders=9,
        cancelled_orders=1,
        average_delivery_days=12.5,
        average_defect_rate=0.015,
        compliance_failure_rate=0.0,
        total_negotiated_savings=1500.0,
        average_negotiated_savings=150.0,
    )
    db.add(vendor)

    po = PurchaseOrder(
        po_id="PO-TEST-1",
        vendor_id="v-101",
        vendor_name="Test Acme Corp",
        material_category="Metals",
        order_status="Delivered",
        quantity=100,
        unit_price=50.0,
        negotiated_price=45.0,
        defective_units=1,
        compliance="Compliant",
        delivery_days=12.0,
    )
    db.add(po)
    db.commit()
    db.close()

    yield

    Base.metadata.drop_all(bind=engine)


@pytest.fixture
def client():
    with TestClient(app) as c:
        yield c


def test_health_check_endpoint(client):
    """Test root health check endpoint."""
    res = client.get("/")
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "ok"
    assert data["app"] == "VendorPulse"


def test_list_vendors_and_detail(client):
    """Test listing vendors and fetching single vendor detail."""
    res = client.get("/api/v1/vendors")
    assert res.status_code == 200
    vendors = res.json()
    assert len(vendors) >= 1
    assert vendors[0]["name"] == "Test Acme Corp"

    # Detail
    v_id = vendors[0]["id"]
    detail_res = client.get(f"/api/v1/vendors/{v_id}")
    assert detail_res.status_code == 200
    assert detail_res.json()["id"] == v_id

    # History
    hist_res = client.get(f"/api/v1/vendors/{v_id}/history")
    assert hist_res.status_code == 200
    history = hist_res.json()
    assert len(history) == 1
    assert history[0]["po_id"] == "PO-TEST-1"


def test_purchase_request_lifecycle(client):
    """Test creating, fetching, deciding, and completing a purchase request."""
    # 1. Create Purchase Request
    pr_payload = {
        "material_name": "Aluminum Sheets 2mm",
        "material_category": "Raw Metals",
        "quantity": 500,
        "target_delivery_date": "2025-06-01",
        "budget": 25000.0,
        "priority": "high",
        "notes": "Urgent stock replenishment",
    }
    create_res = client.post("/api/v1/purchase-requests", json=pr_payload)
    assert create_res.status_code == 201
    pr_data = create_res.json()
    pr_id = pr_data["id"]
    assert pr_data["status"] == "pending"
    assert pr_data["request_number"].startswith("PR-")

    # List requests
    list_res = client.get("/api/v1/purchase-requests")
    assert list_res.status_code == 200
    assert len(list_res.json()) >= 1

    # 2. Submit Procurement Decision
    decision_payload = {
        "purchase_request_id": pr_id,
        "selected_vendor_id": "v-101",
        "decision_type": "approved",
        "decision_reason": "Vendor offers lowest defect rate and reliable delivery lead time.",
        "decider_name": "Jane Doe",
    }
    dec_res = client.post("/api/v1/decisions", json=decision_payload)
    assert dec_res.status_code == 201
    dec_data = dec_res.json()
    assert dec_data["purchase_request_id"] == pr_id
    assert dec_data["selected_vendor_name"] == "Test Acme Corp"

    # Verify PR status updated to 'decided'
    pr_detail = client.get(f"/api/v1/purchase-requests/{pr_id}").json()
    assert pr_detail["status"] == "decided"

    # 3. Submit Procurement Outcome
    outcome_payload = {
        "purchase_request_id": pr_id,
        "vendor_id": "v-101",
        "actual_delivery_date": "2025-06-03",
        "actual_delivery_days": 14,
        "delay_days": 2,
        "defect_rate": 0.0,
        "defective_units": 0,
        "delay_reason": "Minor customs delay",
        "vendor_explanation": "Vendor provided proactive notification.",
        "resolution": "Freight delivered safely with 2 days delay.",
        "additional_cost": 0.0,
        "outcome_summary": "Order fulfilled successfully with minor acceptable delay.",
    }
    out_res = client.post("/api/v1/outcomes", json=outcome_payload)
    assert out_res.status_code == 201
    out_data = out_res.json()
    assert out_data["purchase_request_id"] == pr_id
    assert out_data["delay_days"] == 2

    # Verify PR status updated to 'completed'
    pr_completed = client.get(f"/api/v1/purchase-requests/{pr_id}").json()
    assert pr_completed["status"] == "completed"
