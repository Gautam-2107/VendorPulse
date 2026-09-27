"""Unit tests for VendorPulse Phase 0 Data Service and Pipeline."""

from pathlib import Path
import pytest
import pandas as pd
import numpy as np

from app.services.data_service import (
    clean_and_transform_procurement_data,
    enrich_with_synthetic_context,
    aggregate_dataco_logistics_context,
    generate_vendor_summary,
    convert_record_to_hindsight_experience,
    check_raw_datasets_exist,
    CANONICAL_COLUMNS,
)


@pytest.fixture
def sample_raw_procurement_df():
    """Fixture providing sample raw Procurement KPI dataset records."""
    data = [
        {
            "PO_ID": "PO-1001",
            "Supplier": "Acme Industrial Supplies",
            "Order_Date": "2024-01-10",
            "Delivery_Date": "2024-01-20",
            "Item_Category": "Raw Metals",
            "Order_Status": "Delivered",
            "Quantity": 100,
            "Unit_Price": 50.0,
            "Negotiated_Price": 45.0,
            "Defective_Units": 2,
            "Compliance": "Compliant",
        },
        {
            "PO_ID": "PO-1002",
            "Supplier": "Acme Industrial Supplies",
            "Order_Date": "2024-02-01",
            "Delivery_Date": None,
            "Item_Category": "Raw Metals",
            "Order_Status": "Cancelled",
            "Quantity": 50,
            "Unit_Price": 50.0,
            "Negotiated_Price": 50.0,
            "Defective_Units": 0,
            "Compliance": "Non-Compliant",
        },
        {
            "PO_ID": "PO-1003",
            "Supplier": "Global Tech Corp",
            "Order_Date": "2024-03-01",
            "Delivery_Date": "2024-03-15",
            "Item_Category": "Electronics",
            "Order_Status": "Delivered",
            "Quantity": 200,
            "Unit_Price": 120.0,
            "Negotiated_Price": 100.0,
            "Defective_Units": 10,
            "Compliance": "Compliant",
        },
    ]
    return pd.DataFrame(data)


@pytest.fixture
def sample_raw_dataco_df():
    """Fixture providing sample DataCo logistics records (no supplier IDs)."""
    data = [
        {
            "Days for shipping (real)": 5,
            "Days for shipment (scheduled)": 4,
            "Delivery Status": "Late delivery",
            "Late_delivery_risk": 1,
            "Category Name": "Electronics",
            "Market": "USCA",
            "Order Region": "Central America",
            "Shipping Mode": "Standard Class",
        },
        {
            "Days for shipping (real)": 3,
            "Days for shipment (scheduled)": 4,
            "Delivery Status": "Advance shipping",
            "Late_delivery_risk": 0,
            "Category Name": "Electronics",
            "Market": "USCA",
            "Order Region": "Central America",
            "Shipping Mode": "Standard Class",
        },
    ]
    return pd.DataFrame(data)


def test_clean_and_transform_procurement_mapping_and_metrics(sample_raw_procurement_df):
    """Test source-to-canonical mapping, date parsing, and derived metrics calculations."""
    df_clean, report = clean_and_transform_procurement_data(sample_raw_procurement_df)

    # Check mapping
    assert "po_id" in df_clean.columns
    assert "vendor_name" in df_clean.columns
    assert "material_category" in df_clean.columns
    assert df_clean.loc[0, "vendor_name"] == "Acme Industrial Supplies"

    # Check delivery_days
    # Row 0: 2024-01-20 - 2024-01-10 = 10 days
    assert df_clean.loc[0, "delivery_days"] == 10
    # Row 1: Delivery_Date is None -> delivery_days should be NaN
    assert np.isnan(df_clean.loc[1, "delivery_days"])

    # Check delay_days is strictly NaN (not invented)
    assert np.isnan(df_clean.loc[0, "delay_days"])
    assert np.isnan(df_clean.loc[1, "delay_days"])

    # Check defect_rate
    # Row 0: 2 / 100 = 0.02
    assert df_clean.loc[0, "defect_rate"] == pytest.approx(0.02)

    # Check unit_savings and negotiated_savings
    # Row 0: Unit_Price(50) - Negotiated_Price(45) = 5.0
    assert df_clean.loc[0, "unit_savings"] == pytest.approx(5.0)
    # Negotiated Savings: 5.0 * 100 = 500.0
    assert df_clean.loc[0, "negotiated_savings"] == pytest.approx(500.0)

    # Check quality report
    assert report["input_row_count"] == 3
    assert report["output_row_count"] == 3
    assert report["duplicate_count"] == 0


