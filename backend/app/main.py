from fastapi import FastAPI

from app.database.base import Base
from app.database.connection import engine
from app.models.customer import Customer


app = FastAPI(title="DealFlow360 API")


Base.metadata.create_all(bind=engine)


@app.get("/")
def root():
    return {
        "message": "DealFlow360 API is running",
        "database": "connected",
    }