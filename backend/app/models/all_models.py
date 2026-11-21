from datetime import datetime, date
from sqlalchemy import Column, Integer, String, Float, Boolean, Date, DateTime, Text, ForeignKey, Numeric
from sqlalchemy.orm import relationship
from app.core.database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    full_name = Column(String(255), nullable=False)
    role = Column(String(50), default="employee", nullable=False) # admin, employee, manager, accountant
    department = Column(String(100), default="Operations")
    is_active = Column(Boolean, default=True)
    must_change_password = Column(Boolean, default=False)
    reset_token = Column(String(255), nullable=True)
    reset_token_expires_at = Column(DateTime, nullable=True)
    last_login_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    employee = relationship("Employee", back_populates="user", uselist=False)
    audit_logs = relationship("AuditLog", back_populates="user")
    notifications = relationship("Notification", back_populates="user")

class Employee(Base):
    __tablename__ = "employees"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    employee_code = Column(String(50), unique=True, index=True, nullable=False)
    first_name = Column(String(100), nullable=False)
    last_name = Column(String(100), nullable=False)
    email = Column(String(255), unique=True, nullable=False)
    phone = Column(String(20), nullable=True)
    department = Column(String(100), nullable=False)
    designation = Column(String(100), nullable=False)
    joining_date = Column(Date, default=date.today)
    salary = Column(Float, default=0.0)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="employee")
    attendances = relationship("Attendance", back_populates="employee")
    expenses = relationship("Expense", back_populates="employee")
    tasks = relationship("Task", back_populates="assigned_employee")

class Vendor(Base):
    __tablename__ = "vendors"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), index=True, nullable=False)
    gstin = Column(String(15), unique=True, index=True, nullable=False)
    pan = Column(String(10), index=True, nullable=True)
    email = Column(String(255), nullable=True)
    phone = Column(String(20), nullable=True)
    address = Column(Text, nullable=True)
    state = Column(String(100), nullable=True)
    state_code = Column(String(5), nullable=True)
    bank_name = Column(String(100), nullable=True)
    account_number = Column(String(50), nullable=True)
    ifsc_code = Column(String(20), nullable=True)
    payment_terms_days = Column(Integer, default=30)
    outstanding_balance = Column(Float, default=0.0)
    created_at = Column(DateTime, default=datetime.utcnow)

    invoices = relationship("Invoice", foreign_keys="Invoice.vendor_id", back_populates="vendor")
    purchases = relationship("Purchase", back_populates="vendor")

class Customer(Base):
    __tablename__ = "customers"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), index=True, nullable=False)
    trade_name = Column(String(255), nullable=True)
    gstin = Column(String(15), unique=True, index=True, nullable=True)
    pan = Column(String(10), index=True, nullable=True)
    tan = Column(String(15), index=True, nullable=True)
    email = Column(String(255), nullable=True)
    phone = Column(String(20), nullable=True)
    address = Column(Text, nullable=True)
    state = Column(String(100), nullable=True)
    state_code = Column(String(5), nullable=True)
    credit_limit = Column(Float, default=100000.0)
    outstanding_balance = Column(Float, default=0.0)
    folder_name = Column(String(255), nullable=True)
    gst_username = Column(String(100), nullable=True)
    gst_password_enc = Column(Text, nullable=True)
    it_username = Column(String(100), nullable=True)
    it_password_enc = Column(Text, nullable=True)
    tds_username = Column(String(100), nullable=True)
    tds_password_enc = Column(Text, nullable=True)
    compliance_status = Column(String(50), default="ACTIVE")
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    invoices = relationship("Invoice", foreign_keys="Invoice.customer_id", back_populates="customer")
    sales = relationship("Sale", back_populates="customer")

class BankAccount(Base):
    __tablename__ = "bank_accounts"

    id = Column(Integer, primary_key=True, index=True)
    bank_name = Column(String(100), nullable=False)
    account_number = Column(String(50), unique=True, index=True, nullable=False)
    account_type = Column(String(50), default="Current") # Current, Savings, Overdraft
    ifsc_code = Column(String(20), nullable=False)
    branch = Column(String(100), nullable=True)
    opening_balance = Column(Float, default=0.0)
    current_balance = Column(Float, default=0.0)
    currency = Column(String(10), default="INR")
    created_at = Column(DateTime, default=datetime.utcnow)

    transactions = relationship("BankTransaction", back_populates="bank_account")
    payments = relationship("Payment", back_populates="bank_account")

