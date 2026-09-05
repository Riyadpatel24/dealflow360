from decimal import Decimal

from sqlalchemy.orm import Session

from app.models.customer import Customer
from app.models.quotation import Quotation
from app.models.quotation_line import QuotationLine
from app.models.product import Product
from app.models.risk_evaluation import RiskEvaluation
from app.models.risk_line import RiskLine

from app.services.discount_engine import (
    evaluate_discount,
)


def evaluate_quotation_risk(
    db: Session,
    quotation_id: int,
):

    quotation = db.get(
        Quotation,
        quotation_id,
    )


    if quotation is None:

        raise ValueError(
            "Quotation not found"
        )


    customer = db.get(
        Customer,
        quotation.customer_id,
    )


    if customer is None:

        raise ValueError(
            "Customer not found"
        )


    lines = (
        db.query(QuotationLine)
        .filter(
            QuotationLine.quotation_id
            == quotation_id
        )
        .all()
    )


    if not lines:

        raise ValueError(
            "Quotation has no lines"
        )


    risk_evaluation = (
        db.query(RiskEvaluation)
        .filter(
            RiskEvaluation.quotation_id
            == quotation_id
        )
        .first()
    )


    if risk_evaluation is None:

        risk_evaluation = RiskEvaluation(
            quotation_id=quotation_id,
            risk_level="LOW",
            worst_deviation=Decimal("0"),
            reason="All lines are within policy limits.",
        )

        db.add(risk_evaluation)

        db.flush()


    else:

        old_risk_lines = (
            db.query(RiskLine)
            .filter(
                RiskLine.risk_evaluation_id
                == risk_evaluation.id
            )
            .all()
        )

        for risk_line in old_risk_lines:

            db.delete(risk_line)


    worst_deviation = Decimal("0")

    worst_reason = (
        "All lines are within policy limits."
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


        result = evaluate_discount(
            db=db,
            customer=customer,
            product=product,
            requested_discount=line.discount_percent,
        )


        deviation = result["difference"]


        if deviation > worst_deviation:

            worst_deviation = deviation

            worst_reason = (
                f"{product.name} exceeds "
                f"allowed discount by "
                f"{deviation} percentage points."
            )


        status = (
            "OVER"
            if deviation > 0
            else "OK"
        )


        risk_line = RiskLine(
            risk_evaluation_id=risk_evaluation.id,
            quotation_line_id=line.id,
            risk_type="DISCOUNT",
            requested_discount=result[
                "requested_discount"
            ],
            allowed_discount=result[
                "allowed_discount"
            ],
            deviation=deviation,
            status=status,
            reason=(
                f"Requested discount is "
                f"{result['requested_discount']}%, "
                f"allowed discount is "
                f"{result['allowed_discount']}%."
            ),
        )


        db.add(risk_line)


    if worst_deviation > 0:

        risk_level = "HIGH"

    else:

        risk_level = "LOW"


    risk_evaluation.risk_level = risk_level

    risk_evaluation.worst_deviation = (
        worst_deviation
    )

    risk_evaluation.reason = worst_reason


    db.commit()

    db.refresh(
        risk_evaluation
    )


    return risk_evaluation