# CLAUDE.md — SmartFin.AI Architecture & Development Guide

Welcome to **SmartFin.AI**, the comprehensive Enterprise Financial ERP, Compliance Hub, and Automation Platform custom-engineered for **Vichar Vimarsh Group / Team PMSC**.

---

## 1. Project Overview & Architecture

SmartFin.AI unifies 19 ERP modules, a 7-tool Compliance Automation Hub, an internal SOP knowledge base, a public institutional advisory site, and three dedicated incubator apps into a coherent, high-performance ecosystem.

### Tech Stack
- **Backend:** FastAPI (Python 3.9+), SQLAlchemy ORM, Pydantic v2, Uvicorn.
- **Database:** SQLite (default: `smartfin.db`) with automatic table migration; PostgreSQL supported.
- **Frontend:** React 18, TypeScript, Vite, Tailwind CSS, Lucide Icons, Recharts.
- **WhatsApp Daemon:** Node.js micro-bridge running `@whiskeysockets/baileys` on `127.0.0.1:8001`.
- **Integrations:** Direct WhatsApp Web socket (QR Scan / 8-digit Phone Pairing), SMTP email delivery, OpenAI GPT-4o-mini.

---

## 2. Directory Structure

```
SmartFin AI/
├── CLAUDE.md                  # This file (Instructions for running with Claude / locally)
├── .env.example               # Environment variables template
├── Dockerfile                 # Multi-stage production container build
├── render.yaml                # Render cloud deployment blueprint
├── smartfin.db                # SQLite database with pre-seeded users & schema
│
├── backend/
│   ├── app/
│   │   ├── api/               # FastAPI route controllers (auth, compliance, customer, vendor, etc.)
│   │   ├── core/              # Config, DB session, JWT security, client IP resolution
│   │   ├── models/            # SQLAlchemy database models (all_models.py)
│   │   ├── schemas/           # Pydantic validation schemas
│   │   ├── seed/              # Database seed data & production user generator
│   │   └── services/          # Reconciliation engines, AI assistant, WhatsApp bridge client, SMTP client
│   ├── tests/                 # Automated pytest suite (31 tests covering all engines & routes)
│   ├── requirements.txt       # Python dependencies
│   └── whatsapp_bridge/       # Standalone Baileys micro-bridge
│       ├── server.js          # HTTP bridge daemon & WhatsApp socket event listener
│       └── package.json       # Node.js dependencies (@whiskeysockets/baileys, qrcode, pino)
│
├── frontend/
│   ├── src/
│   │   ├── components/        # Layout, Sidebar, Header, Modals, StatCards
│   │   ├── context/           # AuthContext (JWT session management)
│   │   ├── pages/             # All 19 ERP module pages + ComplianceHub + Public Website
│   │   │   └── portals/       # Standalone incubator apps (FamilyKnowledgeAI, CareerPathwayAI, CollectionAI)
│   │   └── services/          # Centralized typed API service (api.ts)
│   ├── index.html             # Single Page Application entry
│   ├── package.json           # Frontend dependencies
│   └── vite.config.ts         # Vite build configuration & reverse proxy routing
│
├── uploads/                   # Document storage (ITR archives, GSTR return PDFs)
└── exports/                   # Generated MIS reports, Excel exports
```

---

## 3. How to Run Locally / In Claude

### Step 1: Environment Setup
Copy the template and adjust if using external services:
```bash
cp .env.example .env
```

### Step 2: Start Backend (FastAPI)
```bash
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```
*API Swagger Documentation is available at `http://localhost:8000/docs`.*

### Step 3: Start the WhatsApp Web Micro-Bridge
In a separate terminal tab:
```bash
cd backend/whatsapp_bridge
npm install
node server.js
```
*Microservice starts on `http://127.0.0.1:8001` and connects to the FastAPI backend.*

### Step 4: Start Frontend (Vite)
In a third terminal tab:
```bash
cd frontend
npm install
npm run dev
```
*Frontend runs at `http://localhost:5173`.*

---

## 4. Pre-Configured Test & Production Accounts

The database comes pre-seeded with official partner and staff accounts:

| Name | Role | Email | Password |
| :--- | :--- | :--- | :--- |
| **Pinal Shah** | Partner / Admin | `pinal@smartfin.ai` | `SmartFin@2026!` |
| **Nilesh Jain** | Partner / Admin | `nilesh@smartfin.ai` | `SmartFin@2026!` |
| **Birju Bhai** | Partner / Admin | `birju@smartfin.ai` | `SmartFin@2026!` |
| **Priya Mehta** | Compliance Staff | `employee@smartfin.ai` | `SmartFin@2026!` |

---

## 5. Testing & Code Verification

- **Run all Backend Unit Tests:**
  ```bash
  PYTHONPATH=backend pytest backend/tests/ -v
  ```
  *(Current: 31 passed, 100% test success).*

- **Run Frontend TypeScript Build:**
  ```bash
  cd frontend && npm run build
  ```
  *(Compiles with 0 TypeScript/lint errors).*

---

## 6. Strict Production Handover Rules

When modifying or extending this codebase, adhere to these mandatory rules:

1. **Zero Simulated / Fake Success States:**
   - Never show fake "Delivered to WhatsApp" or fake email dispatch when services are disconnected.
   - If WhatsApp is disconnected, return honest `400` errors and disable the broadcast button.
   - If SMTP credentials are not configured, log `NOT_CONFIGURED` without fabricated confirmations.
2. **End-of-Day WhatsApp Briefing (Both Parts Required):**
   - **Part 1:** High-level executive briefing (key decisions, action items, owners, blockers).
   - **Part 2:** Itemized unread messages log (sender, chat, timestamp, exact message body).
   - If no messages are unread, display: `✅ No unread WhatsApp messages pending review.`
3. **Incoming WhatsApp Message Tracking:**
   - Captured in real-time via `messages.upsert` in `server.js` and persisted to SQLite table `whatsapp_incoming_messages`.
   - Never mark messages as read automatically without explicit user review or dispatch request.
4. **Audit Logging & Real Client IP Resolution:**
   - Always resolve real client IPs via `X-Forwarded-For` or `X-Real-IP` behind reverse proxies.
5. **Design Language:**
   - Preserve Vichar Vimarsh brand styling: Deep Navy (`#0D2035`), Navy Accent (`#1A2F46`), Signal Orange (`#E65909`), and Warm Paper (`#F6F3EE`).