class Invoice(Base):
    __tablename__ = "invoices"

    id = Column(Integer, primary_key=True, index=True)
    invoice_number = Column(String(100), index=True, nullable=False)
    invoice_type = Column(String(20), nullable=False) # PURCHASE or SALES
    vendor_id = Column(Integer, ForeignKey("vendors.id"), nullable=True)
    customer_id = Column(Integer, ForeignKey("customers.id"), nullable=True)
    invoice_date = Column(Date, nullable=False)
    due_date = Column(Date, nullable=True)
    taxable_amount = Column(Float, default=0.0, nullable=False)
    cgst_amount = Column(Float, default=0.0)
    sgst_amount = Column(Float, default=0.0)
    igst_amount = Column(Float, default=0.0)
    total_tax = Column(Float, default=0.0)
    total_amount = Column(Float, default=0.0, nullable=False)
    tds_deducted = Column(Float, default=0.0)
    paid_amount = Column(Float, default=0.0)
    balance_due = Column(Float, default=0.0)
    status = Column(String(30), default="UNPAID") # UNPAID, PARTIAL, PAID, CANCELLED
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    vendor = relationship("Vendor", foreign_keys=[vendor_id], back_populates="invoices")
    customer = relationship("Customer", foreign_keys=[customer_id], back_populates="invoices")
    purchases = relationship("Purchase", back_populates="invoice")
    sales = relationship("Sale", back_populates="invoice")
    payments = relationship("Payment", back_populates="invoice")

class Purchase(Base):
    __tablename__ = "purchases"

    id = Column(Integer, primary_key=True, index=True)
    invoice_id = Column(Integer, ForeignKey("invoices.id"), nullable=True)
    vendor_id = Column(Integer, ForeignKey("vendors.id"), nullable=False)
    po_number = Column(String(100), nullable=True)
    item_description = Column(Text, nullable=True)
    invoice_date = Column(Date, nullable=False)
    taxable_value = Column(Float, default=0.0)
    cgst = Column(Float, default=0.0)
    sgst = Column(Float, default=0.0)
    igst = Column(Float, default=0.0)
    total_value = Column(Float, default=0.0)
    itc_eligible = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    invoice = relationship("Invoice", back_populates="purchases")
    vendor = relationship("Vendor", back_populates="purchases")

class Sale(Base):
    __tablename__ = "sales"

    id = Column(Integer, primary_key=True, index=True)
    invoice_id = Column(Integer, ForeignKey("invoices.id"), nullable=True)
    customer_id = Column(Integer, ForeignKey("customers.id"), nullable=False)
    so_number = Column(String(100), nullable=True)
    item_description = Column(Text, nullable=True)
    invoice_date = Column(Date, nullable=False)
    taxable_value = Column(Float, default=0.0)
    cgst = Column(Float, default=0.0)
    sgst = Column(Float, default=0.0)
    igst = Column(Float, default=0.0)
    total_value = Column(Float, default=0.0)
    created_at = Column(DateTime, default=datetime.utcnow)

    invoice = relationship("Invoice", back_populates="sales")
    customer = relationship("Customer", back_populates="sales")

class Payment(Base):
    __tablename__ = "payments"

    id = Column(Integer, primary_key=True, index=True)
    payment_number = Column(String(100), unique=True, index=True, nullable=False)
    payment_type = Column(String(20), nullable=False) # PAYMENT (vendor) or RECEIPT (customer)
    entity_type = Column(String(20), nullable=False) # VENDOR or CUSTOMER
    entity_id = Column(Integer, nullable=False)
    entity_name = Column(String(255), nullable=False)
    invoice_id = Column(Integer, ForeignKey("invoices.id"), nullable=True)
    payment_date = Column(Date, nullable=False)
    amount = Column(Float, nullable=False)
    payment_mode = Column(String(50), default="NEFT") # NEFT, RTGS, UPI, CHEQUE, CASH
    reference_number = Column(String(100), index=True, nullable=True)
    bank_account_id = Column(Integer, ForeignKey("bank_accounts.id"), nullable=False)
    status = Column(String(30), default="COMPLETED")
    created_at = Column(DateTime, default=datetime.utcnow)

    invoice = relationship("Invoice", back_populates="payments")
    bank_account = relationship("BankAccount", back_populates="payments")

