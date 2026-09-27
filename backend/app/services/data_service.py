"""VendorPulse Phase 0 Data Processing Pipeline.

Handles raw dataset loading, validation, cleaning, source mapping, derived metrics,
synthetic context generation, vendor summary aggregation, DataCo aggregation,
and Hindsight experience object formatting.
"""

from pathlib import Path
import random
from typing import Any, Dict, List, Optional, Tuple, Union
import numpy as np
import pandas as pd


PRIMARY_DATASET_NAME = "Procurement KPI Analysis Dataset.csv"
DATACO_DATASET_NAME = "DataCoSupplyChainDataset.csv"

SOURCE_COLUMN_MAP = {
    "PO_ID": "po_id",
    "Supplier": "vendor_name",
    "Order_Date": "order_date",
    "Delivery_Date": "delivery_date",
    "Item_Category": "material_category",
    "Order_Status": "order_status",
    "Quantity": "quantity",
    "Unit_Price": "unit_price",
    "Negotiated_Price": "negotiated_price",
    "Defective_Units": "defective_units",
    "Compliance": "compliance",
}

CANONICAL_COLUMNS = [
    "po_id",
    "vendor_name",
    "material_category",
    "order_date",
    "delivery_date",
    "order_status",
    "quantity",
    "unit_price",
    "negotiated_price",
    "defective_units",
    "compliance",
    "delivery_days",
    "delay_days",
    "defect_rate",
    "unit_savings",
    "negotiated_savings",
    "delay_reason",
    "vendor_explanation",
    "resolution",
    "procurement_decision",
    "outcome",
    "additional_cost",
    "context_source",
    "is_synthetic_context",
]


def get_repo_root() -> Path:
    """Returns the repository root directory using pathlib relative to this file."""
    return Path(__file__).resolve().parents[3]


def check_raw_datasets_exist(repo_root: Optional[Path] = None) -> Dict[str, Union[bool, Path]]:
    """Checks for the presence of raw datasets in data/raw.

    Raises FileNotFoundError with instructions if the primary dataset is missing.
    Prints a warning if the optional DataCo dataset is missing.
    """
    if repo_root is None:
        repo_root = get_repo_root()

    raw_dir = repo_root / "data" / "raw"
    primary_path = raw_dir / PRIMARY_DATASET_NAME
    dataco_path = raw_dir / DATACO_DATASET_NAME

    primary_exists = primary_path.exists()
    dataco_exists = dataco_path.exists()

    if not primary_exists:
        missing_msg = (
            f"Required dataset not found:\n"
            f"data/raw/{PRIMARY_DATASET_NAME}\n\n"
            f"Download the required dataset and place it in data/raw/."
        )
        raise FileNotFoundError(missing_msg)

    if not dataco_exists:
        print(
            f"Warning: Optional DataCo dataset not found at data/raw/{DATACO_DATASET_NAME}. "
            f"Logistics context aggregation will be skipped or run on empty dataset."
        )

    return {
        "primary_path": primary_path,
        "dataco_path": dataco_path,
        "primary_exists": primary_exists,
        "dataco_exists": dataco_exists,
    }


