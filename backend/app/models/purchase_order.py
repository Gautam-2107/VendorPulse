"""SQLAlchemy ORM model for Purchase Orders (Historical dataset records)."""

import uuid
from typing import Optional
from sqlalchemy import String, Integer, Float, Boolean, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.base import Base


class PurchaseOrder(Base):
    __tablename__ = "purchase_orders"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    po_id: Mapped[str] = mapped_column(String(100), index=True, nullable=False)
    vendor_id: Mapped[Optional[str]] = mapped_column(String(36), ForeignKey("vendors.id"), nullable=True)
    vendor_name: Mapped[str] = mapped_column(String(255), index=True, nullable=False)
    material_category: Mapped[str] = mapped_column(String(100), nullable=False)
    order_date: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    delivery_date: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    order_status: Mapped[str] = mapped_column(String(50), nullable=False)
    quantity: Mapped[int] = mapped_column(Integer, nullable=False)
    unit_price: Mapped[float] = mapped_column(Float, nullable=False)
    negotiated_price: Mapped[float] = mapped_column(Float, nullable=False)
    defective_units: Mapped[int] = mapped_column(Integer, default=0)
    compliance: Mapped[str] = mapped_column(String(50), nullable=False)

    # Derived Metrics
    delivery_days: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    delay_days: Mapped[Optional[float]] = mapped_column(Float, nullable=True)  # Always null in raw dataset
    defect_rate: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    unit_savings: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    negotiated_savings: Mapped[Optional[float]] = mapped_column(Float, nullable=True)

    # Synthetic Context Fields
    delay_reason: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    vendor_explanation: Mapped[Optional[str]] = mapped_column(String(1000), nullable=True)
    resolution: Mapped[Optional[str]] = mapped_column(String(1000), nullable=True)
    procurement_decision: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    outcome: Mapped[Optional[str]] = mapped_column(String(1000), nullable=True)
    additional_cost: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    context_source: Mapped[str] = mapped_column(String(100), default="synthetic_demo")
    is_synthetic_context: Mapped[bool] = mapped_column(Boolean, default=True)

    # Relationships
    vendor: Mapped[Optional["Vendor"]] = relationship("Vendor", back_populates="purchase_orders")
