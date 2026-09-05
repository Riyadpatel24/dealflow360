from datetime import date, datetime
from decimal import Decimal

from sqlalchemy import (
    Date,
    DateTime,
    ForeignKey,
    Numeric,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.orm import Mapped, mapped_column

from app.database.base import Base


class Warehouse(Base):
    __tablename__ = "warehouses"

    id: Mapped[int] = mapped_column(primary_key=True)

    name: Mapped[str] = mapped_column(
        String(120),
        unique=True,
        nullable=False,
    )

    location: Mapped[str | None] = mapped_column(
        String(200),
        nullable=True,
    )

    is_active: Mapped[bool] = mapped_column(
        default=True,
        nullable=False,
    )


class Inventory(Base):
    __tablename__ = "inventory"

    __table_args__ = (
        UniqueConstraint(
            "warehouse_id",
            "product_id",
            name="uq_inventory_warehouse_product",
        ),
    )

    id: Mapped[int] = mapped_column(primary_key=True)

    warehouse_id: Mapped[int] = mapped_column(
        ForeignKey("warehouses.id"),
        nullable=False,
    )

    product_id: Mapped[int] = mapped_column(
        ForeignKey("products.id"),
        nullable=False,
    )

    available_quantity: Mapped[int] = mapped_column(
        nullable=False,
        default=0,
    )


class Shipment(Base):
    __tablename__ = "shipments"

    id: Mapped[int] = mapped_column(primary_key=True)

    shipment_number: Mapped[str] = mapped_column(
        String(60),
        unique=True,
        nullable=False,
    )

    quotation_id: Mapped[int] = mapped_column(
        ForeignKey("quotations.id"),
        nullable=False,
    )

    warehouse_id: Mapped[int] = mapped_column(
        ForeignKey("warehouses.id"),
        nullable=False,
    )

    status: Mapped[str] = mapped_column(
        String(30),
        nullable=False,
        default="READY",
    )

    shipment_cost: Mapped[Decimal] = mapped_column(
        Numeric(12, 2),
        nullable=False,
        default=Decimal("0.00"),
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=datetime.utcnow,
        nullable=False,
    )

    shipped_at: Mapped[datetime | None] = mapped_column(
        DateTime,
        nullable=True,
    )


class Fulfillment(Base):
    __tablename__ = "fulfillments"

    id: Mapped[int] = mapped_column(primary_key=True)

    quotation_id: Mapped[int] = mapped_column(
        ForeignKey("quotations.id"),
        nullable=False,
    )

    quotation_line_id: Mapped[int] = mapped_column(
        ForeignKey("quotation_lines.id"),
        nullable=False,
    )

    warehouse_id: Mapped[int] = mapped_column(
        ForeignKey("warehouses.id"),
        nullable=False,
    )

    shipment_id: Mapped[int | None] = mapped_column(
        ForeignKey("shipments.id"),
        nullable=True,
    )

    quantity: Mapped[int] = mapped_column(
        nullable=False,
    )

    status: Mapped[str] = mapped_column(
        String(30),
        nullable=False,
        default="ALLOCATED",
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=datetime.utcnow,
        nullable=False,
    )


class Backorder(Base):
    __tablename__ = "backorders"

    id: Mapped[int] = mapped_column(primary_key=True)

    quotation_id: Mapped[int] = mapped_column(
        ForeignKey("quotations.id"),
        nullable=False,
    )

    quotation_line_id: Mapped[int] = mapped_column(
        ForeignKey("quotation_lines.id"),
        nullable=False,
    )

    quantity: Mapped[int] = mapped_column(
        nullable=False,
    )

    status: Mapped[str] = mapped_column(
        String(30),
        default="OPEN",
        nullable=False,
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=datetime.utcnow,
        nullable=False,
    )

    fulfilled_at: Mapped[datetime | None] = mapped_column(
        DateTime,
        nullable=True,
    )


class SubscriptionPlan(Base):
    __tablename__ = "subscription_plans"

    id: Mapped[int] = mapped_column(primary_key=True)

    name: Mapped[str] = mapped_column(
        String(120),
        unique=True,
        nullable=False,
    )

    interval: Mapped[str] = mapped_column(
        String(20),
        nullable=False,
    )

    active: Mapped[bool] = mapped_column(
        default=True,
        nullable=False,
    )


class Subscription(Base):
    __tablename__ = "subscriptions"

    id: Mapped[int] = mapped_column(primary_key=True)

    quotation_id: Mapped[int] = mapped_column(
        ForeignKey("quotations.id"),
        nullable=False,
    )

    quotation_line_id: Mapped[int] = mapped_column(
        ForeignKey("quotation_lines.id"),
        nullable=False,
    )

    customer_id: Mapped[int] = mapped_column(
        ForeignKey("customers.id"),
        nullable=False,
    )

    plan_id: Mapped[int] = mapped_column(
        ForeignKey("subscription_plans.id"),
        nullable=False,
    )

    quantity: Mapped[int] = mapped_column(
        nullable=False,
    )

    unit_price: Mapped[Decimal] = mapped_column(
        Numeric(12, 2),
        nullable=False,
    )

    start_date: Mapped[date] = mapped_column(
        Date,
        nullable=False,
    )

    next_billing_date: Mapped[date] = mapped_column(
        Date,
        nullable=False,
    )

    status: Mapped[str] = mapped_column(
        String(20),
        default="ACTIVE",
        nullable=False,
    )


class Invoice(Base):
    __tablename__ = "invoices"

    id: Mapped[int] = mapped_column(primary_key=True)

    invoice_number: Mapped[str] = mapped_column(
        String(50),
        unique=True,
        nullable=False,
    )

    quotation_id: Mapped[int] = mapped_column(
        ForeignKey("quotations.id"),
        nullable=False,
    )

    customer_id: Mapped[int] = mapped_column(
        ForeignKey("customers.id"),
        nullable=False,
    )

    invoice_type: Mapped[str] = mapped_column(
        String(20),
        nullable=False,
    )

    amount: Mapped[Decimal] = mapped_column(
        Numeric(12, 2),
        nullable=False,
    )

    currency: Mapped[str] = mapped_column(
        String(3),
        nullable=False,
    )

    status: Mapped[str] = mapped_column(
        String(20),
        default="ISSUED",
        nullable=False,
    )

    issued_date: Mapped[date] = mapped_column(
        Date,
        default=date.today,
        nullable=False,
    )

    due_date: Mapped[date] = mapped_column(
        Date,
        nullable=False,
    )


class Payment(Base):
    __tablename__ = "payments"

    id: Mapped[int] = mapped_column(primary_key=True)

    invoice_id: Mapped[int] = mapped_column(
        ForeignKey("invoices.id"),
        nullable=False,
    )

    amount: Mapped[Decimal] = mapped_column(
        Numeric(12, 2),
        nullable=False,
    )

    payment_date: Mapped[date] = mapped_column(
        Date,
        default=date.today,
        nullable=False,
    )

    reference: Mapped[str] = mapped_column(
        String(100),
        nullable=False,
    )


class NegotiationRequest(Base):
    __tablename__ = "negotiation_requests"

    id: Mapped[int] = mapped_column(primary_key=True)

    quotation_id: Mapped[int] = mapped_column(
        ForeignKey("quotations.id"),
        nullable=False,
    )

    quotation_line_id: Mapped[int | None] = mapped_column(
        ForeignKey("quotation_lines.id"),
        nullable=True,
    )

    requested_discount: Mapped[Decimal | None] = mapped_column(
        Numeric(5, 2),
        nullable=True,
    )

    delivery_date: Mapped[date | None] = mapped_column(
        Date,
        nullable=True,
    )

    comment: Mapped[str] = mapped_column(
        Text,
        nullable=False,
    )

    status: Mapped[str] = mapped_column(
        String(30),
        default="SUBMITTED",
        nullable=False,
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=datetime.utcnow,
        nullable=False,
    )


class AuditEvent(Base):
    __tablename__ = "audit_events"

    id: Mapped[int] = mapped_column(primary_key=True)

    user_id: Mapped[int | None] = mapped_column(
        ForeignKey("users.id"),
        nullable=True,
    )

    entity: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
    )

    entity_id: Mapped[int] = mapped_column(
        nullable=False,
    )

    action: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
    )

    details: Mapped[str | None] = mapped_column(
        Text,
        nullable=True,
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=datetime.utcnow,
        nullable=False,
    )