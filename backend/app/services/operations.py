from datetime import date, timedelta
from decimal import Decimal

from sqlalchemy import func
from sqlalchemy.orm import Session

from app.models.operations import (
    AuditEvent,
    Backorder,
    Fulfillment,
    Inventory,
    Invoice,
    Payment,
    Subscription,
    SubscriptionPlan,
    Warehouse,
)

from app.models.product import Product
from app.models.quotation import Quotation
from app.models.quotation_line import QuotationLine


def audit(
    db: Session,
    user_id: int | None,
    entity: str,
    entity_id: int,
    action: str,
    details: str | None = None,
):
    db.add(
        AuditEvent(
            user_id=user_id,
            entity=entity,
            entity_id=entity_id,
            action=action,
            details=details,
        )
    )


def allocate_fulfillment(
    db: Session,
    quotation: Quotation,
    overrides: dict[int, list[dict]] | None = None,
):
    """
    Allocate each non-subscription quotation line
    from live warehouse inventory.

    Business rules:
    - Subscription products do not consume warehouse stock.
    - Physical products are allocated from available inventory.
    - Manual overrides are validated against live stock.
    - Inventory is locked before being modified.
    - Any quantity that cannot be allocated becomes a backorder.
    """

    allocations = []
    backorders = []

    lines = (
        db.query(QuotationLine)
        .filter(
            QuotationLine.quotation_id
            == quotation.id
        )
        .all()
    )

    for line in lines:

        product = db.get(
            Product,
            line.product_id,
        )

        if product is None:
            raise ValueError(
                f"Product {line.product_id} not found"
            )

        # Subscription products do not require
        # warehouse fulfillment.
        if product.is_subscription:
            continue

        remaining = line.quantity

        requested = (
            overrides or {}
        ).get(line.id)

        # -----------------------------------------------------
        # Recommended allocation
        # -----------------------------------------------------

        if requested is None:

            inventory_rows = (
                db.query(Inventory)
                .join(
                    Warehouse,
                    Warehouse.id
                    == Inventory.warehouse_id,
                )
                .filter(
                    Inventory.product_id
                    == line.product_id,

                    Inventory.available_quantity
                    > 0,

                    Warehouse.is_active.is_(True),
                )
                .order_by(
                    Inventory.id
                )
                .all()
            )

            requested = []

            for stock in inventory_rows:

                if remaining <= 0:
                    break

                quantity = min(
                    remaining,
                    stock.available_quantity,
                )

                requested.append(
                    {
                        "warehouse_id":
                            stock.warehouse_id,

                        "quantity":
                            quantity,
                    }
                )

                remaining -= quantity

            # Reset because we calculate remaining
            # again during actual allocation.
            remaining = line.quantity

        # -----------------------------------------------------
        # Manual allocation / calculated allocation
        # -----------------------------------------------------

        for item in requested:

            if remaining <= 0:
                break

            warehouse_id = int(
                item["warehouse_id"]
            )

            quantity = int(
                item["quantity"]
            )

            if quantity <= 0:
                raise ValueError(
                    "Allocation quantity must be greater than zero"
                )

            # Lock the exact inventory row.
            stock = (
                db.query(Inventory)
                .filter(
                    Inventory.warehouse_id
                    == warehouse_id,

                    Inventory.product_id
                    == line.product_id,
                )
                .with_for_update()
                .one_or_none()
            )

            if stock is None:
                raise ValueError(
                    "No inventory exists for the "
                    "requested warehouse and product"
                )

            if stock.available_quantity <= 0:
                raise ValueError(
                    "Requested warehouse has no "
                    "available stock"
                )

            if quantity > stock.available_quantity:
                raise ValueError(
                    "Insufficient stock for requested "
                    "warehouse allocation"
                )

            if quantity > remaining:
                raise ValueError(
                    "Allocation exceeds quotation "
                    "line quantity"
                )

            # Reserve the inventory.
            stock.available_quantity -= quantity

            allocation = Fulfillment(
                quotation_id=quotation.id,
                quotation_line_id=line.id,
                warehouse_id=warehouse_id,
                quantity=quantity,
                status="SHIPPED",
            )

            db.add(allocation)

            allocations.append(
                allocation
            )

            remaining -= quantity

        # -----------------------------------------------------
        # Backorder
        # -----------------------------------------------------

        if remaining > 0:

            backorder = Backorder(
                quotation_id=quotation.id,
                quotation_line_id=line.id,
                quantity=remaining,
                status="OPEN",
            )

            db.add(backorder)

            backorders.append(
                backorder
            )

    # ---------------------------------------------------------
    # Final quotation status
    # ---------------------------------------------------------

    if backorders:

        quotation.status = (
            "PARTIALLY_FULFILLED"
        )

    else:

        quotation.status = "FULFILLED"

    return allocations, backorders


