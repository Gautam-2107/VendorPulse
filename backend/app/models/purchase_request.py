"""SQLAlchemy ORM model for Purchase Requests."""

import uuid
from datetime import datetime, timezone
from typing import Optional
from sqlalchemy import String, Integer, Float, DateTime
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.base import Base


class PurchaseRequest(Base):
    __tablename__ = "purchase_requests"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    request_number: Mapped[str] = mapped_column(String(50), unique=True, index=True, nullable=False)
    material_name: Mapped[str] = mapped_column(String(255), nullable=False)
    material_category: Mapped[str] = mapped_column(String(100), nullable=False)
    quantity: Mapped[int] = mapped_column(Integer, nullable=False)
    target_delivery_date: Mapped[str] = mapped_column(String(20), nullable=False)
    budget: Mapped[float] = mapped_column(Float, nullable=False)
    status: Mapped[str] = mapped_column(String(50), default="pending", nullable=False)  # pending, evaluated, decided, completed
    priority: Mapped[str] = mapped_column(String(20), default="medium", nullable=False)
    notes: Mapped[Optional[str]] = mapped_column(String(1000), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=lambda: datetime.now(timezone.utc))

    # Relationships
    decision: Mapped[Optional["ProcurementDecision"]] = relationship("ProcurementDecision", back_populates="purchase_request", uselist=False)
    outcome: Mapped[Optional["ProcurementOutcome"]] = relationship("ProcurementOutcome", back_populates="purchase_request", uselist=False)
