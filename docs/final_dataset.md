# VendorPulse Final Dataset Documentation

## Overview

This document describes the canonical VendorPulse procurement dataset used to demonstrate persistent historical memory and risk evaluation in Hindsight.

---

## 1. Summary Dataset Metrics

- **Total Purchase Orders**: 777
- **Total Unique Vendors**: 18
- **Material Categories**: 9
- **Longitudinal Date Range**: `2023-01-02` to `2024-12-21` (2-year longitudinal span)
- **Synthetic Context Ratio**: 100% of contextual narrative fields explicitly tagged (`is_synthetic_context = true`, `context_source = "synthetic_demo"`)
- **Reproducibility**: 100% deterministic (fixed random seed = 42)

---

## 2. Source Data vs. Derived Data vs. Synthetic Context

VendorPulse strictly distinguishes between raw facts, mathematical derivations, and synthetic demo narratives:

### A. Source Data
Original procurement transactional fields sourced from baseline supply-chain data structures:
- `po_id`, `vendor_name`, `material_category`, `order_date`, `delivery_date`, `order_status`, `quantity`, `unit_price`, `negotiated_price`, `defective_units`, `compliance`.

### B. Derived Data (Mathematically Calculated)
- **`delivery_days`**: `delivery_date - order_date` (in calendar days).
- **`delay_days`**: `null` / `NaN` (The dataset lacks target delivery dates; `delay_days` is explicitly left null to prevent data fabrication).
- **`defect_rate`**: `defective_units / quantity`.
- **`unit_savings`**: `unit_price - negotiated_price`.
- **`negotiated_savings`**: `unit_savings * quantity`.

### C. Synthetic Demo Context
Explanatory qualitative narratives generated to enrich Hindsight memories:
- `delay_reason`: Root cause explanation matching order status.
- `vendor_explanation`: Statement from supplier explaining the issue.
- `resolution`: Action taken or corrective measure.
- `procurement_decision`: Historical decision record.
- `outcome`: Summary fulfillment outcome description.
- `additional_cost`: Extra financial cost (downtime / freight penalty).
- **Metadata Flags**: `is_synthetic_context = true`, `context_source = "synthetic_demo"`.

---

## 3. Key Demo Vendor Histories

The dataset provides rich longitudinal history for the primary demonstration vendors:

### 1. SteelCore
- **Material**: Structural Steel
- **Seasonal Risk Profile**:
  - **July & August Orders**: Shows longer summer fulfillment cycles (18 to 26 days) and elevated defect rates (8% to 14%) caused by port customs backlogs and furnace heat-treatment calibration issues.
  - **September - December Orders**: Demonstrates operational recovery (10 to 13 delivery days, 1% to 3% defect rate) following equipment maintenance and tooling upgrades.
- **Hindsight Value**: Demonstrates temporal context awareness—recalling summer performance spikes without permanently labeling the supplier as "bad" in autumn.

### 2. MetalWorks
- **Material**: Structural Steel
- **Performance Profile**: Highly reliable premium supplier with consistent lead times (9 to 12 days), zero compliance failures, and <1% defect rates.
- **Hindsight Value**: Serves as the benchmark low-risk candidate.

### 3. PrimeSteel
- **Material**: Structural Steel
- **Performance Profile**: Competitive mid-tier pricing with moderate lead times (13 to 17 days), 2% to 4.5% defect rates, and occasional stock exhaustion cancellations.
- **Hindsight Value**: Offers a cost-versus-reliability trade-off during vendor comparison.

---

## 4. DataCo Logistics Policy

`DataCoSupplyChainDataset.csv` contains shipping modes, delivery statuses, and late delivery risks, but **does not contain supplier identifiers**.

- **Policy**: DataCo records are **NEVER** joined to individual suppliers (SteelCore, MetalWorks, PrimeSteel).
- **Usage**: Aggregated separately by category and region into `data/processed/final_logistics_context.csv` as general regional shipping benchmarks (`is_vendor_specific = false`, `source = "DataCo"`).

---

## 5. Data Quality & Integrity Validation

All generated records underwent automated quality audit checks (`data/processed/final_dataset_quality_report.json`):

- **Duplicate PO IDs**: 0
- **Invalid Order / Delivery Dates**: 0
- **Negative Quantities or Prices**: 0
- **Defective Units Exceeding Quantity**: 0
- **DataCo Vendor Joins**: 0 (Enforced)
- **Schema Validation**: 100% compliance with canonical 24-column schema.

---

## 6. Output Files & Regeneration

### Generated Artifacts
1. `data/processed/final_procurement_dataset.csv` (Canonical order history)
2. `data/processed/final_vendor_summary.csv` (Aggregated vendor metrics)
3. `data/processed/final_logistics_context.csv` (DataCo regional benchmarks)
4. `data/synthetic/final_synthetic_context.csv` (Standalone synthetic context audit table)
5. `data/processed/final_dataset_quality_report.json` (Data quality audit report)

### How to Regenerate the Dataset

Run the generator script from the repository root:

```bash
python scripts/build_final_dataset.py
```

