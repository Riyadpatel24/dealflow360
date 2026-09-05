from sqlalchemy import text
from sqlalchemy.orm import Session

from app.database.connection import engine
from app.models.customer import Customer
from app.models.customer_user import CustomerUser
from app.models.user import User


def run_migration():

    statements = [
        """
        ALTER TABLE users
        ADD COLUMN IF NOT EXISTS customer_id
        INTEGER
        REFERENCES customers(id)
        """,

        """
        ALTER TABLE quotations
        ADD COLUMN IF NOT EXISTS sales_rep_id
        INTEGER
        REFERENCES users(id)
        """,
    ]

    with engine.begin() as connection:

        for statement in statements:

            connection.execute(
                text(statement)
            )

    # Backfill CustomerUser records for deployments that previously stored
    # customer ownership only on users.customer_id. This preserves all
    # customer and quotation rows and keeps the legacy column in sync.
    with Session(engine) as db:
        customer_users = (
            db.query(User)
            .filter(User.role == "CUSTOMER")
            .all()
        )

        for user in customer_users:
            profile = (
                db.query(CustomerUser)
                .filter(CustomerUser.user_id == user.id)
                .one_or_none()
            )

            if profile is None:
                customer = (
                    db.get(Customer, user.customer_id)
                    if user.customer_id is not None
                    else None
                )

                if customer is None:
                    customer = (
                        db.query(Customer)
                        .filter(Customer.email == user.email)
                        .one_or_none()
                    )

                if customer is None:
                    customer = Customer(
                        name=user.name,
                        email=user.email,
                        tier="Bronze",
                    )
                    db.add(customer)
                    db.flush()

                profile = CustomerUser(
                    user_id=user.id,
                    customer_id=customer.id,
                )
                db.add(profile)

            user.customer_id = profile.customer_id

        db.commit()

    print(
        "Authentication schema migration completed."
    )


if __name__ == "__main__":
    run_migration()
