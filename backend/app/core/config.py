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
        
    # OpenAI API Key
    OPENAI_API_KEY: str = os.getenv("OPENAI_API_KEY", "")
    
    # Upload & Export Directories
    UPLOAD_DIR: str = os.getenv("UPLOAD_DIR", "uploads")
    EXPORT_DIR: str = os.getenv("EXPORT_DIR", "exports")
    
    # Financial Rules Defaults
    GST_TOLERANCE_AMOUNT: float = 1.0 # ₹1 rounding tolerance
    BANK_TOLERANCE_DAYS: int = 4 # days tolerance for cheque clearing / RTGS timing

settings = Settings()

os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
os.makedirs(settings.EXPORT_DIR, exist_ok=True)
