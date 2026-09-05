from decimal import Decimal
from datetime import date, timedelta

from app.database.connection import SessionLocal
from app.models.customer import Customer
from app.models.product import Product
from app.models.quotation import Quotation
from app.models.quotation_line import QuotationLine
from app.models.risk_evaluation import RiskEvaluation
from app.models.operations import (
    Inventory,
    Subscription,
    SubscriptionPlan,
    Warehouse,
)


db = SessionLocal()


def get_or_create(model, defaults=None, **filters):
    obj = db.query(model).filter_by(**filters).first()
    if obj:
        return obj
    obj = model(**filters, **(defaults or {}))
    db.add(obj)
    db.flush()
    return obj


try:
    # Customers
    customers = [
        ("Acme Corp", "sales@acme.example", "Gold"),
        ("Beta Industries", "sales@beta.example", "Silver"),
        ("Nova Retail", "procurement@nova.example", "Gold"),
        ("Delta LLC", "ops@delta.example", "Bronze"),
        ("Zenith Co", "buying@zenith.example", "Silver"),
        ("Orion Systems", "procurement@orion.example", "Gold"),
    ]
    customer_map = {}
    for name, email, tier in customers:
        customer_map[name] = get_or_create(Customer, {"name": name, "tier": tier}, email=email)

    # Products
    product_data = [
        ("Laptop Pro 14", "Hardware", 1200, False),
        ("Docking Station", "Hardware", 180, False),
        ("Onsite Setup Service", "Services", 450, False),
        ("Extended Warranty", "Services", 180, True),
        ("Care Plan 2yr", "Subscriptions", 46, True),
        ("Support SLA", "Subscriptions", 300, True),
        ("Monitor 27", "Hardware", 380, False),
        ("Keyboard Pro", "Hardware", 95, False),
        ("Implementation Package", "Services", 950, False),
        ("Cloud Backup", "Subscriptions", 75, True),
    ]
    products = {}
    for name, category, price, subscription in product_data:
        products[name] = get_or_create(
            Product,
            {"category": category, "unit_price": Decimal(str(price)), "is_subscription": subscription},
            name=name,
        )

    # Subscription plans
    plans = {}
    for name, interval in [("Monthly Care", "MONTHLY"), ("Care Plan 2yr", "MONTHLY"), ("Support SLA", "QUARTERLY")]:
        plans[name] = get_or_create(SubscriptionPlan, {"interval": interval, "active": True}, name=name)

    # Link subscription products to plans
    products["Extended Warranty"].subscription_plan_id = plans["Monthly Care"].id
    products["Care Plan 2yr"].subscription_plan_id = plans["Care Plan 2yr"].id
    products["Support SLA"].subscription_plan_id = plans["Support SLA"].id
    products["Cloud Backup"].subscription_plan_id = plans["Monthly Care"].id

    # Warehouses + richer inventory
    warehouse_map = {}
    for name, location in [("Main Warehouse", "Central"), ("East Depot", "East"), ("West Hub", "West")]:
        warehouse_map[name] = get_or_create(Warehouse, {"location": location, "is_active": True}, name=name)

    inventory = {
        "Main Warehouse": {"Laptop Pro 14": 22, "Docking Station": 53, "Monitor 27": 18, "Keyboard Pro": 60},
        "East Depot": {"Laptop Pro 14": 4, "Docking Station": 15, "Monitor 27": 7, "Keyboard Pro": 20},
        "West Hub": {"Laptop Pro 14": 10, "Docking Station": 9, "Monitor 27": 12, "Keyboard Pro": 16},
    }
    for wh_name, items in inventory.items():
        for product_name, qty in items.items():
            row = (
                db.query(Inventory)
                .filter(Inventory.warehouse_id == warehouse_map[wh_name].id, Inventory.product_id == products[product_name].id)
                .first()
            )
            if row is None:
                db.add(Inventory(warehouse_id=warehouse_map[wh_name].id, product_id=products[product_name].id, available_quantity=qty))
            else:
                row.available_quantity = qty

    # Quotations with different lifecycle states for dashboards/reports.
    quote_specs = [
        ("Q-1043", "Beta Industries", "DRAFT", [("Laptop Pro 14", 3, 1200, 5), ("Docking Station", 3, 180, 0)]),
        ("Q-1044", "Nova Retail", "UNDER_APPROVAL", [("Laptop Pro 14", 8, 1200, 12), ("Onsite Setup Service", 2, 450, 18)]),
        ("Q-1045", "Delta LLC", "APPROVED", [("Monitor 27", 6, 380, 8), ("Keyboard Pro", 6, 95, 5)]),
        ("Q-1046", "Zenith Co", "CONFIRMED", [("Laptop Pro 14", 4, 1200, 7), ("Implementation Package", 1, 950, 5)]),
        ("Q-1047", "Orion Systems", "APPROVED", [("Docking Station", 12, 180, 10), ("Cloud Backup", 12, 75, 5)]),
        ("Q-1048", "Beta Industries", "REJECTED", [("Laptop Pro 14", 10, 1200, 25)]),
        ("Q-1049", "Nova Retail", "DRAFT", [("Monitor 27", 2, 380, 0), ("Onsite Setup Service", 1, 450, 5)]),
        ("Q-1050", "Delta LLC", "INVOICED", [("Laptop Pro 14", 1, 1200, 5), ("Extended Warranty", 1, 180, 5)]),
    ]

    for number, customer_name, status, lines in quote_specs:
        quote = db.query(Quotation).filter(Quotation.quotation_number == number).first()
        if quote is None:
            quote = Quotation(
                quotation_number=number,
                customer_id=customer_map[customer_name].id,
                status=status,
                currency="USD",
            )
            db.add(quote)
            db.flush()
        else:
            quote.customer_id = customer_map[customer_name].id
            quote.status = status

        existing_count = db.query(QuotationLine).filter(QuotationLine.quotation_id == quote.id).count()
        if existing_count == 0:
            for product_name, qty, price, discount in lines:
                db.add(
                    QuotationLine(
                        quotation_id=quote.id,
                        product_id=products[product_name].id,
                        quantity=qty,
                        unit_price=Decimal(str(price)),
                        discount_percent=Decimal(str(discount)),
                    )
                )

        # Add explainable risk signals to non-trivial deals.
        if status in {"UNDER_APPROVAL", "REJECTED"}:
            risk = db.query(RiskEvaluation).filter(RiskEvaluation.quotation_id == quote.id).first()
            if risk is None:
                deviation = Decimal("8.00") if status == "UNDER_APPROVAL" else Decimal("15.00")
                reason = "Discount exceeds the customer/category policy threshold." if status == "UNDER_APPROVAL" else "Requested discount materially exceeds policy limits."
                db.add(RiskEvaluation(quotation_id=quote.id, risk_level="HIGH", worst_deviation=deviation, reason=reason))

    # A few active subscriptions so the subscription/reporting views are populated.
    subscription_specs = [
        ("Acme Corp", "Q-1042", "Extended Warranty", 1, 180, 30),
        ("Nova Retail", "Q-1047", "Cloud Backup", 12, 75, 45),
        ("Orion Systems", "Q-1047", "Support SLA", 1, 300, 60),
    ]
    for customer_name, quote_number, product_name, qty, price, days in subscription_specs:
        quote = db.query(Quotation).filter(Quotation.quotation_number == quote_number).first()
        line = db.query(QuotationLine).filter(QuotationLine.quotation_id == quote.id, QuotationLine.product_id == products[product_name].id).first()
        if not line:
            continue
        exists = (
            db.query(Subscription)
            .filter(Subscription.quotation_line_id == line.id, Subscription.customer_id == customer_map[customer_name].id)
            .first()
        )
        if not exists:
            start = date.today() - timedelta(days=30)
            db.add(
                Subscription(
                    quotation_id=quote.id,
                    quotation_line_id=line.id,
                    customer_id=customer_map[customer_name].id,
                    plan_id=products[product_name].subscription_plan_id,
                    quantity=qty,
                    unit_price=Decimal(str(price)),
                    start_date=start,
                    next_billing_date=date.today() + timedelta(days=days),
                    status="ACTIVE",
                )
            )

    db.commit()
    print("Hackathon demo dataset ready: customers=6, products=10, warehouses=3, quotations=8, plus risk/subscription data.")
finally:
    db.close()
