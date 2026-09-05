from fastapi import APIRouter, Depends

from app.core.dependencies import (
    get_current_user,
    require_role,
)

from app.models.user import User


router = APIRouter(
    prefix="/dashboard",
    tags=["Dashboard"],
)


@router.get("/me")
def dashboard_me(
    current_user: User = Depends(
        get_current_user
    ),
):

    return {
        "message": "Authenticated successfully",
        "user": current_user.name,
        "role": current_user.role,
    }


@router.get("/admin")
def admin_dashboard(
    current_user: User = Depends(
        require_role("ADMIN")
    ),
):

    return {
        "message": "Admin dashboard access granted",
        "user": current_user.name,
        "role": current_user.role,
    }


@router.get("/sales")
def sales_dashboard(
    current_user: User = Depends(
        require_role(
            "SALES",
            "SALES_MANAGER",
            "FINANCE",
        )
    ),
):

    return {
        "message": "Sales workspace access granted",
        "user": current_user.name,
        "role": current_user.role,
    }


@router.get("/customer")
def customer_dashboard(
    current_user: User = Depends(
        require_role("CUSTOMER")
    ),
):

    return {
        "message": "Customer portal access granted",
        "user": current_user.name,
        "role": current_user.role,
        "customer_id": current_user.customer_id,
    }