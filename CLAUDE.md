# CLAUDE.md — SmartFin.AI (Vichar Vimarsh Enterprise Consulting & Tax Automation)

Welcome to **SmartFin.AI**, the comprehensive Enterprise Financial ERP, Compliance Hub, Strategic Advisory and Tax Automation Platform custom-engineered for **Vichar Vimarsh (https://vicharvimarsh.com/) & Team PMSC**.

---

## 1. Project Overview & Architecture

SmartFin.AI combines 24 integrated modules into a single, cohesive, responsive light-theme consulting-firm interface:
- **Executive Consulting Aesthetic:** Crisp white & soft neutral surfaces, sharp navy/charcoal typography (`#1A2F46`, `#0D2035`), and refined terracotta/orange brand accents (`#E65909`).
- **Real-Time Data Flow:** Zero dummy or fake states. All queries hit live database records, local filesystem paths, or verified network sockets.
- **2,207 Client Assessees Master:** Real client records with encrypted GST, IT e-Filing, and TDS portal credentials, contact persons, fuzzy aliases, custom folder overrides, and dispatch toggles.
- **FolderResolver Collision Safety:** Automatic folder routing to `~/Desktop/<ClientName>/GST/` and `IncomeTax/`. Duplicates are versioned safely as `(2).pdf`, `(3).pdf` to prevent overwriting staff work; ambiguous files route cleanly to `Needs_Review_Staging/`.

### Tech Stack
- **Backend:** FastAPI (Python 3.9+), SQLAlchemy ORM (SQLite / PostgreSQL), Pydantic v2, Uvicorn.
- **Frontend:** React 18, TypeScript, Vite, Tailwind CSS, Lucide Icons, Recharts.
- **AI Engine:** Multi-provider LLM interface (Google Gemini 1.5 Flash -> OpenAI GPT-4o-mini -> domain-specific structured heuristic fallback).
- **Automation & Integrations:** Direct WhatsApp Web Baileys socket (`127.0.0.1:8001`), SMTP TLS dispatch, Fernet AES-128 credential vault.

---

## 2. Directory Structure

```
SmartFin AI/
├── CLAUDE.md                  # This file (Instructions for running with Claude / locally)
├── README.md                  # System overview & production documentation
├── .env.example               # Clean environment variables template
├── Dockerfile                 # Multi-stage production container build
├── render.yaml                # Render cloud deployment blueprint
├── smartfin.db                # SQLite database with 2,207 real client records
│
├── backend/
│   ├── app/
│   │   ├── api/               # FastAPI routers (auth, customer, crm_leads, projects_meetings,
│   │   │                      #   business_scan, document_analyzer, settings_manager, compliance, etc.)
│   │   ├── core/              # Config, DB session, JWT security, Fernet AES-128 encryption
│   │   ├── models/            # SQLAlchemy database models (all_models.py)
│   │   ├── schemas/           # Pydantic validation schemas
│   │   ├── seed/              # Database seed data & production user generator
│   │   └── services/
│   │       ├── ai/            # Multi-provider LLM interface (gemini_client.py, assistant.py)
│   │       ├── automation/    # FolderResolver fuzzy folder router, collision safety
│   │       ├── reconciliation/# GST, Bank, TDS, Vendor, Customer engines
│   │       └── whatsapp/      # WhatsApp socket client, background schedulers
│   ├── tests/                 # Automated pytest suite (50 passing tests covering all routes)
│   ├── requirements.txt       # Python dependencies
│   └── whatsapp_bridge/       # Standalone Baileys micro-bridge (Node.js)
│
├── frontend/
│   ├── src/
│   │   ├── components/        # Layout, Sidebar, Header, Modals, StatCards
│   │   ├── context/           # AuthContext (JWT session management)
│   │   ├── pages/             # All 24 modules:
│   │   │   ├── Dashboard.tsx            # 00 / Executive Dashboard with management strip
│   │   │   ├── CustomerReconciliation.tsx# 01 / Client Master & Credential Vault
│   │   │   ├── CrmPipeline.tsx          # 02 / CRM Lead Pipeline (7-stage Kanban)
│   │   │   ├── ProjectsKanban.tsx       # 03 / Projects & Tasks Kanban
│   │   │   ├── MeetingsDesk.tsx         # 04 / Executive Meetings & AI Minutes
│   │   │   ├── ComplianceHub.tsx        # 05 / Statutory Automation Hub
│   │   │   ├── StatutoryNotices.tsx     # 06 / Statutory Notices Desk (7d/15d/30d)
│   │   │   ├── AutomationCenter.tsx     # 07 / Automation Center & Local Desktop Sync
│   │   │   ├── BusinessScanHub.tsx      # 08 / 7-Domain Diagnostic Hub
│   │   │   ├── DocumentAnalyzer.tsx     # 09 / Multi-Format AI Document Parser & Chat
│   │   │   ├── AIAssistantPage.tsx      # 10 / Vichar AI Copilot
│   │   │   ├── GSTReconciliation.tsx    # 11 / GST 2B Reconciliation
│   │   │   ├── VendorReconciliation.tsx # 12 / Vendor Ledgers & Aging
│   │   │   ├── TDSManagement.tsx        # 13 / TDS/TCS 26Q Compliance
│   │   │   ├── BankReconciliation.tsx   # 14 / Bank BRS Statement
│   │   │   ├── ExcelAutomation.tsx      # 15 / Excel Workflow Engine
│   │   │   ├── MISReports.tsx           # 16 / MIS Management Reports
│   │   │   ├── OfficeManagement.tsx     # 17 / Office & HR Operations
│   │   │   ├── SystemSettingsPage.tsx   # 18 / Settings & Live Connection Diagnostics
│   │   │   ├── AuditLogs.tsx            # 19 / Immutable Audit Trail Ledger
│   │   │   ├── VVPMSCChatbot.tsx        # 20 / VV-PMSC SOP Assistant
│   │   │   ├── PMSCPublicWebsite.tsx    # 21 / Public Client Intake Portal
│   │   │   └── portals/                 # 22-24 / Incubator Apps (Family AI, Career AI, Collection AI)
│   │   ├── services/          # Centralized typed API client (api.ts)
│   │   └── types/             # Full TypeScript interfaces (index.ts)
│   ├── package.json           # Frontend dependencies
│   └── vite.config.ts         # Vite build configuration
│
└── uploads/                   # Staged files & compliance archives
```

---

## 3. How to Run Locally

### Prerequisites
- Python 3.9+
- Node.js 18+ and npm

### Backend Setup
```bash
# 1. Create and activate virtual environment
python3 -m venv backend/venv
source backend/venv/bin/activate

# 2. Install dependencies
pip install -r backend/requirements.txt

# 3. Run FastAPI backend server (port 8000)
PYTHONPATH=backend backend/venv/bin/uvicorn app.main:app --app-dir backend --host 127.0.0.1 --port 8000 --reload
```

### Frontend Setup
```bash
# 1. Install frontend dependencies
cd frontend
npm install

# 2. Start Vite dev server (port 5173)
npm run dev -- --host 127.0.0.1 --port 5173
```

Open `http://127.0.0.1:5173` (or `http://127.0.0.1:8000` which serves the production frontend build directly).

### Default Production Credentials
- **Admin Account:** `pinal@smartfin.ai` / `SmartFin@2026!`
- **Managing Partner:** `birju@smartfin.ai` / `SmartFin@2026!`
- **Employee Account:** `rahul@smartfin.ai` / `SmartFin@2026!`

---

## 4. Running Automated Tests

All 50 unit and integration tests are verified and passing:
```bash
# Run full pytest suite
PYTHONPATH=backend backend/venv/bin/pytest backend/tests/ -v

# Run new CRM, Projects, Meetings, Business Scan & Settings tests
PYTHONPATH=backend backend/venv/bin/pytest backend/tests/test_crm_and_rebuild.py -v
```

### Frontend Build Verification
```bash
npm --prefix frontend run build
```
Builds cleanly with zero TypeScript errors into `frontend/dist/`.
