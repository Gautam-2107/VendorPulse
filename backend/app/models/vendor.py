"""SQLAlchemy ORM model for Vendors."""

import uuid
from typing import Optional
from sqlalchemy import String, Integer, Float
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.base import Base


class Vendor(Base):
    __tablename__ = "vendors"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    name: Mapped[str] = mapped_column(String(255), unique=True, index=True, nullable=False)
    total_orders: Mapped[int] = mapped_column(Integer, default=0)
    delivered_orders: Mapped[int] = mapped_column(Integer, default=0)
    cancelled_orders: Mapped[int] = mapped_column(Integer, default=0)
    pending_orders: Mapped[int] = mapped_column(Integer, default=0)
    partially_delivered_orders: Mapped[int] = mapped_column(Integer, default=0)
    average_delivery_days: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    average_defect_rate: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    compliance_failure_rate: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    total_negotiated_savings: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    average_negotiated_savings: Mapped[Optional[float]] = mapped_column(Float, nullable=True)

    # Relationships
    purchase_orders: Mapped[list["PurchaseOrder"]] = relationship("PurchaseOrder", back_populates="vendor")
