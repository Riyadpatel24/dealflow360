from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database.connection import SessionLocal

from app.schemas.auth import (
    LoginRequest,
    LoginResponse,
    LoginUser,
    SignupRequest,
)

from app.models.user import User
from app.services.auth_service import (
    authenticate_user,
    create_access_token,
    signup_customer,
)


router = APIRouter()


def get_db():
    db = SessionLocal()

    try:
        yield db
    finally:
        db.close()


@router.post(
    "/login",
    response_model=LoginResponse,
)
def login(
    request: LoginRequest,
    db: Session = Depends(get_db),
):
    user = authenticate_user(
        db,
        request.email,
        request.password,
    )

    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account is inactive",
        )

    token = create_access_token(
        user_id=user.id,
        role=user.role,
    )

    return LoginResponse(
        access_token=token,
        token_type="bearer",
        user=LoginUser(
            id=user.id,
            name=user.name,
            email=user.email,
            role=user.role,
        ),
    )


@router.post("/signup")
def signup(
    request: SignupRequest,
    db: Session = Depends(get_db),
):
    existing_user = (
        db.query(User)
        .filter(User.email == request.email)
        .first()
    )

    if existing_user:
        raise HTTPException(
            status_code=400,
            detail="Email is already registered",
        )

    user = signup_customer(
        db=db,
        name=request.name,
        email=request.email,
        password=request.password,
    )

    return {
        "message": "Customer account created successfully",
        "user_id": user.id,
        "role": user.role,
    }
