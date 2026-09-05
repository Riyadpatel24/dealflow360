from decimal import Decimal

from pydantic import BaseModel, Field


class QuotationLineCreate(BaseModel):
    product_id: int
    quantity: int = Field(gt=0)
    unit_price: Decimal = Field(gt=0)
    discount_percent: Decimal = Field(ge=0, le=100)


class QuotationLineResponse(BaseModel):
    id: int
    quotation_id: int
    product_id: int
    quantity: int
    unit_price: Decimal
    discount_percent: Decimal

    class Config:
        from_attributes = True