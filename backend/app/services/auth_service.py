from sqlalchemy.orm import Session

from app.core.security import (
    create_access_token,
    hash_password,
    verify_password,
)

from app.models.user import User
from app.models.customer import Customer
from app.models.customer_user import CustomerUser


def authenticate_user(
    db: Session,
    email: str,
    password: str,
):

    user = (
        db.query(User)
        .filter(
            User.email == email
        )
        .first()
    )


    if user is None:
        return None


    if not user.is_active:
        return None


    if not verify_password(
        password,
        user.password_hash,
    ):
        return None


    return user


def login_user(
    db: Session,
    email: str,
    password: str,
):

    user = authenticate_user(
        db=db,
        email=email,
        password=password,
    )


    if user is None:
        return None


    token = create_access_token(
        user_id=user.id,
        role=user.role,
    )


    return {
        "access_token": token,
        "token_type": "bearer",
        "user": {
            "id": user.id,
            "name": user.name,
            "email": user.email,
            "role": user.role,
        },
    }


def signup_customer(
    db: Session,
    name: str,
    email: str,
    password: str,
):

    existing_user = (
        db.query(User)
        .filter(
            User.email == email
        )
        .first()
    )


    if existing_user is not None:

        raise ValueError(
            "Email is already registered"
        )


    customer = (
        db.query(Customer)
        .filter(Customer.email == email)
        .first()
    )

    try:
        if customer is None:
            customer = Customer(
                name=name,
                email=email,
                tier="Bronze",
            )
            db.add(customer)
            db.flush()

        user = User(
            name=name,
            email=email,
            password_hash=hash_password(password),
            role="CUSTOMER",
            # Compatibility mirror for existing quotation/dashboard code.
            # CustomerUser remains the ownership source of truth.
            customer_id=customer.id,
            is_active=True,
        )
        db.add(user)
        db.flush()

        db.add(
            CustomerUser(
                user_id=user.id,
                customer_id=customer.id,
            )
        )
        db.commit()
        db.refresh(user)
    except Exception:
        db.rollback()
        raise

    return user
