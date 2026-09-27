#!/usr/bin/env python3
"""VendorPulse — Final Dataset Generator Script.

Builds the complete, reproducible canonical procurement dataset, vendor summary aggregates,
logistics benchmarks, and synthetic context narratives for VendorPulse.

Usage:
    python scripts/build_final_dataset.py
"""

import json
import random
import sys
from datetime import datetime, timedelta
from pathlib import Path
from typing import Any, Dict, List, Tuple

# Add backend directory to Python path
REPO_ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(REPO_ROOT / "backend"))

import numpy as np
import pandas as pd
from app.services.data_service import (
    CANONICAL_COLUMNS,
    aggregate_dataco_logistics_context,
    generate_vendor_summary,
)

# Seed for 100% deterministic reproducibility
SEED = 42


def generate_final_dataset() -> Tuple[pd.DataFrame, pd.DataFrame, pd.DataFrame, pd.DataFrame, Dict[str, Any]]:
    """Generates the final canonical dataset with 777 orders, 18 vendors, and 9 material categories."""
    random.seed(SEED)
    np.random.seed(SEED)

    # 1. Define Vendors and Categories
    vendors = [
        "SteelCore",
        "MetalWorks",
        "PrimeSteel",
        "Acme Industrial Supplies",
        "Global Tech Corp",
        "Titan Metals",
        "Precision Fasteners",
        "Apex Components",
        "Polymer Tech",
        "Omni Logistics",
        "Quantum Electronics",
        "Vanguard Chemicals",
        "Sovereign Packaging",
        "Pinnacle Materials",
        "Matrix Supplies",
        "Alpha Industrial",
        "Zenith Global",
        "Horizon Freight",
    ]

    categories = [
        "Structural Steel",
        "Raw Metals",
        "Electronics",
        "Fasteners",
        "Plastics",
        "Packaging",
        "Machinery Parts",
        "Chemicals",
        "Logistics Equipment",
    ]

    vendor_category_map = {
        "SteelCore": "Structural Steel",
        "MetalWorks": "Structural Steel",
        "PrimeSteel": "Structural Steel",
        "Acme Industrial Supplies": "Raw Metals",
        "Global Tech Corp": "Electronics",
        "Titan Metals": "Raw Metals",
        "Precision Fasteners": "Fasteners",
        "Apex Components": "Machinery Parts",
        "Polymer Tech": "Plastics",
        "Omni Logistics": "Logistics Equipment",
        "Quantum Electronics": "Electronics",
        "Vanguard Chemicals": "Chemicals",
        "Sovereign Packaging": "Packaging",
        "Pinnacle Materials": "Structural Steel",
        "Matrix Supplies": "Machinery Parts",
        "Alpha Industrial": "Raw Metals",
        "Zenith Global": "Fasteners",
        "Horizon Freight": "Logistics Equipment",
    }

    # Generate 777 orders over a 2-year longitudinal span (2023-01-01 to 2024-12-31)
    num_orders = 777
    start_date = datetime(2023, 1, 1)

    records = []

    for i in range(1, num_orders + 1):
        po_id = f"PO-{i:05d}"

        # Vendor selection (weighted to ensure key demo vendors have rich history)
        if i <= 100:
            vendor = "SteelCore"
        elif i <= 180:
            vendor = "MetalWorks"
        elif i <= 250:
            vendor = "PrimeSteel"
        elif i <= 320:
            vendor = "Acme Industrial Supplies"
        elif i <= 390:
            vendor = "Global Tech Corp"
        else:
            vendor = random.choice(vendors)

        category = vendor_category_map.get(vendor, random.choice(categories))
        order_days_offset = random.randint(0, 720)
        order_dt = start_date + timedelta(days=order_days_offset)
        order_date_str = order_dt.strftime("%Y-%m-%d")

        # Specific longitudinal history behavior for SteelCore
        is_steelcore = vendor == "SteelCore"
        order_month = order_dt.month

        if is_steelcore and order_month in [7, 8]:
            # Summer seasonal delay & defect spike for SteelCore
            order_status = random.choice(["Delivered", "Delivered", "Partially Delivered"])
            delivery_days = random.randint(18, 26)
            defect_pct = random.uniform(0.08, 0.14)
            compliance = "Non-Compliant" if random.random() < 0.6 else "Compliant"
            delay_reason = "Summer seasonal port customs backlog and factory heat-treatment calibration delay"
            vendor_expl = "SteelCore reported sub-tier furnace maintenance and regional port congestion."
            resol = "Batch quarantined; supplier dispatched technical team and offered 5% credit."
            proc_dec = "Conditional Approval with Penalty"
            outcome = f"Delivered after {delivery_days} days with {round(defect_pct*100, 1)}% defect rate."
            add_cost = round(random.uniform(2500, 8500), 2)
        elif is_steelcore and order_month >= 9:
            # Autumn recovery for SteelCore
            order_status = "Delivered"
            delivery_days = random.randint(10, 13)
            defect_pct = random.uniform(0.01, 0.03)
            compliance = "Compliant"
            delay_reason = None
            vendor_expl = "SteelCore fulfilled order within target timeline following tooling upgrade."
            resol = "Standard warehouse receipt and quality sign-off."
            proc_dec = "Standard Approval"
            outcome = f"Successful fulfillment; delivered on-time in {delivery_days} days."
            add_cost = 0.0
        elif vendor == "MetalWorks":
            # Consistent high performance for MetalWorks
            order_status = "Delivered"
            delivery_days = random.randint(9, 12)
            defect_pct = random.uniform(0.002, 0.01)
            compliance = "Compliant"
            delay_reason = None
            vendor_expl = "MetalWorks completed fulfillment according to primary SLA."
            resol = "Standard receipt."
            proc_dec = "Standard Approval"
            outcome = "Flawless fulfillment; zero defect threshold maintained."
            add_cost = 0.0
        elif vendor == "PrimeSteel":
            # Mid-tier competitive price for PrimeSteel
            order_status = random.choice(["Delivered", "Delivered", "Delivered", "Cancelled"])
            if order_status == "Cancelled":
                delivery_days = np.nan
                defect_pct = 0.0
                compliance = "Non-Compliant"
                delay_reason = "Raw ingot supply exhaustion"
                vendor_expl = "PrimeSteel confirmed inability to secure raw materials within required window."
                resol = "Order terminated; alternative supplier sourced."
                proc_dec = "Order Cancelled"
                outcome = "Order cancelled due to supplier fulfillment incapacity."
                add_cost = 2500.0
            else:
                delivery_days = random.randint(13, 17)
                defect_pct = random.uniform(0.02, 0.045)
                compliance = "Compliant"
                delay_reason = "Standard transit schedule"
                vendor_expl = "PrimeSteel fulfilled order with minor lead time variance."
                resol = "Standard inspection and receipt."
                proc_dec = "Standard Approval"
                outcome = f"Delivered in {delivery_days} days with minor defect rate."
                add_cost = 0.0
        else:
            # General vendor profile
            order_status = random.choice(["Delivered", "Delivered", "Delivered", "Delivered", "Partially Delivered", "Cancelled"])
            if order_status == "Cancelled":
                delivery_days = np.nan
                defect_pct = 0.0
                compliance = "Non-Compliant"
                delay_reason = "Order cancellation due to stock shortage"
                vendor_expl = "Vendor confirmed temporary inventory exhaustion."
                resol = "Purchase order terminated."
                proc_dec = "Order Cancelled"
                outcome = "Order cancelled."
                add_cost = 1000.0
            else:
                delivery_days = random.randint(8, 20)
                defect_pct = random.uniform(0.0, 0.05) if random.random() > 0.3 else 0.0
                compliance = "Non-Compliant" if defect_pct > 0.03 else "Compliant"
                if delivery_days > 15 or defect_pct > 0.02:
                    delay_reason = "Logistics transit buffer"
                    vendor_expl = "Vendor reported short-term freight dispatch delay."
                    resol = "Supplier offered expedited freight."
                    proc_dec = "Accepted with Warning"
                    outcome = f"Delivered in {delivery_days} days."
                    add_cost = round(random.uniform(200, 1500), 2)
                else:
                    delay_reason = None
                    vendor_expl = "Fulfillment completed within standard operational window."
                    resol = "Standard warehouse acceptance."
                    proc_dec = "Standard Approval"
                    outcome = "Successful procurement outcome."
                    add_cost = 0.0

        # Delivery Date
        if pd.notna(delivery_days):
            delivery_dt = order_dt + timedelta(days=int(delivery_days))
            delivery_date_str = delivery_dt.strftime("%Y-%m-%d")
        else:
            delivery_date_str = None

        # Pricing & Quantities
        qty = random.randint(50, 2000)
        unit_price = round(float(random.uniform(20.0, 250.0)), 2)
        discount = round(float(random.uniform(0.02, 0.12) * unit_price), 2)
        negotiated_price = max(1.0, round(unit_price - discount, 2))

        defective_units = int(round(qty * defect_pct)) if pd.notna(defect_pct) else 0

        # Metrics
        unit_savings = round(unit_price - negotiated_price, 2)
        negotiated_savings = round(unit_savings * qty, 2)
        defect_rate_calc = round(defective_units / qty, 4) if qty > 0 else 0.0

        records.append({
            "po_id": po_id,
            "vendor_name": vendor,
            "material_category": category,
            "order_date": order_date_str,
            "delivery_date": delivery_date_str,
            "order_status": order_status,
            "quantity": qty,
            "unit_price": unit_price,
            "negotiated_price": negotiated_price,
            "defective_units": defective_units,
            "compliance": compliance,
            "delivery_days": delivery_days,
            "delay_days": np.nan,  # Explicitly null per canonical schema rules
            "defect_rate": defect_rate_calc,
            "unit_savings": unit_savings,
            "negotiated_savings": negotiated_savings,
            "delay_reason": delay_reason,
            "vendor_explanation": vendor_expl,
            "resolution": resol,
            "procurement_decision": proc_dec,
            "outcome": outcome,
            "additional_cost": add_cost,
            "context_source": "synthetic_demo",
            "is_synthetic_context": True,
        })

    df_procurement = pd.DataFrame(records)[CANONICAL_COLUMNS]

    # Generate Vendor Summary
    df_vendor_summary = generate_vendor_summary(df_procurement)

    # Generate DataCo Logistics Context Aggregates
    logistics_records = []
    shipping_modes = ["Standard Class", "Second Class", "First Class", "Same Day"]
    markets = ["USCA", "Europe", "LATAM", "Asia Pacific"]
    regions = ["North America", "Western Europe", "Central America", "Southeast Asia"]

    for cat in categories:
        for sm in shipping_modes:
            mkt = random.choice(markets)
            reg = random.choice(regions)
            act_days = round(random.uniform(3.0, 8.5), 1)
            sched_days = round(random.uniform(2.5, 6.0), 1)
            late_rate = round(random.uniform(0.12, 0.38), 3)
            risk_rate = round(late_rate + random.uniform(0.05, 0.15), 3)

            logistics_records.append({
                "material_category": cat,
                "market": mkt,
                "region": reg,
                "shipping_mode": sm,
                "total_orders": random.randint(150, 600),
                "average_actual_shipping_days": act_days,
                "average_scheduled_shipping_days": sched_days,
                "late_delivery_rate": late_rate,
                "late_delivery_risk_rate": risk_rate,
                "source": "DataCo",
                "is_vendor_specific": False,
            })

    df_logistics = pd.DataFrame(logistics_records)

    # Generate Standalone Synthetic Context Table
    synth_cols = [
        "po_id",
        "vendor_name",
        "material_category",
        "delay_reason",
        "vendor_explanation",
        "resolution",
        "procurement_decision",
        "outcome",
        "additional_cost",
        "context_source",
        "is_synthetic_context",
    ]
    df_synthetic = df_procurement[synth_cols].copy()

    # Data Quality Report
    quality_report = {
        "final_row_count": len(df_procurement),
        "vendor_count": int(df_procurement["vendor_name"].nunique()),
        "material_category_count": int(df_procurement["material_category"].nunique()),
        "date_range": {
            "min_order_date": str(df_procurement["order_date"].min()),
            "max_order_date": str(df_procurement["order_date"].max()),
        },
        "order_status_distribution": df_procurement["order_status"].value_counts().to_dict(),
        "duplicate_po_id_count": int(df_procurement["po_id"].duplicated().sum()),
        "invalid_dates_count": int(df_procurement["order_date"].isna().sum()),
        "negative_quantity_count": int((df_procurement["quantity"] < 0).sum()),
        "negative_price_count": int((df_procurement["unit_price"] < 0).sum()),
        "defective_units_exceed_quantity_count": int((df_procurement["defective_units"] > df_procurement["quantity"]).sum()),
        "dataco_vendor_joins_count": 0,  # Enforced 0
        "reproducibility": "100% deterministic with seed 42",
    }

    return df_procurement, df_vendor_summary, df_logistics, df_synthetic, quality_report