class BankTransaction(Base):
    __tablename__ = "bank_transactions"

    id = Column(Integer, primary_key=True, index=True)
    bank_account_id = Column(Integer, ForeignKey("bank_accounts.id"), nullable=False)
    transaction_date = Column(Date, nullable=False)
    value_date = Column(Date, nullable=True)
    description = Column(Text, nullable=False)
    reference_number = Column(String(100), index=True, nullable=True)
    debit_amount = Column(Float, default=0.0) # Withdrawals
    credit_amount = Column(Float, default=0.0) # Deposits
    balance_after = Column(Float, default=0.0)
    category = Column(String(50), default="UNCATEGORIZED") # VENDOR_PAYMENT, CUSTOMER_RECEIPT, BANK_CHARGES, INTEREST, SALARY, TAX, UNCATEGORIZED
    reconciliation_status = Column(String(30), default="UNMATCHED") # MATCHED, UNMATCHED, SUSPICIOUS, MANUAL_MATCHED
    matched_payment_id = Column(Integer, ForeignKey("payments.id"), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    bank_account = relationship("BankAccount", back_populates="transactions")

class GSTRecord(Base):
    __tablename__ = "gst_records"

    id = Column(Integer, primary_key=True, index=True)
    record_type = Column(String(50), index=True, nullable=False) # PURCHASE_REGISTER, GSTR2B, GSTR1
    gstin_supplier = Column(String(15), index=True, nullable=False)
    supplier_name = Column(String(255), nullable=True)
    invoice_number = Column(String(100), index=True, nullable=False)
    invoice_date = Column(Date, nullable=False)
    invoice_type = Column(String(50), default="Regular")
    taxable_value = Column(Float, default=0.0)
    cgst = Column(Float, default=0.0)
    sgst = Column(Float, default=0.0)
    igst = Column(Float, default=0.0)
    total_tax = Column(Float, default=0.0)
    invoice_value = Column(Float, default=0.0)
    itc_availability = Column(String(20), default="YES") # YES, NO, INELIGIBLE
    financial_year = Column(String(10), default="2026-27")
    return_period = Column(String(20), default="112026") # MMYYYY
    match_status = Column(String(50), default="UNPROCESSED") # FULLY_MATCHED, PARTIALLY_MATCHED, MISSING_IN_BOOKS, MISSING_IN_GSTR2B, TAX_MISMATCH, DUPLICATE, INVOICE_NUM_MISMATCH
    difference_amount = Column(Float, default=0.0)
    remarks = Column(Text, nullable=True)
    verified_by_user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    verified_at = Column(DateTime, nullable=True)
    job_id = Column(Integer, ForeignKey("reconciliation_jobs.id"), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

class TDSRecord(Base):
    __tablename__ = "tds_records"

    id = Column(Integer, primary_key=True, index=True)
    record_type = Column(String(10), default="TDS") # TDS or TCS
    section = Column(String(20), index=True, nullable=False) # 194C, 194J, 194I, 194Q, 206C_TCS
    entity_type = Column(String(20), default="VENDOR") # VENDOR, CUSTOMER, CONTRACTOR
    entity_name = Column(String(255), nullable=False)
    entity_pan = Column(String(10), index=True, nullable=False)
    invoice_number = Column(String(100), nullable=True)
    transaction_date = Column(Date, nullable=False)
    base_amount = Column(Float, default=0.0, nullable=False)
    applicable_rate = Column(Float, default=0.0, nullable=False) # Percentage e.g. 1.0, 2.0, 10.0
    expected_tds = Column(Float, default=0.0, nullable=False)
    actual_deducted = Column(Float, default=0.0, nullable=False)
    deduction_date = Column(Date, nullable=True)
    deposit_due_date = Column(Date, nullable=True) # Usually 7th of subsequent month
    deposit_date = Column(Date, nullable=True)
    challan_bsr_code = Column(String(20), nullable=True)
    challan_no = Column(String(50), nullable=True)
    challan_date = Column(Date, nullable=True)
    status = Column(String(30), default="VERIFIED") # VERIFIED, SHORT_DEDUCTED, LATE_DEPOSIT, DEPOSITED, FILING_READY
    quarter = Column(String(10), default="Q3") # Q1, Q2, Q3, Q4
    financial_year = Column(String(10), default="2026-27")
    remarks = Column(Text, nullable=True)
    verified_by_user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

class ReconciliationJob(Base):
    __tablename__ = "reconciliation_jobs"

    id = Column(Integer, primary_key=True, index=True)
    job_type = Column(String(50), index=True, nullable=False) # GST, BANK, VENDOR, CUSTOMER
    title = Column(String(255), nullable=False)
    status = Column(String(30), default="COMPLETED") # PROCESSING, COMPLETED, FAILED
    total_records_a = Column(Integer, default=0)
    total_records_b = Column(Integer, default=0)
    matched_count = Column(Integer, default=0)
    mismatched_count = Column(Integer, default=0)
    missing_count = Column(Integer, default=0)
    discrepancy_total = Column(Float, default=0.0)
    created_by = Column(String(100), default="System")
    created_at = Column(DateTime, default=datetime.utcnow)
    completed_at = Column(DateTime, default=datetime.utcnow)
    summary_json = Column(Text, nullable=True)

    results = relationship("ReconciliationResult", back_populates="job")

class ReconciliationResult(Base):
    __tablename__ = "reconciliation_results"

    id = Column(Integer, primary_key=True, index=True)
    job_id = Column(Integer, ForeignKey("reconciliation_jobs.id"), nullable=False)
    entity_type = Column(String(50), nullable=False) # GST, BANK, VENDOR, CUSTOMER
    record_id_a = Column(String(100), nullable=True)
    record_id_b = Column(String(100), nullable=True)
    match_type = Column(String(50), nullable=False) # FULLY_MATCHED, PARTIALLY_MATCHED, MISSING_IN_A, MISSING_IN_B, DISCREPANCY
    confidence_score = Column(Float, default=1.0)
    difference_amount = Column(Float, default=0.0)
    details_json = Column(Text, nullable=True)
    is_manually_verified = Column(Boolean, default=False)
    verified_by = Column(String(100), nullable=True)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    job = relationship("ReconciliationJob", back_populates="results")

class Attendance(Base):
    __tablename__ = "attendances"

    id = Column(Integer, primary_key=True, index=True)
    employee_id = Column(Integer, ForeignKey("employees.id"), nullable=False)
    date = Column(Date, nullable=False)
    status = Column(String(20), default="PRESENT") # PRESENT, ABSENT, HALF_DAY, ON_LEAVE
    check_in = Column(String(10), nullable=True) # e.g. "09:15 AM"
    check_out = Column(String(10), nullable=True) # e.g. "06:30 PM"
    total_hours = Column(Float, default=8.0)
    leave_type = Column(String(50), nullable=True) # CASUAL, SICK, PAID, UNPAID
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    employee = relationship("Employee", back_populates="attendances")

class Expense(Base):
    __tablename__ = "expenses"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(255), nullable=False)
    category = Column(String(50), nullable=False) # OFFICE_SUPPLIES, TRAVEL, UTILITIES, SOFTWARE, MARKETING, REPAIRS, MEALS, MISC
    amount = Column(Float, nullable=False)
    expense_date = Column(Date, nullable=False)
    employee_id = Column(Integer, ForeignKey("employees.id"), nullable=False)
    receipt_url = Column(String(255), nullable=True)
    status = Column(String(30), default="PENDING") # PENDING, APPROVED, REJECTED, REIMBURSED
    approved_by = Column(String(100), nullable=True)
    approved_at = Column(DateTime, nullable=True)
    remarks = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    employee = relationship("Employee", back_populates="expenses")

class Task(Base):
    __tablename__ = "tasks"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    assigned_to_employee_id = Column(Integer, ForeignKey("employees.id"), nullable=False)
    created_by_user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    priority = Column(String(20), default="MEDIUM") # LOW, MEDIUM, HIGH, URGENT
    status = Column(String(30), default="TODO") # TODO, IN_PROGRESS, REVIEW, COMPLETED
    due_date = Column(Date, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    assigned_employee = relationship("Employee", back_populates="tasks")

class Document(Base):
    __tablename__ = "documents"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(255), nullable=False)
    document_category = Column(String(50), nullable=False) # INVOICE, CONTRACT, TAX_RECORD, BANK_STATEMENT, POLICY, EMPLOYEE_DOC, MISC
    file_path = Column(String(255), nullable=False)
    file_size = Column(Integer, default=0) # in bytes
    mime_type = Column(String(100), default="application/pdf")
    uploaded_by_user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    access_role = Column(String(50), default="ALL") # ALL, ACCOUNTANT, MANAGER, ADMIN
    tags = Column(String(255), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

class ExcelWorkflowTemplate(Base):
    __tablename__ = "excel_workflow_templates"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    workflow_type = Column(String(50), nullable=False) # CLEANING, RECONCILIATION, MERGE, SHEET_COMPARE
    configuration_json = Column(Text, nullable=False) # Rules: deduplicate, normalize_dates, fillna, etc.
    created_by_user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    is_reusable = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)

class MISReport(Base):
    __tablename__ = "mis_reports"

    id = Column(Integer, primary_key=True, index=True)
    report_type = Column(String(50), nullable=False) # FINANCIAL_SUMMARY, PROFIT_LOSS, CASH_FLOW, GST_MIS, TDS_MIS, RECONCILIATION_STATUS, EXECUTIVE_DASHBOARD
    period_type = Column(String(30), default="MONTHLY") # DAILY, WEEKLY, MONTHLY, CUSTOM
    start_date = Column(Date, nullable=False)
    end_date = Column(Date, nullable=False)
    metrics_json = Column(Text, nullable=False)
    generated_by_user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    user_email = Column(String(255), nullable=False)
    action = Column(String(100), nullable=False) # LOGIN, UPLOAD_GST, APPROVE_RECONCILIATION, EXPORT_MIS, CREATE_INVOICE, etc.
    entity_type = Column(String(50), nullable=True)
    entity_id = Column(String(100), nullable=True)
    ip_address = Column(String(50), default="127.0.0.1")
    details_json = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="audit_logs")