def clean_and_transform_procurement_data(df: pd.DataFrame) -> Tuple[pd.DataFrame, Dict[str, Any]]:
    """Cleans raw Procurement KPI dataset, maps fields to canonical names,

    validates data, calculates derived metrics, and produces a quality report.
    """
    input_row_count = len(df)
    validation_warnings: List[str] = []

    # Check required columns
    missing_cols = [col for col in SOURCE_COLUMN_MAP.keys() if col not in df.columns]
    if missing_cols:
        raise ValueError(f"Input DataFrame missing required source columns: {missing_cols}")

    # Select and rename columns
    df_clean = df[list(SOURCE_COLUMN_MAP.keys())].rename(columns=SOURCE_COLUMN_MAP).copy()

    # Exact duplicate check
    duplicate_count = int(df_clean.duplicated().sum())
    if duplicate_count > 0:
        df_clean = df_clean.drop_duplicates().copy()
        validation_warnings.append(f"Removed {duplicate_count} exact duplicate rows.")

    # Trim categorical whitespace
    string_cols = ["po_id", "vendor_name", "material_category", "order_status", "compliance"]
    for col in string_cols:
        if col in df_clean.columns:
            df_clean[col] = df_clean[col].astype(str).str.strip()

    # Parse dates
    invalid_dates_count = 0

    # Order Date parsing
    parsed_order_date = pd.to_datetime(df_clean["order_date"], errors="coerce")
    invalid_dates_count += int(parsed_order_date.isna().sum())
    df_clean["order_date"] = parsed_order_date.dt.strftime("%Y-%m-%d")

    # Delivery Date parsing (nullable)
    parsed_delivery_date = pd.to_datetime(df_clean["delivery_date"], errors="coerce")
    df_clean["delivery_date"] = parsed_delivery_date.dt.strftime("%Y-%m-%d")

    # Convert numeric columns
    numeric_cols = ["quantity", "unit_price", "negotiated_price", "defective_units"]
    invalid_numeric_count = 0

    for col in numeric_cols:
        before_coerce = df_clean[col].isna().sum()
        df_clean[col] = pd.to_numeric(df_clean[col], errors="coerce")
        after_coerce = df_clean[col].isna().sum()
        new_invalids = int(after_coerce - before_coerce)
        if new_invalids > 0:
            invalid_numeric_count += new_invalids
            validation_warnings.append(f"Coerced {new_invalids} non-numeric values to NaN in column '{col}'.")

    # Data validation checks
    invalid_qty = df_clean[df_clean["quantity"] < 0]
    if len(invalid_qty) > 0:
        validation_warnings.append(f"Found {len(invalid_qty)} rows with quantity < 0.")

    invalid_price = df_clean[(df_clean["unit_price"] < 0) | (df_clean["negotiated_price"] < 0)]
    if len(invalid_price) > 0:
        validation_warnings.append(f"Found {len(invalid_price)} rows with price < 0.")

    invalid_defects = df_clean[df_clean["defective_units"] < 0]
    if len(invalid_defects) > 0:
        validation_warnings.append(f"Found {len(invalid_defects)} rows with defective_units < 0.")

    defect_exceeds_qty = df_clean[df_clean["defective_units"] > df_clean["quantity"]]
    if len(defect_exceeds_qty) > 0:
        validation_warnings.append(
            f"Flagged {len(defect_exceeds_qty)} rows where defective_units > quantity."
        )

    # Derived Metrics Calculation
    # 1. delivery_days = Delivery_Date - Order_Date (only when both dates are valid)
    valid_dates_mask = parsed_order_date.notna() & parsed_delivery_date.notna()
    delivery_delta = (parsed_delivery_date - parsed_order_date).dt.days
    df_clean["delivery_days"] = np.where(valid_dates_mask, delivery_delta, np.nan)

    # 2. delay_days = null (Procurement KPI dataset does not specify expected delivery date)
    df_clean["delay_days"] = np.nan

    # 3. defect_rate = Defective_Units / Quantity (only when Quantity > 0 and Defective_Units exists)
    valid_defect_mask = (df_clean["quantity"] > 0) & df_clean["defective_units"].notna()
    df_clean["defect_rate"] = np.where(
        valid_defect_mask, df_clean["defective_units"] / df_clean["quantity"], np.nan
    )

    # 4. unit_savings = Unit_Price - Negotiated_Price
    df_clean["unit_savings"] = df_clean["unit_price"] - df_clean["negotiated_price"]

    # 5. negotiated_savings = (Unit_Price - Negotiated_Price) * Quantity
    df_clean["negotiated_savings"] = df_clean["unit_savings"] * df_clean["quantity"]

    # Compute missing values report
    missing_values_by_column = {
        col: int(df_clean[col].isna().sum()) for col in df_clean.columns
    }

    quality_report = {
        "input_row_count": input_row_count,
        "output_row_count": len(df_clean),
        "duplicate_count": duplicate_count,
        "missing_values_by_column": missing_values_by_column,
        "invalid_dates_count": invalid_dates_count,
        "invalid_numeric_count": invalid_numeric_count,
        "validation_warnings": validation_warnings,
    }

    return df_clean, quality_report