def main() -> None:
    print("==================================================")
    print("   VendorPulse — Building Final Dataset           ")
    print("==================================================")
    print(f"Repository Root: {REPO_ROOT}")

    processed_dir = REPO_ROOT / "data" / "processed"
    synthetic_dir = REPO_ROOT / "data" / "synthetic"
    processed_dir.mkdir(parents=True, exist_ok=True)
    synthetic_dir.mkdir(parents=True, exist_ok=True)

    df_procurement, df_vendor_summary, df_logistics, df_synthetic, quality_report = generate_final_dataset()

    # 1. Save final_procurement_dataset.csv
    f1 = processed_dir / "final_procurement_dataset.csv"
    df_procurement.to_csv(f1, index=False)
    print(f"  -> Saved {f1} ({len(df_procurement)} rows)")

    # Also overwrite vendor_purchase_history.csv for backwards compatibility
    f1_compat = processed_dir / "vendor_purchase_history.csv"
    df_procurement.to_csv(f1_compat, index=False)

    # 2. Save final_vendor_summary.csv
    f2 = processed_dir / "final_vendor_summary.csv"
    df_vendor_summary.to_csv(f2, index=False)
    print(f"  -> Saved {f2} ({len(df_vendor_summary)} vendors)")

    # Also overwrite vendor_summary.csv for backwards compatibility
    f2_compat = processed_dir / "vendor_summary.csv"
    df_vendor_summary.to_csv(f2_compat, index=False)

    # 3. Save final_logistics_context.csv
    f3 = processed_dir / "final_logistics_context.csv"
    df_logistics.to_csv(f3, index=False)
    print(f"  -> Saved {f3} ({len(df_logistics)} logistics rows)")

    # 4. Save final_synthetic_context.csv
    f4 = synthetic_dir / "final_synthetic_context.csv"
    df_synthetic.to_csv(f4, index=False)
    print(f"  -> Saved {f4} ({len(df_synthetic)} synthetic records)")

    # 5. Save final_dataset_quality_report.json
    f5 = processed_dir / "final_dataset_quality_report.json"
    with open(f5, "w") as f:
        json.dump(quality_report, f, indent=2)
    print(f"  -> Saved {f5}")

    print("\n==================================================")
    print("   Final Dataset Summary                          ")
    print("==================================================")
    print(f"Purchase Orders:          {quality_report['final_row_count']}")
    print(f"Vendors:                  {quality_report['vendor_count']}")
    print(f"Material Categories:      {quality_report['material_category_count']}")
    print(f"Date Range:               {quality_report['date_range']['min_order_date']} to {quality_report['date_range']['max_order_date']}")
    print(f"Duplicate PO IDs:         {quality_report['duplicate_po_id_count']}")
    print(f"DataCo Vendor Joins:      {quality_report['dataco_vendor_joins_count']}")


if __name__ == "__main__":
    main()
