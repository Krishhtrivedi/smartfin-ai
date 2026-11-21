import uuid
import pytest
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
        "assigned_owner": "Birju Trivedi (Birju Sir)",
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
    assert target_notice["assigned_owner"] == "Birju Trivedi (Birju Sir)"
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
