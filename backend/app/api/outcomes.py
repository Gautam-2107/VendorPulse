"""Procurement outcome endpoints."""

import uuid
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models.purchase_request import PurchaseRequest
from app.models.vendor import Vendor
from app.models.outcome import ProcurementOutcome
from app.models.schemas import ProcurementOutcomeCreate, ProcurementOutcomeRead

router = APIRouter(prefix="/outcomes", tags=["Outcomes"])


@router.post("", response_model=ProcurementOutcomeRead, status_code=status.HTTP_201_CREATED)
def record_procurement_outcome(outcome_in: ProcurementOutcomeCreate, db: Session = Depends(get_db)):
    """Records actual procurement fulfillment outcome for a completed order."""
    pr = db.query(PurchaseRequest).filter(PurchaseRequest.id == outcome_in.purchase_request_id).first()
    if not pr:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Purchase request with ID '{outcome_in.purchase_request_id}' not found.",
        )

    vendor = db.query(Vendor).filter(Vendor.id == outcome_in.vendor_id).first()
    if not vendor:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Vendor with ID '{outcome_in.vendor_id}' not found.",
        )

    existing = db.query(ProcurementOutcome).filter(ProcurementOutcome.purchase_request_id == pr.id).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Outcome already recorded for purchase request '{pr.id}'.",
        )

    db_outcome = ProcurementOutcome(
        id=str(uuid.uuid4()),
        purchase_request_id=pr.id,
        vendor_id=vendor.id,
        actual_delivery_date=outcome_in.actual_delivery_date,
        actual_delivery_days=outcome_in.actual_delivery_days,
        delay_days=outcome_in.delay_days,
        defect_rate=outcome_in.defect_rate,
        defective_units=outcome_in.defective_units,
        delay_reason=outcome_in.delay_reason,
        vendor_explanation=outcome_in.vendor_explanation,
        resolution=outcome_in.resolution,
        additional_cost=outcome_in.additional_cost,
        outcome_summary=outcome_in.outcome_summary,
        is_retained_to_hindsight=False,  # Will be set to True when retained in Phase 2
    )

    # Update purchase request status to completed
    pr.status = "completed"

    db.add(db_outcome)
    db.commit()
    db.refresh(db_outcome)
    return db_outcome


@router.get("/{outcome_id}", response_model=ProcurementOutcomeRead)
def get_outcome(outcome_id: str, db: Session = Depends(get_db)):
    """Retrieves outcome record by ID."""
    outcome = db.query(ProcurementOutcome).filter(ProcurementOutcome.id == outcome_id).first()
    if not outcome:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Outcome with ID '{outcome_id}' not found.",
        )
    return outcome
