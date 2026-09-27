"""Database seed service for VendorPulse.

Populates SQLite database with Phase 0 processed historical purchase records and
vendor aggregates.
"""

from pathlib import Path
from typing import Dict, Any
import pandas as pd
from sqlalchemy.orm import Session

from app.db.base import Base
from app.db.session import engine, SessionLocal
from app.models.vendor import Vendor
from app.models.purchase_order import PurchaseOrder
from app.services.data_service import (
    get_repo_root,
    check_raw_datasets_exist,
    clean_and_transform_procurement_data,
    enrich_with_synthetic_context,
    generate_vendor_summary,
)


def seed_database_from_processed_data(db: Session, repo_root: Path = None) -> Dict[str, int]:
    """Seeds database using processed Phase 0 CSVs or dynamically running pipeline."""
    if repo_root is None:
        repo_root = get_repo_root()

    processed_dir = repo_root / "data" / "processed"
    history_csv = processed_dir / "vendor_purchase_history.csv"
    vendor_summary_csv = processed_dir / "vendor_summary.csv"

    # Create tables if not existing
    Base.metadata.create_all(bind=engine)

    # Check if database already seeded
    existing_vendors = db.query(Vendor).count()
    if existing_vendors > 0:
        existing_pos = db.query(PurchaseOrder).count()
        return {
            "vendors_seeded": 0,
            "purchase_orders_seeded": 0,
            "message": f"Database already populated ({existing_vendors} vendors, {existing_pos} POs).",
        }

    # Load data
    if history_csv.exists() and vendor_summary_csv.exists():
        df_history = pd.read_csv(history_csv)
        df_vendors = pd.read_csv(vendor_summary_csv)
    else:
        # Fallback: Check raw datasets and run pipeline in-memory
        paths_info = check_raw_datasets_exist(repo_root)
        df_raw = pd.read_csv(paths_info["primary_path"])
        df_clean, _ = clean_and_transform_procurement_data(df_raw)
        df_history = enrich_with_synthetic_context(df_clean, seed=42)
        df_vendors = generate_vendor_summary(df_history)

    # Seed Vendors
    vendor_id_map: Dict[str, str] = {}
    vendors_count = 0

    for _, row in df_vendors.iterrows():
        v_name = str(row["vendor_name"])
        vendor_obj = Vendor(
            name=v_name,
            total_orders=int(row.get("total_orders", 0)),
            delivered_orders=int(row.get("delivered_orders", 0)),
            cancelled_orders=int(row.get("cancelled_orders", 0)),
            pending_orders=int(row.get("pending_orders", 0)),
            partially_delivered_orders=int(row.get("partially_delivered_orders", 0)),
            average_delivery_days=float(row["average_delivery_days"]) if pd.notna(row.get("average_delivery_days")) else None,
            average_defect_rate=float(row["average_defect_rate"]) if pd.notna(row.get("average_defect_rate")) else None,
            compliance_failure_rate=float(row["compliance_failure_rate"]) if pd.notna(row.get("compliance_failure_rate")) else None,
            total_negotiated_savings=float(row["total_negotiated_savings"]) if pd.notna(row.get("total_negotiated_savings")) else None,
            average_negotiated_savings=float(row["average_negotiated_savings"]) if pd.notna(row.get("average_negotiated_savings")) else None,
        )
        db.add(vendor_obj)
        db.flush()  # populate vendor_obj.id
        vendor_id_map[v_name] = vendor_obj.id
        vendors_count += 1

    # Seed Historical Purchase Orders
    po_count = 0
    for _, row in df_history.iterrows():
        v_name = str(row["vendor_name"])
        v_id = vendor_id_map.get(v_name)

        po_obj = PurchaseOrder(
            po_id=str(row["po_id"]),
            vendor_id=v_id,
            vendor_name=v_name,
            material_category=str(row.get("material_category", "General")),
            order_date=str(row["order_date"]) if pd.notna(row.get("order_date")) else None,
            delivery_date=str(row["delivery_date"]) if pd.notna(row.get("delivery_date")) else None,
            order_status=str(row.get("order_status", "Unknown")),
            quantity=int(row.get("quantity", 0)),
            unit_price=float(row.get("unit_price", 0.0)),
            negotiated_price=float(row.get("negotiated_price", 0.0)),
            defective_units=int(row["defective_units"]) if pd.notna(row.get("defective_units")) else 0,
            compliance=str(row.get("compliance", "Unknown")),
            delivery_days=float(row["delivery_days"]) if pd.notna(row.get("delivery_days")) else None,
            delay_days=None,  # Explicitly null per schema rules
            defect_rate=float(row["defect_rate"]) if pd.notna(row.get("defect_rate")) else None,
            unit_savings=float(row["unit_savings"]) if pd.notna(row.get("unit_savings")) else None,
            negotiated_savings=float(row["negotiated_savings"]) if pd.notna(row.get("negotiated_savings")) else None,
            delay_reason=str(row["delay_reason"]) if pd.notna(row.get("delay_reason")) else None,
            vendor_explanation=str(row["vendor_explanation"]) if pd.notna(row.get("vendor_explanation")) else None,
            resolution=str(row["resolution"]) if pd.notna(row.get("resolution")) else None,
            procurement_decision=str(row["procurement_decision"]) if pd.notna(row.get("procurement_decision")) else None,
            outcome=str(row["outcome"]) if pd.notna(row.get("outcome")) else None,
            additional_cost=float(row["additional_cost"]) if pd.notna(row.get("additional_cost")) else None,
            context_source=str(row.get("context_source", "synthetic_demo")),
            is_synthetic_context=bool(row.get("is_synthetic_context", True)),
        )
        db.add(po_obj)
        po_count += 1

    db.commit()

    return {
        "vendors_seeded": vendors_count,
        "purchase_orders_seeded": po_count,
        "message": f"Successfully seeded {vendors_count} vendors and {po_count} purchase orders.",
    }
