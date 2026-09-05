"""
Additive migration for DealFlow360 business workflow tables.

This migration never drops existing tables.
"""

from sqlalchemy import text

import app.models

from app.database.base import Base
from app.database.connection import engine


def run_migration():

    statements = [

        """
        ALTER TABLE products
        ADD COLUMN IF NOT EXISTS cost_price NUMERIC(12,2)
        """,

        """
        ALTER TABLE products
        ADD COLUMN IF NOT EXISTS subscription_plan_id INTEGER
        """,

        """
        ALTER TABLE approval_steps
        ADD COLUMN IF NOT EXISTS action_by_user_id INTEGER
        REFERENCES users(id)
        """,

        """
        ALTER TABLE approval_steps
        ADD COLUMN IF NOT EXISTS reason VARCHAR(500)
        """,

        """
        ALTER TABLE fulfillments
        ADD COLUMN IF NOT EXISTS shipment_id INTEGER
        REFERENCES shipments(id)
        """,

        """
        ALTER TABLE backorders
        ADD COLUMN IF NOT EXISTS fulfilled_at TIMESTAMP
        """,

        """
        ALTER TABLE shipments
        ADD COLUMN IF NOT EXISTS shipment_number VARCHAR(60)
        """,

        """
        ALTER TABLE shipments
        ADD COLUMN IF NOT EXISTS quotation_id INTEGER
        REFERENCES quotations(id)
        """,

        """
        ALTER TABLE shipments
        ADD COLUMN IF NOT EXISTS warehouse_id INTEGER
        REFERENCES warehouses(id)
        """,

        """
        ALTER TABLE shipments
        ADD COLUMN IF NOT EXISTS status VARCHAR(30)
        """,

        """
        ALTER TABLE shipments
        ADD COLUMN IF NOT EXISTS shipment_cost NUMERIC(12,2)
        """,

        """
        ALTER TABLE shipments
        ADD COLUMN IF NOT EXISTS created_at TIMESTAMP
        """,

        """
        ALTER TABLE shipments
        ADD COLUMN IF NOT EXISTS shipped_at TIMESTAMP
        """,
    ]

    with engine.begin() as connection:

        for statement in statements:

            try:
                connection.execute(
                    text(statement)
                )
            except Exception as exc:
                print(
                    "Migration warning:",
                    exc,
                )

    Base.metadata.create_all(
        bind=engine
    )

    print(
        "DealFlow360 business workflow "
        "schema migration completed."
    )


if __name__ == "__main__":
    run_migration()