def test_invalid_and_duplicate_data_handling():
    """Test handling of duplicates, negative quantities/prices, and missing dates."""
    data = [
        {
            "PO_ID": "PO-999",
            "Supplier": "Bad Data Vendor",
            "Order_Date": "invalid-date",
            "Delivery_Date": "2024-01-10",
            "Item_Category": "Hardware",
            "Order_Status": "Delivered",
            "Quantity": -10,
            "Unit_Price": -50.0,
            "Negotiated_Price": 40.0,
            "Defective_Units": 15,  # > Quantity
            "Compliance": "Compliant",
        },
        {
            "PO_ID": "PO-999",
            "Supplier": "Bad Data Vendor",
            "Order_Date": "invalid-date",
            "Delivery_Date": "2024-01-10",
            "Item_Category": "Hardware",
            "Order_Status": "Delivered",
            "Quantity": -10,
            "Unit_Price": -50.0,
            "Negotiated_Price": 40.0,
            "Defective_Units": 15,
            "Compliance": "Compliant",
        },
    ]
    df_raw = pd.DataFrame(data)
    df_clean, report = clean_and_transform_procurement_data(df_raw)

    # Duplicate should be removed
    assert len(df_clean) == 1
    assert report["duplicate_count"] == 1
    assert report["invalid_dates_count"] > 0
    assert len(report["validation_warnings"]) > 0


def test_enrich_with_synthetic_context(sample_raw_procurement_df):
    """Test synthetic context field generation, tagging, and deterministic seed behavior."""
    df_clean, _ = clean_and_transform_procurement_data(sample_raw_procurement_df)
    df_synth = enrich_with_synthetic_context(df_clean, seed=42)

    # Ensure canonical columns exist
    for col in CANONICAL_COLUMNS:
        assert col in df_synth.columns

    # Verify synthetic flags
    assert (df_synth["is_synthetic_context"] == True).all()
    assert (df_synth["context_source"] == "synthetic_demo").all()

    # Cancelled order should have cancellation context
    cancelled_row = df_synth[df_synth["po_id"] == "PO-1002"].iloc[0]
    assert cancelled_row["procurement_decision"] == "Order Cancelled"
    assert "cancelled" in str(cancelled_row["outcome"]).lower()


def test_generate_vendor_summary(sample_raw_procurement_df):
    """Test vendor summary aggregation metrics calculation."""
    df_clean, _ = clean_and_transform_procurement_data(sample_raw_procurement_df)
    df_synth = enrich_with_synthetic_context(df_clean, seed=42)
    summary_df = generate_vendor_summary(df_synth)

    assert len(summary_df) == 2  # Acme and Global Tech Corp
    acme_summary = summary_df[summary_df["vendor_name"] == "Acme Industrial Supplies"].iloc[0]

    assert acme_summary["total_orders"] == 2
    assert acme_summary["delivered_orders"] == 1
    assert acme_summary["cancelled_orders"] == 1
    assert acme_summary["average_delivery_days"] == 10.0
    # Mean of 0.02 (Row 0) and 0.00 (Row 1) = 0.01
    assert acme_summary["average_defect_rate"] == pytest.approx(0.01)
    assert acme_summary["compliance_failure_rate"] == pytest.approx(0.5)


def test_dataco_logistics_context_aggregation(sample_raw_dataco_df):
    """Test DataCo logistics aggregation and non-vendor-specific metadata tagging."""
    summary = aggregate_dataco_logistics_context(sample_raw_dataco_df)

    assert not summary.empty
    assert (summary["source"] == "DataCo").all()
    assert (summary["is_vendor_specific"] == False).all()
    assert summary.loc[0, "late_delivery_rate"] == pytest.approx(0.5)


def test_convert_record_to_hindsight_experience(sample_raw_procurement_df):
    """Test formatting a procurement record into a Hindsight experience object."""
    df_clean, _ = clean_and_transform_procurement_data(sample_raw_procurement_df)
    df_synth = enrich_with_synthetic_context(df_clean, seed=42)
    record = df_synth.iloc[0].to_dict()

    experience = convert_record_to_hindsight_experience(record)

    assert experience["memory_type"] == "experience"
    assert experience["vendor_name"] == "Acme Industrial Supplies"
    assert experience["po_id"] == "PO-1001"
    assert experience["source"] == "Procurement KPI dataset"
    assert experience["is_synthetic_context"] == True
    assert "Acme Industrial Supplies" in experience["experience_text"]
    assert "PO-1001" in experience["experience_text"]


def test_check_raw_datasets_exist_missing(tmp_path):
    """Test error handling when primary dataset is missing in raw directory."""
    fake_repo_root = tmp_path
    (fake_repo_root / "data" / "raw").mkdir(parents=True, exist_ok=True)

    with pytest.raises(FileNotFoundError) as exc_info:
        check_raw_datasets_exist(fake_repo_root)

    assert "Required dataset not found:" in str(exc_info.value)
    assert "Procurement KPI Analysis Dataset.csv" in str(exc_info.value)
