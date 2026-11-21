import os
from dotenv import load_dotenv

load_dotenv()

class Settings:
    PROJECT_NAME: str = "SmartFin AI – Finance & Office Automation System"
    VERSION: str = "1.0.0"
    API_V1_STR: str = "/api/v1"
    
    SECRET_KEY: str = os.getenv("SECRET_KEY", "smartfin-super-secure-jwt-secret-key-production-ready-2026")
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 # 24 hours
    
    # Database
    DATABASE_URL: str = os.getenv("DATABASE_URL", "sqlite:///./smartfin.db")
    if DATABASE_URL.startswith("postgres://"):
        DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)
        
    # OpenAI API Key & Model
    OPENAI_API_KEY: str = os.getenv("OPENAI_API_KEY", "")
    AI_MODEL: str = os.getenv("AI_MODEL", "gpt-4o-mini")
    
    # Upload & Storage Directories (Supports persistent disk e.g. /var/data)
    UPLOAD_DIR: str = os.getenv("UPLOAD_DIR", "uploads")
    EXPORT_DIR: str = os.getenv("EXPORT_DIR", "exports")
    ITR_ARCHIVE_DIR: str = os.getenv("ITR_ARCHIVE_DIR", os.path.join(UPLOAD_DIR, "itr_archives"))
    GSTR_INBOX_DIR: str = os.getenv("GSTR_INBOX_DIR", os.path.join(UPLOAD_DIR, "gstr_returns"))
    
    # SMTP / Email Configuration
    SMTP_HOST: str = os.getenv("SMTP_HOST", "")
    SMTP_PORT: int = int(os.getenv("SMTP_PORT", "587"))
    SMTP_USER: str = os.getenv("SMTP_USER", "")
    SMTP_PASSWORD: str = os.getenv("SMTP_PASSWORD", "")
    SMTP_FROM_EMAIL: str = os.getenv("SMTP_FROM_EMAIL", os.getenv("SMTP_USER", "compliance@smartfin.ai"))
    SMTP_FROM_NAME: str = os.getenv("SMTP_FROM_NAME", "SmartFin.AI Compliance Desk")
    SMTP_TLS: bool = os.getenv("SMTP_TLS", "true").lower() in ("true", "1", "yes")
    
    # WhatsApp Configuration
    WHATSAPP_SESSION_DIR: str = os.getenv("WHATSAPP_SESSION_DIR", "")
    WHATSAPP_BRIDGE_PORT: int = int(os.getenv("WHATSAPP_BRIDGE_PORT", "8001"))
    WHATSAPP_AUTO_SCHEDULE_TIME: str = os.getenv("WHATSAPP_AUTO_SCHEDULE_TIME", "18:30")
    WHATSAPP_AUTO_SCHEDULE_ENABLED: bool = os.getenv("WHATSAPP_AUTO_SCHEDULE_ENABLED", "true").lower() in ("true", "1", "yes")
    WHATSAPP_API_URL: str = os.getenv("WHATSAPP_API_URL", "")
    WHATSAPP_API_TOKEN: str = os.getenv("WHATSAPP_API_TOKEN", "")
    WHATSAPP_PMSC_GROUP_ID: str = os.getenv("WHATSAPP_PMSC_GROUP_ID", "")
    
    # Financial Rules Defaults
    GST_TOLERANCE_AMOUNT: float = 1.0 # ₹1 rounding tolerance
    BANK_TOLERANCE_DAYS: int = 4 # days tolerance for cheque clearing / RTGS timing

settings = Settings()

os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
os.makedirs(settings.EXPORT_DIR, exist_ok=True)
os.makedirs(settings.ITR_ARCHIVE_DIR, exist_ok=True)
os.makedirs(settings.GSTR_INBOX_DIR, exist_ok=True)
