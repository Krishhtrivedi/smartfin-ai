"""
Automation Center API.

Two callers:
  * Staff in the SmartFin web app (JWT): create jobs, watch status, send results to clients.
  * The SmartFin Mac agent (X-Agent-Token): claims jobs, opens the GST / Income Tax portals on
    the office Mac (staff type CAPTCHA + OTP), and reports back WITH PROOF.

Rules (no simulated success):
  * A job is SUCCESS only after the server itself has checked the proof (PDF bytes, GSTIN and
    period inside the PDF, matching SHA-256). Anything uncertain is NEEDS_REVIEW, never SUCCESS.
  * Jobs whose agent stops reporting for STALE_MINUTES are marked FAILED with that reason.
  * Email / WhatsApp sends are recorded with the provider's message ID, or with the error.
  * Income Tax items are stored exactly as read; anything the page did not show stays empty and
    the row is flagged for review. Nothing is invented.
"""
import hashlib
import hmac
import io
import json
import os
import re
from datetime import date, datetime, timedelta
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, File, Form, Header, HTTPException, Request, UploadFile
from fastapi.responses import FileResponse
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.database import get_db
from app.core.dependencies import get_current_user, log_audit_event
from app.core.phone import normalize_phone, whatsapp_jid
from app.core.security import decrypt_credential
from app.models.all_models import (
    AgentHeartbeat, AutomationJob, ClientReportSubmission, Customer, GSTRDispatchLog, PortalNotice, User,
)
from app.services.email.smtp_client import SMTPClient
from app.services.whatsapp.client import WhatsAppClient

router = APIRouter(prefix="/automation", tags=["Automation Center"])

JOB_TYPES = {"GSTR1_DOWNLOAD", "IT_NOTICES_FETCH"}
ACTIVE = {"RUNNING", "WAITING_FOR_HUMAN"}
FINAL = {"SUCCESS", "NEEDS_REVIEW", "FAILED", "CANCELLED"}
STALE_MINUTES = 20
AGENT_ONLINE_SECONDS = 120
MAX_PDF_BYTES = 25 * 1024 * 1024
MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August",
          "September", "October", "November", "December"]


# ------------------------------------------------------------------ helpers
def _token() -> str:
    return (os.getenv("AGENT_API_TOKEN") or settings.AGENT_API_TOKEN or "").strip()


def require_agent(x_agent_token: Optional[str] = Header(default=None)) -> str:
    expected = _token()
    if not expected:
        raise HTTPException(status_code=503, detail={"code": "NOT_CONFIGURED",
                            "message": "AGENT_API_TOKEN is not set on the server, so the Mac agent cannot connect."})
    if not x_agent_token or not hmac.compare_digest(x_agent_token.strip(), expected):
        raise HTTPException(status_code=401, detail="Invalid agent token.")
    return "agent"


def _automation_dir(*parts) -> str:
    base = os.path.abspath(os.getenv("AUTOMATION_DIR") or settings.AUTOMATION_DIR)
    path = os.path.join(base, *parts)
    os.makedirs(path, exist_ok=True)
    return path


def folder_for(c: Customer) -> str:
    raw = (c.folder_name or c.trade_name or c.name or f"Client_{c.id}").strip()
    raw = re.sub(r'[\\/:*?"<>|\x00-\x1f]', " ", raw)
    return re.sub(r"\s+", " ", raw).strip(" .")[:120] or f"Client_{c.id}"


def _j(v) -> Any:
    return json.loads(v) if v else None


def _iso(dt) -> Optional[str]:
    return dt.isoformat() if dt else None


def job_out(j: AutomationJob) -> dict:
    c = j.customer
    return {
        "id": j.id, "job_type": j.job_type, "status": j.status, "status_message": j.status_message,
        "customer_id": j.customer_id, "client_name": c.name if c else None,
        "gstin": c.gstin if c else None, "pan": c.pan if c else None,
        "params": _j(j.params_json) or {}, "agent_name": j.agent_name, "created_by_email": j.created_by_email,
        "created_at": _iso(j.created_at), "claimed_at": _iso(j.claimed_at), "last_update_at": _iso(j.last_update_at),
        "finished_at": _iso(j.finished_at), "has_file": bool(j.file_path and os.path.isfile(j.file_path)),
        "file_sha256": j.file_sha256, "file_size": j.file_size, "desktop_path": j.desktop_path,
        "checks": _j(j.checks_json) or [], "dispatch": _j(j.dispatch_json) or [],
    }


