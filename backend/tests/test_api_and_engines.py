import pytest
from fastapi.testclient import TestClient
from datetime import date, datetime
import pandas as pd
import io

from app.main import app
from app.core.database import SessionLocal, Base, engine
from app.seed.seed_data import seed_database
from app.models.all_models import (
    User, Vendor, Customer, BankAccount, Invoice, Purchase, Sale,
    BankTransaction, GSTRecord, TDSRecord, Expense, Task, Attendance, Payment
)
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
    assert response.json()["system"] == "SMARTFIN.AI"

def test_auth_login_admin():
    response = client.post("/api/v1/auth/login", json={
        "email": "pinal@smartfin.ai",
        "password": "SmartFin@2026!"
    })
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert data["user"]["role"] == "admin"
    assert data["user"]["email"] == "pinal@smartfin.ai"

def test_auth_login_invalid_password():
    response = client.post("/api/v1/auth/login", json={
        "email": "pinal@smartfin.ai",
        "password": "wrongpassword99"
    })
    assert response.status_code == 401
    assert "Invalid email or password." in response.json()["detail"]

def test_dashboard_summary_empty_state_zero():
    # Login to get admin token
    login_res = client.post("/api/v1/auth/login", json={
        "email": "pinal@smartfin.ai",
        "password": "SmartFin@2026!"
    })
    token = login_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    res = client.get("/api/v1/dashboard/summary", headers=headers)
    assert res.status_code == 200
    data = res.json()
    assert "kpis" in data
    # All entries must start at 0
    assert data["kpis"]["total_sales"] == 0
    assert data["kpis"]["total_purchases"] == 0
    assert data["kpis"]["total_bank_balance"] == 0
    assert data["kpis"]["vendor_outstanding"] == 0
    assert data["kpis"]["customer_outstanding"] == 0
    assert data["kpis"]["net_profit"] == 0
    assert len(data["monthly_trends"]) == 0
    assert len(data["expense_breakdown"]) == 0

def test_add_vendor_and_purchase_invoice_updates_dashboard():
    login_res = client.post("/api/v1/auth/login", json={
        "email": "pinal@smartfin.ai",
        "password": "SmartFin@2026!"
    })
    headers = {"Authorization": f"Bearer {login_res.json()['access_token']}"}

    # 1. Register a real vendor
    v_res = client.post("/api/v1/vendors/create", headers=headers, json={
        "name": "Live Hardware Solutions Ltd",
        "gstin": "24AABCL8899K1Z2",
        "pan": "AABCL8899K",
        "email": "orders@livehardware.in",
        "phone": "+91 98200 44551",
        "state": "Gujarat",
        "state_code": "24",
        "payment_terms_days": 30,
        "outstanding_balance": 0.0
    })
    assert v_res.status_code == 200
    vendor_id = v_res.json()["id"]

    # 2. Record a real purchase invoice for this vendor
    inv_res = client.post(f"/api/v1/vendors/{vendor_id}/invoices", headers=headers, json={
        "invoice_number": "LHS-INV-1001",
        "invoice_type": "PURCHASE",
        "invoice_date": "2026-11-18",
        "taxable_amount": 50000.0,
        "cgst_amount": 4500.0,
        "sgst_amount": 4500.0,
        "igst_amount": 0.0,
        "total_tax": 9000.0,
        "total_amount": 59000.0,
        "balance_due": 59000.0,
        "status": "UNPAID"
    })
    assert inv_res.status_code == 200

    # 3. Check dashboard reflects the real recorded purchase
    dash = client.get("/api/v1/dashboard/summary", headers=headers).json()
    assert dash["kpis"]["total_purchases"] == 50000.0
    assert dash["kpis"]["vendor_outstanding"] == 59000.0

    # 4. Cleanup so DB remains clean at 0
    db = SessionLocal()
    db.query(Invoice).filter(Invoice.invoice_number == "LHS-INV-1001").delete()
    db.query(Vendor).filter(Vendor.id == vendor_id).delete()
    db.commit()
    db.close()

