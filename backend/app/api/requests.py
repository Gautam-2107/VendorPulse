"""Purchase request endpoints."""

import uuid
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models.purchase_request import PurchaseRequest
from app.models.schemas import PurchaseRequestCreate, PurchaseRequestRead

router = APIRouter(prefix="/purchase-requests", tags=["Purchase Requests"])


@router.post("", response_model=PurchaseRequestRead, status_code=status.HTTP_201_CREATED)
def create_purchase_request(req_in: PurchaseRequestCreate, db: Session = Depends(get_db)):
    """Creates a new purchase request for material evaluation."""
    # Generate request number
    count = db.query(PurchaseRequest).count() + 1
    req_num = f"PR-{count:04d}"

    db_obj = PurchaseRequest(
        id=str(uuid.uuid4()),
        request_number=req_num,
        material_name=req_in.material_name,
        material_category=req_in.material_category,
        quantity=req_in.quantity,
        target_delivery_date=req_in.target_delivery_date,
        budget=req_in.budget,
        priority=req_in.priority,
        notes=req_in.notes,
        status="pending",
    )
    db.add(db_obj)
    db.commit()
    db.refresh(db_obj)
    return db_obj


@router.get("", response_model=List[PurchaseRequestRead])
def list_purchase_requests(db: Session = Depends(get_db)):
    """Lists all created purchase requests."""
    return db.query(PurchaseRequest).order_by(PurchaseRequest.created_at.desc()).all()


@router.get("/{request_id}", response_model=PurchaseRequestRead)
def get_purchase_request(request_id: str, db: Session = Depends(get_db)):
    """Retrieves single purchase request details by ID."""
    pr = db.query(PurchaseRequest).filter(PurchaseRequest.id == request_id).first()
    if not pr:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Purchase request with ID '{request_id}' not found.",
        )
    return pr
