from fastapi import (
    APIRouter,
    Depends,
    HTTPException,
)

from sqlalchemy.orm import Session

from app.core.dependencies import (
    get_db,
    require_role,
)

from app.core.security import hash_password

from app.models.customer import Customer
from app.models.discount_policy import DiscountPolicy
from app.models.product import Product
from app.models.user import User
from app.models.admin import Admin
from app.models.sales_user import SalesUser
from app.models.customer_user import CustomerUser

from app.schemas.admin import (
    UserCreate,
    UserResponse,
)

from app.schemas.customer import (
    CustomerCreate,
    CustomerResponse,
)

from app.schemas.product import (
    ProductCreate,
    ProductResponse,
)

from app.schemas.discount_policy import (
    DiscountPolicyCreate,
    DiscountPolicyResponse,
)


router = APIRouter(
    prefix="/admin",
    tags=["Admin"],
)


admin_only = require_role(
    "ADMIN"
)


@router.get("/users")
def get_users(
    db: Session = Depends(get_db),
    current_user: User = Depends(admin_only),
):

    return (
        db.query(User)
        .order_by(User.id)
        .all()
    )


@router.post(
    "/users",
    response_model=UserResponse,
)
def create_user(
    user_data: UserCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(admin_only),
):

    existing = (
        db.query(User)
        .filter(
            User.email
            == user_data.email
        )
        .first()
    )


    if existing:

        raise HTTPException(
            status_code=409,
            detail="Email already exists",
        )


    allowed_roles = {
        "ADMIN",
        "SALES",
        "SALES_MANAGER",
        "FINANCE",
        "CUSTOMER",
    }


    if user_data.role not in allowed_roles:

        raise HTTPException(
            status_code=400,
            detail="Invalid role",
        )


    if (
        user_data.role == "CUSTOMER"
        and user_data.customer_id is None
    ):

        raise HTTPException(
            status_code=400,
            detail="Customer users require customer_id",
        )


    user = User(
        name=user_data.name,
        email=user_data.email,
        password_hash=hash_password(
            user_data.password
        ),
        role=user_data.role,
        customer_id=user_data.customer_id,
        is_active=True,
    )


    try:
        db.add(user)
        db.flush()
        if user.role == "ADMIN":
            db.add(Admin(user_id=user.id))
        elif user.role in {"SALES", "SALES_MANAGER", "FINANCE"}:
            db.add(SalesUser(user_id=user.id))
        elif user.role == "CUSTOMER":
            db.add(CustomerUser(user_id=user.id, customer_id=user.customer_id))
        db.commit()
        db.refresh(user)
    except Exception:
        db.rollback()
        raise


    return user


@router.get(
    "/customers",
    response_model=list[CustomerResponse],
)
def get_customers(
    db: Session = Depends(get_db),
    current_user: User = Depends(admin_only),
):

    return (
        db.query(Customer)
        .order_by(Customer.id)
        .all()
    )


@router.post(
    "/customers",
    response_model=CustomerResponse,
)
def create_customer(
    customer_data: CustomerCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(admin_only),
):

    existing = (
        db.query(Customer)
        .filter(
            Customer.email
            == customer_data.email
        )
        .first()
    )


    if existing:

        raise HTTPException(
            status_code=409,
            detail="Customer email already exists",
        )


    customer = Customer(
        name=customer_data.name,
        email=customer_data.email,
        tier=customer_data.tier,
    )


    db.add(customer)
    db.commit()
    db.refresh(customer)


    return customer


@router.get(
    "/products",
    response_model=list[ProductResponse],
)
def get_products(
    db: Session = Depends(get_db),
    current_user: User = Depends(admin_only),
):

    return (
        db.query(Product)
        .order_by(Product.id)
        .all()
    )


@router.post(
    "/products",
    response_model=ProductResponse,
)
def create_product(
    product_data: ProductCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(admin_only),
):

    product = Product(
        name=product_data.name,
        category=product_data.category,
        unit_price=product_data.unit_price,
        is_subscription=
            product_data.is_subscription,
        cost_price=product_data.cost_price,
        subscription_plan_id=product_data.subscription_plan_id,
    )


    db.add(product)
    db.commit()
    db.refresh(product)


    return product


@router.get(
    "/discount-policies",
    response_model=list[DiscountPolicyResponse],
)
def get_discount_policies(
    db: Session = Depends(get_db),
    current_user: User = Depends(admin_only),
):

    return (
        db.query(DiscountPolicy)
        .order_by(DiscountPolicy.id)
        .all()
    )


@router.post(
    "/discount-policies",
    response_model=DiscountPolicyResponse,
)
def create_discount_policy(
    policy_data: DiscountPolicyCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(admin_only),
):

    policy = DiscountPolicy(
        name=policy_data.name,
        customer_tier=
            policy_data.customer_tier,
        category=
            policy_data.category,
        max_discount_percent=
            policy_data.max_discount_percent,
    )


    db.add(policy)
    db.commit()
    db.refresh(policy)


    return policy
