from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database.connection import SessionLocal
from app.models.customer import Customer
from app.models.product import Product
from app.models.quotation import Quotation
from app.models.quotation_line import QuotationLine
from app.schemas.quotation import QuotationCreate, QuotationResponse
from app.schemas.quotation_line import (
    QuotationLineCreate,
    QuotationLineResponse,
)


router = APIRouter(prefix="/quotations", tags=["Quotations"])


def get_db():
    db = SessionLocal()

    try:
        yield db
    finally:
        db.close()


@router.post("/", response_model=QuotationResponse)
def create_quotation(
    quotation_data: QuotationCreate,
    db: Session = Depends(get_db),
):
    customer = db.get(Customer, quotation_data.customer_id)

    if customer is None:
        raise HTTPException(
            status_code=404,
            detail="Customer not found",
        )

    quotation = Quotation(
        quotation_number=quotation_data.quotation_number,
        customer_id=quotation_data.customer_id,
        currency=quotation_data.currency,
    )

    db.add(quotation)
    db.commit()
    db.refresh(quotation)

    return quotation

@router.post(
    "/{quotation_id}/lines",
    response_model=QuotationLineResponse,
)
def create_quotation_line(
    quotation_id: int,
    line_data: QuotationLineCreate,
    db: Session = Depends(get_db),
):
    quotation = db.get(Quotation, quotation_id)

    if quotation is None:
        raise HTTPException(
            status_code=404,
            detail="Quotation not found",
        )

    product = db.get(Product, line_data.product_id)

    if product is None:
        raise HTTPException(
            status_code=404,
            detail="Product not found",
        )

    quotation_line = QuotationLine(
        quotation_id=quotation_id,
        product_id=line_data.product_id,
        quantity=line_data.quantity,
        unit_price=line_data.unit_price,
        discount_percent=line_data.discount_percent,
    )

    db.add(quotation_line)
    db.commit()
    db.refresh(quotation_line)

    return quotation_line