def sweep_stale(db: Session) -> int:
    """Jobs whose agent went quiet are failed honestly instead of spinning forever."""
    cutoff = datetime.utcnow() - timedelta(minutes=STALE_MINUTES)
    stale = db.query(AutomationJob).filter(AutomationJob.status.in_(ACTIVE), AutomationJob.last_update_at < cutoff).all()
    for j in stale:
        j.status = "FAILED"
        j.status_message = f"The Mac agent stopped reporting for {STALE_MINUTES} minutes (Mac asleep, closed or offline). Nothing was completed."
        j.finished_at = datetime.utcnow()
    if stale:
        db.commit()
    return len(stale)


def _set(db: Session, j: AutomationJob, status: str, message: Optional[str] = None):
    j.status = status
    j.status_message = message
    j.last_update_at = datetime.utcnow()
    if status in FINAL:
        j.finished_at = datetime.utcnow()
    db.commit()


# ------------------------------------------------------------------ schemas
class JobIn(BaseModel):
    job_type: str
    customer_id: int
    financial_year: Optional[str] = None   # GSTR-1: e.g. 2025-26
    period: Optional[str] = None           # GSTR-1: MMYYYY, e.g. 102025
    auto_send: bool = False                # GSTR-1: email + WhatsApp the PDF when it passes all checks


class SendIn(BaseModel):
    email: bool = True
    whatsapp: bool = True
    confirm_reviewed: bool = False         # required to send a NEEDS_REVIEW file


class HeartbeatIn(BaseModel):
    agent_name: str
    version: Optional[str] = None
    desktop_root: Optional[str] = None


class ProgressIn(BaseModel):
    status: str                            # RUNNING | WAITING_FOR_HUMAN
    message: Optional[str] = None


class FailIn(BaseModel):
    error: str


class ITRowIn(BaseModel):
    kind: str = "NOTICE"                   # NOTICE | DEMAND
    headers: Optional[List[str]] = None
    cells: List[str]


class ITResultIn(BaseModel):
    reached_pages: List[str]               # which portal pages the agent confirmed it opened
    rows: List[ITRowIn] = []


class SyncedIn(BaseModel):
    desktop_path: str
    sha256: str