def enrich_with_synthetic_context(df_clean: pd.DataFrame, seed: int = 42) -> pd.DataFrame:
    """Enriches clean procurement records with deterministic synthetic context fields.

    Every generated synthetic record explicitly sets:
    - is_synthetic_context = True
    - context_source = "synthetic_demo"
    """
    random.seed(seed)
    np.random.seed(seed)

    df_synth = df_clean.copy()

    delay_reasons_pool = [
        "Raw material supply chain bottleneck",
        "Port customs clearance backlog",
        "Factory tooling calibration delay",
        "Unforeseen severe weather disruption",
        "Transportation logistics driver shortage",
        "Quality re-inspection requirements",
    ]

    vendor_explanations_pool = [
        "Vendor reported temporary sub-tier supplier allocation constraints.",
        "Vendor cited unexpected regional port congestion.",
        "Vendor indicated equipment maintenance led to short-term production pause.",
        "Vendor claimed unexpected order volume surge created temporary backlog.",
        "Vendor noted weather conditions delayed freight departure.",
    ]

    resolutions_pool = [
        "Expedited air freight provided at vendor expense.",
        "Partial batch shipped immediately; remainder delivered next week.",
        "Vendor provided 5% credit on subsequent purchase order.",
        "Procurement management issued formal corrective action request.",
        "Standard order fulfillment completed after minor schedule adjustment.",
    ]

    delay_reasons: List[Optional[str]] = []
    vendor_explanations: List[Optional[str]] = []
    resolutions: List[Optional[str]] = []
    procurement_decisions: List[Optional[str]] = []
    outcomes: List[Optional[str]] = []
    additional_costs: List[Optional[float]] = []

    for idx, row in df_synth.iterrows():
        status = str(row.get("order_status", "")).lower()
        compliance = str(row.get("compliance", "")).lower()
        defect_rate = row.get("defect_rate")
        delivery_days = row.get("delivery_days")

        has_defects = pd.notna(defect_rate) and defect_rate > 0
        is_delayed = pd.notna(delivery_days) and delivery_days > 14  # Lead time threshold
        is_cancelled = "cancel" in status
        is_non_compliant = "non" in compliance or "fail" in compliance or "no" == compliance

        # Context generation logic matching record status
        if is_cancelled:
            d_reason = "Order cancelled due to supplier fulfillment incapacity"
            v_expl = "Vendor confirmed inability to secure raw materials within required timeline."
            resol = "Order terminated; alternative supplier sourced."
            p_dec = "Order Cancelled"
            outc = "Purchase order cancelled; zero inventory delivered."
            add_cost = round(float(random.uniform(1000, 5000)), 2)
        elif is_non_compliant or has_defects:
            d_reason = random.choice(delay_reasons_pool) if is_delayed else None
            v_expl = random.choice(vendor_explanations_pool)
            resol = "Batch quarantined; vendor dispatched technical team for quality review."
            p_dec = "Conditional Acceptance with Penalty"
            outc = f"Delivered with quality defects ({round(float(defect_rate or 0)*100, 1)}% defective units)."
            add_cost = round(float(random.uniform(500, 3500)), 2)
        elif is_delayed:
            d_reason = random.choice(delay_reasons_pool)
            v_expl = random.choice(vendor_explanations_pool)
            resol = random.choice(resolutions_pool)
            p_dec = "Accepted with Expedited Freight Request"
            outc = f"Delivery completed after {int(delivery_days)} days."
            add_cost = round(float(random.uniform(300, 2000)), 2)
        else:
            d_reason = None
            v_expl = "Order fulfilled as scheduled without reported issues."
            resol = "Standard receipt and warehouse entry."
            p_dec = "Standard Approval"
            outc = "Successful procurement outcome; delivered on time and compliant."
            add_cost = 0.0

        delay_reasons.append(d_reason)
        vendor_explanations.append(v_expl)
        resolutions.append(resol)
        procurement_decisions.append(p_dec)
        outcomes.append(outc)
        additional_costs.append(add_cost)

    df_synth["delay_reason"] = delay_reasons
    df_synth["vendor_explanation"] = vendor_explanations
    df_synth["resolution"] = resolutions
    df_synth["procurement_decision"] = procurement_decisions
    df_synth["outcome"] = outcomes
    df_synth["additional_cost"] = additional_costs
    df_synth["context_source"] = "synthetic_demo"
    df_synth["is_synthetic_context"] = True

    # Ensure canonical column order
    for col in CANONICAL_COLUMNS:
        if col not in df_synth.columns:
            df_synth[col] = np.nan

    return df_synth[CANONICAL_COLUMNS].copy()


