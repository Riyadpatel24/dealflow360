from fastapi import FastAPI

from fastapi.middleware.cors import (
    CORSMiddleware,
)

import app.models

from app.database.base import Base
from app.database.connection import engine

from app.routers.auth import (
    router as auth_router
)

from app.routers.dashboard import (
    router as dashboard_router
)

from app.routers.admin import (
    router as admin_router
)

from app.routers.quotations import (
    router as quotations_router
)
from app.routers.operations import router as operations_router

Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="DealFlow360 API",
    version="1.0.0",
)


app.add_middleware(
    CORSMiddleware,

    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:5174",
        "http://127.0.0.1:5174",
    ],

    allow_credentials=True,

    allow_methods=["*"],

    allow_headers=["*"],
)


Base.metadata.create_all(
    bind=engine
)


app.include_router(
    auth_router
)

app.include_router(
    dashboard_router
)

app.include_router(
    admin_router
)

app.include_router(
    quotations_router
)
app.include_router(operations_router)


@app.get("/")
def root():

    return {
        "message": "DealFlow360 API is running",
        "database": "connected",
    }