class Notification(Base):
    __tablename__ = "notifications"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    title = Column(String(255), nullable=False)
    message = Column(Text, nullable=False)
    notification_type = Column(String(30), default="INFO") # INFO, WARNING, APPROVAL_REQUEST, ALERT, SUCCESS
    is_read = Column(Boolean, default=False)
    link_url = Column(String(255), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="notifications")

class StatutoryNotice(Base):
    __tablename__ = "statutory_notices"

    id = Column(Integer, primary_key=True, index=True)
    notice_number = Column(String(100), unique=True, index=True, nullable=False)
    notice_type = Column(String(50), nullable=False) # INCOME_TAX, GST, ROC, PF_ESIC, OTHER
    section = Column(String(100), nullable=False) # e.g., 143(1), 148, 142(1), DRC-01, ASMT-10, GSTR-3A
    client_name = Column(String(255), nullable=False)
    client_pan_gstin = Column(String(50), nullable=False)
    assessment_year = Column(String(20), default="2026-27")
    financial_year = Column(String(20), default="2025-26")
    issue_date = Column(Date, nullable=False)
    due_date = Column(Date, nullable=False)
    risk_level = Column(String(20), default="MEDIUM") # LOW, MEDIUM, HIGH, CRITICAL
    assigned_owner = Column(String(100), default="Biraju Bhai (Birju Sir)") # e.g. Biraju Bhai
    status = Column(String(50), default="RECEIVED") # RECEIVED, UNDER_REVIEW, DRAFTING_REPLY, FILED, CLOSED
    demand_amount = Column(Float, default=0.0)
    penalty_amount = Column(Float, default=0.0)
    description = Column(Text, nullable=True)
    response_notes = Column(Text, nullable=True)
    checklist_json = Column(Text, nullable=True) # JSON checklist items
    attachments_json = Column(Text, nullable=True) # list of doc names/urls
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

