from pydantic import BaseModel


class QuotationCreate(BaseModel):
    quotation_number: str
    customer_id: int
    currency: str = "USD"


class QuotationResponse(BaseModel):
    id: int
    quotation_number: str
    customer_id: int
    status: str
    currency: str

    class Config:
        from_attributes = True