def aggregate_dataco_logistics_context(dataco_df: pd.DataFrame) -> pd.DataFrame:
    """Aggregates DataCo supply chain dataset into general logistics context summaries.

    IMPORTANT: DataCo records DO NOT contain vendor/supplier identifiers.
    This aggregation is purely for regional/category shipping benchmarks and is
    NEVER joined to Procurement KPI suppliers.
    """
    if dataco_df.empty:
        return pd.DataFrame(
            columns=[
                "material_category",
                "market",
                "region",
                "shipping_mode",
                "total_orders",
                "average_actual_shipping_days",
                "average_scheduled_shipping_days",
                "late_delivery_rate",
                "late_delivery_risk_rate",
                "source",
                "is_vendor_specific",
            ]
        )

    # Rename & select fields safely
    field_map = {
        "Days for shipping (real)": "actual_shipping_days",
        "Days for shipment (scheduled)": "scheduled_shipping_days",
        "Delivery Status": "delivery_status",
        "Late_delivery_risk": "late_delivery_risk",
        "Category Name": "material_category",
        "Market": "market",
        "Order Region": "region",
        "Shipping Mode": "shipping_mode",
    }

    available_cols = [col for col in field_map.keys() if col in dataco_df.columns]
    df = dataco_df[available_cols].rename(columns=field_map).copy()

    # Ensure numeric
    if "actual_shipping_days" in df.columns:
        df["actual_shipping_days"] = pd.to_numeric(df["actual_shipping_days"], errors="coerce")
    if "scheduled_shipping_days" in df.columns:
        df["scheduled_shipping_days"] = pd.to_numeric(df["scheduled_shipping_days"], errors="coerce")
    if "late_delivery_risk" in df.columns:
        df["late_delivery_risk"] = pd.to_numeric(df["late_delivery_risk"], errors="coerce")

    if "delivery_status" in df.columns:
        df["is_late"] = df["delivery_status"].astype(str).str.contains("Late", case=False, na=False).astype(int)
    else:
        df["is_late"] = 0

    group_cols = [col for col in ["material_category", "market", "region", "shipping_mode"] if col in df.columns]

    if not group_cols:
        group_cols = ["material_category"]
        df["material_category"] = "General"

    agg_dict = {}
    if "actual_shipping_days" in df.columns:
        agg_dict["actual_shipping_days"] = ("actual_shipping_days", "mean")
    if "scheduled_shipping_days" in df.columns:
        agg_dict["scheduled_shipping_days"] = ("scheduled_shipping_days", "mean")
    if "is_late" in df.columns:
        agg_dict["late_delivery_rate"] = ("is_late", "mean")
    if "late_delivery_risk" in df.columns:
        agg_dict["late_delivery_risk_rate"] = ("late_delivery_risk", "mean")

    summary = df.groupby(group_cols).agg(**agg_dict).reset_index()
    summary["total_orders"] = df.groupby(group_cols).size().values

    # Clean up column names
    if "actual_shipping_days" in summary.columns:
        summary = summary.rename(columns={"actual_shipping_days": "average_actual_shipping_days"})
    if "scheduled_shipping_days" in summary.columns:
        summary = summary.rename(columns={"scheduled_shipping_days": "average_scheduled_shipping_days"})

    summary["source"] = "DataCo"
    summary["is_vendor_specific"] = False

    return summary


