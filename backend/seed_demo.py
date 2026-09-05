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
        db.add(monthly); db.flush()

    customer = db.query(Customer).filter(Customer.email == "sales@acme.example").first()
    if customer is None:
        customer = Customer(name="Acme Corp", email="sales@acme.example", tier="Gold")
        db.add(customer); db.flush()

    laptop = db.query(Product).filter(Product.name == "Laptop Pro 14").first()
    setup = db.query(Product).filter(Product.name == "Onsite Setup Service").first()
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
            db.add(warehouse); db.flush()
        warehouses[name] = warehouse

    if laptop:
        for warehouse_name, quantity in [("Main Warehouse", 22), ("East Depot", 4)]:
            warehouse = warehouses[warehouse_name]
            stock = db.query(Inventory).filter(Inventory.warehouse_id == warehouse.id, Inventory.product_id == laptop.id).one_or_none()
            if stock is None: db.add(Inventory(warehouse_id=warehouse.id, product_id=laptop.id, available_quantity=quantity))

    docking_station = db.query(Product).filter(Product.name == "Docking Station").first()
    if docking_station:
        warehouse = warehouses["Main Warehouse"]
        stock = db.query(Inventory).filter(Inventory.warehouse_id == warehouse.id, Inventory.product_id == docking_station.id).one_or_none()
        if stock is None: db.add(Inventory(warehouse_id=warehouse.id, product_id=docking_station.id, available_quantity=53))

    quotation = db.query(Quotation).filter(Quotation.quotation_number == "Q-1042").first()
    if quotation:
        quotation.status = "DRAFT"
        print("Q-1042 already exists. Reset status to DRAFT for the approval demo.")
    else:
        quotation = Quotation(quotation_number="Q-1042", customer_id=customer.id, status="DRAFT", currency="USD")
        db.add(quotation); db.flush()
        if laptop: db.add(QuotationLine(quotation_id=quotation.id, product_id=laptop.id, quantity=2, unit_price=Decimal("1200"), discount_percent=Decimal("12")))
        if setup: db.add(QuotationLine(quotation_id=quotation.id, product_id=setup.id, quantity=1, unit_price=Decimal("450"), discount_percent=Decimal("18")))
        if warranty: db.add(QuotationLine(quotation_id=quotation.id, product_id=warranty.id, quantity=1, unit_price=Decimal("180"), discount_percent=Decimal("10")))

    db.commit()

    demo_signals = [
        ("APPROVAL", "Approval queue ready", "Q-1042 is a draft with policy-sensitive pricing. Evaluate risk before submission."),
        ("WAREHOUSE", "Warehouse signal", "Laptop Pro 14 demand is being watched against available inventory."),
        ("INTELLIGENCE", "Command center ready", "Revenue, Deal Health, Customer 360 and next-best-action signals are available."),
    ]
    for email in ["admin@dealflow360.com", "manager@dealflow360.com", "finance@dealflow360.com", "sales@dealflow360.com"]:
        user = db.query(User).filter(User.email == email).first()
        if not user: continue
        for kind, title, message in demo_signals:
            exists = db.query(Notification).filter(Notification.user_id == user.id, Notification.title == title).first()
            if not exists:
                db.add(Notification(user_id=user.id, title=title, message=message, kind=kind, entity="quotation", entity_id=quotation.id))
    db.commit()
    print("DealFlow360 demo data seeded successfully.")
finally:
    db.close()
