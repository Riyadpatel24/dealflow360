from app.database.base import Base
from app.database.connection import (
    SessionLocal,
    engine,
)

import app.models

from app.core.security import (
    hash_password,
)

from app.models.customer import Customer
from app.models.customer_user import CustomerUser
from app.models.discount_policy import DiscountPolicy
from app.models.product import Product
from app.models.user import User
from app.models.admin import Admin
from app.models.sales_user import SalesUser


Base.metadata.create_all(
    bind=engine
)


db = SessionLocal()


try:

    # -------------------------
    # CUSTOMER
    # -------------------------

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


    # -------------------------
    # USERS
    # -------------------------

    demo_users = [

        {
            "name": "DealFlow Admin",
            "email": "admin@dealflow360.com",
            "password": "Admin@123",
            "role": "ADMIN",
        },
        {
            "name": "Sales Manager",
            "email": "manager@dealflow360.com",
            "password": "Manager@123",
            "role": "SALES_MANAGER",
        },
        {
            "name": "Finance Approver",
            "email": "finance@dealflow360.com",
            "password": "Finance@123",
            "role": "FINANCE",
        },

        {
            "name": "Sales Representative",
            "email": "sales@dealflow360.com",
            "password": "Sales@123",
            "role": "SALES",
        },

        {
            "name": "Acme Customer",
            "email": "customer@dealflow360.com",
            "password": "Customer@123",
            "role": "CUSTOMER",
            "customer_id": customer.id,
        },

    ]


    for user_data in demo_users:

        existing = (
            db.query(User)
            .filter(
                User.email
                == user_data["email"]
            )
            .first()
        )


        if existing is None:

            user = User(
                name=user_data["name"],
                email=user_data["email"],
                password_hash=
                    hash_password(
                        user_data["password"]
                    ),
                role=user_data["role"],
                customer_id=
                    user_data.get(
                        "customer_id"
                    ),
                is_active=True,
            )

            db.add(user)
            db.flush()

            if user.role == "CUSTOMER":
                db.add(
                    CustomerUser(
                        user_id=user.id,
                        customer_id=user.customer_id,
                    )
                )
            elif user.role == "ADMIN":
                db.add(Admin(user_id=user.id))
            else:
                db.add(SalesUser(user_id=user.id))


    # -------------------------
    # PRODUCTS
    # -------------------------

    products = [
        {
            "name": "Laptop Pro 14",
            "category": "Hardware",
            "unit_price": 1200,
            "is_subscription": False,
        },
        {
            "name": "Onsite Setup Service",
            "category": "Services",
            "unit_price": 450,
            "is_subscription": False,
        },
        {
            "name": "Extended Warranty",
            "category": "Services",
            "unit_price": 180,
            "is_subscription": False,
        },
    ]


    for product_data in products:

        existing = (
            db.query(Product)
            .filter(
                Product.name
                == product_data["name"]
            )
            .first()
        )


        if existing is None:

            db.add(
                Product(
                    **product_data
                )
            )


    # -------------------------
    # DISCOUNT POLICIES
    # -------------------------

    policies = [

        {
            "name":
                "Bronze Hardware",

            "customer_tier":
                "Bronze",

            "category":
                "Hardware",

            "max_discount_percent":
                5,
        },

        {
            "name":
                "Bronze Services",

            "customer_tier":
                "Bronze",

            "category":
                "Services",

            "max_discount_percent":
                5,
        },

        {
            "name":
                "Silver Hardware",

            "customer_tier":
                "Silver",

            "category":
                "Hardware",

            "max_discount_percent":
                10,
        },

        {
            "name":
                "Silver Services",

            "customer_tier":
                "Silver",

            "category":
                "Services",

            "max_discount_percent":
                10,
        },

        {
            "name":
                "Gold Hardware",

            "customer_tier":
                "Gold",

            "category":
                "Hardware",

            "max_discount_percent":
                15,
        },

        {
            "name":
                "Gold Services",

            "customer_tier":
                "Gold",

            "category":
                "Services",

            "max_discount_percent":
                10,
        },

    ]


    for policy_data in policies:

        existing = (
            db.query(
                DiscountPolicy
            )
            .filter(
                DiscountPolicy.name
                == policy_data["name"]
            )
            .first()
        )


        if existing is None:

            db.add(
                DiscountPolicy(
                    **policy_data
                )
            )


    db.commit()


    print(
        "DealFlow360 demo data seeded successfully."
    )


finally:

    db.close()
