from decimal import Decimal

from app.database.connection import (
    SessionLocal,
)

from app.models.customer import Customer
from app.models.operations import (
    Inventory,
    SubscriptionPlan,
    Warehouse,
)

from app.models.product import Product

from app.models.quotation import (
    Quotation,
)

from app.models.quotation_line import (
    QuotationLine,
)


db = SessionLocal()


try:

    # =========================================================
    # SUBSCRIPTION PLAN
    # =========================================================

    monthly = (
        db.query(SubscriptionPlan)
        .filter(
            SubscriptionPlan.name
            == "Monthly Care"
        )
        .first()
    )

    if monthly is None:

        monthly = SubscriptionPlan(
            name="Monthly Care",
            interval="MONTHLY",
            active=True,
        )

        db.add(monthly)
        db.flush()


    # =========================================================
    # CUSTOMER
    # =========================================================

    customer = (
        db.query(Customer)
        .filter(
            Customer.email
            == "sales@acme.example"
        )
        .first()
    )

    if customer is None:

        customer = Customer(
            name="Acme Corp",
            email="sales@acme.example",
            tier="Gold",
        )

        db.add(customer)
        db.flush()


    # =========================================================
    # PRODUCTS
    # =========================================================

    laptop = (
        db.query(Product)
        .filter(
            Product.name
            == "Laptop Pro 14"
        )
        .first()
    )

    setup = (
        db.query(Product)
        .filter(
            Product.name
            == "Onsite Setup Service"
        )
        .first()
    )

    warranty = (
        db.query(Product)
        .filter(
            Product.name
            == "Extended Warranty"
        )
        .first()
    )


    if warranty:

        warranty.cost_price = Decimal(
            "60"
        )

        warranty.subscription_plan_id = (
            monthly.id
        )


    # =========================================================
    # WAREHOUSES
    # =========================================================

    warehouse_data = [
        (
            "Main Warehouse",
            "Central",
        ),
        (
            "East Depot",
            "East",
        ),
    ]


    warehouses = {}


    for name, location in warehouse_data:

        warehouse = (
            db.query(Warehouse)
            .filter(
                Warehouse.name == name
            )
            .first()
        )

        if warehouse is None:

            warehouse = Warehouse(
                name=name,
                location=location,
                is_active=True,
            )

            db.add(warehouse)
            db.flush()

        warehouses[name] = warehouse


    # =========================================================
    # LAPTOP INVENTORY
    #
    # Main = 22
    # East = 4
    #
    # Total = 26
    #
    # Q-1042 needs 2 laptops.
    #
    # Recommendation will therefore allocate:
    #
    # Main Warehouse -> 2
    #
    # The architecture also supports the demo scenario:
    #
    # Required 24
    # Main 22
    # East 4
    #
    # => Main 22 + East 2
    # =========================================================

    if laptop:

        inventory_data = [
            (
                "Main Warehouse",
                22,
            ),
            (
                "East Depot",
                4,
            ),
        ]


        for warehouse_name, quantity in (
            inventory_data
        ):

            warehouse = warehouses[
                warehouse_name
            ]

            stock = (
                db.query(Inventory)
                .filter(
                    Inventory.warehouse_id
                    == warehouse.id,

                    Inventory.product_id
                    == laptop.id,
                )
                .one_or_none()
            )


            if stock is None:

                db.add(
                    Inventory(
                        warehouse_id=warehouse.id,
                        product_id=laptop.id,
                        available_quantity=quantity,
                    )
                )


    # =========================================================
    # DOCKING STATION INVENTORY
    # =========================================================

    docking_station = (
        db.query(Product)
        .filter(
            Product.name
            == "Docking Station"
        )
        .first()
    )


    if docking_station:

        warehouse = warehouses[
            "Main Warehouse"
        ]

        stock = (
            db.query(Inventory)
            .filter(
                Inventory.warehouse_id
                == warehouse.id,

                Inventory.product_id
                == docking_station.id,
            )
            .one_or_none()
        )


        if stock is None:

            db.add(
                Inventory(
                    warehouse_id=warehouse.id,
                    product_id=docking_station.id,
                    available_quantity=53,
                )
            )


    # =========================================================
    # Q-1042
    # =========================================================

    existing = (
        db.query(Quotation)
        .filter(
            Quotation.quotation_number
            == "Q-1042"
        )
        .first()
    )


    if existing:

        # The demo quotation must be fulfillable.
        existing.status = "APPROVED"

        quotation = existing

        print(
            "Q-1042 already exists. "
            "Updated status to APPROVED."
        )

    else:

        quotation = Quotation(
            quotation_number="Q-1042",
            customer_id=customer.id,
            status="APPROVED",
            currency="USD",
        )

        db.add(quotation)
        db.flush()


        if laptop:

            db.add(
                QuotationLine(
                    quotation_id=quotation.id,
                    product_id=laptop.id,
                    quantity=2,
                    unit_price=Decimal(
                        "1200"
                    ),
                    discount_percent=Decimal(
                        "12"
                    ),
                )
            )


        if setup:

            db.add(
                QuotationLine(
                    quotation_id=quotation.id,
                    product_id=setup.id,
                    quantity=1,
                    unit_price=Decimal(
                        "450"
                    ),
                    discount_percent=Decimal(
                        "18"
                    ),
                )
            )


        if warranty:

            db.add(
                QuotationLine(
                    quotation_id=quotation.id,
                    product_id=warranty.id,
                    quantity=1,
                    unit_price=Decimal(
                        "180"
                    ),
                    discount_percent=Decimal(
                        "10"
                    ),
                )
            )


        print(
            "Q-1042 created successfully."
        )


    db.commit()


finally:

    db.close()