def generate_vendor_summary(df_processed: pd.DataFrame) -> pd.DataFrame:
    """Generates aggregate vendor summary statistics from canonical procurement records."""
    if df_processed.empty:
        return pd.DataFrame()

    def get_status_count(series: pd.Series, status_keyword: str) -> int:
        return int(series.astype(str).str.lower().str.contains(status_keyword, na=False).sum())

    summary_rows = []
    grouped = df_processed.groupby("vendor_name")

    for vendor_name, group in grouped:
        total_orders = len(group)
        status_series = group["order_status"]

        delivered_orders = get_status_count(status_series, "deliver")
        cancelled_orders = get_status_count(status_series, "cancel")
        pending_orders = get_status_count(status_series, "pend")
        partially_delivered = get_status_count(status_series, "partial")

        avg_delivery_days = group["delivery_days"].mean()
        avg_delivery_days_val = float(round(avg_delivery_days, 2)) if pd.notna(avg_delivery_days) else None

        avg_defect_rate = group["defect_rate"].mean()
        avg_defect_rate_val = float(round(avg_defect_rate, 4)) if pd.notna(avg_defect_rate) else None

        compliance_series = group["compliance"].astype(str).str.lower()
        non_compliant_count = int((compliance_series.str.contains("non") | compliance_series.str.contains("fail")).sum())
        compliance_failure_rate = float(round(non_compliant_count / total_orders, 4)) if total_orders > 0 else 0.0

        total_savings = group["negotiated_savings"].sum()
        total_savings_val = float(round(total_savings, 2)) if pd.notna(total_savings) else 0.0

        avg_savings = group["negotiated_savings"].mean()
        avg_savings_val = float(round(avg_savings, 2)) if pd.notna(avg_savings) else 0.0

        summary_rows.append({
            "vendor_name": vendor_name,
            "total_orders": total_orders,
            "delivered_orders": delivered_orders,
            "cancelled_orders": cancelled_orders,
            "pending_orders": pending_orders,
            "partially_delivered_orders": partially_delivered,
            "average_delivery_days": avg_delivery_days_val,
            "average_defect_rate": avg_defect_rate_val,
            "compliance_failure_rate": compliance_failure_rate,
            "total_negotiated_savings": total_savings_val,
            "average_negotiated_savings": avg_savings_val,
        })

    return pd.DataFrame(summary_rows)


def convert_record_to_hindsight_experience(record: Dict[str, Any]) -> Dict[str, Any]:
    """Converts a processed procurement record dictionary into a Hindsight-ready experience object."""
    vendor_name = record.get("vendor_name", "Unknown Vendor")
    po_id = record.get("po_id", "Unknown PO")
    category = record.get("material_category", "General")
    order_status = record.get("order_status", "Unspecified")
    qty = record.get("quantity", 0)
    delivery_days = record.get("delivery_days")
    defect_rate = record.get("defect_rate")
    compliance = record.get("compliance", "Unknown")

    # Context
    is_synth = record.get("is_synthetic_context", False)
    vendor_expl = record.get("vendor_explanation")
    delay_reason = record.get("delay_reason")
    resolution = record.get("resolution")
    outcome = record.get("outcome")
    add_cost = record.get("additional_cost")

    # Build qualitative experience narrative
    narrative_parts = [
        f"Purchase Order {po_id} for {qty} units of {category} with supplier {vendor_name}.",
        f"Order Status: {order_status}.",
        f"Compliance Status: {compliance}."
    ]

    if pd.notna(delivery_days):
        narrative_parts.append(f"Actual fulfillment delivery duration was {int(delivery_days)} days.")

    if pd.notna(defect_rate) and defect_rate > 0:
        narrative_parts.append(f"Quality defect rate recorded at {round(float(defect_rate)*100, 2)}%.")

    if outcome:
        narrative_parts.append(f"Recorded Outcome: {outcome}")

    if is_synth:
        synth_context_parts = []
        if delay_reason:
            synth_context_parts.append(f"Delay Root Cause: {delay_reason}")
        if vendor_expl:
            synth_context_parts.append(f"Vendor Explanation: {vendor_expl}")
        if resolution:
            synth_context_parts.append(f"Resolution Action: {resolution}")
        if add_cost and add_cost > 0:
            synth_context_parts.append(f"Additional Financial Impact: ${add_cost:,.2f}")

        if synth_context_parts:
            narrative_parts.append(f"[Qualitative Context - Synthetic Demo Data]: {' | '.join(synth_context_parts)}")

    experience_text = " ".join(narrative_parts)

    return {
        "memory_type": "experience",
        "vendor_name": vendor_name,
        "po_id": po_id,
        "category": category,
        "experience_text": experience_text,
        "source": "Procurement KPI dataset",
        "is_synthetic_context": bool(is_synth),
    }
