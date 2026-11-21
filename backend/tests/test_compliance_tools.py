import uuid
import pytest
from datetime import datetime
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def get_admin_token():
    res = client.post(
        "/api/v1/auth/login",
        json={"email": "birju@smartfin.ai", "password": "SmartFin@2026!"}
    )
    assert res.status_code == 200
    return res.json()["access_token"]

def test_statutory_notices_crud():
    token = get_admin_token()
    headers = {
        "Authorization": f"Bearer {token}",
        "X-Forwarded-For": "203.0.113.195, 10.0.0.1"
    }

    # 1. Create Notice
    unique_no = f"NOT-IT-148A-{uuid.uuid4().hex[:6].upper()}"
    payload = {
        "notice_number": unique_no,
        "notice_type": "INCOME_TAX",
        "section": "148A(b)",
        "client_name": "Adani Green Energy Ltd",
        "client_pan_gstin": "AABCA1234F",
        "assessment_year": "2023-24",
        "financial_year": "2022-23",
        "issue_date": "2026-10-15",
        "due_date": "2026-11-30",
        "risk_level": "CRITICAL",
        "assigned_owner": "Biraju Bhai (Birju Sir)",
        "demand_amount": 450000.0,
        "description": "Alleged unexplained cash credits under section 68."
    }
    create_res = client.post("/api/v1/compliance/notices", json=payload, headers=headers)
    assert create_res.status_code == 200
    create_data = create_res.json()
    assert create_data["id"] is not None
    notice_id = create_data["id"]

    # 2. Get Notices list
    list_res = client.get("/api/v1/compliance/notices", headers=headers)
    assert list_res.status_code == 200
    notices = list_res.json()
    target_notice = next((n for n in notices if n["id"] == notice_id), None)
    assert target_notice is not None
    assert target_notice["assigned_owner"] == "Biraju Bhai (Birju Sir)"
    assert target_notice["risk_level"] == "CRITICAL"

    # 3. Update status & notes
    update_res = client.put(
        f"/api/v1/compliance/notices/{notice_id}/status",
        json={
            "status": "DRAFTING_REPLY",
            "response_notes": "Reconciliation statement and bank ledger extracts attached.",
            "checklist": [
                {"id": 1, "task": "Verify notice validity", "done": True},
                {"id": 2, "task": "Draft response with Birju Sir", "done": True}
            ]
        },
        headers=headers
    )
    assert update_res.status_code == 200
    updated = update_res.json()
    assert updated["status"] == "DRAFTING_REPLY"

def test_capital_gains_calculator():
    token = get_admin_token()
    headers = {"Authorization": f"Bearer {token}"}

    payload = {
        "asset_type": "EQUITY_LISTED",
        "purchase_date": "2023-01-15",
        "sale_date": "2026-05-20",
        "cost_of_acquisition": 2000000.0,
        "sale_consideration": 3500000.0,
        "transfer_expenses": 5000.0,
        "exemption_amount": 0.0
    }
    res = client.post("/api/v1/compliance/capital-gains/calculate", json=payload, headers=headers)
    assert res.status_code == 200
    data = res.json()
    assert data["gain_type"] == "LTCG"
    assert data["net_taxable_gain"] > 0
    assert data["tax_payable"] > 0

def test_statutory_salary_calculator():
    token = get_admin_token()
    headers = {"Authorization": f"Bearer {token}"}

    payload = {
        "ctc_monthly": 65000.0,
        "basic_pct": 50.0,
        "hra_pct": 40.0,
        "lop_days": 1.0,
        "month_days": 30
    }
    res = client.post("/api/v1/compliance/tools/calculate-salary", json=payload, headers=headers)
    assert res.status_code == 200
    data = res.json()
    assert data["summary"]["net_take_home_pay"] > 0
    assert data["employee_deductions"]["provident_fund_12pct"] > 0
    assert data["employee_deductions"]["professional_tax"] > 0
    assert data["summary"]["total_employer_ctc"] > 0

def test_gstr_dispatch_and_agent():
    token = get_admin_token()
    headers = {"Authorization": f"Bearer {token}"}

    # Dispatch trigger
    dispatch_res = client.post(
        "/api/v1/compliance/gstr-dispatch/scan-and-send",
        json={"target_folder": "/data/gstr_returns", "period": "102026"},
        headers=headers
    )
    assert dispatch_res.status_code == 200
    assert "dispatches" in dispatch_res.json()
    assert len(dispatch_res.json()["dispatches"]) > 0

    # AI Filing Agent Pre-checks
    check_res = client.post(
        "/api/v1/compliance/gst-agent/prepare",
        json={"return_type": "GSTR-1", "tax_period": "102026", "client_gstin": "24AABCA1234F1Z8"},
        headers=headers
    )
    assert check_res.status_code == 200
    check_data = check_res.json()
    assert "review_id" in check_data
    assert check_data["status"] == "PENDING_APPROVAL"

    # Human-in-the-loop approval
    review_id = check_data["review_id"]
    approve_res = client.post(
        f"/api/v1/compliance/gst-agent/approve-and-file/{review_id}",
        json={"approval_notes": "Audited with Birju sir and verified invoices."},
        headers=headers
    )
    assert approve_res.status_code == 200
    assert approve_res.json()["status"] == "APPROVED_FILED"