def test_add_customer_and_sales_invoice_updates_dashboard():
    login_res = client.post("/api/v1/auth/login", json={
        "email": "pinal@smartfin.ai",
        "password": "SmartFin@2026!"
    })
    headers = {"Authorization": f"Bearer {login_res.json()['access_token']}"}

    # Pre-clean any leftover test records
    db_pre = SessionLocal()
    existing_c = db_pre.query(Customer).filter(Customer.gstin == "24AABCG1122D1Z9").first()
    if existing_c:
        db_pre.query(Payment).filter(Payment.entity_type == "CUSTOMER", Payment.entity_id == existing_c.id).delete()
        db_pre.query(Invoice).filter(Invoice.customer_id == existing_c.id).delete()
        db_pre.query(Customer).filter(Customer.id == existing_c.id).delete()
        db_pre.commit()
    db_pre.close()

    # 1. Register a real customer
    c_res = client.post("/api/v1/customers/create", headers=headers, json={
        "name": "Global Retail Partners LLP",
        "gstin": "24AABCG1122D1Z9",
        "pan": "AABCG1122D",
        "email": "procurement@globalretail.in",
        "phone": "+91 98200 77881",
        "state": "Gujarat",
        "state_code": "24",
        "credit_limit": 2000000.0,
        "payment_terms_days": 45,
        "outstanding_balance": 0.0
    })
    assert c_res.status_code == 200
    customer_id = c_res.json()["id"]

    # 2. Record a real sales invoice for this customer
    inv_res = client.post(f"/api/v1/customers/{customer_id}/invoices", headers=headers, json={
        "invoice_number": "SF-SLS-2026-99",
        "invoice_type": "SALES",
        "invoice_date": "2026-11-18",
        "taxable_amount": 100000.0,
        "cgst_amount": 9000.0,
        "sgst_amount": 9000.0,
        "igst_amount": 0.0,
        "total_tax": 18000.0,
        "total_amount": 118000.0,
        "balance_due": 118000.0,
        "status": "UNPAID"
    })
    assert inv_res.status_code == 200

    # 3. Check dashboard reflects the real recorded sales revenue
    dash = client.get("/api/v1/dashboard/summary", headers=headers).json()
    assert dash["kpis"]["total_sales"] == 100000.0
    assert dash["kpis"]["customer_outstanding"] == 118000.0

    # 4. Record a customer payment receipt
    rec_res = client.post(f"/api/v1/customers/{customer_id}/receipts", headers=headers, json={
        "payment_date": "2026-11-19",
        "amount": 118000.0,
        "payment_mode": "NEFT",
        "reference_number": "UTR-TEST-2026-001",
        "invoice_id": inv_res.json()["id"]
    })
    assert rec_res.status_code == 200
    assert rec_res.json()["status"] == "SUCCESS"

    # 5. Verify customer reconciliation shows 0 outstanding and invoice PAID
    recon = client.get(f"/api/v1/customers/{customer_id}/reconcile", headers=headers).json()
    assert recon["outstanding_balance"] == 0.0
    assert recon["total_received"] == 118000.0
    assert len(recon["receipts"]) == 1

    # 6. Cleanup so DB remains clean at 0
    db = SessionLocal()
    db.query(Payment).filter(Payment.entity_type == "CUSTOMER", Payment.entity_id == customer_id).delete()
    db.query(Invoice).filter(Invoice.invoice_number == "SF-SLS-2026-99").delete()
    db.query(Customer).filter(Customer.id == customer_id).delete()
    db.commit()
    db.commit()
    db.close()

def test_add_bank_account_updates_dashboard():
    login_res = client.post("/api/v1/auth/login", json={
        "email": "pinal@smartfin.ai",
        "password": "SmartFin@2026!"
    })
    headers = {"Authorization": f"Bearer {login_res.json()['access_token']}"}

    # 1. Link a real business bank account
    b_res = client.post("/api/v1/bank/accounts", headers=headers, json={
        "bank_name": "State Bank of India",
        "account_number": "309988776655",
        "account_type": "CURRENT",
        "ifsc_code": "SBIN0001234",
        "branch": "Main Branch",
        "opening_balance": 85000.0,
        "current_balance": 85000.0,
        "currency": "INR"
    })
    assert b_res.status_code == 200
    account_id = b_res.json()["id"]

    # 2. Check dashboard reflects the liquid bank balance
    dash = client.get("/api/v1/dashboard/summary", headers=headers).json()
    assert dash["kpis"]["total_bank_balance"] == 85000.0

    # 3. Cleanup so DB remains clean at 0
    db = SessionLocal()
    db.query(BankAccount).filter(BankAccount.id == account_id).delete()
    db.commit()
    db.close()

