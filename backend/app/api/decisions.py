"""Procurement decision endpoints."""

import uuid
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models.purchase_request import PurchaseRequest
from app.models.vendor import Vendor
from app.models.decision import ProcurementDecision
from app.models.schemas import ProcurementDecisionCreate, ProcurementDecisionRead

router = APIRouter(prefix="/decisions", tags=["Decisions"])


@router.post("", response_model=ProcurementDecisionRead, status_code=status.HTTP_201_CREATED)
def record_procurement_decision(decision_in: ProcurementDecisionCreate, db: Session = Depends(get_db)):
    """Records human procurement decision for a purchase request."""
    pr = db.query(PurchaseRequest).filter(PurchaseRequest.id == decision_in.purchase_request_id).first()
    if not pr:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Purchase request with ID '{decision_in.purchase_request_id}' not found.",
        )

    vendor = db.query(Vendor).filter(Vendor.id == decision_in.selected_vendor_id).first()
    if not vendor:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Vendor with ID '{decision_in.selected_vendor_id}' not found.",
        )

    # Check if decision already exists
    existing = db.query(ProcurementDecision).filter(ProcurementDecision.purchase_request_id == pr.id).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Procurement decision already recorded for purchase request '{pr.id}'.",
        )

    db_decision = ProcurementDecision(
        id=str(uuid.uuid4()),
        purchase_request_id=pr.id,
        selected_vendor_id=vendor.id,
        selected_vendor_name=vendor.name,
        decision_type=decision_in.decision_type,
        decision_reason=decision_in.decision_reason,
        decider_name=decision_in.decider_name,
    )

    # Update purchase request status
    pr.status = "decided"

    db.add(db_decision)
    db.commit()
    db.refresh(db_decision)
    return db_decision


@router.get("/{decision_id}", response_model=ProcurementDecisionRead)
def get_decision(decision_id: str, db: Session = Depends(get_db)):
    """Retrieves decision record by ID."""
    decision = db.query(ProcurementDecision).filter(ProcurementDecision.id == decision_id).first()
    if not decision:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Decision with ID '{decision_id}' not found.",
        )
    return decision
