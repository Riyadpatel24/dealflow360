from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

import app.models

from app.core.config import settings
from app.database.base import Base
from app.database.connection import engine
from app.routers.admin import router as admin_router
from app.routers.auth import router as auth_router
from app.routers.dashboard import router as dashboard_router
from app.routers.operations import router as operations_router
from app.routers.quotations import router as quotations_router
from app.routers.intelligence import router as intelligence_router
from app.routers.quotation_form import router as quotation_form_router


Base.metadata.create_all(bind=engine)

app = FastAPI(
    title=settings.app_name,
    version=settings.app_version,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router)
app.include_router(dashboard_router)
app.include_router(admin_router)
app.include_router(quotations_router)
app.include_router(quotation_form_router)
app.include_router(operations_router)
app.include_router(intelligence_router)


@app.get("/")
def root():
    return {"message": "DealFlow360 API is running", "database": "connected"}


@app.get("/health")
def health():
    return {"status": "ok", "service": "dealflow360-api"}
