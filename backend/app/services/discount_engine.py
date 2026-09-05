from decimal import Decimal

from sqlalchemy.orm import Session

from app.models.customer import Customer
from app.models.discount_policy import DiscountPolicy
from app.models.product import Product


def evaluate_discount(
    db: Session,
    customer: Customer,
    product: Product,
    requested_discount: Decimal,
) -> dict:

    policy = (
        db.query(DiscountPolicy)
        .filter(
            DiscountPolicy.customer_tier
            == customer.tier,

            DiscountPolicy.category
            == product.category,
        )
        .first()
    )


    if policy is None:

        raise ValueError(
            "No discount policy found for this customer tier and category"
        )


    difference = (
        requested_discount
        - policy.max_discount_percent
    )


    return {

        "requested_discount":
            requested_discount,

        "allowed_discount":
            policy.max_discount_percent,

        "difference":
            difference,

        "within_limit":
            requested_discount
            <= policy.max_discount_percent,
    }