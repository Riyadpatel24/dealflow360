from pydantic import BaseModel, EmailStr


class CustomerCreate(BaseModel):

    name: str

    email: EmailStr

    tier: str = "Bronze"


class CustomerResponse(BaseModel):

    id: int

    name: str

    email: EmailStr

    tier: str

    class Config:

        from_attributes = True