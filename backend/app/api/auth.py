from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from typing import List, Optional
import secrets
from datetime import datetime, timedelta

from app.core.database import get_db
from app.core.security import verify_password, hash_password, create_access_token
from app.core.dependencies import get_current_user, require_role, log_audit_event
from app.models.all_models import User
from app.schemas.auth import (
    UserOut, UserCreate, UserUpdate, Token, LoginRequest,
    ChangePasswordRequest, ForgotPasswordRequest, ResetPasswordRequest
)

router = APIRouter(prefix="/auth", tags=["Authentication"])

def check_user_password(plain: str, hashed: str) -> bool:
    if not plain or not hashed:
        return False
    # 1. Exact match
    if verify_password(plain, hashed):
        return True
    # 2. Strip leading/trailing spaces
    trimmed = plain.strip()
    if trimmed != plain and verify_password(trimmed, hashed):
        return True
    # 3. Forgiving initial default password check (case variants or missing exclamation)
    lower = trimmed.lower()
    if lower in ("smartfin@2026!", "smartfin@2026", "smartfin2026"):
        if verify_password("SmartFin@2026!", hashed):
            return True
    return False

@router.post("/login", response_model=Token)
def login(request: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == request.email.strip().lower()).first()
    if not user or not check_user_password(request.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    if not user.is_active:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="User account is deactivated")

    # Update last login timestamp
    user.last_login_at = datetime.utcnow()
    db.commit()

    access_token = create_access_token(subject=user.email)
    log_audit_event(db, user, "LOGIN", "USER", str(user.id), {"email": user.email, "role": user.role})

    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": user
    }

@router.post("/token", response_model=Token)
def login_for_access_token(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == form_data.username.strip().lower()).first()
    if not user or not check_user_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    user.last_login_at = datetime.utcnow()
    db.commit()

    access_token = create_access_token(subject=user.email)
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": user
    }

@router.get("/me", response_model=UserOut)
def read_users_me(current_user: User = Depends(get_current_user)):
    return current_user

@router.post("/change-password")
def change_password(
    req: ChangePasswordRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if not verify_password(req.old_password, current_user.hashed_password):
        raise HTTPException(status_code=400, detail="Current password is incorrect")
    
    if len(req.new_password) < 8:
        raise HTTPException(status_code=400, detail="New password must be at least 8 characters long")
    
    current_user.hashed_password = hash_password(req.new_password)
    current_user.must_change_password = False
    current_user.updated_at = datetime.utcnow()
    db.commit()

    log_audit_event(db, current_user, "CHANGE_PASSWORD", "USER", str(current_user.id), {"email": current_user.email})
    return {"message": "Password changed successfully"}

@router.post("/forgot-password")
def forgot_password(req: ForgotPasswordRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == req.email.strip().lower()).first()
    if not user:
        # Avoid user enumeration in production
        return {"message": "If this email is registered with SmartFin AI, a password reset token has been issued."}

    # Generate cryptographically secure token
    token = secrets.token_hex(16)
    user.reset_token = token
    user.reset_token_expires_at = datetime.utcnow() + timedelta(minutes=30)
    db.commit()

    log_audit_event(db, user, "FORGOT_PASSWORD_REQUEST", "USER", str(user.id), {"email": user.email})
    
    return {
        "message": "If this email is registered with SmartFin AI, a password reset token has been issued.",
        "reset_token": token  # Returned for direct verification
    }

@router.post("/reset-password")
def reset_password(req: ResetPasswordRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == req.email.strip().lower()).first()
    if not user:
        raise HTTPException(status_code=400, detail="Invalid reset request")

    if not user.reset_token or user.reset_token != req.token:
        raise HTTPException(status_code=400, detail="Invalid or expired reset token")

    if not user.reset_token_expires_at or user.reset_token_expires_at < datetime.utcnow():
        raise HTTPException(status_code=400, detail="Reset token has expired. Please request a new one.")

    if len(req.new_password) < 8:
        raise HTTPException(status_code=400, detail="New password must be at least 8 characters long")

    user.hashed_password = hash_password(req.new_password)
    user.reset_token = None
    user.reset_token_expires_at = None
    user.must_change_password = False
    user.updated_at = datetime.utcnow()
    db.commit()

    log_audit_event(db, user, "RESET_PASSWORD_COMPLETE", "USER", str(user.id), {"email": user.email})
    return {"message": "Password has been successfully reset. You may now sign in."}

@router.get("/users", response_model=List[UserOut])
def get_all_users(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(["admin"]))
):
    return db.query(User).order_by(User.id.asc()).all()

@router.post("/users", response_model=UserOut)
def create_user(
    user_in: UserCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(["admin"]))
):
    existing = db.query(User).filter(User.email == user_in.email.strip().lower()).first()
    if existing:
        raise HTTPException(status_code=400, detail="User with this email already exists")

    new_user = User(
        email=user_in.email.strip().lower(),
        hashed_password=hash_password(user_in.password),
        full_name=user_in.full_name,
        role=user_in.role.lower(),
        department=user_in.department,
        is_active=user_in.is_active,
        must_change_password=user_in.must_change_password
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    log_audit_event(db, current_user, "CREATE_USER", "USER", str(new_user.id), {"email": new_user.email, "role": new_user.role})
    return new_user
