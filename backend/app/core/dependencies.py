from fastapi import Depends, HTTPException
from fastapi.security import OAuth2PasswordBearer

from jose import JWTError, jwt

from sqlalchemy.orm import Session

from app.core.security import (
    ALGORITHM,
    SECRET_KEY,
)

from app.database.connection import SessionLocal

from app.models.user import User


oauth2_scheme = OAuth2PasswordBearer(
    tokenUrl="/login"
)


def get_db():

    db = SessionLocal()

    try:

        yield db

    finally:

        db.close()


def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db),
):

    credentials_exception = HTTPException(
        status_code=401,
        detail="Could not validate credentials",
    )

    try:

        payload = jwt.decode(
            token,
            SECRET_KEY,
            algorithms=[ALGORITHM],
        )

        user_id = payload.get("sub")

        if user_id is None:

            raise credentials_exception

        user_id = int(user_id)

    except (
        JWTError,
        ValueError,
    ):

        raise credentials_exception


    user = db.get(
        User,
        user_id,
    )


    if user is None:

        raise credentials_exception


    if not user.is_active:

        raise HTTPException(
            status_code=403,
            detail="User account is inactive",
        )


    return user


def require_role(
    *allowed_roles: str,
):

    def role_dependency(
        current_user: User = Depends(
            get_current_user
        ),
    ):

        if current_user.role not in allowed_roles:

            raise HTTPException(
                status_code=403,
                detail="You do not have permission for this resource",
            )

        return current_user

    return role_dependency
