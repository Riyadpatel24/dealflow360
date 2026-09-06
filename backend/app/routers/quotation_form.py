from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.dependencies import get_db, require_role
from app.models.customer import Customer
from app.models.product import Product
from app.models.user import User

router = APIRouter(prefix="/quotation-form", tags=["Quotation Form"])
internal_access = require_role("ADMIN", "SALES", "SALES_MANAGER", "FINANCE")


@router.get("/options")
def quotation_form_options(
    db: Session = Depends(get_db),
    current_user: User = Depends(internal_access),
):
    customers = db.query(Customer).order_by(Customer.name).all()
    products = (
        db.query(Product)
        .filter(Product.category == "Policy")
        .order_by(Product.name)
        .all()
    )
    return {
        "customers": [
            {"id": c.id, "name": c.name, "email": c.email, "tier": c.tier}
            for c in customers
        ],
        "products": [
            {
                "id": p.id,
                "name": p.name,
                "category": p.category,
                "unit_price": float(p.unit_price),
                "is_subscription": p.is_subscription,
            }
            for p in products
        ],
    }
