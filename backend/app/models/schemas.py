"""Pydantic schemas for API request validation and response serialization."""

from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, ConfigDict, Field


# Vendor Schemas
class VendorBase(BaseModel):
    name: str
    total_orders: int = 0
    delivered_orders: int = 0
    cancelled_orders: int = 0
    pending_orders: int = 0
    partially_delivered_orders: int = 0
    average_delivery_days: Optional[float] = None
    average_defect_rate: Optional[float] = None
    compliance_failure_rate: Optional[float] = None
    total_negotiated_savings: Optional[float] = None
    average_negotiated_savings: Optional[float] = None


class VendorRead(VendorBase):
    id: str

    model_config = ConfigDict(from_attributes=True)


# Purchase Order (Historical) Schemas
class PurchaseOrderRead(BaseModel):
    id: str
    po_id: str
    vendor_id: Optional[str] = None
    vendor_name: str
    material_category: str
    order_date: Optional[str] = None
    delivery_date: Optional[str] = None
    order_status: str
    quantity: int
    unit_price: float
    negotiated_price: float
    defective_units: int = 0
    compliance: str
    delivery_days: Optional[float] = None
    delay_days: Optional[float] = None
    defect_rate: Optional[float] = None
    unit_savings: Optional[float] = None
    negotiated_savings: Optional[float] = None
    delay_reason: Optional[str] = None
    vendor_explanation: Optional[str] = None
    resolution: Optional[str] = None
    procurement_decision: Optional[str] = None
    outcome: Optional[str] = None
    additional_cost: Optional[float] = None
    context_source: str = "synthetic_demo"
    is_synthetic_context: bool = True

    model_config = ConfigDict(from_attributes=True)


# Purchase Request Schemas
class PurchaseRequestCreate(BaseModel):
    material_name: str = Field(..., description="Name of material or product to purchase")
    material_category: str = Field(..., description="Category of material")
    quantity: int = Field(..., gt=0, description="Quantity requested")
    target_delivery_date: str = Field(..., description="Target delivery date (YYYY-MM-DD)")
    budget: float = Field(..., gt=0, description="Target budget")
    priority: str = Field("medium", description="Priority level: low, medium, high")
    notes: Optional[str] = None


class PurchaseRequestRead(BaseModel):
    id: str
    request_number: str
    material_name: str
    material_category: str
    quantity: int
    target_delivery_date: str
    budget: float
    status: str
    priority: str
    notes: Optional[str] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


# Decision Schemas
class ProcurementDecisionCreate(BaseModel):
    purchase_request_id: str
    selected_vendor_id: str
    decision_type: str = Field("approved", description="approved, rejected, or override")
    decision_reason: str = Field(..., min_length=5, description="Justification for selecting vendor")
    decider_name: str = "Procurement Manager"


class ProcurementDecisionRead(BaseModel):
    id: str
    purchase_request_id: str
    selected_vendor_id: str
    selected_vendor_name: str
    decision_type: str
    decision_reason: str
    decider_name: str
    decided_at: datetime

    model_config = ConfigDict(from_attributes=True)


# Outcome Schemas
class ProcurementOutcomeCreate(BaseModel):
    purchase_request_id: str
    vendor_id: str
    actual_delivery_date: str
    actual_delivery_days: int
    delay_days: int = 0
    defect_rate: float = 0.0
    defective_units: int = 0
    delay_reason: Optional[str] = None
    vendor_explanation: Optional[str] = None
    resolution: Optional[str] = None
    additional_cost: float = 0.0
    outcome_summary: str = Field(..., min_length=5)


class ProcurementOutcomeRead(BaseModel):
    id: str
    purchase_request_id: str
    vendor_id: str
    actual_delivery_date: str
    actual_delivery_days: int
    delay_days: int
    defect_rate: float
    defective_units: int
    delay_reason: Optional[str] = None
    vendor_explanation: Optional[str] = None
    resolution: Optional[str] = None
    additional_cost: float
    outcome_summary: str
    is_retained_to_hindsight: bool
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
