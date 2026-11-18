import pytest
from fastapi.testclient import TestClient
from datetime import date
import pandas as pd
import io

from app.main import app
from app.core.database import SessionLocal, Base, engine
from app.seed.seed_data import seed_database
from app.services.reconciliation.gst_engine import GSTReconciliationEngine
from app.services.reconciliation.bank_engine import BankReconciliationEngine
from app.services.reconciliation.tds_engine import TDSReconciliationEngine
from app.services.automation.excel_engine import ExcelAutomationEngine
from app.services.reports.mis_generator import MISReportGenerator
from app.services.ai.assistant import AIFinanceAssistant

client = TestClient(app)

@pytest.fixture(scope="session", autouse=True)
def setup_db():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    seed_database(db)
    db.close()

def test_health_check():
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json()["status"] == "healthy"

def test_auth_login_admin():
    response = client.post("/api/v1/auth/login", json={
        "email": "admin@smartfin.ai",
        "password": "admin123"
    })
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert data["user"]["role"] == "admin"

def test_auth_login_invalid_password():
    response = client.post("/api/v1/auth/login", json={
        "email": "admin@smartfin.ai",
        "password": "wrongpassword"
    })
    assert response.status_code == 401

def test_dashboard_summary():
    # Login to get token
    login_res = client.post("/api/v1/auth/login", json={
        "email": "admin@smartfin.ai",
        "password": "admin123"
    })
    token = login_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    res = client.get("/api/v1/dashboard/summary", headers=headers)
    assert res.status_code == 200
    data = res.json()
    assert "kpis" in data
    assert data["kpis"]["total_sales"] > 0
    assert data["kpis"]["total_purchases"] > 0
    assert data["kpis"]["total_bank_balance"] > 0
    assert "monthly_trends" in data
    assert "gst_status" in data

def test_gst_reconciliation_engine():
    db = SessionLocal()
    try:
        engine_inst = GSTReconciliationEngine(db=db)
        res = engine_inst.reconcile(financial_year="2026-27")
        assert res["status"] == "COMPLETED"
        assert res["summary"]["fully_matched"] >= 1
        assert res["summary"]["missing_in_gstr2b"] >= 1
        assert res["summary"]["missing_in_books"] >= 1
    finally:
        db.close()

def test_bank_reconciliation_engine():
    db = SessionLocal()
    try:
        engine_inst = BankReconciliationEngine(db=db)
        res = engine_inst.reconcile(bank_account_id=1)
        assert res["status"] == "COMPLETED"
        assert res["summary"]["matched_transactions_count"] >= 1
        assert res["summary"]["balance_as_per_bank"] > 0
        assert res["summary"]["balance_as_per_books"] > 0
    finally:
        db.close()

def test_tds_engine_compliance():
    db = SessionLocal()
    try:
        engine_inst = TDSReconciliationEngine(db=db)
        res = engine_inst.check_compliance_and_reconcile(financial_year="2026-27")
        assert res["total_records"] >= 4
        assert res["short_deduction_count"] >= 1
        assert res["late_deposit_count"] >= 1
        assert res["net_shortfall"] >= 1000.0
    finally:
        db.close()

def test_excel_automation_cleaning():
    raw_data = {
        "Invoice No": ["INV-001", "INV-002", "INV-001"], # duplicate
        "Date": ["01/11/2026", "2026-11-05", "01/11/2026"],
        "Amount": ["₹1,500.50", "(250.00)", "₹1,500.50"]
    }
    df = pd.DataFrame(raw_data)
    df_cleaned, stats = ExcelAutomationEngine.clean_and_normalize(
        df=df,
        remove_duplicates=True,
        normalize_dates=True,
        normalize_amounts=True
    )
    assert len(df_cleaned) == 2
    assert stats["duplicates_removed"] == 1
    assert df_cleaned["Amount"].iloc[0] == 1500.50
    assert df_cleaned["Amount"].iloc[1] == -250.00

def test_excel_sheet_comparison():
    df_a = pd.DataFrame({
        "Key": ["A1", "A2", "A3"],
        "Price": [100.0, 200.0, 300.0]
    })
    df_b = pd.DataFrame({
        "Key": ["A1", "A2", "A4"],
        "Price": [100.0, 250.0, 400.0]
    })
    diff_report = ExcelAutomationEngine.compare_sheets(df_a, df_b, key_column="Key")
    assert diff_report["common_records"] == 2
    assert diff_report["identical_records"] == 1
    assert diff_report["modified_records_count"] == 1
    assert diff_report["only_in_sheet_a_count"] == 1
    assert diff_report["only_in_sheet_b_count"] == 1

def test_mis_report_generator():
    db = SessionLocal()
    try:
        gen = MISReportGenerator(db=db)
        rep = gen.generate_financial_mis(start_date=date(2026, 11, 1), end_date=date(2026, 11, 30))
        assert "pnl" in rep
        assert rep["pnl"]["sales_revenue"] > 0
        assert rep["pnl"]["cost_of_purchases"] > 0
        assert "cash_flow" in rep
        # Test excel generation
        excel_bytes = gen.generate_excel_workbook(rep)
        assert len(excel_bytes) > 1000
    finally:
        db.close()

