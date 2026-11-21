from datetime import datetime, timedelta, timezone
from typing import Optional, Any
from jose import jwt, JWTError
import bcrypt
from app.core.config import settings

def hash_password(password: str) -> str:
    # Truncate to 72 bytes as per bcrypt specification
    pwd_bytes = password.encode('utf-8')[:72]
    salt = bcrypt.gensalt(rounds=12)
    return bcrypt.hashpw(pwd_bytes, salt).decode('utf-8')

def verify_password(plain_password: str, hashed_password: str) -> bool:
    try:
        pwd_bytes = plain_password.encode('utf-8')[:72]
        hash_bytes = hashed_password.encode('utf-8')
        return bcrypt.checkpw(pwd_bytes, hash_bytes)
    except Exception:
        return False

def create_access_token(subject: str or Any, expires_delta: Optional[timedelta] = None) -> str:
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    
    to_encode = {"exp": expire, "sub": str(subject)}
    encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
    return encoded_jwt

def decode_access_token(token: str) -> Optional[str]:
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        return payload.get("sub")
    except JWTError:
        return None

def get_fernet():
    import base64
    import hashlib
    from cryptography.fernet import Fernet
    key_bytes = hashlib.sha256(settings.SECRET_KEY.encode('utf-8')).digest()
    urlsafe_key = base64.urlsafe_b64encode(key_bytes)
    return Fernet(urlsafe_key)

def encrypt_credential(plain_text: Optional[str]) -> Optional[str]:
    if not plain_text or not str(plain_text).strip():
        return None
    try:
        f = get_fernet()
        return f.encrypt(str(plain_text).strip().encode('utf-8')).decode('utf-8')
    except Exception:
        return None

def decrypt_credential(cipher_text: Optional[str]) -> Optional[str]:
    if not cipher_text or not str(cipher_text).strip():
        return None
    try:
        f = get_fernet()
        return f.decrypt(str(cipher_text).strip().encode('utf-8')).decode('utf-8')
    except Exception:
        return None

def mask_credential(val: Optional[str]) -> Optional[str]:
    if not val or not str(val).strip():
        return None
    s = str(val).strip()
    if len(s) <= 4:
        return "••••"
    return s[:2] + "••••" + s[-2:]
