from decimal import Decimal

from pydantic import BaseModel


class DiscountPolicyCreate(BaseModel):

    name: str

    customer_tier: str

    category: str

    max_discount_percent: Decimal


class DiscountPolicyResponse(BaseModel):

    id: int

    name: str

    customer_tier: str

    category: str

    max_discount_percent: Decimal

    class Config:

        from_attributes = True