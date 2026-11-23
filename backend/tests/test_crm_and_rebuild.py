import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.core.database import SessionLocal
from app.models.all_models import Customer, Employee
from app.services.automation.folder_resolver import FolderResolver
import tempfile
import os

client = TestClient(app)

def get_admin_token():
    resp = client.post("/api/v1/auth/login", json={"email": "pinal@smartfin.ai", "password": "SmartFin@2026!"})
    assert resp.status_code == 200
    return resp.json()["access_token"]


def test_folder_resolver_exact_and_alias():
    with tempfile.TemporaryDirectory() as tmpdir:
        db = SessionLocal()
        try:
            # Seed a test customer with aliases
            test_cust = Customer(
                name="Swastik Insecticides Private Limited",
                trade_name="Swastik",
                aliases="Swastik, Swastik Insecticides",
                gstin="24AAACS9999P1Z9",
                pan="AAACS9999P",
                folder_name="Swastik Insecticides"
            )
            db.add(test_cust)
            db.commit()
            db.refresh(test_cust)

            resolver = FolderResolver(root_desktop_dir=tmpdir)
            
            # Exact GSTIN match
            res1 = resolver.resolve_destination(
                db=db,
                category="GST",
                sub_period_or_fy="2026-27",
                file_name="GSTR1.pdf",
                gstin="24AAACS9999P1Z9"
            )
            assert res1["status"] == "ROUTED"
            assert res1["is_needs_review"] is False
            assert "Swastik" in res1["resolved_file_path"]

            # Alias match (e.g., matching keyword 'Swastik')
            res2 = resolver.resolve_destination(
                db=db,
                category="GST",
                sub_period_or_fy="2026-27",
                file_name="GSTR1.pdf",
                company_name="Swastik"
            )
            assert res2["status"] == "ROUTED"
            assert res2["is_needs_review"] is False

            # Collision test: create the file and resolve again to ensure free_path appends (2)
            os.makedirs(os.path.dirname(res1["resolved_file_path"]), exist_ok=True)
            with open(res1["resolved_file_path"], "w") as f:
                f.write("content")

            res_collision = resolver.resolve_destination(
                db=db,
                category="GST",
                sub_period_or_fy="2026-27",
                file_name="GSTR1.pdf",
                gstin="24AAACS9999P1Z9"
            )
            assert " (2).pdf" in res_collision["resolved_file_path"]

            # Unknown company fallback to Needs_Review_Staging
            res_unknown = resolver.resolve_destination(
                db=db,
                category="GST",
                sub_period_or_fy="2026-27",
                file_name="GSTR1.pdf",
                company_name="Nonexistent Phantom Corporation 999"
            )
            assert res_unknown["status"] == "NEEDS_REVIEW"
            assert res_unknown["is_needs_review"] is True
            assert "Needs_Review_Staging" in res_unknown["resolved_file_path"]

        finally:
            db.close()


def test_crm_leads_lifecycle():
    token = get_admin_token()
    headers = {"Authorization": f"Bearer {token}"}

    # 1. Create a lead
    payload = {
        "company_name": "Apex Innovations Ltd",
        "contact_person": "Vikram Sethi",
        "email": "vikram@apexinnovations.in",
        "phone": "+91 98765 43210",
        "source": "WEBSITE",
        "expected_value": 75000.0,
        "notes": "Interested in GST automation & Virtual CFO"
    }
    res = client.post("/api/v1/crm/leads", json=payload, headers=headers)
    assert res.status_code == 200
    res_data = res.json()
    assert res_data["status"] == "SUCCESS"
    lead_id = res_data["id"]

    # Verify lead details
    lead_det = client.get(f"/api/v1/crm/leads/{lead_id}", headers=headers).json()["lead"]
    assert lead_det["stage"] == "NEW"
    assert lead_det["company_name"] == "Apex Innovations Ltd"

    # 2. Get pipeline summary
    summary_res = client.get("/api/v1/crm/pipeline-summary", headers=headers)
    assert summary_res.status_code == 200
    summary = summary_res.json()
    assert summary["total_leads"] >= 1
    assert "stages" in summary

    # 3. Add activity
    act_payload = {
        "activity_type": "CALL",
        "title": "Initial Discovery Call",
        "description": "Discussed scope of work. Client requested proposal."
    }
    act_res = client.post(f"/api/v1/crm/leads/{lead_id}/activities", json=act_payload, headers=headers)
    assert act_res.status_code == 200

    # 4. Update stage to PROPOSAL_SENT
    up_res = client.put(f"/api/v1/crm/leads/{lead_id}", json={"stage": "PROPOSAL_SENT", "probability": 70}, headers=headers)
    assert up_res.status_code == 200
    up_det = client.get(f"/api/v1/crm/leads/{lead_id}", headers=headers).json()["lead"]
    assert up_det["stage"] == "PROPOSAL_SENT"

    # 5. Convert lead to customer
    conv_res = client.post(f"/api/v1/crm/leads/{lead_id}/convert", headers=headers)
    assert conv_res.status_code == 200
    conv_data = conv_res.json()
    assert conv_data["status"] == "SUCCESS"
    assert "customer_id" in conv_data