# ------------------------------------------------------------------ staff: overview & jobs
@router.get("/overview")
def overview(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    sweep_stale(db)
    now = datetime.utcnow()
    agents = db.query(AgentHeartbeat).order_by(AgentHeartbeat.last_seen_at.desc()).all()
    wa = WhatsAppClient.get_live_status()
    counts = {s: db.query(AutomationJob).filter(AutomationJob.status == s).count()
              for s in ["QUEUED", "RUNNING", "WAITING_FOR_HUMAN", "NEEDS_REVIEW", "FAILED", "SUCCESS"]}
    period = date.today().strftime("%b %Y")
    received_ids = {cid for (cid,) in db.query(ClientReportSubmission.customer_id).filter(
        ClientReportSubmission.period == period, ClientReportSubmission.status == "RECEIVED",
        ClientReportSubmission.customer_id.isnot(None)).all()}
    total_clients = db.query(Customer).count()
    return {
        "agent_configured": bool(_token()),
        "agents": [{"agent_name": a.agent_name, "version": a.version, "desktop_root": a.desktop_root,
                    "last_seen_at": _iso(a.last_seen_at),
                    "online": (now - a.last_seen_at).total_seconds() < AGENT_ONLINE_SECONDS} for a in agents],
        "whatsapp": {"connected": bool(wa.get("is_connected")), "can_send": bool(wa.get("can_send")),
                     "state": wa.get("state") or wa.get("status")},
        "smtp_configured": SMTPClient.is_configured(),
        "jobs": counts,
        "reports": {"period": period, "received": len(received_ids), "total_clients": total_clients},
        "it_items_open": db.query(PortalNotice).filter(PortalNotice.seen_on_last_fetch.is_(True),
                                                       PortalNotice.response_status != "RESPONDED").count(),
        "it_items_review": db.query(PortalNotice).filter(PortalNotice.needs_review.is_(True)).count(),
    }


@router.get("/clients")
def client_picker(search: str = "", limit: int = 20, db: Session = Depends(get_db),
                  current_user: User = Depends(get_current_user)):
    q = db.query(Customer)
    s = search.strip()
    if s:
        like = f"%{s.lower()}%"
        from sqlalchemy import func, or_
        q = q.filter(or_(func.lower(Customer.name).like(like), func.lower(Customer.trade_name).like(like),
                         func.lower(Customer.gstin).like(like), func.lower(Customer.pan).like(like)))
    rows = q.order_by(Customer.name).limit(min(max(limit, 1), 50)).all()
    return [{"id": c.id, "name": c.name, "trade_name": c.trade_name, "gstin": c.gstin, "pan": c.pan,
             "phone": c.phone, "email": c.email, "folder_name": folder_for(c),
             "has_gst_login": bool(c.gst_username), "has_it_password": bool(c.it_password_enc)} for c in rows]


@router.get("/jobs")
def list_jobs(job_type: Optional[str] = None, status: Optional[str] = None, limit: int = 100,
              db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    sweep_stale(db)
    q = db.query(AutomationJob)
    if job_type:
        q = q.filter(AutomationJob.job_type == job_type)
    if status:
        q = q.filter(AutomationJob.status == status)
    return [job_out(j) for j in q.order_by(AutomationJob.id.desc()).limit(min(max(limit, 1), 300)).all()]


@router.post("/jobs", status_code=201)
def create_job(payload: JobIn, request: Request, db: Session = Depends(get_db),
               current_user: User = Depends(get_current_user)):
    if payload.job_type not in JOB_TYPES:
        raise HTTPException(status_code=422, detail=f"job_type must be one of {sorted(JOB_TYPES)}")
    c = db.query(Customer).get(payload.customer_id)
    if not c:
        raise HTTPException(status_code=404, detail="Client not found.")
    errors = []
    params: Dict[str, Any] = {}
    if payload.job_type == "GSTR1_DOWNLOAD":
        if not c.gstin:
            errors.append(f"{c.name} has no GSTIN in the Client Master.")
        if not payload.period or not re.fullmatch(r"(0[1-9]|1[0-2])20\d\d", payload.period):
            errors.append("Return period must be MMYYYY, e.g. 102025 for October 2025.")
        if not payload.financial_year or not re.fullmatch(r"20\d\d-\d\d", payload.financial_year):
            errors.append("Financial year must look like 2025-26.")
        params = {"financial_year": payload.financial_year, "period": payload.period, "auto_send": payload.auto_send}
    else:
        if not c.pan:
            errors.append(f"{c.name} has no PAN in the Client Master.")
    if errors:
        raise HTTPException(status_code=422, detail={"message": "Job not created.", "errors": errors})
    dup = db.query(AutomationJob).filter(AutomationJob.customer_id == c.id, AutomationJob.job_type == payload.job_type,
                                         AutomationJob.status.in_({"QUEUED"} | ACTIVE)).first()
    if dup and _j(dup.params_json) == (params or None):
        raise HTTPException(status_code=409, detail=f"The same job is already {dup.status.lower()} (job #{dup.id}).")
    j = AutomationJob(job_type=payload.job_type, customer_id=c.id, params_json=json.dumps(params) if params else None,
                      status="QUEUED", status_message="Waiting for the SmartFin agent on the office Mac to pick this up.",
                      created_by_email=current_user.email)
    db.add(j)
    db.commit()
    db.refresh(j)
    log_audit_event(db, current_user, "AUTOMATION_JOB_CREATED", "AutomationJob", j.id,
                    {"job_type": j.job_type, "customer_id": c.id, "params": params}, request=request)
    return job_out(j)


@router.post("/jobs/{job_id}/cancel")
def cancel_job(job_id: int, request: Request, db: Session = Depends(get_db),
               current_user: User = Depends(get_current_user)):
    j = db.query(AutomationJob).get(job_id)
    if not j:
        raise HTTPException(status_code=404, detail="Job not found.")
    if j.status in FINAL:
        raise HTTPException(status_code=409, detail=f"Job is already {j.status}.")
    _set(db, j, "CANCELLED", f"Cancelled by {current_user.email}.")
    log_audit_event(db, current_user, "AUTOMATION_JOB_CANCELLED", "AutomationJob", j.id, {}, request=request)
    return job_out(j)


@router.get("/jobs/{job_id}/file")
def download_job_file(job_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    j = db.query(AutomationJob).get(job_id)
    if not j or not j.file_path or not os.path.isfile(j.file_path):
        raise HTTPException(status_code=404, detail="No file stored for this job.")
    return FileResponse(j.file_path, media_type="application/pdf", filename=os.path.basename(j.file_path))


def dispatch_gstr1(db: Session, j: AutomationJob, email: bool, whatsapp: bool, actor_email: str) -> List[dict]:
    c = j.customer
    p = _j(j.params_json) or {}
    period = p.get("period", "")
    label = f"{MONTHS[int(period[:2]) - 1]} {period[2:]}" if len(period) == 6 else period
    fname = os.path.basename(j.file_path)
    results = []
    now = datetime.utcnow().isoformat()
    if email:
        if not getattr(c, "auto_email_dispatch", True):
            results.append({"channel": "email", "status": "SKIPPED_TOGGLE_OFF", "error": "Auto-email dispatch toggle is disabled in Client Master.", "at": now})
        elif not c.email:
            results.append({"channel": "email", "status": "SKIPPED", "error": "No email in Client Master.", "at": now})
        else:
            r = SMTPClient.send_email(
                to_email=c.email, subject=f"GSTR-1 for {label} - {c.trade_name or c.name}",
                html_body=f"<p>Dear {c.name},</p><p>Please find attached your GSTR-1 for <b>{label}</b> "
                          f"(GSTIN {c.gstin}).</p><p>Regards,<br>{settings.SMTP_FROM_NAME}</p>",
                attachments=[j.file_path])
            results.append({"channel": "email", "to": c.email, "status": "SENT" if r.get("success") else r.get("status", "FAILED"),
                            "error": None if r.get("success") else r.get("error"), "at": now})
            db.add(GSTRDispatchLog(client_name=c.name, gstin=c.gstin or "-", return_type="GSTR1", tax_period=period,
                                   file_name=fname, recipient_email=c.email,
                                   status="SENT" if r.get("success") else r.get("status", "FAILED"),
                                   error_message=None if r.get("success") else r.get("error"),
                                   dispatched_by_user_email=actor_email))
    if whatsapp:
        if not getattr(c, "auto_whatsapp_dispatch", True):
            results.append({"channel": "whatsapp", "status": "SKIPPED_TOGGLE_OFF", "error": "Auto-WhatsApp dispatch toggle is disabled in Client Master.", "at": now})
        else:
            phone, perr = normalize_phone(c.phone)
            if not phone:
                results.append({"channel": "whatsapp", "status": "SKIPPED",
                                "error": perr or "No WhatsApp number in Client Master.", "at": now})
            else:
                r = WhatsAppClient.send_document(whatsapp_jid(phone), j.file_path, fname,
                                                 caption=f"GSTR-1 for {label} - {c.trade_name or c.name}")
                results.append({"channel": "whatsapp", "to": phone, "status": r.get("status"),
                                "message_id": r.get("message_id"), "error": r.get("error"), "at": now})
    j.dispatch_json = json.dumps((_j(j.dispatch_json) or []) + results)
    db.commit()
    return results


@router.post("/jobs/{job_id}/send")
def send_job_result(job_id: int, payload: SendIn, request: Request, db: Session = Depends(get_db),
                    current_user: User = Depends(get_current_user)):
    j = db.query(AutomationJob).get(job_id)
    if not j or j.job_type != "GSTR1_DOWNLOAD":
        raise HTTPException(status_code=404, detail="GSTR-1 job not found.")
    if not j.file_path or not os.path.isfile(j.file_path):
        raise HTTPException(status_code=409, detail="There is no verified file for this job yet.")
    if j.status == "NEEDS_REVIEW" and not payload.confirm_reviewed:
        raise HTTPException(status_code=409, detail="This file did not pass every check. Open it, confirm it is correct, then send again.")
    if j.status not in {"SUCCESS", "NEEDS_REVIEW"}:
        raise HTTPException(status_code=409, detail=f"Job is {j.status}; nothing to send.")
    if not (payload.email or payload.whatsapp):
        raise HTTPException(status_code=422, detail="Choose email, WhatsApp or both.")
    results = dispatch_gstr1(db, j, payload.email, payload.whatsapp, current_user.email)
    log_audit_event(db, current_user, "GSTR1_SENT_TO_CLIENT", "AutomationJob", j.id,
                    {"results": results, "confirmed_review": payload.confirm_reviewed}, request=request)
    sent = sum(1 for r in results if r["status"] == "SENT")
    return {"sent": sent, "requested": len(results), "results": results, "job": job_out(j)}


# ------------------------------------------------------------------ staff: Income Tax items
@router.get("/it-notices")
def list_it_items(customer_id: Optional[int] = None, show: str = "open", db: Session = Depends(get_db),
                  current_user: User = Depends(get_current_user)):
    q = db.query(PortalNotice)
    if customer_id:
        q = q.filter(PortalNotice.customer_id == customer_id)
    if show == "open":
        q = q.filter(PortalNotice.seen_on_last_fetch.is_(True))
    elif show == "review":
        q = q.filter(PortalNotice.needs_review.is_(True))
    rows = q.all()
    rows.sort(key=lambda n: (n.response_status == "RESPONDED", n.due_date or date.max))
    today = date.today()
    return [{
        "id": n.id, "customer_id": n.customer_id, "client_name": n.customer.name if n.customer else None,
        "pan": n.customer.pan if n.customer else None, "kind": n.kind, "portal_ref": n.portal_ref,
        "section": n.section, "assessment_year": n.assessment_year, "description": n.description,
        "issue_date": n.issue_date.isoformat() if n.issue_date else None,
        "due_date": n.due_date.isoformat() if n.due_date else None,
        "days_left": (n.due_date - today).days if n.due_date else None,
        "response_status": n.response_status, "amount": n.amount, "raw_cells": _j(n.raw_cells_json),
        "needs_review": n.needs_review, "review_reasons": _j(n.review_reasons) or [],
        "seen_on_last_fetch": n.seen_on_last_fetch, "last_seen_at": _iso(n.last_seen_at),
    } for n in rows]


# ------------------------------------------------------------------ agent API
@router.post("/agent/heartbeat")
def agent_heartbeat(payload: HeartbeatIn, db: Session = Depends(get_db), _: str = Depends(require_agent)):
    hb = db.query(AgentHeartbeat).filter(AgentHeartbeat.agent_name == payload.agent_name[:100]).first()
    if not hb:
        hb = AgentHeartbeat(agent_name=payload.agent_name[:100])
        db.add(hb)
    hb.version, hb.desktop_root, hb.last_seen_at = payload.version, payload.desktop_root, datetime.utcnow()
    # A heartbeat from the agent also keeps its running job alive
    for j in db.query(AutomationJob).filter(AutomationJob.agent_name == hb.agent_name, AutomationJob.status.in_(ACTIVE)):
        j.last_update_at = datetime.utcnow()
    db.commit()
    sweep_stale(db)
    return {"ok": True, "server_time": datetime.utcnow().isoformat()}


@router.post("/agent/claim")
def agent_claim(payload: HeartbeatIn, request: Request, db: Session = Depends(get_db), _: str = Depends(require_agent)):
    agent_heartbeat(payload, db, "agent")
    j = db.query(AutomationJob).filter(AutomationJob.status == "QUEUED").order_by(AutomationJob.id).first()
    if not j:
        return {"job": None}
    c = j.customer
    j.status, j.agent_name, j.claimed_at, j.last_update_at = "RUNNING", payload.agent_name[:100], datetime.utcnow(), datetime.utcnow()
    j.status_message = "Agent started; opening the portal on the office Mac."
    db.commit()
    creds: Dict[str, Optional[str]] = {}
    if j.job_type == "GSTR1_DOWNLOAD":
        creds = {"username": c.gst_username, "password": decrypt_credential(c.gst_password_enc)}
    else:
        creds = {"username": c.it_username or c.pan, "password": decrypt_credential(c.it_password_enc)}
    log_audit_event(db, None, "AGENT_CLAIMED_JOB", "AutomationJob", j.id,
                    {"agent": j.agent_name, "credential_released": bool(creds.get("password"))}, request=request)
    return {"job": {**job_out(j), "folder_name": folder_for(c), "credentials": creds}}


def _agent_job(db: Session, job_id: int) -> AutomationJob:
    j = db.query(AutomationJob).get(job_id)
    if not j:
        raise HTTPException(status_code=404, detail="Job not found.")
    if j.status in FINAL:
        raise HTTPException(status_code=409, detail=f"Job is already {j.status}.")
    return j


@router.post("/agent/jobs/{job_id}/progress")
def agent_progress(job_id: int, payload: ProgressIn, db: Session = Depends(get_db), _: str = Depends(require_agent)):
    if payload.status not in ACTIVE:
        raise HTTPException(status_code=422, detail="status must be RUNNING or WAITING_FOR_HUMAN")
    j = _agent_job(db, job_id)
    _set(db, j, payload.status, (payload.message or "")[:1000] or None)
    return {"ok": True}


@router.post("/agent/jobs/{job_id}/fail")
def agent_fail(job_id: int, payload: FailIn, request: Request, db: Session = Depends(get_db), _: str = Depends(require_agent)):
    j = _agent_job(db, job_id)
    _set(db, j, "FAILED", payload.error[:1000])
    log_audit_event(db, None, "AUTOMATION_JOB_FAILED", "AutomationJob", j.id, {"error": payload.error[:500]}, request=request)
    return {"ok": True}


def verify_gstr1_pdf(data: bytes, gstin: str, period: str, fy: str) -> List[dict]:
    checks = []
    checks.append({"check": "File is a PDF", "result": "PASS" if data[:5] == b"%PDF-" else "FAIL"})
    text = ""
    if checks[0]["result"] == "PASS":
        try:
            from pypdf import PdfReader
            reader = PdfReader(io.BytesIO(data))
            text = "\n".join((p.extract_text() or "") for p in reader.pages[:10])
        except Exception as e:
            checks.append({"check": "PDF can be read", "result": "FAIL", "detail": e.__class__.__name__})
    flat = re.sub(r"\s+", "", text).upper()
    if not flat:
        checks.append({"check": "Text inside the PDF", "result": "UNKNOWN",
                       "detail": "No readable text (scanned image?). Open it and check by eye."})
        return checks
    checks.append({"check": f"GSTIN {gstin} appears in the PDF", "result": "PASS" if gstin.upper() in flat else "FAIL"})
    month = MONTHS[int(period[:2]) - 1]
    month_ok = month.upper() in flat or period in flat
    checks.append({"check": f"Tax period {month} appears", "result": "PASS" if month_ok else "UNKNOWN"})
    fy_ok = fy.replace(" ", "") in flat or fy.replace("-", "-20").replace(" ", "") in flat
    checks.append({"check": f"Financial year {fy} appears", "result": "PASS" if fy_ok else "UNKNOWN"})
    return checks


@router.post("/agent/jobs/{job_id}/gstr1")
async def agent_gstr1_result(job_id: int, request: Request, file: UploadFile = File(...), sha256: str = Form(...),
                             desktop_path: str = Form(...), db: Session = Depends(get_db), _: str = Depends(require_agent)):
    j = _agent_job(db, job_id)
    if j.job_type != "GSTR1_DOWNLOAD":
        raise HTTPException(status_code=422, detail="Not a GSTR-1 job.")
    data = await file.read(MAX_PDF_BYTES + 1)
    c = j.customer
    p = _j(j.params_json) or {}
    if not data or len(data) > MAX_PDF_BYTES:
        _set(db, j, "FAILED", "Downloaded file was empty or larger than 25 MB.")
        return job_out(j)
    actual = hashlib.sha256(data).hexdigest()
    checks = [{"check": "File arrived intact (SHA-256 matches the Mac copy)",
               "result": "PASS" if hmac.compare_digest(actual, sha256.strip().lower()) else "FAIL"}]
    checks += verify_gstr1_pdf(data, c.gstin or "", p.get("period", ""), p.get("financial_year", ""))
    folder = _automation_dir("gstr1", folder_for(c))
    path = os.path.join(folder, f"GSTR1_{c.gstin}_{p.get('period')}.pdf")
    with open(path, "wb") as fh:
        fh.write(data)
    j.file_path, j.file_sha256, j.file_size, j.desktop_path = path, actual, len(data), desktop_path[:500]
    j.checks_json = json.dumps(checks)
    results = {ch["result"] for ch in checks}
    if "FAIL" in results:
        failed = "; ".join(ch["check"] for ch in checks if ch["result"] == "FAIL")
        _set(db, j, "FAILED", f"Downloaded file failed checks: {failed}. It was not sent to the client.")
    elif "UNKNOWN" in results:
        _set(db, j, "NEEDS_REVIEW", "File saved, but some checks could not be confirmed automatically. Open it before sending.")
    else:
        _set(db, j, "SUCCESS", "GSTR-1 downloaded and verified.")
        if p.get("auto_send"):
            res = dispatch_gstr1(db, j, True, True, "auto-send")
            sent = [r["channel"] for r in res if r["status"] == "SENT"]
            j.status_message = f"GSTR-1 downloaded and verified. Auto-send: {', '.join(sent) or 'nothing sent'}" + \
                               ("" if len(sent) == len(res) else " (see details)") + "."
            db.commit()
    log_audit_event(db, None, "GSTR1_DOWNLOADED", "AutomationJob", j.id,
                    {"status": j.status, "sha256": actual, "size": len(data), "checks": checks}, request=request)
    return job_out(j)


# --- Income Tax parsing (only what the page shows) ---
DATE_PATTERNS = [("%d-%m-%Y", r"\d{2}-\d{2}-\d{4}"), ("%d/%m/%Y", r"\d{2}/\d{2}/\d{4}"),
                 ("%d-%b-%Y", r"\d{2}-[A-Za-z]{3}-\d{4}"), ("%d %b %Y", r"\d{1,2} [A-Za-z]{3} \d{4}"),
                 ("%d-%B-%Y", r"\d{2}-[A-Za-z]{4,9}-\d{4}"), ("%Y-%m-%d", r"\d{4}-\d{2}-\d{2}")]


def parse_date(s: str) -> Optional[date]:
    s = (s or "").strip()
    for fmt, pat in DATE_PATTERNS:
        m = re.search(pat, s)
        if m:
            try:
                return datetime.strptime(m.group(0), fmt).date()
            except ValueError:
                continue
    return None


def parse_amount(s: str) -> Optional[float]:
    m = re.search(r"-?[\d,]+(?:\.\d+)?", (s or "").replace("₹", ""))
    if not m:
        return None
    try:
        return float(m.group(0).replace(",", ""))
    except ValueError:
        return None


HEADER_MAP = [
    ("portal_ref", ("din", "notice no", "notice number", "document identification", "reference", "demand reference", "proceeding id")),
    ("section", ("section",)),
    ("assessment_year", ("assessment year", "a.y", "ay")),
    ("issue_date", ("issue date", "date of issue", "issued on", "notice date", "date of demand", "demand raised")),
    ("due_date", ("due date", "response due", "date of compliance", "compliance date", "reply by")),
    ("response_status", ("status", "response")),
    ("amount", ("amount", "demand", "outstanding")),
    ("description", ("proceeding name", "description", "notice type", "subject", "type")),
]


def interpret_row(row: ITRowIn) -> dict:
    cells = [re.sub(r"\s+", " ", c or "").strip() for c in row.cells]
    out: Dict[str, Any] = {"kind": row.kind if row.kind in {"NOTICE", "DEMAND"} else "NOTICE"}
    reasons = []
    if row.headers and len(row.headers) == len(cells):
        for h, v in zip(row.headers, cells):
            hl = (h or "").strip().lower()
            for field, keys in HEADER_MAP:
                if field not in out and v and any(k == hl or k in hl for k in keys):
                    out[field] = v
                    break
    else:
        reasons.append("No column headers captured; fields were read by pattern only.")
        joined = " | ".join(cells)
        m = re.search(r"\b(?:ITBA|CPC)/[A-Z0-9/\-]+", joined)
        if m:
            out["portal_ref"] = m.group(0)
        m = re.search(r"\b20\d\d-\d\d\b", joined)
        if m:
            out["assessment_year"] = m.group(0)
        dates = [d for d in (parse_date(c) for c in cells) if d]
        if len(dates) == 1:
            reasons.append("One date found; not known whether it is the issue or due date.")
        elif len(dates) > 1:
            reasons.append("Several dates found; issue and due dates need to be confirmed.")
    issue = parse_date(out.get("issue_date", "")) if out.get("issue_date") else None
    due = parse_date(out.get("due_date", "")) if out.get("due_date") else None
    if out.get("issue_date") and not issue:
        reasons.append(f"Issue date '{out['issue_date']}' could not be read.")
    if out.get("due_date") and not due:
        reasons.append(f"Due date '{out['due_date']}' could not be read.")
    amount = parse_amount(out["amount"]) if out.get("amount") else None
    st = (out.get("response_status") or "").lower()
    status = "RESPONDED" if any(k in st for k in ("submitted", "responded", "replied", "closed", "disposed")) else \
             ("PENDING" if any(k in st for k in ("pending", "open", "not submitted", "awaiting", "due")) else None)
    if not out.get("portal_ref"):
        reasons.append("No DIN / reference number on the row.")
    if out["kind"] == "NOTICE" and not due:
        reasons.append("No due date shown.")
    if status is None:
        reasons.append("Response status not shown.")
    fp_src = out.get("portal_ref") or "|".join(cells)
    return {
        "kind": out["kind"], "portal_ref": (out.get("portal_ref") or None),
        "fingerprint": hashlib.sha256(f"{out['kind']}|{fp_src}".encode()).hexdigest(),
        "section": out.get("section"), "assessment_year": out.get("assessment_year"),
        "description": out.get("description"), "issue_date": issue, "due_date": due,
        "response_status": status, "amount": amount, "raw_cells": cells, "reasons": reasons,
    }


@router.post("/agent/jobs/{job_id}/it-notices")
def agent_it_result(job_id: int, payload: ITResultIn, request: Request, db: Session = Depends(get_db),
                    _: str = Depends(require_agent)):
    j = _agent_job(db, job_id)
    if j.job_type != "IT_NOTICES_FETCH":
        raise HTTPException(status_code=422, detail="Not an Income Tax job.")
    if not payload.reached_pages:
        _set(db, j, "FAILED", "The agent did not confirm it reached the e-Proceedings or demand page. Nothing was stored.")
        return job_out(j)
    now = datetime.utcnow()
    existing = {n.row_fingerprint: n for n in db.query(PortalNotice).filter(PortalNotice.customer_id == j.customer_id)}
    seen = set()
    created = updated = review = 0
    for row in payload.rows:
        if not any((c or "").strip() for c in row.cells):
            continue
        r = interpret_row(row)
        seen.add(r["fingerprint"])
        n = existing.get(r["fingerprint"])
        if not n:
            n = PortalNotice(customer_id=j.customer_id, kind=r["kind"], row_fingerprint=r["fingerprint"], first_seen_at=now)
            db.add(n)
            existing[r["fingerprint"]] = n
            created += 1
        else:
            updated += 1
        n.portal_ref, n.section, n.assessment_year, n.description = r["portal_ref"], r["section"], r["assessment_year"], r["description"]
        n.issue_date, n.due_date, n.response_status, n.amount = r["issue_date"], r["due_date"], r["response_status"], r["amount"]
        n.raw_cells_json = json.dumps(r["raw_cells"])
        n.needs_review = bool(r["reasons"])
        n.review_reasons = json.dumps(r["reasons"]) if r["reasons"] else None
        n.last_seen_at, n.seen_on_last_fetch, n.last_job_id = now, True, j.id
        review += int(n.needs_review)
    gone = 0
    for fp, n in existing.items():
        if fp not in seen and n.seen_on_last_fetch:
            n.seen_on_last_fetch = False
            gone += 1
    pages = ", ".join(payload.reached_pages)
    msg = f"Read {len(seen)} item(s) from {pages}: {created} new, {updated} already known, {gone} no longer shown."
    if review:
        _set(db, j, "NEEDS_REVIEW", msg + f" {review} need a quick check (missing or unclear fields).")
    else:
        _set(db, j, "SUCCESS", msg)
    log_audit_event(db, None, "IT_PORTAL_ITEMS_FETCHED", "AutomationJob", j.id,
                    {"pages": payload.reached_pages, "items": len(seen), "new": created, "review": review, "gone": gone},
                    request=request)
    return job_out(j)


# --- WhatsApp files -> office Mac Desktop ---
@router.get("/agent/received-files")
def agent_received_files(db: Session = Depends(get_db), _: str = Depends(require_agent)):
    subs = db.query(ClientReportSubmission).filter(
        ClientReportSubmission.status == "RECEIVED", ClientReportSubmission.customer_id.isnot(None),
        ClientReportSubmission.file_path.isnot(None), ClientReportSubmission.desktop_synced_at.is_(None)).limit(50).all()
    out = []
    for s in subs:
        c = db.query(Customer).get(s.customer_id)
        if not c or not os.path.isfile(s.file_path):
            continue
        out.append({"id": s.id, "folder_name": folder_for(c), "period": s.period,
                    "file_name": s.original_file_name or os.path.basename(s.file_path),
                    "sha256": s.file_sha256, "size": s.file_size})
    return out


@router.get("/agent/received-files/{sub_id}/download")
def agent_download_received(sub_id: int, db: Session = Depends(get_db), _: str = Depends(require_agent)):
    s = db.query(ClientReportSubmission).get(sub_id)
    if not s or not s.file_path or not os.path.isfile(s.file_path):
        raise HTTPException(status_code=404, detail="File not found on server.")
    return FileResponse(s.file_path, filename=s.original_file_name or os.path.basename(s.file_path))


@router.post("/agent/received-files/{sub_id}/synced")
def agent_received_synced(sub_id: int, payload: SyncedIn, db: Session = Depends(get_db), _: str = Depends(require_agent)):
    s = db.query(ClientReportSubmission).get(sub_id)
    if not s:
        raise HTTPException(status_code=404, detail="Not found.")
    if not s.file_sha256 or not hmac.compare_digest(s.file_sha256, payload.sha256.strip().lower()):
        raise HTTPException(status_code=409, detail="SHA-256 does not match the server copy; not marked as saved.")
    s.desktop_path, s.desktop_synced_at = payload.desktop_path[:500], datetime.utcnow()
    db.commit()
    return {"ok": True}
