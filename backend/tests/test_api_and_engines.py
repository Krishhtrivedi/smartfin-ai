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
