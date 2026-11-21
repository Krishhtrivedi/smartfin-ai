"""Automation Center: jobs, agent proof checks, IT notices, WhatsApp receipts. All data is synthetic."""
import hashlib
import os
import uuid
from datetime import datetime, timedelta

import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.core.database import SessionLocal
from app.core.phone import normalize_phone
from app.models.all_models import AutomationJob, ClientReportSubmission, Customer

client = TestClient(app)
TOKEN = "test-agent-token-123"
AGENT = {"X-Agent-Token": TOKEN}
HB = {"agent_name": "office-mac", "version": "1.0", "desktop_root": "/Users/x/Desktop"}


def staff():
    r = client.post("/api/v1/auth/login", json={"email": "birju@smartfin.ai", "password": "SmartFin@2026!"})
    assert r.status_code == 200
    return {"Authorization": f"Bearer {r.json()['access_token']}"}


def make_pdf(text: str) -> bytes:
    """Minimal single-page PDF with real extractable text."""
    content = "BT /F1 10 Tf 40 800 Td " + " ".join(f"({line}) Tj 0 -14 Td" for line in text.split("\n")) + " ET"
    objs = [
        "<< /Type /Catalog /Pages 2 0 R >>",
        "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
        "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>",
        f"<< /Length {len(content)} >>\nstream\n{content}\nendstream",
        "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
    ]
    out, offsets = b"%PDF-1.4\n", []
    for i, o in enumerate(objs, 1):
        offsets.append(len(out))
        out += f"{i} 0 obj\n{o}\nendobj\n".encode()
    xref = len(out)
    out += f"xref\n0 {len(objs)+1}\n0000000000 65535 f \n".encode()
    out += "".join(f"{o:010d} 00000 n \n" for o in offsets).encode()
    out += f"trailer\n<< /Size {len(objs)+1} /Root 1 0 R >>\nstartxref\n{xref}\n%%EOF".encode()
    return out


def new_customer(phone="98250 11111", **kw):
    db = SessionLocal()
    try:
        import random, string
        pan = "ZZ" + "".join(random.choices(string.ascii_uppercase, k=3)) + f"{random.randint(0, 9999):04d}" + "Q"
        c = Customer(name=f"Test Client {uuid.uuid4().hex[:6]}", trade_name="TESTCO", gstin=f"24{pan}1Z5", pan=pan,
                     phone=phone, email=None, folder_name=None, **kw)
        db.add(c); db.commit(); db.refresh(c)
        return c.id, c.gstin, c.pan
    finally:
        db.close()


@pytest.fixture(autouse=True)
def agent_token(monkeypatch):
    monkeypatch.setenv("AGENT_API_TOKEN", TOKEN)


def drain_queue():
    """Finish any queued jobs left by other tests so claim order is predictable."""
    db = SessionLocal()
    try:
        for j in db.query(AutomationJob).filter(AutomationJob.status.in_(["QUEUED", "RUNNING", "WAITING_FOR_HUMAN"])):
            j.status = "CANCELLED"
        db.commit()
    finally:
        db.close()


def test_phone_normalisation():
    assert normalize_phone("9825011111")[0] == "+919825011111"
    assert normalize_phone("098250 11111")[0] == "+919825011111"
    assert normalize_phone("+91-98250-11111")[0] == "+919825011111"
    assert normalize_phone("12345")[0] is None
    assert normalize_phone("")[0] is None


def test_agent_api_off_without_token(monkeypatch):
    monkeypatch.delenv("AGENT_API_TOKEN")
    r = client.post("/api/v1/automation/agent/heartbeat", json=HB, headers=AGENT)
    assert r.status_code == 503
    monkeypatch.setenv("AGENT_API_TOKEN", TOKEN)
    assert client.post("/api/v1/automation/agent/heartbeat", json=HB, headers={"X-Agent-Token": "wrong"}).status_code == 401


def test_job_validation():
    h = staff()
    cid, _, _ = new_customer()
    r = client.post("/api/v1/automation/jobs", headers=h, json={"job_type": "GSTR1_DOWNLOAD", "customer_id": cid, "period": "13-2025"})
    assert r.status_code == 422
    assert any("MMYYYY" in e for e in r.json()["detail"]["errors"])


def run_gstr1(pdf: bytes, sha=None, period="102025", fy="2025-26"):
    drain_queue()
    h = staff()
    cid, gstin, _ = new_customer()
    job = client.post("/api/v1/automation/jobs", headers=h, json={
        "job_type": "GSTR1_DOWNLOAD", "customer_id": cid, "period": period, "financial_year": fy}).json()
    claimed = client.post("/api/v1/automation/agent/claim", headers=AGENT, json=HB).json()["job"]
    assert claimed["id"] == job["id"] and claimed["status"] == "RUNNING"
    assert "credentials" in claimed and claimed["folder_name"]
    assert client.post(f"/api/v1/automation/agent/jobs/{job['id']}/progress", headers=AGENT,
                       json={"status": "WAITING_FOR_HUMAN", "message": "Enter CAPTCHA"}).status_code == 200
    body = pdf(gstin) if callable(pdf) else pdf
    r = client.post(f"/api/v1/automation/agent/jobs/{job['id']}/gstr1", headers=AGENT,
                    files={"file": ("g.pdf", body, "application/pdf")},
                    data={"sha256": sha or hashlib.sha256(body).hexdigest(), "desktop_path": "/Users/x/Desktop/T/g.pdf"})
    assert r.status_code == 200, r.text
    return h, r.json()