def test_projects_and_meetings():
    token = get_admin_token()
    headers = {"Authorization": f"Bearer {token}"}

    # Find or seed an employee for assignment
    db = SessionLocal()
    emp = db.query(Employee).first()
    if not emp:
        emp = Employee(name="Rahul Mehta", email="rahul@smartfin.ai", department="Accounts", designation="Senior Executive")
        db.add(emp)
        db.commit()
        db.refresh(emp)
    emp_id = emp.id
    db.close()

    # Create project
    proj_payload = {
        "name": "Annual Statutory Audit 2026",
        "code": "PRJ-2026-TEST",
        "description": "Statutory audit and tax planning",
        "priority": "HIGH",
        "budget": 120000.0,
        "manager_employee_id": emp_id
    }
    p_res = client.post("/api/v1/projects", json=proj_payload, headers=headers)
    assert p_res.status_code == 200
    p_data = p_res.json()
    assert p_data["status"] == "SUCCESS"
    project_id = p_data["id"]

    # Verify project in list
    projs = client.get("/api/v1/projects", headers=headers).json()
    assert any(p["id"] == project_id for p in projs)

    # Add task to project
    task_payload = {
        "title": "Collect 26AS and GSTR-2B",
        "description": "Gather Form 26AS and 2B for reconciliation",
        "priority": "HIGH",
        "assigned_to_employee_id": emp_id,
        "status": "TODO"
    }
    t_res = client.post(f"/api/v1/projects/{project_id}/tasks", json=task_payload, headers=headers)
    assert t_res.status_code == 200
    t_data = t_res.json()
    task_id = t_data["id"]

    # Update task status
    ts_res = client.put(f"/api/v1/tasks/{task_id}/status?status_in=COMPLETED", headers=headers)
    assert ts_res.status_code == 200
    ts_data = ts_res.json()
    assert ts_data["status"] == "SUCCESS"

    # Schedule meeting
    m_payload = {
        "title": "Audit Kickoff Meeting",
        "meeting_type": "CLIENT_CONSULTATION",
        "scheduled_time": "2026-11-25T11:00:00",
        "duration_minutes": 45,
        "agenda": "Review timeline and document checklist",
        "discussion_notes": "Client agreed to provide bank statements by Friday."
    }
    m_res = client.post("/api/v1/meetings", json=m_payload, headers=headers)
    assert m_res.status_code == 200
    m_data = m_res.json()
    meeting_id = m_data["id"]

    # Generate AI summary
    sum_res = client.post(f"/api/v1/meetings/{meeting_id}/generate-summary", headers=headers)
    assert sum_res.status_code == 200
    sum_data = sum_res.json()
    assert sum_data["ai_summary"] is not None


def test_business_scan_lifecycle():
    token = get_admin_token()
    headers = {"Authorization": f"Bearer {token}"}

    # Create scan
    res = client.post("/api/v1/business-scan/create", json={"company_name": "Zenith Retail Solutions"}, headers=headers)
    assert res.status_code == 200
    res_data = res.json()
    assert res_data["status"] == "SUCCESS"
    scan_id = res_data["id"]
    share_token = res_data["shareable_token"]

    # Fetch scan by token (public link)
    pub_res = client.get(f"/api/v1/business-scan/details/{share_token}")
    assert pub_res.status_code == 200
    pub_data = pub_res.json()
    assert pub_data["scan"]["company_name"] == "Zenith Retail Solutions"

    # Answer a question
    ans_payload = {
        "question_key": "fin_cfo",
        "answer_text": "We have an outsourced team.",
        "score_impact": 7.0,
        "notes": "Reviewed by accountant."
    }
    ans_res = client.post(f"/api/v1/business-scan/details/{scan_id}/answer", json=ans_payload)
    assert ans_res.status_code == 200

    # Calculate scores
    calc_res = client.post(f"/api/v1/business-scan/details/{scan_id}/calculate-scores", headers=headers)
    assert calc_res.status_code == 200
    scores = calc_res.json()
    assert "overall_health_score" in scores
    assert "scores" in scores


def test_settings_manager_endpoints():
    token = get_admin_token()
    headers = {"Authorization": f"Bearer {token}"}

    # Get settings
    res = client.get("/api/v1/settings", headers=headers)
    assert res.status_code == 200
    settings = res.json()
    assert "smtp" in settings
    assert "whatsapp" in settings
    assert "storage" in settings

    # Update settings
    up_res = client.put("/api/v1/settings", json={"settings": {"STORAGE_DESKTOP_PATH": "~/Desktop"}}, headers=headers)
    assert up_res.status_code == 200

    # Test SMTP (should return real diagnostic without crashing)
    smtp_res = client.post("/api/v1/settings/test-smtp", json={"test_email": "test@example.com"}, headers=headers)
    assert smtp_res.status_code == 200
    assert "status" in smtp_res.json()

    # Test WhatsApp (should return real diagnostic)
    wa_res = client.post("/api/v1/settings/test-whatsapp", headers=headers)
    assert wa_res.status_code == 200
    assert "status" in wa_res.json()
