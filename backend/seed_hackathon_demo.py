"""Seed a deterministic, idempotent DealFlow360 hackathon dataset.

Adds 300+ useful records so dashboards, search, analytics, deal health,
warehouse and audit views look like a real operating system rather than a toy.
"""
from decimal import Decimal
from datetime import datetime, timedelta
import json

from app.database.connection import SessionLocal
from app.models.customer import Customer
from app.models.notification import Notification
from app.models.product import Product
from app.models.quotation import Quotation
from app.models.quotation_line import QuotationLine
from app.models.risk_evaluation import RiskEvaluation
from app.models.operations import AuditEvent, Inventory, Warehouse
from app.models.user import User


db = SessionLocal()

try:
    def get_or_create(model, defaults=None, **filters):
        obj = db.query(model).filter_by(**filters).first()
        if obj:
            return obj
        obj = model(**filters, **(defaults or {}))
        db.add(obj)
        db.flush()
        return obj

    # 36 customers
    tiers = ["Bronze", "Silver", "Gold", "Platinum"]
    customers = []
    for i in range(1, 37):
        email = f"demo.customer{i:02d}@dealflow.example"
        customer = get_or_create(
            Customer,
            {"name": f"Demo Customer {i:02d}", "tier": tiers[(i - 1) % 4]},
            email=email,
        )
        customers.append(customer)

    # 24 products across hardware, software, services and subscriptions
    catalog = [
        ("Cloud Laptop", "Hardware", 1450, False),
        ("Business Laptop", "Hardware", 1190, False),
        ("Workstation Pro", "Hardware", 2350, False),
        ("Monitor 27", "Hardware", 420, False),
        ("Monitor 34 Ultrawide", "Hardware", 690, False),
        ("USB-C Dock", "Hardware", 180, False),
        ("Keyboard Pro", "Hardware", 95, False),
        ("Mouse Pro", "Hardware", 70, False),
        ("Conference Camera", "Hardware", 310, False),
        ("Headset Pro", "Hardware", 160, False),
        ("Cloud Backup", "Software", 240, True),
        ("Analytics Suite", "Software", 780, False),
        ("CRM Connector", "Software", 360, False),
        ("Security Pack", "Software", 520, False),
        ("Support Standard", "Services", 300, False),
        ("Support Premium", "Services", 720, False),
        ("Onboarding Service", "Services", 450, False),
        ("Migration Service", "Services", 1100, False),
        ("Extended Warranty", "Services", 180, True),
        ("Training Workshop", "Services", 600, False),
        ("Cloud Storage 1TB", "Subscriptions", 120, True),
        ("Cloud Storage 5TB", "Subscriptions", 420, True),
        ("AI Assistant Seats", "Subscriptions", 300, True),
        ("Security Monitoring", "Subscriptions", 260, True),
    ]
    products = []
    for base_name, category, price, subscription in catalog:
        name = f"Demo {base_name}"
        product = get_or_create(
            Product,
            {
                "category": category,
                "unit_price": Decimal(str(price)),
                "cost_price": Decimal(str(round(price * 0.58, 2))),
                "is_subscription": subscription,
            },
            name=name,
        )
        products.append(product)

    # Three warehouses and inventory for every demo product.
    warehouses = []
    for name, location in [("Demo Main Warehouse", "Central"), ("Demo East Depot", "East"), ("Demo West Hub", "West")]:
        warehouses.append(get_or_create(Warehouse, {"location": location, "is_active": True}, name=name))
    for i, product in enumerate(products, 1):
        for w, warehouse in enumerate(warehouses):
            stock = db.query(Inventory).filter(
                Inventory.warehouse_id == warehouse.id,
                Inventory.product_id == product.id,
            ).one_or_none()
            quantity = 12 + ((i * 9 + w * 13) % 75)
            if stock is None:
                db.add(Inventory(warehouse_id=warehouse.id, product_id=product.id, available_quantity=quantity))
            else:
                stock.available_quantity = quantity

    db.flush()

    # 70 quotations x 2 lines = 140 quotation lines.
    statuses = [
        "DRAFT", "DRAFT", "UNDER_APPROVAL", "APPROVED", "CONFIRMED",
        "PARTIALLY_FULFILLED", "FULFILLED", "INVOICED", "REJECTED", "APPROVED",
    ]
    quotes = []
    for i in range(1, 71):
        number = f"DMO-{1000 + i}"
        customer = customers[(i - 1) % len(customers)]
        status = statuses[(i - 1) % len(statuses)]
        quote = get_or_create(
            Quotation,
            {
                "customer_id": customer.id,
                "status": status,
                "currency": "USD",
                "created_at": datetime.utcnow() - timedelta(days=(70 - i) % 45),
                "updated_at": datetime.utcnow() - timedelta(days=(70 - i) % 18),
            },
            quotation_number=number,
        )
        if quote.customer_id != customer.id or quote.status != status:
            quote.customer_id = customer.id
            quote.status = status
        if db.query(QuotationLine).filter(QuotationLine.quotation_id == quote.id).count() == 0:
            p1 = products[(i * 2 - 2) % len(products)]
            p2 = products[(i * 2 - 1) % len(products)]
            db.add(QuotationLine(
                quotation_id=quote.id, product_id=p1.id, quantity=1 + (i % 8),
                unit_price=p1.unit_price, discount_percent=Decimal(str((i * 2) % 18)),
            ))
            db.add(QuotationLine(
                quotation_id=quote.id, product_id=p2.id, quantity=1 + ((i + 3) % 6),
                unit_price=p2.unit_price, discount_percent=Decimal(str((i * 3) % 14)),
            ))
        quotes.append(quote)

    db.flush()

    # Explainable risk records for high-risk demo deals.
    for i, quote in enumerate(quotes, 1):
        if quote.status not in {"UNDER_APPROVAL", "REJECTED"}:
            continue
        existing = db.query(RiskEvaluation).filter(RiskEvaluation.quotation_id == quote.id).first()
        if not existing:
            deviation = Decimal("8.00") if quote.status == "UNDER_APPROVAL" else Decimal("15.00")
            reason = (
                "Discount exceeds the customer/category policy threshold."
                if quote.status == "UNDER_APPROVAL"
                else "Requested discount materially exceeds policy limits."
            )
            db.add(RiskEvaluation(
                quotation_id=quote.id,
                risk_level="HIGH",
                worst_deviation=deviation,
                reason=reason,
            ))

    db.commit()

    # 24 notifications across the internal team.
    internal_emails = [
        "admin@dealflow360.com", "manager@dealflow360.com",
        "finance@dealflow360.com", "sales@dealflow360.com",
    ]
    kinds = ["APPROVAL", "WAREHOUSE", "RISK", "REVENUE"]
    for i in range(1, 25):
        user = db.query(User).filter(User.email == internal_emails[(i - 1) % 4]).first()
        if not user:
            continue
        quote = quotes[(i - 1) % len(quotes)]
        title = f"Demo signal {i:02d}"
        if not db.query(Notification).filter(Notification.user_id == user.id, Notification.title == title).first():
            db.add(Notification(
                user_id=user.id,
                title=title,
                message=f"Demo intelligence signal for {quote.quotation_number}. Review the current workflow state and next action.",
                kind=kinds[(i - 1) % 4],
                entity="quotation",
                entity_id=quote.id,
                is_read=i % 4 == 0,
            ))

    # 30 audit events for the admin/management audit screen.
    actions = ["QUOTE_VIEWED", "RISK_EVALUATED", "APPROVAL_REVIEWED", "FULFILLMENT_UPDATED", "REPORT_VIEWED"]
    for i in range(1, 31):
        user = db.query(User).filter(User.email == internal_emails[(i - 1) % 4]).first()
        quote = quotes[(i - 1) % len(quotes)]
        action = actions[(i - 1) % len(actions)]
        exists = db.query(AuditEvent).filter(
            AuditEvent.entity == "QUOTATION",
            AuditEvent.entity_id == quote.id,
            AuditEvent.action == action,
        ).first()
        if not exists:
            db.add(AuditEvent(
                user_id=user.id if user else None,
                entity="QUOTATION",
                entity_id=quote.id,
                action=action,
                details=json.dumps({"source": "hackathon_demo", "sequence": i}),
            ))

    db.commit()
    print("DealFlow360 demo dataset ready: 36 customers + 24 products + 72 inventory rows + 70 quotations + 140 quotation lines + 24 notifications + 30 audit events = 396+ records.")
finally:
    db.close()