def test_ai_finance_assistant():
    db = SessionLocal()
    try:
        assistant = AIFinanceAssistant(db=db)
        # Ask about pending vendor payments
        res = assistant.ask("Show all pending vendor payments")
        assert "reply" in res
        assert "Vendor" in res["reply"] or "Invoice" in res["reply"]
        assert len(res["sources"]) > 0

        # Ask about bank transactions
        res_bank = assistant.ask("What are the unmatched bank transactions?")
        assert len(res_bank["sources"]) > 0
    finally:
        db.close()


def test_production_admin_accounts():
    for admin_email in ["pinal@smartfin.ai", "nilesh@smartfin.ai", "birju@smartfin.ai"]:
        res = client.post("/api/v1/auth/login", json={
            "email": admin_email,
            "password": "SmartFin@2026!"
        })
        assert res.status_code == 200, f"Login failed for {admin_email}"
        data = res.json()
        assert "access_token" in data
        assert data["user"]["role"] == "admin"
        assert "must_change_password" in data["user"]

def test_production_employee_account():
    res = client.post("/api/v1/auth/login", json={
        "email": "employee@smartfin.ai",
        "password": "SmartFin@2026!"
    })
    assert res.status_code == 200
    data = res.json()
    assert "access_token" in data
    assert data["user"]["role"] == "employee"

def test_rbac_employee_forbidden_admin_routes():
    # Login as employee
    emp_login = client.post("/api/v1/auth/login", json={
        "email": "employee@smartfin.ai",
        "password": "SmartFin@2026!"
    }).json()
    emp_token = emp_login["access_token"]
    headers = {"Authorization": f"Bearer {emp_token}"}

    # Admin only route: GET /api/v1/auth/users
    res_users = client.get("/api/v1/auth/users", headers=headers)
    assert res_users.status_code == 403

    # Admin only route: GET /api/v1/audit/logs
    res_audit = client.get("/api/v1/audit/logs", headers=headers)
    assert res_audit.status_code == 403

def test_employee_personal_dashboard():
    emp_login = client.post("/api/v1/auth/login", json={
        "email": "employee@smartfin.ai",
        "password": "SmartFin@2026!"
    }).json()
    headers = {"Authorization": f"Bearer {emp_login['access_token']}"}

    res = client.get("/api/v1/dashboard/employee", headers=headers)
    assert res.status_code == 200
    data = res.json()
    assert "profile" in data
    assert data["profile"]["email"] == "employee@smartfin.ai"
    assert "stats" in data
    assert "tasks" in data
    assert "expenses" in data
    assert "attendance" in data

def test_password_change_flow():
    # Login as birju
    login_res = client.post("/api/v1/auth/login", json={
        "email": "birju@smartfin.ai",
        "password": "SmartFin@2026!"
    }).json()
    headers = {"Authorization": f"Bearer {login_res['access_token']}"}

    # Change password
    change_res = client.post("/api/v1/auth/change-password", headers=headers, json={
        "old_password": "SmartFin@2026!",
        "new_password": "Birju@Secure2026#"
    })
    assert change_res.status_code == 200

    # Old password should now fail
    fail_res = client.post("/api/v1/auth/login", json={
        "email": "birju@smartfin.ai",
        "password": "SmartFin@2026!"
    })
    assert fail_res.status_code == 401

    # New password should succeed
    succ_res = client.post("/api/v1/auth/login", json={
        "email": "birju@smartfin.ai",
        "password": "Birju@Secure2026#"
    })
    assert succ_res.status_code == 200
    assert succ_res.json()["user"]["must_change_password"] is False

    # Reset back for clean testing state
    client.post("/api/v1/auth/change-password", headers={"Authorization": f"Bearer {succ_res.json()['access_token']}"}, json={
        "old_password": "Birju@Secure2026#",
        "new_password": "SmartFin@2026!"
    })

def test_forgot_and_reset_password_flow():
    # Request forgot password token
    forgot_res = client.post("/api/v1/auth/forgot-password", json={
        "email": "pinal@smartfin.ai"
    })
    assert forgot_res.status_code == 200
    token = forgot_res.json()["reset_token"]
    assert token is not None

    # Reset password using token
    reset_res = client.post("/api/v1/auth/reset-password", json={
        "email": "pinal@smartfin.ai",
        "token": token,
        "new_password": "Pinal@NewSecret2026!"
    })
    assert reset_res.status_code == 200

    # Verify login with new password
    succ_res = client.post("/api/v1/auth/login", json={
        "email": "pinal@smartfin.ai",
        "password": "Pinal@NewSecret2026!"
    })
    assert succ_res.status_code == 200

    # Reset back for consistency
    headers = {"Authorization": f"Bearer {succ_res.json()['access_token']}"}
    client.post("/api/v1/auth/change-password", headers=headers, json={
        "old_password": "Pinal@NewSecret2026!",
        "new_password": "SmartFin@2026!"
    })
