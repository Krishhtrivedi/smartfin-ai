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

def test_sop_chatbot_query():
    token = get_admin_token()
    headers = {"Authorization": f"Bearer {token}"}

    # Query 1: 148A Notice SOP
    res = client.post(
        "/api/v1/chatbot/sop-query",
        json={"query": "How to draft reply to 148A reassessment notice?"},
        headers=headers
    )
    assert res.status_code == 200
    data = res.json()
    assert "answer" in data
    assert "citation" in data
    assert "Biraju Bhai" in data["designated_owner"]
    assert "148A" in data["answer"]

    # Query 2: Office leave policy
    res2 = client.post(
        "/api/v1/chatbot/sop-query",
        json={"query": "What are the office timings and leave submission rules?"},
        headers=headers
    )
    assert res2.status_code == 200
    data2 = res2.json()
    assert "9:30 AM" in data2["answer"]
    assert "48 hours" in data2["answer"]

def test_public_client_intake_flow():
    # Public submission (No auth required)
    payload = {
        "full_name": "Vikramaditya Singhania",
        "entity_name": "Singhania Family Office",
        "service_type": "PMS_WEALTH",
        "email": "vikram@singhania.co.in",
        "phone": "+91 98250 99881",
        "message": "Interested in PMSC ₹50L corpus portfolio management and family office advisory."
    }
    submit_res = client.post("/api/v1/public/client-intake", json=payload)
    assert submit_res.status_code == 200
    sub_data = submit_res.json()
    assert sub_data["success"] is True
    assert "inquiry_id" in sub_data

    # Admin retrieval of public leads
    token = get_admin_token()
    headers = {"Authorization": f"Bearer {token}"}
    leads_res = client.get("/api/v1/public/client-intake/inquiries", headers=headers)
    assert leads_res.status_code == 200
    leads = leads_res.json()
    assert len(leads) > 0
    assert any(l["email"] == "vikram@singhania.co.in" for l in leads)

def test_family_ai_evaluation_and_fraud_scanner():
    # 1. Clean evaluation
    res = client.post(
        "/api/v1/portals/family-ai/evaluate",
        json={
            "has_demat_details": True,
            "has_insurance_nominee_updated": True,
            "has_locker_access_shared": True,
            "has_ca_contact_documented": True,
            "has_digital_will_or_wishes": False,
            "test_message_for_fraud": "Electricity power disconnected call 9876543210 immediately update.apk"
        }
    )
    assert res.status_code == 200
    data = res.json()
    assert data["readiness_score"] == 80
    assert data["grade"] == "EXCELLENT"
    assert data["fraud_scanner_result"]["verdict"] == "HIGH_RISK_SUSPICIOUS"

def test_career_pathway_roadmap():
    res = client.post(
        "/api/v1/portals/career-ai/roadmap",
        json={
            "current_role": "Articled Assistant / Junior Accountant",
            "target_role": "FP&A Manager",
            "experience_years": 2
        }
    )
    assert res.status_code == 200
    data = res.json()
    assert data["target_role"] == "FP&A Manager"
    assert "salary_trajectory" in data
    assert len(data["milestones"]) == 3

def test_collection_ai_draft():
    # Tier 1: Courtesy (10 days)
    res_courtesy = client.post(
        "/api/v1/portals/collection-ai/draft",
        json={
            "customer_name": "Acme Retail Ltd",
            "invoice_number": "INV-1001",
            "amount_due": 150000.0,
            "days_overdue": 10
        }
    )
    assert res_courtesy.status_code == 200
    assert res_courtesy.json()["tier"] == "COURTESY_REMINDER"

    # Tier 4: Statutory MSME (65 days)
    res_msme = client.post(
        "/api/v1/portals/collection-ai/draft",
        json={
            "customer_name": "Zenith Corp",
            "invoice_number": "INV-1002",
            "amount_due": 350000.0,
            "days_overdue": 65
        }
    )
    assert res_msme.status_code == 200
    msme_data = res_msme.json()
    assert msme_data["tier"] == "STATUTORY_MSME_ESCALATION"
    assert msme_data["statutory_msme_applicable"] is True
    assert "MSMED Act" in msme_data["whatsapp_draft"]