class GSTRDispatchLog(Base):
    __tablename__ = "gstr_dispatch_logs"

    id = Column(Integer, primary_key=True, index=True)
    client_name = Column(String(255), nullable=False)
    gstin = Column(String(15), index=True, nullable=False)
    return_type = Column(String(20), nullable=False) # GSTR1, GSTR2B, GSTR3B
    tax_period = Column(String(20), nullable=False) # e.g. 102026, Q3-2026
    file_name = Column(String(255), nullable=False)
    recipient_email = Column(String(255), nullable=True)
    status = Column(String(30), default="SENT") # SENT, FAILED, MISSING_EMAIL
    error_message = Column(Text, nullable=True)
    sent_at = Column(DateTime, default=datetime.utcnow)
    dispatched_by_user_email = Column(String(255), default="system@smartfin.ai")

class GSTFilingReview(Base):
    __tablename__ = "gst_filing_reviews"

    id = Column(Integer, primary_key=True, index=True)
    client_name = Column(String(255), nullable=False)
    gstin = Column(String(15), index=True, nullable=False)
    return_type = Column(String(20), nullable=False) # GSTR1, GSTR3B
    tax_period = Column(String(20), nullable=False)
    total_taxable_value = Column(Float, default=0.0)
    total_tax = Column(Float, default=0.0)
    checks_summary_json = Column(Text, nullable=False)
    discrepancies_count = Column(Integer, default=0)
    status = Column(String(50), default="PENDING_APPROVAL") # PENDING_APPROVAL, APPROVED_FILED, REJECTED
    approved_by_user_email = Column(String(255), nullable=True)
    approved_at = Column(DateTime, nullable=True)
    filing_ack_ref = Column(String(100), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

class ITRCollectionCase(Base):
    __tablename__ = "itr_collection_cases"

    id = Column(Integer, primary_key=True, index=True)
    client_name = Column(String(255), nullable=False)
    pan = Column(String(10), index=True, nullable=False)
    email = Column(String(255), nullable=True)
    phone = Column(String(20), nullable=True)
    assessment_year = Column(String(20), default="2026-27")
    income_profile = Column(String(50), default="SALARIED") # SALARIED, BUSINESS_PROFESSION, CAPITAL_GAINS_INVESTOR, NRI_FOREIGN, COMPREHENSIVE
    checklist_items_json = Column(Text, nullable=False)
    completion_percentage = Column(Float, default=0.0)
    status = Column(String(50), default="INTAKE_OPEN") # INTAKE_OPEN, DOCUMENTS_PARTIAL, READY_FOR_PREPARATION, FILED, CLOSED
    last_reminder_sent_at = Column(DateTime, nullable=True)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

class ITRArchivePackage(Base):
    __tablename__ = "itr_archive_packages"

    id = Column(Integer, primary_key=True, index=True)
    client_name = Column(String(255), nullable=False)
    pan = Column(String(10), index=True, nullable=False)
    client_email = Column(String(255), nullable=True)
    client_phone = Column(String(20), nullable=True)
    covered_years_json = Column(Text, nullable=False) # e.g. ["AY 2024-25", "AY 2025-26", "AY 2026-27"]
    missing_years_json = Column(Text, nullable=True)
    folder_path = Column(String(255), nullable=True)
    delivery_channel = Column(String(30), default="BOTH") # EMAIL, WHATSAPP, BOTH
    delivery_status = Column(String(30), default="ORGANIZED") # ORGANIZED, DISPATCHED, FAILED
    dispatched_at = Column(DateTime, nullable=True)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

class CapitalGainRecord(Base):
    __tablename__ = "capital_gain_records"

    id = Column(Integer, primary_key=True, index=True)
    client_name = Column(String(255), nullable=False)
    pan = Column(String(10), index=True, nullable=False)
    assessment_year = Column(String(20), default="2026-27")
    asset_type = Column(String(50), nullable=False) # EQUITY_LISTED, EQUITY_MUTUAL_FUNDS, DEBT_MUTUAL_FUNDS, IMMOVABLE_PROPERTY, UNLISTED_SHARES, GOLD_OTHER
    asset_description = Column(String(255), nullable=False)
    purchase_date = Column(Date, nullable=False)
    sale_date = Column(Date, nullable=False)
    holding_period_months = Column(Float, default=0.0)
    gain_type = Column(String(10), default="LTCG") # STCG, LTCG
    sale_consideration = Column(Float, default=0.0)
    cost_of_acquisition = Column(Float, default=0.0)
    indexed_cost_of_acquisition = Column(Float, default=0.0)
    transfer_expenses = Column(Float, default=0.0)
    exemption_section = Column(String(50), default="NONE") # SEC_54, SEC_54EC, SEC_54F, NONE
    exemption_amount = Column(Float, default=0.0)
    net_taxable_gain = Column(Float, default=0.0)
    applicable_tax_rate = Column(Float, default=12.5) # e.g. 12.5%, 20%, slab
    tax_payable = Column(Float, default=0.0)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

class DailyOfficeSummary(Base):
    __tablename__ = "daily_office_summaries"

    id = Column(Integer, primary_key=True, index=True)
    summary_date = Column(Date, default=date.today)
    team_name = Column(String(100), default="Team PMSC")
    raw_update_count = Column(Integer, default=0)
    filtered_noise_count = Column(Integer, default=0)
    key_decisions_json = Column(Text, nullable=False)
    action_items_json = Column(Text, nullable=False)
    blockers_json = Column(Text, nullable=False)
    formatted_whatsapp_text = Column(Text, nullable=False)
    dispatch_status = Column(String(30), default="GENERATED") # GENERATED, POSTED_TO_PMSC, FAILED
    posted_at = Column(DateTime, nullable=True)
    created_by_user_email = Column(String(255), default="admin@smartfin.ai")
    unread_messages_json = Column(Text, nullable=True) # JSON snapshot of unread messages included in digest
    created_at = Column(DateTime, default=datetime.utcnow)

class WhatsAppIncomingMessage(Base):
    __tablename__ = "whatsapp_incoming_messages"

    id = Column(Integer, primary_key=True, index=True)
    message_id = Column(String(100), unique=True, index=True, nullable=False)
    chat_jid = Column(String(100), index=True, nullable=False)
    chat_name = Column(String(255), nullable=True)
    sender_jid = Column(String(100), nullable=True)
    sender_name = Column(String(255), nullable=True)
    message_text = Column(Text, nullable=False)
    message_timestamp = Column(DateTime, nullable=False, default=datetime.utcnow)
    is_group = Column(Boolean, default=False)
    is_read = Column(Boolean, default=False, index=True)
    has_attachment = Column(Boolean, default=False)
    attachment_path = Column(String(500), nullable=True)
    reviewed_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

class ClientReportSubmission(Base):
    __tablename__ = "client_report_submissions"

    id = Column(Integer, primary_key=True, index=True)
    client_name = Column(String(255), nullable=False, index=True)
    gstin_or_pan = Column(String(50), nullable=True)
    phone = Column(String(50), nullable=True)
    report_type = Column(String(50), default="TDS_GST_REPORT")
    period = Column(String(20), default="CURRENT")
    file_path = Column(String(500), nullable=True)
    status = Column(String(30), default="RECEIVED") # RECEIVED, PENDING, REMINDER_SENT
    received_at = Column(DateTime, default=datetime.utcnow)
    reminder_sent_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

class AIUsageMetric(Base):
    __tablename__ = "ai_usage_metrics"

    id = Column(Integer, primary_key=True, index=True)
    user_email = Column(String(255), nullable=False)
    user_role = Column(String(50), default="employee")
    module_name = Column(String(100), nullable=False) # NOTICE_MANAGER, GST_AGENT, FINANCE_ASSISTANT, ITR_BOT, CONSULTING_GEN, SALARY_TOOL
    interaction_type = Column(String(50), default="QUERY") # QUERY, DRAFT, VERIFICATION, CALCULATION
    prompt_tokens = Column(Integer, default=0)
    completion_tokens = Column(Integer, default=0)
    estimated_time_saved_mins = Column(Float, default=15.0)
    cost_usd = Column(Float, default=0.002)
    error_flag = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)

class PublicClientInquiry(Base):
    __tablename__ = "public_client_inquiries"

    id = Column(Integer, primary_key=True, index=True)
    full_name = Column(String(255), nullable=False)
    entity_name = Column(String(255), nullable=True)
    service_type = Column(String(100), nullable=False) # PMS_WEALTH, TAX_LITIGATION, AR_COLLECTIONS, VIRTUAL_CFO, GENERAL_CONSULTING
    email = Column(String(255), nullable=False)
    phone = Column(String(50), nullable=False)
    message = Column(Text, nullable=True)
    status = Column(String(50), default="NEW") # NEW, CONTACTED, CONVERTED, CLOSED
    client_ip = Column(String(100), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