def test_gstr1_verified_and_send_reports_real_results():
    h, job = run_gstr1(lambda g: make_pdf(f"GSTR-1 Details of outward supplies\nGSTIN - {g}\nFinancial year 2025-26\nTax period October"))
    assert job["status"] == "SUCCESS", job
    assert job["has_file"]
    # SMTP not configured, WhatsApp not connected, no email on file -> honest statuses, nothing "SENT"
    r = client.post(f"/api/v1/automation/jobs/{job['id']}/send", headers=h, json={"email": True, "whatsapp": True}).json()
    assert r["sent"] == 0
    statuses = {x["channel"]: x["status"] for x in r["results"]}
    assert statuses["email"] == "SKIPPED"
    assert statuses["whatsapp"] in {"NOT_CONNECTED", "FAILED"}


def test_gstr1_wrong_gstin_fails():
    _, job = run_gstr1(make_pdf("GSTIN - 24AAAAA9999A1Z5\nTax period October\n2025-26"))
    assert job["status"] == "FAILED"
    assert "GSTIN" in job["status_message"]


def test_gstr1_corrupted_upload_fails():
    _, job = run_gstr1(lambda g: make_pdf(f"GSTIN {g} October 2025-26"), sha="0" * 64)
    assert job["status"] == "FAILED"


def test_gstr1_missing_period_needs_review_and_cannot_send_unconfirmed():
    h, job = run_gstr1(lambda g: make_pdf(f"GSTIN - {g}"))
    assert job["status"] == "NEEDS_REVIEW"
    r = client.post(f"/api/v1/automation/jobs/{job['id']}/send", headers=h, json={"email": True, "whatsapp": False})
    assert r.status_code == 409


def test_it_notices_stored_as_read_and_flagged():
    drain_queue()
    h = staff()
    cid, _, _ = new_customer()
    job = client.post("/api/v1/automation/jobs", headers=h, json={"job_type": "IT_NOTICES_FETCH", "customer_id": cid}).json()
    client.post("/api/v1/automation/agent/claim", headers=AGENT, json=HB)
    headers = ["DIN", "Section", "Assessment Year", "Issued On", "Response Due Date", "Status"]
    rows = [
        {"kind": "NOTICE", "headers": headers, "cells": ["ITBA/AST/S/143(2)/2025-26/1000001", "143(2)", "2024-25", "01-10-2025", "15-12-2025", "Pending"]},
        {"kind": "NOTICE", "headers": headers, "cells": ["ITBA/AST/S/142(1)/2025-26/1000002", "142(1)", "2024-25", "05-10-2025", "", "Submitted"]},
    ]
    r = client.post(f"/api/v1/automation/agent/jobs/{job['id']}/it-notices", headers=AGENT,
                    json={"reached_pages": ["e-Proceedings"], "rows": rows}).json()
    assert r["status"] == "NEEDS_REVIEW"     # second row has no due date
    items = client.get(f"/api/v1/automation/it-notices?customer_id={cid}&show=all", headers=h).json()
    by_ref = {i["portal_ref"]: i for i in items}
    a = by_ref["ITBA/AST/S/143(2)/2025-26/1000001"]
    assert a["due_date"] == "2025-12-15" and a["response_status"] == "PENDING" and not a["needs_review"]
    b = by_ref["ITBA/AST/S/142(1)/2025-26/1000002"]
    assert b["due_date"] is None and b["response_status"] == "RESPONDED" and b["needs_review"]   # nothing invented

    # Second fetch shows only the first notice -> second is marked not seen, not deleted
    job2 = client.post("/api/v1/automation/jobs", headers=h, json={"job_type": "IT_NOTICES_FETCH", "customer_id": cid}).json()
    client.post("/api/v1/automation/agent/claim", headers=AGENT, json=HB)
    r2 = client.post(f"/api/v1/automation/agent/jobs/{job2['id']}/it-notices", headers=AGENT,
                     json={"reached_pages": ["e-Proceedings"], "rows": rows[:1]}).json()
    assert r2["status"] == "SUCCESS" and "1 no longer shown" in r2["status_message"]
    items = client.get(f"/api/v1/automation/it-notices?customer_id={cid}&show=all", headers=h).json()
    assert len(items) == 2


