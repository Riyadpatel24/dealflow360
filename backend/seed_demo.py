from decimal import Decimal

from app.database.connection import SessionLocal
from app.models.customer import Customer
from app.models.notification import Notification
from app.models.operations import Inventory, SubscriptionPlan, Warehouse
from app.models.product import Product
from app.models.quotation import Quotation
from app.models.quotation_line import QuotationLine
from app.models.user import User


db = SessionLocal()

try:
    monthly = db.query(SubscriptionPlan).filter(SubscriptionPlan.name == "Monthly Care").first()
    if monthly is None:
        monthly = SubscriptionPlan(name="Monthly Care", interval="MONTHLY", active=True)
        db.add(monthly)
        db.flush()

    # Demo customer set for quotation creation.
    customer_data = [
        ("Acme Corp", "sales@acme.example", "Gold"),
        ("Nova Insurance", "sales@nova-insurance.example", "Silver"),
        ("Zenith Holdings", "sales@zenith.example", "Gold"),
        ("Apex Financial", "sales@apex-financial.example", "Silver"),
        ("BluePeak Enterprises", "sales@bluepeak.example", "Bronze"),
        ("Orion Technologies", "sales@orion.example", "Gold"),
        ("Vertex Solutions", "sales@vertex.example", "Silver"),
    ]
    customers = {}
    for name, email, tier in customer_data:
        customer = db.query(Customer).filter(Customer.email == email).first()
        if customer is None:
            customer = Customer(name=name, email=email, tier=tier)
            db.add(customer)
            db.flush()
        else:
            customer.name = name
            customer.tier = tier
        customers[email] = customer

    customer = customers["sales@acme.example"]

    # Demo policy products for the quotation selector.
    policy_data = [
        ("Silver Health Policy", "Silver", Decimal("10000"), False),
        ("Gold Health Policy", "Gold", Decimal("18000"), False),
        ("Bronze Protection Policy", "Bronze", Decimal("6000"), False),
        ("Corporate Risk Policy", "Gold", Decimal("25000"), False),
        ("Family Protection Policy", "Silver", Decimal("12000"), False),
        ("Business Continuity Policy", "Gold", Decimal("30000"), False),
        ("Annual Premium Care Policy", "Silver", Decimal("15000"), True),
    ]
    policy_products = []
    for name, tier, price, is_subscription in policy_data:
        product = db.query(Product).filter(Product.name == name).first()
        if product is None:
            product = Product(
                name=name,
                category="Policy",
                unit_price=price,
                is_subscription=is_subscription,
                cost_price=price * Decimal("0.65"),
                subscription_plan_id=monthly.id if is_subscription else None,
            )
            db.add(product)
            db.flush()
        else:
            product.category = "Policy"
            product.unit_price = price
            product.is_subscription = is_subscription
            product.cost_price = price * Decimal("0.65")
            product.subscription_plan_id = monthly.id if is_subscription else None
        policy_products.append(product)

    # Keep the existing operational demo data available.
    laptop = db.query(Product).filter(Product.name == "Laptop Pro 14").first()
    warranty = db.query(Product).filter(Product.name == "Extended Warranty").first()
    if warranty:
        warranty.cost_price = Decimal("60")
        warranty.subscription_plan_id = monthly.id

    warehouse_data = [("Main Warehouse", "Central"), ("East Depot", "East")]
    warehouses = {}
    for name, location in warehouse_data:
        warehouse = db.query(Warehouse).filter(Warehouse.name == name).first()
        if warehouse is None:
            warehouse = Warehouse(name=name, location=location, is_active=True)
            db.add(warehouse)
            db.flush()
        warehouses[name] = warehouse

    if laptop:
        for warehouse_name, quantity in [("Main Warehouse", 22), ("East Depot", 4)]:
            warehouse = warehouses[warehouse_name]
            stock = db.query(Inventory).filter(
                Inventory.warehouse_id == warehouse.id,
                Inventory.product_id == laptop.id,
            ).one_or_none()
            if stock is None:
                db.add(Inventory(
                    warehouse_id=warehouse.id,
                    product_id=laptop.id,
                    available_quantity=quantity,
                ))

    quotation = db.query(Quotation).filter(Quotation.quotation_number == "Q-1042").first()
    if quotation:
        quotation.status = "DRAFT"
        print("Q-1042 already exists. Reset status to DRAFT for the approval demo.")
    else:
        quotation = Quotation(
            quotation_number="Q-1042",
            customer_id=customer.id,
            status="DRAFT",
            currency="USD",
        )
        db.add(quotation)
        db.flush()
        if policy_products:
            db.add(QuotationLine(
                quotation_id=quotation.id,
                product_id=policy_products[0].id,
                quantity=1,
                unit_price=policy_products[0].unit_price,
                discount_percent=Decimal("12"),
            ))

    db.commit()

    demo_signals = [
        ("APPROVAL", "Approval queue ready", "Q-1042 is a draft with policy-sensitive pricing. Evaluate risk before submission."),
        ("WAREHOUSE", "Warehouse signal", "Policy demand is being watched against available operational capacity."),
        ("INTELLIGENCE", "Command center ready", "Revenue, Deal Health, Customer 360 and next-best-action signals are available."),
    ]
    for email in ["admin@dealflow360.com", "manager@dealflow360.com", "finance@dealflow360.com", "sales@dealflow360.com"]:
        user = db.query(User).filter(User.email == email).first()
        if not user:
            continue
        for kind, title, message in demo_signals:
            exists = db.query(Notification).filter(
                Notification.user_id == user.id,
                Notification.title == title,
            ).first()
            if not exists:
                db.add(Notification(
                    user_id=user.id,
                    title=title,
                    message=message,
                    kind=kind,
                    entity="quotation",
                    entity_id=quotation.id,
                ))
    db.commit()
    print("DealFlow360 demo data seeded successfully.")
finally:
    db.close()
