"""SQLAlchemy ORM model for Procurement Outcomes."""

import uuid
from datetime import datetime, timezone
from typing import Optional
from sqlalchemy import String, Integer, Float, Boolean, DateTime, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.base import Base


class ProcurementOutcome(Base):
    __tablename__ = "procurement_outcomes"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    purchase_request_id: Mapped[str] = mapped_column(String(36), ForeignKey("purchase_requests.id"), unique=True, nullable=False)
    vendor_id: Mapped[str] = mapped_column(String(36), ForeignKey("vendors.id"), nullable=False)
    actual_delivery_date: Mapped[str] = mapped_column(String(20), nullable=False)
    actual_delivery_days: Mapped[int] = mapped_column(Integer, nullable=False)
    delay_days: Mapped[int] = mapped_column(Integer, default=0)
    defect_rate: Mapped[float] = mapped_column(Float, default=0.0)
    defective_units: Mapped[int] = mapped_column(Integer, default=0)
    delay_reason: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    vendor_explanation: Mapped[Optional[str]] = mapped_column(String(1000), nullable=True)
    resolution: Mapped[Optional[str]] = mapped_column(String(1000), nullable=True)
    additional_cost: Mapped[float] = mapped_column(Float, default=0.0)
    outcome_summary: Mapped[str] = mapped_column(String(1000), nullable=False)
    is_retained_to_hindsight: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=lambda: datetime.now(timezone.utc))

    # Relationships
    purchase_request: Mapped["PurchaseRequest"] = relationship("PurchaseRequest", back_populates="outcome")
    vendor: Mapped["Vendor"] = relationship("Vendor")
