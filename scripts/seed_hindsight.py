#!/usr/bin/env python3
"""VendorPulse Phase 2 — Hindsight Memory Seeding Script.

Ingests Phase 0 historical procurement purchase experiences into the
Hindsight memory bank (vendorpulse-procurement).

Usage:
    python scripts/seed_hindsight.py
"""

import sys
from pathlib import Path

# Add backend to Python path
REPO_ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(REPO_ROOT / "backend"))

import pandas as pd
from app.services.data_service import (
    check_raw_datasets_exist,
    clean_and_transform_procurement_data,
    enrich_with_synthetic_context,
    convert_record_to_hindsight_experience,
)
from app.services.hindsight_service import hindsight_service


def main() -> None:
    print("==================================================")
    print("   VendorPulse Hindsight Memory Seeding Pipeline  ")
    print("==================================================")
    print(f"Repository Root: {REPO_ROOT}")
    print(f"Target Hindsight Bank: {hindsight_service.bank_id}")
    print(f"Mock Mode: {hindsight_service.mock_mode}\n")

    processed_dir = REPO_ROOT / "data" / "processed"
    history_csv = processed_dir / "vendor_purchase_history.csv"

    if history_csv.exists():
        print(f"Loading Phase 0 dataset from {history_csv}...")
        df_history = pd.read_csv(history_csv)
    else:
        print("Phase 0 CSV not found on disk. Running in-memory processing pipeline...")
        try:
            paths_info = check_raw_datasets_exist(REPO_ROOT)
            df_raw = pd.read_csv(paths_info["primary_path"])
            df_clean, _ = clean_and_transform_procurement_data(df_raw)
            df_history = enrich_with_synthetic_context(df_clean, seed=42)
        except Exception as err:
            print(f"ERROR: Failed to load raw dataset for seeding: {err}", file=sys.stderr)
            sys.exit(1)

    print(f"Processing {len(df_history)} historical records into Hindsight memories...")

    retained_count = 0
    failed_count = 0

    for idx, row in df_history.iterrows():
        record_dict = row.to_dict()
        exp_obj = convert_record_to_hindsight_experience(record_dict)

        success = hindsight_service.retain_purchase_experience(
            vendor_name=exp_obj["vendor_name"],
            po_id=exp_obj["po_id"],
            category=exp_obj["category"],
            experience_text=exp_obj["experience_text"],
            metadata={
                "order_status": record_dict.get("order_status"),
                "compliance": record_dict.get("compliance"),
                "delivery_days": record_dict.get("delivery_days"),
                "defect_rate": record_dict.get("defect_rate"),
            },
            is_synthetic_context=exp_obj["is_synthetic_context"],
        )

        if success:
            retained_count += 1
        else:
            failed_count += 1

    print("\n==================================================")
    print("   Hindsight Seeding Completed                    ")
    print("==================================================")
    print(f"Total Experiences Processed: {len(df_history)}")
    print(f"Successfully Retained:      {retained_count}")
    print(f"Failed Ingestions:          {failed_count}")


if __name__ == "__main__":
    main()
