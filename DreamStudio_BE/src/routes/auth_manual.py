from fastapi import APIRouter, Depends, HTTPException, Request, status, Response
from sqlalchemy.orm import Session
from sqlalchemy import func
import ipaddress
from typing import Optional
from passlib.hash import argon2
from ..models import auth_models
from ..models import auth_schemas 
from ..helpers.db import get_db
from ..helpers import auth_utils as tk
from datetime import datetime, timezone



router = APIRouter(prefix="/api/v1/auth/manual", tags=["Manual Auth"])

def _extract_client_ip(request: Request) -> Optional[str]:
    """Return a valid IPv4/IPv6 string from headers/client or None if unavailable.
    - Prefers the first entry of X-Forwarded-For when present
    - Falls back to request.client.host
    - Validates using ipaddress; returns None if invalid (e.g., 'testclient')
    """
    # Try X-Forwarded-For (could be a list: client, proxy1, proxy2...)
    xff = request.headers.get("x-forwarded-for")
    candidate: Optional[str] = None
    if xff:
        candidate = xff.split(",")[0].strip()
    else:
        # Fall back to the direct client
        if request.client and request.client.host:
            candidate = request.client.host

    if not candidate:
        return None

    try:
        # Validate IP (raises ValueError if not a real IP)
        ipaddress.ip_address(candidate)
        return candidate
    except ValueError:
        return None

@router.post("/signup", response_model=auth_models.SignUpResponse)
def signup_manual(payload: auth_models.SignupManual, request: Request, db: Session = Depends(get_db)):
    # check existing
    existing = db.query(auth_schemas.User).filter(auth_schemas.User.email == payload.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")

    user = auth_schemas.User(
        email=payload.email,
        first_name=payload.first_name,
        last_name=payload.last_name,
        signup_ip=_extract_client_ip(request),
    )
    db.add(user)
    db.flush()  # to get user.id

    identity = auth_schemas.AuthIdentity(
        user_id=user.id,
        provider="password",
        email=payload.email,
        password_hash=argon2.hash(payload.password),
    )
    db.add(identity)
    db.commit()
    db.refresh(user)
    print("what is going on")
    return user
    


@router.post("/login", response_model=auth_models.LoginResponse)
def login_manual(payload: auth_models.ManualLoginRequest, response: Response, db: Session = Depends(get_db)):
    identity = (
            db.query(auth_schemas.AuthIdentity)
            .filter(auth_schemas.AuthIdentity.email == payload.email, auth_schemas.AuthIdentity.provider == "password")
            .first()
        )
    if not identity or not argon2.verify(payload.password, identity.password_hash):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    if not identity.user.is_active:
        raise HTTPException(status_code=403, detail="User not active yet")

    access_token = tk.create_access_token(str(identity.user.id))
    refresh_token = tk.create_refresh_token(db = db, user_id=identity.user.id)

    identity.user.last_login_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(identity)

    return auth_models.LoginResponse(
        user_id=identity.user.id,
        email=identity.email,
        first_name=identity.user.first_name,
        last_name=identity.user.last_name,
        access_token=access_token,
        refresh_token=refresh_token
    )

    
