"""Vendor endpoints."""

from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models.vendor import Vendor
from app.models.purchase_order import PurchaseOrder
from app.models.schemas import VendorRead, PurchaseOrderRead

router = APIRouter(prefix="/vendors", tags=["Vendors"])


@router.get("", response_model=List[VendorRead])
def list_vendors(db: Session = Depends(get_db)):
    """Retrieves all candidate vendors with baseline aggregate KPI metrics."""
    return db.query(Vendor).all()


@router.get("/{vendor_id}", response_model=VendorRead)
def get_vendor(vendor_id: str, db: Session = Depends(get_db)):
    """Retrieves single vendor details by ID."""
    vendor = db.query(Vendor).filter(Vendor.id == vendor_id).first()
    if not vendor:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Vendor with ID '{vendor_id}' not found.")
    return vendor


@router.get("/{vendor_id}/history", response_model=List[PurchaseOrderRead])
def get_vendor_purchase_history(vendor_id: str, db: Session = Depends(get_db)):
    """Retrieves historical purchase orders for a vendor."""
    vendor = db.query(Vendor).filter(Vendor.id == vendor_id).first()
    if not vendor:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Vendor with ID '{vendor_id}' not found.")

    return db.query(PurchaseOrder).filter(PurchaseOrder.vendor_id == vendor_id).all()
