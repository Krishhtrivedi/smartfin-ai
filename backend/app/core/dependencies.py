from fastapi import Depends, HTTPException, status, Request
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.security import decode_access_token
from app.models.all_models import User, AuditLog
import json

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login")

def get_client_ip(request: Request = None) -> str:
    if not request:
        return "127.0.0.1"
    # Check X-Forwarded-For (standard for reverse proxies: Render, Cloudflare, AWS ALB)
    forwarded = request.headers.get("x-forwarded-for")
    if forwarded:
        client_ip = forwarded.split(",")[0].strip()
        if client_ip:
            return client_ip
    # Check X-Real-IP
    real_ip = request.headers.get("x-real-ip")
    if real_ip:
        return real_ip.strip()
    # Check CF-Connecting-IP (Cloudflare)
    cf_ip = request.headers.get("cf-connecting-ip")
    if cf_ip:
        return cf_ip.strip()
    if request.client and request.client.host:
        return request.client.host
    return "127.0.0.1"

def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)) -> User:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials or session expired",
        headers={"WWW-Authenticate": "Bearer"},
    )
    email = decode_access_token(token)
    if email is None:
        raise credentials_exception
    user = db.query(User).filter(User.email == email).first()
    if user is None or not user.is_active:
        raise credentials_exception
    return user

def require_role(allowed_roles: list[str]):
    def role_checker(current_user: User = Depends(get_current_user)):
        if current_user.role.lower() not in [r.lower() for r in allowed_roles] and current_user.role.lower() != "admin":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access forbidden: requires one of {allowed_roles} roles. Your role is {current_user.role}."
            )
        return current_user
    return role_checker

def log_audit_event(
    db: Session,
    user: User,
    action: str,
    entity_type: str = None,
    entity_id: str = None,
    details: dict = None,
    ip_address: str = None,
    request: Request = None
):
    try:
        resolved_ip = ip_address or get_client_ip(request)
        audit = AuditLog(
            user_id=user.id if user else None,
            user_email=user.email if user else "anonymous",
            action=action,
            entity_type=entity_type,
            entity_id=str(entity_id) if entity_id else None,
            ip_address=resolved_ip,
            details_json=json.dumps(details or {})
        )
        db.add(audit)
        db.commit()
    except Exception as e:
        db.rollback()
        print(f"Error logging audit: {e}")