def test_gst_reconciliation_engine():
    db = SessionLocal()
    try:
        # Create real test GST entries
        g1 = GSTRecord(
            record_type="PURCHASE_REGISTER",
            gstin_supplier="24AABB1234K1Z1",
            supplier_name="Test Supplier",
            invoice_number="GST-TEST-01",
            invoice_date=date(2026, 11, 1),
            taxable_value=10000.0,
            cgst=900.0,
            sgst=900.0,
            igst=0.0,
            total_tax=1800.0,
            return_period="112026",
            financial_year="2026-27",
            match_status="FULLY_MATCHED"
        )
        g2 = GSTRecord(
            record_type="GSTR2B",
            gstin_supplier="24AABB1234K1Z1",
            supplier_name="Test Supplier",
            invoice_number="GST-TEST-01",
            invoice_date=date(2026, 11, 1),
            taxable_value=10000.0,
            cgst=900.0,
            sgst=900.0,
            igst=0.0,
            total_tax=1800.0,
            return_period="112026",
            financial_year="2026-27",
            match_status="FULLY_MATCHED"
        )
        db.add_all([g1, g2])
        db.commit()

        engine_inst = GSTReconciliationEngine(db=db)
        res = engine_inst.reconcile(financial_year="2026-27")
        assert res["status"] == "COMPLETED"
        assert res["summary"]["fully_matched"] >= 1
    finally:
        db.query(GSTRecord).filter(GSTRecord.invoice_number == "GST-TEST-01").delete()
        db.commit()
        db.close()

def test_bank_reconciliation_engine():
    db = SessionLocal()
    try:
        acc = BankAccount(bank_name="Test BRS Bank", account_number="TESTBRS999", ifsc_code="BRS001", opening_balance=50000.0, current_balance=50000.0)
        db.add(acc)
        db.commit()
        db.refresh(acc)

        txn = BankTransaction(
            bank_account_id=acc.id,
            transaction_date=date(2026, 11, 1),
            description="HDFC BANK CHARGE",
            debit_amount=500.0,
            credit_amount=0.0
        )
        db.add(txn)
        db.commit()

        engine_inst = BankReconciliationEngine(db=db)
        res = engine_inst.reconcile(bank_account_id=acc.id)
        assert res["status"] == "COMPLETED"
        assert res["summary"]["matched_transactions_count"] >= 1
    finally:
        db.query(BankTransaction).filter(BankTransaction.description == "HDFC BANK CHARGE").delete()
        db.query(BankAccount).filter(BankAccount.account_number == "TESTBRS999").delete()
        db.commit()
        db.close()

def test_tds_engine_compliance():
    db = SessionLocal()
    try:
        tds = TDSRecord(
            section="194C",
            entity_name="Test Contractor",
            entity_pan="AABCT1234D",
            transaction_date=date(2026, 11, 1),
            base_amount=100000.0,
            applicable_rate=2.0,
            expected_tds=2000.0,
            actual_deducted=1000.0,
            status="SHORT_DEDUCTED",
            quarter="Q3",
            financial_year="2026-27"
        )
        db.add(tds)
        db.commit()

        engine_inst = TDSReconciliationEngine(db=db)
        res = engine_inst.check_compliance_and_reconcile(financial_year="2026-27")
        assert res["total_records"] >= 1
        assert res["short_deduction_count"] >= 1
        assert res["net_shortfall"] >= 1000.0
    finally:
        db.query(TDSRecord).filter(TDSRecord.section == "194C").delete()
        db.commit()
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
        assert "cash_flow" in rep
        excel_bytes = gen.generate_excel_workbook(rep)
        assert len(excel_bytes) > 500
    finally:
        db.close()

def test_ai_finance_assistant():
    db = SessionLocal()
    try:
        assistant = AIFinanceAssistant(db=db)
        res = assistant.ask("Show all pending vendor payments")
        assert "reply" in res
        assert "sources" in res
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