def test_whatsapp_integration_and_pmsc_summary():
    token = get_admin_token()
    headers = {
        "Authorization": f"Bearer {token}",
        "X-Forwarded-For": "203.0.113.195, 10.0.0.1"
    }

    # 1. Check WhatsApp config endpoint
    config_res = client.get("/api/v1/compliance/whatsapp/config", headers=headers)
    assert config_res.status_code == 200
    cfg = config_res.json()
    assert "status" in cfg
    assert "schedule" in cfg

    # 2. Test Connection (should return safe status even when not configured)
    test_conn_res = client.post("/api/v1/compliance/whatsapp/test-connection", headers=headers)
    assert test_conn_res.status_code == 200
    test_data = test_conn_res.json()
    assert "status" in test_data

    # 3. Update Schedule
    sched_res = client.post(
        "/api/v1/compliance/whatsapp/schedule",
        json={"enabled": True, "time_ist": "18:45"},
        headers=headers
    )
    assert sched_res.status_code == 200
    assert sched_res.json()["schedule"]["time_ist"] == "18:45"

    # 4. Generate Daily Office Summary
    gen_res = client.post(
        "/api/v1/compliance/office-summary/generate",
        json={"summary_date": "2026-11-21"},
        headers=headers
    )
    assert gen_res.status_code == 200
    summary = gen_res.json()
    assert "summary_id" in summary
    assert "formatted_text" in summary
    assert "Team PMSC" in summary["formatted_text"]
    summary_id = summary["summary_id"]

    # 5. Dispatch Summary to Team PMSC - verify strict refusal when disconnected
    post_res_disconnected = client.post(
        f"/api/v1/compliance/office-summary/{summary_id}/post-to-pmsc",
        headers=headers
    )
    # Strictly blocked with 400 because WhatsApp is not fake-connected
    assert post_res_disconnected.status_code == 400
    assert "not connected" in post_res_disconnected.json()["detail"].lower()

    # Dispatch Summary with connected session (verified genuine send)
    from unittest.mock import patch
    with patch("app.services.whatsapp.client.WhatsAppClient.get_live_status", return_value={"can_send": True, "state": "CONNECTED"}), \
         patch("app.services.whatsapp.client.WhatsAppClient.send_real_message", return_value={"success": True, "message_id": "WAMSG_TEST_99812", "timestamp": "2026-11-21T12:00:00Z", "group_id": "1203630283920192@g.us"}):
        post_res = client.post(
            f"/api/v1/compliance/office-summary/{summary_id}/post-to-pmsc",
            headers=headers
        )
        assert post_res.status_code == 200
        post_data = post_res.json()
        assert post_data["status"] == "POSTED_TO_PMSC"
        assert post_data["send_result"]["message_id"] == "WAMSG_TEST_99812"

    # 6. Check Delivery History
    history_res = client.get("/api/v1/compliance/office-summary/history", headers=headers)
    assert history_res.status_code == 200
    hist = history_res.json()
    assert len(hist) > 0
    assert any(h["id"] == summary_id for h in hist)

def test_whatsapp_unread_tracking_and_digest():
    token = get_admin_token()
    headers = {"Authorization": f"Bearer {token}"}

    # 1. Simulate incoming message webhook
    msg_payload = {
        "message_id": f"msg_test_{datetime.utcnow().timestamp()}",
        "chat_jid": "919825012345@s.whatsapp.net",
        "chat_name": "Adani Green Accounts",
        "sender_jid": "919825012345@s.whatsapp.net",
        "sender_name": "Karan Singhal",
        "message_text": "Urgent: Please share Form 16 and GSTR-3B filed copy before 4 PM.",
        "timestamp": datetime.utcnow().isoformat(),
        "is_group": False
    }
    hook_res = client.post("/api/v1/compliance/whatsapp/incoming-webhook", json=msg_payload)
    assert hook_res.status_code == 200
    assert hook_res.json()["status"] == "STORED"

    # 2. Query unread messages
    unread_res = client.get("/api/v1/compliance/whatsapp/unread-messages", headers=headers)
    assert unread_res.status_code == 200
    unreads = unread_res.json()
    assert unreads["count"] >= 1
    found = [m for m in unreads["messages"] if m["message_id"] == msg_payload["message_id"]]
    assert len(found) == 1
    msg_db_id = found[0]["id"]
    assert found[0]["sender_name"] == "Karan Singhal"

    # 3. Generate Daily Summary - verifies Part 1 and Part 2 both present
    gen_res = client.post(
        "/api/v1/compliance/office-summary/generate",
        json={"summary_date": "2026-11-21"},
        headers=headers
    )
    assert gen_res.status_code == 200
    data = gen_res.json()
    assert "PART 1: EXECUTIVE BRIEFING & UNREAD SUMMARY" in data["formatted_text"]
    assert "PART 2: UNREAD MESSAGES LOG" in data["formatted_text"]
    assert "Karan Singhal" in data["formatted_text"]
    assert data["unread_count"] >= 1

    # 4. Mark Message as Read
    mark_res = client.post(
        "/api/v1/compliance/whatsapp/messages/mark-read",
        json={"message_ids": [msg_db_id]},
        headers=headers
    )
    assert mark_res.status_code == 200
    assert mark_res.json()["success"] is True
    assert mark_res.json()["marked_count"] == 1

    # 5. Verify it is no longer unread
    unread_after = client.get("/api/v1/compliance/whatsapp/unread-messages", headers=headers)
    assert not any(m["id"] == msg_db_id for m in unread_after.json()["messages"])