def create_subscriptions(
    db: Session,
    quotation: Quotation,
):
    created = []

    lines = (
        db.query(QuotationLine)
        .filter(
            QuotationLine.quotation_id
            == quotation.id
        )
        .all()
    )

    for line in lines:

        product = db.get(
            Product,
            line.product_id,
        )

        if product is None:
            raise ValueError(
                f"Product {line.product_id} not found"
            )

        if not product.is_subscription:
            continue

        existing = (
            db.query(Subscription)
            .filter(
                Subscription.quotation_line_id
                == line.id
            )
            .first()
        )

        if existing:
            continue

        if not product.subscription_plan_id:
            raise ValueError(
                f"Subscription product "
                f"{product.name} has no plan"
            )

        plan = db.get(
            SubscriptionPlan,
            product.subscription_plan_id,
        )

        if plan is None:
            raise ValueError(
                f"Subscription plan not found "
                f"for {product.name}"
            )

        days = {
            "MONTHLY": 30,
            "QUARTERLY": 90,
            "YEARLY": 365,
        }.get(
            plan.interval
        )

        if not days:
            raise ValueError(
                "Invalid subscription interval"
            )

        price = (
            Decimal(line.unit_price)
            * (
                Decimal("1")
                - Decimal(
                    line.discount_percent
                )
                / 100
            )
        )

        subscription = Subscription(
            quotation_id=quotation.id,
            quotation_line_id=line.id,
            customer_id=quotation.customer_id,
            plan_id=plan.id,
            quantity=line.quantity,
            unit_price=price,
            start_date=date.today(),
            next_billing_date=(
                date.today()
                + timedelta(days=days)
            ),
            status="ACTIVE",
        )

        db.add(
            subscription
        )

        created.append(
            subscription
        )

    return created


def create_invoices(
    db: Session,
    quotation: Quotation,
):
    invoices = []

    shipped = {
        row[0]: row[1]
        for row in (
            db.query(
                Fulfillment.quotation_line_id,
                func.sum(
                    Fulfillment.quantity
                ),
            )
            .filter(
                Fulfillment.quotation_id
                == quotation.id,

                Fulfillment.status
                == "SHIPPED",
            )
            .group_by(
                Fulfillment.quotation_line_id
            )
        )
    }

    one_time = Decimal("0")
    recurring = Decimal("0")

    lines = (
        db.query(QuotationLine)
        .filter(
            QuotationLine.quotation_id
            == quotation.id
        )
        .all()
    )

    for line in lines:

        product = db.get(
            Product,
            line.product_id,
        )

        if product is None:
            raise ValueError(
                f"Product {line.product_id} not found"
            )

        amount = (
            Decimal(line.unit_price)
            * (
                Decimal("1")
                - Decimal(
                    line.discount_percent
                )
                / 100
            )
        )

        if product.is_subscription:

            recurring += (
                amount * line.quantity
            )

        else:

            one_time += (
                amount
                * shipped.get(
                    line.id,
                    0,
                )
            )

    for invoice_type, amount in (
        ("ONE_TIME", one_time),
        ("RECURRING", recurring),
    ):

        if amount <= 0:
            continue

        exists = (
            db.query(Invoice)
            .filter(
                Invoice.quotation_id
                == quotation.id,

                Invoice.invoice_type
                == invoice_type,

                Invoice.status
                != "VOID",
            )
            .first()
        )

        if exists:
            continue

        invoice = Invoice(
            invoice_number=(
                f"INV-{quotation.id}-"
                f"{invoice_type[0]}-"
                f"{date.today():%Y%m%d}"
            ),

            quotation_id=quotation.id,

            customer_id=quotation.customer_id,

            invoice_type=invoice_type,

            amount=amount,

            currency=quotation.currency,

            status="ISSUED",

            issued_date=date.today(),

            due_date=(
                date.today()
                + timedelta(days=30)
            ),
        )

        db.add(
            invoice
        )

        invoices.append(
            invoice
        )

    if invoices:
        quotation.status = "INVOICED"

    return invoices


def record_payment(
    db: Session,
    invoice: Invoice,
    amount: Decimal,
    reference: str,
):
    paid = (
        db.query(
            func.coalesce(
                func.sum(
                    Payment.amount
                ),
                0,
            )
        )
        .filter(
            Payment.invoice_id
            == invoice.id
        )
        .scalar()
    )

    paid = Decimal(paid)

    if amount <= 0:
        raise ValueError(
            "Payment must be positive"
        )

    if (
        paid + amount
        > Decimal(invoice.amount)
    ):
        raise ValueError(
            "Payment cannot exceed "
            "invoice balance"
        )

    payment = Payment(
        invoice_id=invoice.id,
        amount=amount,
        reference=reference,
        payment_date=date.today(),
    )

    db.add(
        payment
    )

    invoice.status = (
        "PAID"
        if paid + amount
        == Decimal(invoice.amount)
        else "PARTIALLY_PAID"
    )

    return payment


def prorated_amount(
    old_price: Decimal,
    new_price: Decimal,
    cycle_start: date,
    cycle_end: date,
    changed_on: date,
) -> Decimal:

    total_days = (
        cycle_end - cycle_start
    ).days

    remaining = max(
        0,
        (
            cycle_end - changed_on
        ).days,
    )

    if total_days <= 0:
        raise ValueError(
            "Invalid subscription billing cycle"
        )

    return (
        (new_price - old_price)
        * Decimal(remaining)
        / Decimal(total_days)
    )