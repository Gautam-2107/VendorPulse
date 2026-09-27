"""SQLAlchemy ORM model for Procurement Decisions."""

import uuid
from datetime import datetime, timezone
from typing import Optional
from sqlalchemy import String, DateTime, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.base import Base


class ProcurementDecision(Base):
    __tablename__ = "procurement_decisions"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    purchase_request_id: Mapped[str] = mapped_column(String(36), ForeignKey("purchase_requests.id"), unique=True, nullable=False)
    selected_vendor_id: Mapped[str] = mapped_column(String(36), ForeignKey("vendors.id"), nullable=False)
    selected_vendor_name: Mapped[str] = mapped_column(String(255), nullable=False)
    decision_type: Mapped[str] = mapped_column(String(50), default="approved", nullable=False)  # approved, rejected, override
    decision_reason: Mapped[str] = mapped_column(String(1000), nullable=False)
    decider_name: Mapped[str] = mapped_column(String(255), default="Procurement Manager", nullable=False)
    decided_at: Mapped[datetime] = mapped_column(DateTime, default=lambda: datetime.now(timezone.utc))

    # Relationships
    purchase_request: Mapped["PurchaseRequest"] = relationship("PurchaseRequest", back_populates="decision")
    vendor: Mapped["Vendor"] = relationship("Vendor")
