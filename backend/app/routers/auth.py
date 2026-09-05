import base64
import hashlib
import hmac
import json
import secrets
import time
from urllib.parse import urlencode
from urllib.request import Request, urlopen

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import RedirectResponse
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.dependencies import get_current_user
from app.database.connection import SessionLocal
from app.models.user import User
from app.schemas.auth import LoginRequest, LoginResponse, LoginUser, SignupRequest
from app.services.auth_service import authenticate_user, create_access_token, signup_customer

router = APIRouter()
GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth"
GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token"
GOOGLE_USERINFO_URL = "https://openidconnect.googleapis.com/v1/userinfo"


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def _oauth_state() -> str:
    issued = str(int(time.time()))
    nonce = secrets.token_urlsafe(18)
    payload = f"{issued}.{nonce}"
    signature = hmac.new(settings.secret_key.encode(), payload.encode(), hashlib.sha256).hexdigest()
    return f"{payload}.{signature}"


def _valid_state(state: str) -> bool:
    try:
        issued, nonce, signature = state.split(".", 2)
        payload = f"{issued}.{nonce}"
        expected = hmac.new(settings.secret_key.encode(), payload.encode(), hashlib.sha256).hexdigest()
        return hmac.compare_digest(signature, expected) and (time.time() - int(issued) < 600)
    except (ValueError, TypeError):
        return False


def _google_json(url: str, data: dict | None = None, headers: dict | None = None) -> dict:
    body = urlencode(data).encode() if data is not None else None
    request = Request(url, data=body, headers=headers or {}, method="POST" if body else "GET")
    with urlopen(request, timeout=10) as response:
        return json.loads(response.read().decode())


@router.post("/login", response_model=LoginResponse)
def login(request: LoginRequest, db: Session = Depends(get_db)):
    user = authenticate_user(db, request.email, request.password)
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid email or password")
    if not user.is_active:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="User account is inactive")
    token = create_access_token(user_id=user.id, role=user.role)
    return LoginResponse(access_token=token, token_type="bearer", user=LoginUser(id=user.id, name=user.name, email=user.email, role=user.role))


@router.get("/me", response_model=LoginUser)
def me(current_user: User = Depends(get_current_user)):
    return LoginUser(id=current_user.id, name=current_user.name, email=current_user.email, role=current_user.role)


@router.get("/auth/google/start")
def google_start():
    if not settings.google_oauth_enabled:
        raise HTTPException(status_code=503, detail="Google sign-in is not configured. Add GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET and GOOGLE_REDIRECT_URI to backend .env.")
    state = _oauth_state()
    params = {
        "client_id": settings.google_client_id,
        "redirect_uri": settings.google_redirect_uri,
        "response_type": "code",
        "scope": "openid email profile",
        "state": state,
        "access_type": "offline",
        "prompt": "select_account",
    }
    return RedirectResponse(f"{GOOGLE_AUTH_URL}?{urlencode(params)}")


@router.get("/auth/google/callback")
def google_callback(code: str, state: str):
    if not settings.google_oauth_enabled:
        raise HTTPException(status_code=503, detail="Google sign-in is not configured")
    if not _valid_state(state):
        raise HTTPException(status_code=400, detail="Invalid or expired Google OAuth state")
    try:
        token_data = _google_json(GOOGLE_TOKEN_URL, {
            "code": code,
            "client_id": settings.google_client_id,
            "client_secret": settings.google_client_secret,
            "redirect_uri": settings.google_redirect_uri,
            "grant_type": "authorization_code",
        }, {"Content-Type": "application/x-www-form-urlencoded"})
        access_token = token_data["access_token"]
        google_user = _google_json(GOOGLE_USERINFO_URL, headers={"Authorization": f"Bearer {access_token}"})
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"Google authentication failed: {exc}") from exc

    email = (google_user.get("email") or "").lower().strip()
    if not email or not google_user.get("email_verified", False):
        raise HTTPException(status_code=403, detail="A verified Google email is required")

    db = SessionLocal()
    try:
        user = db.query(User).filter(User.email == email).first()
        if not user:
            raise HTTPException(status_code=403, detail="This Google account is not provisioned in DealFlow360")
        if not user.is_active:
            raise HTTPException(status_code=403, detail="User account is inactive")
        token = create_access_token(user_id=user.id, role=user.role)
    finally:
        db.close()

    return RedirectResponse(f"{settings.frontend_url}/oauth/callback?token={token}")


@router.post("/signup")
def signup(request: SignupRequest, db: Session = Depends(get_db)):
    existing_user = db.query(User).filter(User.email == request.email).first()
    if existing_user:
        raise HTTPException(status_code=400, detail="Email is already registered")
    user = signup_customer(db=db, name=request.name, email=request.email, password=request.password)
    return {"message": "Customer account created successfully", "user_id": user.id, "role": user.role}
