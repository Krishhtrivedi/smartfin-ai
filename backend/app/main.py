import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from sqlalchemy import text

from app.core.config import settings
from app.core.database import Base, engine, SessionLocal
from app.seed.seed_data import seed_database

# Import routers
from app.api.auth import router as auth_router
from app.api.dashboard import router as dashboard_router
from app.api.gst import router as gst_router
from app.api.vendor import router as vendor_router
from app.api.customer import router as customer_router
from app.api.tds import router as tds_router
from app.api.bank import router as bank_router
from app.api.office import router as office_router
from app.api.excel import router as excel_router
from app.api.mis import router as mis_router
from app.api.ai import router as ai_router
from app.api.audit import router as audit_router
from app.api.compliance_tools import router as compliance_router
from app.api.incubator import router as incubator_router
from app.api.automation import router as automation_router

# Initialize Database Schema
Base.metadata.create_all(bind=engine)

# Add model columns missing from existing tables (safe, add-only; needed on Render PostgreSQL)
try:
    from app.core.schema_sync import add_missing_columns
    _added = add_missing_columns(engine, Base.metadata)
    if _added:
        print(f"Schema sync: added columns {_added}")
except Exception as _e:
    print(f"Schema sync notice: {_e}")

app = FastAPI(
    title="SMARTFIN.AI",
    version=settings.VERSION,
    description="Enterprise Finance & Office Management Automation Platform for SMARTFIN.AI"
)

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount Routers under /api/v1
app.include_router(auth_router, prefix=settings.API_V1_STR)
app.include_router(dashboard_router, prefix=settings.API_V1_STR)
app.include_router(gst_router, prefix=settings.API_V1_STR)
app.include_router(vendor_router, prefix=settings.API_V1_STR)
app.include_router(customer_router, prefix=settings.API_V1_STR)
app.include_router(tds_router, prefix=settings.API_V1_STR)
app.include_router(bank_router, prefix=settings.API_V1_STR)
app.include_router(office_router, prefix=settings.API_V1_STR)
app.include_router(excel_router, prefix=settings.API_V1_STR)
app.include_router(mis_router, prefix=settings.API_V1_STR)
app.include_router(ai_router, prefix=settings.API_V1_STR)
app.include_router(audit_router, prefix=settings.API_V1_STR)
app.include_router(compliance_router, prefix=settings.API_V1_STR)
app.include_router(incubator_router, prefix=settings.API_V1_STR)
app.include_router(automation_router, prefix=settings.API_V1_STR)

@app.on_event("startup")
def on_startup():
    # 1. Run migrations for new columns if needed (PostgreSQL / SQLite safe)
    try:
        with engine.connect() as conn:
            is_postgres = not str(engine.url).startswith("sqlite")
            if is_postgres:
                conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS must_change_password BOOLEAN DEFAULT FALSE;"))
                conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS reset_token VARCHAR(255);"))
                conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS reset_token_expires_at TIMESTAMP;"))
                conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMP;"))
                conn.execute(text("ALTER TABLE daily_office_summaries ADD COLUMN IF NOT EXISTS unread_messages_json TEXT;"))
                conn.commit()
            else:
                try:
                    conn.execute(text("ALTER TABLE daily_office_summaries ADD COLUMN unread_messages_json TEXT;"))
                    conn.commit()
                except Exception:
                    pass
    except Exception as e:
        print(f"Startup migration notice: {e}")

    # 2. Seed / Ensure production accounts exist
    db = SessionLocal()
    try:
        seed_database(db)
    finally:
        db.close()

    # 3. Start automated background scheduler for PMSC WhatsApp Summaries
    try:
        from app.services.whatsapp.scheduler import PMSCWhatsAppScheduler
        PMSCWhatsAppScheduler.get_instance().start()
    except Exception as e:
        print(f"WhatsApp Scheduler startup notice: {e}")

@app.get("/health")
def health_check():
    return {
        "status": "healthy",
        "system": "SMARTFIN.AI",
        "organization": "SMARTFIN.AI",
        "version": settings.VERSION
    }

# Frontend Static / SPA Serving
frontend_dist_candidates = [
    os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), "frontend", "dist"),
    os.path.join(os.getcwd(), "frontend", "dist"),
    "/app/frontend/dist"
]

frontend_dist = next((p for p in frontend_dist_candidates if os.path.exists(p) and os.path.isdir(p)), None)

if frontend_dist:
    assets_dir = os.path.join(frontend_dist, "assets")
    if os.path.exists(assets_dir):
        app.mount("/assets", StaticFiles(directory=assets_dir), name="assets")

    @app.get("/{full_path:path}")
    def serve_spa(full_path: str):
        if full_path.startswith("api/") or full_path in ("docs", "openapi.json", "redoc", "health"):
            return {"error": "Not Found"}
        file_path = os.path.join(frontend_dist, full_path)
        if full_path and os.path.exists(file_path) and os.path.isfile(file_path):
            return FileResponse(file_path)
        return FileResponse(os.path.join(frontend_dist, "index.html"))
else:
    @app.get("/")
    def root():
        return {
            "system": "SMARTFIN.AI",
            "message": "Enterprise Finance & Office Automation System",
            "docs_url": "/docs",
            "api_v1": settings.API_V1_STR
        }
