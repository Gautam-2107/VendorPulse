#!/usr/bin/env python3
"""VendorPulse Phase 0 — Dataset Preparation Pipeline Script.

Executes data validation, cleaning, source mapping, derived metrics,
synthetic context generation, vendor summary aggregation, and DataCo
logistics context processing.

Usage:
    python scripts/prepare_datasets.py
"""

import json
import sys
from pathlib import Path

# Add backend to Python path
REPO_ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(REPO_ROOT / "backend"))

import pandas as pd
from app.services.data_service import (
    DATACO_DATASET_NAME,
    PRIMARY_DATASET_NAME,
    aggregate_dataco_logistics_context,
    check_raw_datasets_exist,
    clean_and_transform_procurement_data,
    enrich_with_synthetic_context,
    generate_vendor_summary,
)


def main() -> None:
    print("==================================================")
    print("   VendorPulse Phase 0 Data Processing Pipeline   ")
    print("==================================================")
    print(f"Repository Root: {REPO_ROOT}\n")

    # 1. Check Raw Dataset Presence
    try:
        paths_info = check_raw_datasets_exist(REPO_ROOT)
    except FileNotFoundError as err:
        print(f"ERROR: {err}", file=sys.stderr)
        sys.exit(1)

    primary_path = paths_info["primary_path"]
    dataco_path = paths_info["dataco_path"]
    dataco_exists = paths_info["dataco_exists"]

    # Ensure output directories exist
    processed_dir = REPO_ROOT / "data" / "processed"
    synthetic_dir = REPO_ROOT / "data" / "synthetic"
    processed_dir.mkdir(parents=True, exist_ok=True)
    synthetic_dir.mkdir(parents=True, exist_ok=True)

    # 2. Process Primary Dataset (Procurement KPI Dataset)
    print(f"[1/4] Loading Primary Procurement Dataset from {primary_path}...")
    try:
        df_primary_raw = pd.read_csv(primary_path)
    except Exception as e:
        print(f"ERROR reading primary dataset CSV: {e}", file=sys.stderr)
        sys.exit(1)

    print(f"      Raw rows loaded: {len(df_primary_raw)}")

    print("[2/4] Cleaning, mapping canonical fields, and calculating derived metrics...")
    df_clean, quality_report = clean_and_transform_procurement_data(df_primary_raw)

    print("[3/4] Generating deterministic synthetic context fields...")
    df_canonical = enrich_with_synthetic_context(df_clean, seed=42)

    print("[4/4] Aggregating vendor summary metrics...")
    vendor_summary_df = generate_vendor_summary(df_canonical)

    # 3. Process Secondary Dataset (DataCo Dataset)
    if dataco_exists:
        print(f"\nProcessing Optional DataCo Dataset from {dataco_path}...")
        try:
            df_dataco_raw = pd.read_csv(dataco_path, encoding="latin1")
            logistics_summary = aggregate_dataco_logistics_context(df_dataco_raw)
            print(f"      DataCo logistics context rows aggregated: {len(logistics_summary)}")
        except Exception as e:
            print(f"Warning: Failed to process DataCo dataset: {e}")
            logistics_summary = aggregate_dataco_logistics_context(pd.DataFrame())
    else:
        print(f"\nSkipping DataCo processing (file not found at {dataco_path}).")
        logistics_summary = aggregate_dataco_logistics_context(pd.DataFrame())

    # 4. Save Processed Artifacts
    print("\nSaving output files...")

    # Output 1: Canonical Vendor Purchase History
    out_history = processed_dir / "vendor_purchase_history.csv"
    df_canonical.to_csv(out_history, index=False)
    print(f"  -> Saved {out_history} ({len(df_canonical)} rows)")

    # Output 2: Logistics Context
    out_logistics = processed_dir / "logistics_context.csv"
    logistics_summary.to_csv(out_logistics, index=False)
    print(f"  -> Saved {out_logistics} ({len(logistics_summary)} rows)")

    # Output 3: Vendor Summary
    out_vendor_summary = processed_dir / "vendor_summary.csv"
    vendor_summary_df.to_csv(out_vendor_summary, index=False)
    print(f"  -> Saved {out_vendor_summary} ({len(vendor_summary_df)} vendors)")

    # Output 4: Quality Report JSON
    out_quality = processed_dir / "data_quality_report.json"
    with open(out_quality, "w") as f:
        json.dump(quality_report, f, indent=2)
    print(f"  -> Saved {out_quality}")

    # Output 5: Synthetic Context Records
    out_synthetic = synthetic_dir / "synthetic_context_records.csv"
    synth_cols = [
        "po_id",
        "vendor_name",
        "delay_reason",
        "vendor_explanation",
        "resolution",
        "procurement_decision",
        "outcome",
        "additional_cost",
        "context_source",
        "is_synthetic_context",
    ]
    df_canonical[synth_cols].to_csv(out_synthetic, index=False)
    print(f"  -> Saved {out_synthetic}")

    print("\n==================================================")
    print("   Phase 0 Data Processing Completed Successfully ")
    print("==================================================")


if __name__ == "__main__":
    main()
