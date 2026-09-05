from fastapi import FastAPI

from app.database.base import Base
from app.database.connection import engine
from app.models.customer import Customer
from app.models.product import Product
from app.models.quotation import Quotation
from app.models.quotation_line import QuotationLine
from app.routers.quotations import router as quotations_router


app = FastAPI(title="DealFlow360 API")


Base.metadata.create_all(bind=engine)


app.include_router(quotations_router)


@app.get("/")
def root():
    return {
        "message": "DealFlow360 API is running",
        "database": "connected",
    }