def test_it_fetch_without_reaching_page_fails():
    drain_queue()
    h = staff()
    cid, _, _ = new_customer()
    job = client.post("/api/v1/automation/jobs", headers=h, json={"job_type": "IT_NOTICES_FETCH", "customer_id": cid}).json()
    client.post("/api/v1/automation/agent/claim", headers=AGENT, json=HB)
    r = client.post(f"/api/v1/automation/agent/jobs/{job['id']}/it-notices", headers=AGENT, json={"reached_pages": [], "rows": []}).json()
    assert r["status"] == "FAILED"


def test_stale_job_is_failed_not_left_spinning():
    drain_queue()
    h = staff()
    cid, _, _ = new_customer()
    job = client.post("/api/v1/automation/jobs", headers=h, json={"job_type": "IT_NOTICES_FETCH", "customer_id": cid}).json()
    client.post("/api/v1/automation/agent/claim", headers=AGENT, json={**HB, "agent_name": "sleepy-mac"})
    db = SessionLocal()
    try:
        j = db.query(AutomationJob).get(job["id"]); j.last_update_at = datetime.utcnow() - timedelta(hours=1); db.commit()
    finally:
        db.close()
    jobs = client.get("/api/v1/automation/jobs", headers=h).json()
    j = next(x for x in jobs if x["id"] == job["id"])
    assert j["status"] == "FAILED" and "stopped reporting" in j["status_message"]


def inbox_file(name, data=b"%PDF-1.4 report"):
    p = os.path.join(os.environ["WHATSAPP_INBOX_DIR"], f"{uuid.uuid4().hex}_{name}")
    with open(p, "wb") as f:
        f.write(data)
    return p


def webhook(**kw):
    payload = {"message_id": uuid.uuid4().hex, "chat_jid": kw.get("jid"), "sender_jid": kw.get("jid"),
               "sender_name": kw.get("name", "Someone"), "message_text": kw.get("text", ""), "is_group": False,
               "has_attachment": bool(kw.get("path")), "attachment_path": kw.get("path"),
               "attachment_file_name": "TDS Oct.pdf"}
    return client.post("/api/v1/compliance/whatsapp/incoming-webhook", json=payload, headers=kw.get("headers", {}))


def test_whatsapp_receipt_matched_by_phone_only():
    h = staff()
    phone_digits = "98" + str(uuid.uuid4().int)[:8]
    cid, _, _ = new_customer(phone=phone_digits)          # stored WITHOUT +91
    jid = f"91{phone_digits}@s.whatsapp.net"

    # Text mentioning GST but no file -> not received
    assert webhook(jid=jid, text="sending GST report soon").json()["receipt"] is None
    # File from the client's number -> RECEIVED, linked to the client
    assert webhook(jid=jid, path=inbox_file("tds.pdf"), name="Display Name Differs").json()["receipt"] == "RECEIVED"
    # File from an unknown number -> UNMATCHED, never guessed
    assert webhook(jid="919000000001@s.whatsapp.net", path=inbox_file("x.pdf")).json()["receipt"] == "UNMATCHED"
    # A path outside the inbox is ignored
    assert webhook(jid=jid, path="/etc/hosts").json()["receipt"] is None

    t = client.get("/api/v1/compliance/whatsapp/client-reports/tracker", headers=h).json()
    assert any(r["customer_id"] == cid for r in t["received"])
    assert all(p["customer_id"] != cid for p in t["pending"])
    assert any(u["phone"] == "+919000000001" for u in t["unmatched"])

    # Agent copies it to the Desktop; wrong hash is refused, right hash accepted
    files = client.get("/api/v1/automation/agent/received-files", headers=AGENT).json()
    f = next(x for x in files if x["file_name"] == "TDS Oct.pdf" and x["sha256"])
    body = client.get(f"/api/v1/automation/agent/received-files/{f['id']}/download", headers=AGENT).content
    assert client.post(f"/api/v1/automation/agent/received-files/{f['id']}/synced", headers=AGENT,
                       json={"desktop_path": "/x", "sha256": "0" * 64}).status_code == 409
    assert client.post(f"/api/v1/automation/agent/received-files/{f['id']}/synced", headers=AGENT,
                       json={"desktop_path": "/Users/x/Desktop/T/Received/tds.pdf",
                             "sha256": hashlib.sha256(body).hexdigest()}).status_code == 200


def test_webhook_requires_secret_when_set(monkeypatch):
    monkeypatch.setenv("BRIDGE_WEBHOOK_SECRET", "s3cret")
    assert webhook(jid="919999999999@s.whatsapp.net").status_code == 401
    assert webhook(jid="919999999999@s.whatsapp.net", headers={"X-Bridge-Secret": "s3cret"}).status_code == 200


def test_overview_reports_real_state():
    h = staff()
    client.post("/api/v1/automation/agent/heartbeat", headers=AGENT, json=HB)
    o = client.get("/api/v1/automation/overview", headers=h).json()
    assert o["agent_configured"] is True
    assert any(a["agent_name"] == "office-mac" and a["online"] for a in o["agents"])
    assert o["whatsapp"]["connected"] is False
