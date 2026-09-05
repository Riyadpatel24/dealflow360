from decimal import Decimal

from pydantic import BaseModel


class ProductCreate(BaseModel):

    name: str

    category: str

    unit_price: Decimal

    is_subscription: bool = False
    cost_price: Decimal | None = None
    subscription_plan_id: int | None = None


class ProductResponse(BaseModel):

    id: int

    name: str

    category: str

    unit_price: Decimal

    is_subscription: bool
    cost_price: Decimal | None = None
    subscription_plan_id: int | None = None

    class Config:

        from_attributes = True
