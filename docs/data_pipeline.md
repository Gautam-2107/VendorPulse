# VendorPulse Data Pipeline Documentation (Phase 0)

## Overview

The VendorPulse Data Pipeline prepares baseline procurement and logistics data for historical vendor risk evaluation. It transforms raw procurement records into a standardized canonical schema and enriches them with clearly labeled synthetic qualitative context for Hindsight memory seeding.

> **Note on Raw Datasets**: Raw datasets are intentionally excluded from Git version control because of their size. They must be placed locally in `data/raw/` before running the pipeline.

---

## 1. Local Raw Dataset Setup

Place the raw CSV datasets in the `data/raw/` folder at the repository root:

```text
VendorPulse/
└── data/
    └── raw/
        ├── Procurement KPI Analysis Dataset.csv  (REQUIRED)
        ├── DataCoSupplyChainDataset.csv          (OPTIONAL)
        ├── DescriptionDataCoSupplyChain.csv      (OPTIONAL)
        └── tokenized_access_logs.csv             (Unused in MVP)
```

- **Primary Dataset (Required)**: `Procurement KPI Analysis Dataset.csv`
- **Secondary Dataset (Optional)**: `DataCoSupplyChainDataset.csv` (Provides regional logistics benchmarks)

---

## 2. Canonical Schema & Field Mapping

The pipeline maps the primary dataset fields into the VendorPulse canonical schema (`snake_case`):

| Source Field (`Procurement KPI`) | Canonical Field | Data Type | Notes / Transformations |
| :--- | :--- | :--- | :--- |
| `PO_ID` | `po_id` | `string` | Unique Purchase Order ID |
| `Supplier` | `vendor_name` | `string` | Trimmed supplier name |
| `Item_Category` | `material_category` | `string` | Material / item category |
| `Order_Date` | `order_date` | `date` | Parsed to `YYYY-MM-DD` |
| `Delivery_Date` | `delivery_date` | `date` (nullable) | Parsed to `YYYY-MM-DD` |
| `Order_Status` | `order_status` | `string` | Delivered, Cancelled, Pending, etc. |
| `Quantity` | `quantity` | `integer` | Order quantity (validated >= 0) |
| `Unit_Price` | `unit_price` | `float` | Unit price (validated >= 0) |
| `Negotiated_Price` | `negotiated_price` | `float` | Negotiated unit price (validated >= 0) |
| `Defective_Units` | `defective_units` | `integer` | Defective units count |
| `Compliance` | `compliance` | `string` | Compliant / Non-Compliant |

---

## 3. Derived Metrics

The pipeline calculates five derived metrics from valid source fields:

1. **`delivery_days`**:
   - Calculation: `Delivery_Date - Order_Date` (in calendar days).
   - Only computed when both `Order_Date` and `Delivery_Date` are valid dates.
2. **`defect_rate`**:
   - Calculation: `Defective_Units / Quantity`.
   - Computed when `Quantity > 0` and `Defective_Units` is not null.
3. **`unit_savings`**:
   - Calculation: `Unit_Price - Negotiated_Price`.
4. **`negotiated_savings`**:
   - Calculation: `(Unit_Price - Negotiated_Price) * Quantity`.
5. **`delay_days` (Important Rule)**:
   - Value: `null` / `NaN`.
   - **Reason**: The raw Procurement KPI dataset does not specify an *expected* delivery date. To preserve data integrity and avoid fabrication, `delay_days` is explicitly set to `null` and is **never** filled by equating it with `delivery_days`.

---

## 4. Synthetic Qualitative Context

To simulate realistic historical vendor memory narratives for Hindsight, the pipeline enriches clean records with deterministic synthetic context fields:

- `delay_reason`: Qualitative delay reason matching record status.
- `vendor_explanation`: Vendor explanation statement.
- `resolution`: Action taken or resolution.
- `procurement_decision`: Historical decision record.
- `outcome`: Summary outcome description.
- `additional_cost`: Extra financial cost (e.g. freight/downtime penalty).
- `context_source`: Constant `"synthetic_demo"`.
- `is_synthetic_context`: Constant `true`.

**Transparency Rule**: Synthetic fields are explicitly tagged with `is_synthetic_context = true` to clearly distinguish generated contextual narratives from raw source facts.

---

## 5. DataCo Dataset Limitations & Non-Vendor-Joining Rule

`DataCoSupplyChainDataset.csv` is used **only** as a general logistics context source.

### Key Limitation
- DataCo records contain order locations, shipping modes, and delivery risks, but **do not contain supplier or vendor identifiers**.

### Strict Policy
- **DO NOT** join DataCo records to Procurement KPI suppliers.
- **DO NOT** attribute DataCo shipping behavior to specific VendorPulse suppliers.
- DataCo data is aggregated separately by category/region into `data/processed/logistics_context.csv` with metadata tags `source = "DataCo"` and `is_vendor_specific = false`.

---

## 6. Pipeline Execution & Outputs

### Running the Pipeline Locally

Run the CLI script from the repository root:

```bash
python scripts/prepare_datasets.py
```

### Generated Outputs

The pipeline produces the following files:

1. **`data/processed/vendor_purchase_history.csv`**: Canonical vendor purchase history with derived metrics and synthetic context.
2. **`data/processed/logistics_context.csv`**: DataCo regional shipping averages and delivery risk benchmarks.
3. **`data/processed/vendor_summary.csv`**: Aggregated supplier KPI statistics (total orders, delivery days average, defect rate average, savings total).
4. **`data/processed/data_quality_report.json`**: Data quality audit report (input/output row counts, duplicate counts, missing values, validation warnings).
5. **`data/synthetic/synthetic_context_records.csv`**: Standalone synthetic context audit table.

---

## 7. Troubleshooting Missing Datasets

If you run `python scripts/prepare_datasets.py` without placing `Procurement KPI Analysis Dataset.csv` in `data/raw/`, the pipeline will halt with the following message:

```text
ERROR: Required dataset not found:
data/raw/Procurement KPI Analysis Dataset.csv

Download the required dataset and place it in data/raw/.
```

**Resolution**: Obtain the required dataset file and place it in `data/raw/Procurement KPI Analysis Dataset.csv`, then re-run `python scripts/prepare_datasets.py`.
