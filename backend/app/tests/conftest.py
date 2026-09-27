"""Pytest configuration and global fixtures for VendorPulse tests."""

import sys
from pathlib import Path
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

# Automatically add 'backend' directory to sys.path so tests run seamlessly from repo root without setting PYTHONPATH
backend_dir = Path(__file__).resolve().parents[2]
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

from app.main import app
from app.db.base import Base
from app.db.session import get_db
from app.models import Vendor, PurchaseOrder, PurchaseRequest, ProcurementDecision, ProcurementOutcome


# Setup shared in-memory SQLite database for test isolation
SQLALCHEMY_DATABASE_URL = "sqlite:///:memory:"

test_engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=test_engine)


def override_get_db():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()


app.dependency_overrides[get_db] = override_get_db


@pytest.fixture(autouse=True)
def setup_test_database():
    """Creates database tables and seeds base test records before each test."""
    Base.metadata.create_all(bind=test_engine)
    db = TestingSessionLocal()

    # Clear any residual records
    db.query(ProcurementOutcome).delete()
    db.query(ProcurementDecision).delete()
    db.query(PurchaseRequest).delete()
    db.query(PurchaseOrder).delete()
    db.query(Vendor).delete()
    db.commit()

    # Seed base test vendor
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

    pr = PurchaseRequest(
        id="pr-agent-1",
        request_number="PR-0088",
        material_name="Industrial Bearings",
        material_category="Machinery Parts",
        quantity=300,
        target_delivery_date="2025-07-15",
        budget=15000.0,
        priority="high",
        status="pending",
    )
    db.add(pr)

    db.commit()
    db.close()

    yield

    db = TestingSessionLocal()
    db.query(ProcurementOutcome).delete()
    db.query(ProcurementDecision).delete()
    db.query(PurchaseRequest).delete()
    db.query(PurchaseOrder).delete()
    db.query(Vendor).delete()
    db.commit()
    db.close()


@pytest.fixture
def client():
    with TestClient(app) as c:
        yield c


@pytest.fixture
def db_session():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()
