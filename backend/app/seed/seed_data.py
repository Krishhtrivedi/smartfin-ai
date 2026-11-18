from datetime import date, datetime, timedelta
from sqlalchemy.orm import Session
from app.core.database import SessionLocal, engine, Base
from app.core.security import hash_password
from app.models.all_models import (
    User, Employee, Vendor, Customer, BankAccount, Invoice, Purchase, Sale,
    Payment, BankTransaction, GSTRecord, TDSRecord, Attendance, Expense,
    Task, Document, AuditLog, Notification, ExcelWorkflowTemplate
)

def seed_database(db: Session = None):
    own_session = False
    if db is None:
        Base.metadata.create_all(bind=engine)
        db = SessionLocal()
        own_session = True

    try:
        # Check if already seeded
        if db.query(User).filter(User.email == "admin@smartfin.ai").first():
            print("Database already seeded with demo data. Skipping...")
            return

        print("Seeding SmartFin AI with realistic Enterprise Demo Data...")

        # 1. Users
        users_data = [
            User(email="admin@smartfin.ai", full_name="Rajesh Mehta (Admin)", role="admin", department="Executive", hashed_password=hash_password("admin123")),
            User(email="accountant@smartfin.ai", full_name="Priya Nair (Lead Accountant)", role="accountant", department="Finance & Accounts", hashed_password=hash_password("account123")),
            User(email="manager@smartfin.ai", full_name="Vikram Seth (Finance Manager)", role="manager", department="Financial Planning", hashed_password=hash_password("manager123")),
            User(email="employee@smartfin.ai", full_name="Sneha Patel (Office Executive)", role="employee", department="Operations", hashed_password=hash_password("employee123")),
        ]
        db.add_all(users_data)
        db.flush()

        admin_user = users_data[0]
        acc_user = users_data[1]

        # 2. Employees
        employees_data = [
            Employee(user_id=admin_user.id, employee_code="EMP-001", first_name="Rajesh", last_name="Mehta", email="admin@smartfin.ai", phone="+91 98200 11223", department="Executive", designation="Chief Financial Officer", salary=250000.0, joining_date=date(2023, 1, 15)),
            Employee(user_id=acc_user.id, employee_code="EMP-002", first_name="Priya", last_name="Nair", email="accountant@smartfin.ai", phone="+91 98200 44556", department="Finance & Accounts", designation="Senior Chartered Accountant", salary=120000.0, joining_date=date(2023, 4, 1)),
            Employee(user_id=users_data[2].id, employee_code="EMP-003", first_name="Vikram", last_name="Seth", email="manager@smartfin.ai", phone="+91 98200 77889", department="Financial Planning", designation="Finance Manager", salary=140000.0, joining_date=date(2023, 6, 10)),
            Employee(user_id=users_data[3].id, employee_code="EMP-004", first_name="Sneha", last_name="Patel", email="employee@smartfin.ai", phone="+91 98200 99001", department="Operations", designation="Office Administrator", salary=60000.0, joining_date=date(2024, 2, 1)),
        ]
        db.add_all(employees_data)
        db.flush()

        # 3. Vendors
        vendors_data = [
            Vendor(name="Apex Cloud Hosting Pvt Ltd", gstin="27AABCA9876K1ZQ", pan="AABCA9876K", email="billing@apexcloud.in", phone="+91 22 4001 2345", state="Maharashtra", state_code="27", bank_name="HDFC Bank", account_number="50200098765432", ifsc_code="HDFC0000240", payment_terms_days=30, outstanding_balance=188800.0),
            Vendor(name="Bharat Paper Mills & Office Depot", gstin="07AAACB5566D1Z2", pan="AAACB5566D", email="orders@bharatpaper.com", phone="+91 11 2345 6789", state="Delhi", state_code="07", bank_name="State Bank of India", account_number="30987654321", ifsc_code="SBIN0001234", payment_terms_days=15, outstanding_balance=47200.0),
            Vendor(name="Sterling Logistics & Transport Co", gstin="24AAACS1122E1Z8", pan="AAACS1122E", email="accounts@sterlinglogistics.com", phone="+91 79 2654 3210", state="Gujarat", state_code="24", bank_name="ICICI Bank", account_number="001105001234", ifsc_code="ICIC0000011", payment_terms_days=30, outstanding_balance=118000.0),
            Vendor(name="Tata Telecommunications Ltd", gstin="27AAACT2233M1ZV", pan="AAACT2233M", email="corp-billing@tatatele.com", phone="+91 22 6655 4433", state="Maharashtra", state_code="27", bank_name="Axis Bank", account_number="91202003456789", ifsc_code="UTIB0000045", payment_terms_days=15, outstanding_balance=0.0),
            Vendor(name="KPMG Consulting India LLP", gstin="27AABCK8899F1Z1", pan="AABCK8899F", email="in-finance@kpmg.com", phone="+91 22 3090 1200", state="Maharashtra", state_code="27", bank_name="Citibank", account_number="0543218765", ifsc_code="CITI0000002", payment_terms_days=45, outstanding_balance=354000.0),
        ]
        db.add_all(vendors_data)
        db.flush()

        # 4. Customers
        customers_data = [
            Customer(name="Reliance Digital Services Ltd", gstin="27AABCR1234A1Z9", pan="AABCR1234A", email="vendor-desk@reliancedigital.in", phone="+91 22 4477 8899", state="Maharashtra", state_code="27", credit_limit=2500000.0, outstanding_balance=472000.0),
            Customer(name="Mahindra Auto Components Ltd", gstin="27AAACM4321B1Z3", pan="AAACM4321B", email="purchase@mahindra-auto.com", phone="+91 22 2490 1441", state="Maharashtra", state_code="27", credit_limit=1500000.0, outstanding_balance=295000.0),
            Customer(name="Wipro Enterprise Solutions", gstin="29AABCW8899C1ZM", pan="AABCW8899C", email="ap@wipro.com", phone="+91 80 2844 0011", state="Karnataka", state_code="29", credit_limit=3000000.0, outstanding_balance=708000.0),
            Customer(name="Zomato Media Logistics", gstin="07AABCZ7788P1ZR", pan="AABCZ7788P", email="finance@zomato.com", phone="+91 11 4050 6070", state="Delhi", state_code="07", credit_limit=1000000.0, outstanding_balance=0.0),
        ]
        db.add_all(customers_data)
        db.flush()

        # 5. Bank Accounts
        bank_accounts_data = [
            BankAccount(bank_name="HDFC Bank", account_number="50200012345678", account_type="Current", ifsc_code="HDFC0000123", branch="Nariman Point, Mumbai", opening_balance=1250000.0, current_balance=2845000.0, currency="INR"),
            BankAccount(bank_name="ICICI Bank", account_number="001105009876", account_type="Current", ifsc_code="ICIC0000011", branch="BKC, Mumbai", opening_balance=850000.0, current_balance=1420000.0, currency="INR"),
        ]
        db.add_all(bank_accounts_data)
        db.flush()
        primary_bank = bank_accounts_data[0]

        # 6. Invoices (Purchases & Sales)
        today = date.today()
        nov_1 = date(2026, 11, 1)
        nov_5 = date(2026, 11, 5)
        nov_6 = date(2026, 11, 6)
        nov_8 = date(2026, 11, 8)
        nov_10 = date(2026, 11, 10)
        nov_12 = date(2026, 11, 12)
        nov_14 = date(2026, 11, 14)
        nov_15 = date(2026, 11, 15)
        nov_16 = date(2026, 11, 16)
        nov_17 = date(2026, 11, 17)

        invoices_data = [
            # Purchases
            Invoice(invoice_number="INV-APX-2026-101", invoice_type="PURCHASE", vendor_id=vendors_data[0].id, invoice_date=nov_1, due_date=nov_1 + timedelta(days=30), taxable_amount=160000.0, cgst_amount=14400.0, sgst_amount=14400.0, igst_amount=0.0, total_tax=28800.0, total_amount=188800.0, status="UNPAID", balance_due=188800.0, notes="AWS & Cloud Server infrastructure charges for Nov 2026"),
            Invoice(invoice_number="INV-BPM-2026-088", invoice_type="PURCHASE", vendor_id=vendors_data[1].id, invoice_date=nov_5, due_date=nov_5 + timedelta(days=15), taxable_amount=40000.0, cgst_amount=0.0, sgst_amount=0.0, igst_amount=7200.0, total_tax=7200.0, total_amount=47200.0, status="UNPAID", balance_due=47200.0, notes="Office stationery, printer toners & executive desk supplies"),
            Invoice(invoice_number="INV-STL-2026-442", invoice_type="PURCHASE", vendor_id=vendors_data[2].id, invoice_date=nov_10, due_date=nov_10 + timedelta(days=30), taxable_amount=100000.0, cgst_amount=0.0, sgst_amount=0.0, igst_amount=18000.0, total_tax=18000.0, total_amount=118000.0, status="UNPAID", balance_due=118000.0, notes="Inter-state transport & freight logistics"),
            Invoice(invoice_number="INV-TTL-2026-903", invoice_type="PURCHASE", vendor_id=vendors_data[3].id, invoice_date=nov_1, due_date=nov_1 + timedelta(days=15), taxable_amount=50000.0, cgst_amount=4500.0, sgst_amount=4500.0, igst_amount=0.0, total_tax=9000.0, total_amount=59000.0, paid_amount=59000.0, status="PAID", balance_due=0.0, notes="Leased line fiber internet & VoIP enterprise connectivity"),
            Invoice(invoice_number="INV-KPMG-2026-015", invoice_type="PURCHASE", vendor_id=vendors_data[4].id, invoice_date=nov_12, due_date=nov_12 + timedelta(days=45), taxable_amount=300000.0, cgst_amount=27000.0, sgst_amount=27000.0, igst_amount=0.0, total_tax=54000.0, total_amount=354000.0, status="UNPAID", balance_due=354000.0, notes="Quarterly statutory audit & internal financial controls review"),

            # Sales
            Invoice(invoice_number="SF-SALES-2026-001", invoice_type="SALES", customer_id=customers_data[0].id, invoice_date=nov_1, due_date=nov_1 + timedelta(days=30), taxable_amount=400000.0, cgst_amount=36000.0, sgst_amount=36000.0, igst_amount=0.0, total_tax=72000.0, total_amount=472000.0, status="UNPAID", balance_due=472000.0, notes="Annual Enterprise Automation License Q3"),
            Invoice(invoice_number="SF-SALES-2026-002", invoice_type="SALES", customer_id=customers_data[1].id, invoice_date=nov_5, due_date=nov_5 + timedelta(days=30), taxable_amount=250000.0, cgst_amount=22500.0, sgst_amount=22500.0, igst_amount=0.0, total_tax=45000.0, total_amount=295000.0, status="UNPAID", balance_due=295000.0, notes="Custom ERP Integration & API Automation Module"),
            Invoice(invoice_number="SF-SALES-2026-003", invoice_type="SALES", customer_id=customers_data[2].id, invoice_date=nov_8, due_date=nov_8 + timedelta(days=45), taxable_amount=600000.0, cgst_amount=0.0, sgst_amount=0.0, igst_amount=108000.0, total_tax=108000.0, total_amount=708000.0, status="UNPAID", balance_due=708000.0, notes="Financial Reconciliation Engine Subscription"),
            Invoice(invoice_number="SF-SALES-2026-004", invoice_type="SALES", customer_id=customers_data[3].id, invoice_date=nov_10, due_date=nov_10 + timedelta(days=15), taxable_amount=150000.0, cgst_amount=0.0, sgst_amount=0.0, igst_amount=27000.0, total_tax=27000.0, total_amount=177000.0, paid_amount=177000.0, status="PAID", balance_due=0.0, notes="MIS Analytics & Automated Dashboard Deployment"),
        ]
        db.add_all(invoices_data)
        db.flush()

        # 7. Payments
        payments_data = [
            Payment(payment_number="PAY-2026-001", payment_type="PAYMENT", entity_type="VENDOR", entity_id=vendors_data[3].id, entity_name=vendors_data[3].name, invoice_id=invoices_data[3].id, payment_date=nov_10, amount=59000.0, payment_mode="NEFT", reference_number="HDFC263158904", bank_account_id=primary_bank.id, status="COMPLETED"),
            Payment(payment_number="RCT-2026-001", payment_type="RECEIPT", entity_type="CUSTOMER", entity_id=customers_data[3].id, entity_name=customers_data[3].name, invoice_id=invoices_data[8].id, payment_date=nov_14, amount=177000.0, payment_mode="RTGS", reference_number="UTIBR5202611140089", bank_account_id=primary_bank.id, status="COMPLETED"),
        ]
        db.add_all(payments_data)
        db.flush()

        # 8. Bank Transactions (HDFC Bank Statement)
        bank_txns_data = [
            BankTransaction(bank_account_id=primary_bank.id, transaction_date=nov_10, description="NEFT DR - TATA TELECOMMUNICATIONS LTD - HDFC263158904", reference_number="HDFC263158904", debit_amount=59000.0, credit_amount=0.0, balance_after=2668000.0, category="VENDOR_PAYMENT", reconciliation_status="MATCHED", matched_payment_id=payments_data[0].id),
            BankTransaction(bank_account_id=primary_bank.id, transaction_date=nov_14, description="RTGS CR - ZOMATO MEDIA LOGISTICS - UTIBR5202611140089", reference_number="UTIBR5202611140089", debit_amount=0.0, credit_amount=177000.0, balance_after=2845000.0, category="CUSTOMER_RECEIPT", reconciliation_status="MATCHED", matched_payment_id=payments_data[1].id),
            BankTransaction(bank_account_id=primary_bank.id, transaction_date=nov_15, description="CHG: CONSOLIDATED SERVICE CHARGES FOR NOV", reference_number="CHG992144", debit_amount=1180.0, credit_amount=0.0, balance_after=2843820.0, category="BANK_CHARGES", reconciliation_status="MATCHED"),
            BankTransaction(bank_account_id=primary_bank.id, transaction_date=nov_16, description="AUTO CR - SWEEP DEPOSIT INTEREST EARNED", reference_number="INT20261116", debit_amount=0.0, credit_amount=8420.0, balance_after=2852240.0, category="INTEREST", reconciliation_status="MATCHED"),
            BankTransaction(bank_account_id=primary_bank.id, transaction_date=nov_16, description="UPI/DR/COFFEE-CAFE-DAY/FOOD-SUPPLIES", reference_number="UPI632109845", debit_amount=2450.0, credit_amount=0.0, balance_after=2849790.0, category="UNCATEGORIZED", reconciliation_status="UNMATCHED"),
            BankTransaction(bank_account_id=primary_bank.id, transaction_date=nov_17, description="IMPS CR - CLIENT UNIDENTIFIED REF-99482", reference_number="IMPS9948201", debit_amount=0.0, credit_amount=45000.0, balance_after=2894790.0, category="UNCATEGORIZED", reconciliation_status="UNMATCHED"),
        ]
        db.add_all(bank_txns_data)
        db.flush()

        # 9. GST Records (Both Purchase Register and GSTR-2B with realistic matching cases)
        gst_records_data = [
            # Case 1: Fully Matched (Apex Cloud)
            GSTRecord(record_type="PURCHASE_REGISTER", gstin_supplier="27AABCA9876K1ZQ", supplier_name="Apex Cloud Hosting Pvt Ltd", invoice_number="INV-APX-2026-101", invoice_date=nov_1, taxable_value=160000.0, cgst=14400.0, sgst=14400.0, igst=0.0, total_tax=28800.0, invoice_value=188800.0, match_status="FULLY_MATCHED", remarks="100% Matched with GSTR-2B"),
            GSTRecord(record_type="GSTR2B", gstin_supplier="27AABCA9876K1ZQ", supplier_name="Apex Cloud Hosting Pvt Ltd", invoice_number="INV-APX-2026-101", invoice_date=nov_1, taxable_value=160000.0, cgst=14400.0, sgst=14400.0, igst=0.0, total_tax=28800.0, invoice_value=188800.0, match_status="FULLY_MATCHED", remarks="100% Matched with Purchase Register"),

            # Case 2: Missing in GSTR-2B (Bharat Paper - Vendor hasn't filed GSTR-1 yet, ITC at risk)
            GSTRecord(record_type="PURCHASE_REGISTER", gstin_supplier="07AAACB5566D1Z2", supplier_name="Bharat Paper Mills & Office Depot", invoice_number="INV-BPM-2026-088", invoice_date=nov_5, taxable_value=40000.0, cgst=0.0, sgst=0.0, igst=7200.0, total_tax=7200.0, invoice_value=47200.0, match_status="MISSING_IN_GSTR2B", difference_amount=7200.0, remarks="Invoice present in books, but supplier has not filed GSTR-1 (Missing in 2B)"),

            # Case 3: Tax Amount Mismatch (Sterling Logistics - Books has 18% IGST = 18,000, 2B has 12% = 12,000)
            GSTRecord(record_type="PURCHASE_REGISTER", gstin_supplier="24AAACS1122E1Z8", supplier_name="Sterling Logistics & Transport Co", invoice_number="INV-STL-2026-442", invoice_date=nov_10, taxable_value=100000.0, cgst=0.0, sgst=0.0, igst=18000.0, total_tax=18000.0, invoice_value=118000.0, match_status="TAX_MISMATCH", difference_amount=6000.0, remarks="Tax mismatch: Books ₹18,000.00 vs GSTR-2B ₹12,000.00"),
            GSTRecord(record_type="GSTR2B", gstin_supplier="24AAACS1122E1Z8", supplier_name="Sterling Logistics & Transport Co", invoice_number="INV-STL-2026-442", invoice_date=nov_10, taxable_value=100000.0, cgst=0.0, sgst=0.0, igst=12000.0, total_tax=12000.0, invoice_value=112000.0, match_status="TAX_MISMATCH", difference_amount=6000.0, remarks="Tax mismatch: Books ₹18,000.00 vs GSTR-2B ₹12,000.00"),

            # Case 4: Missing in Books (Unclaimed ITC on GSTR-2B portal from Amazon Web Services)
            GSTRecord(record_type="GSTR2B", gstin_supplier="27AAACA9999P1ZQ", supplier_name="Amazon Web Services India", invoice_number="AWS-IN-2026-8871", invoice_date=nov_6, taxable_value=25000.0, cgst=2250.0, sgst=2250.0, igst=0.0, total_tax=4500.0, invoice_value=29500.0, match_status="MISSING_IN_BOOKS", difference_amount=4500.0, remarks="Invoice present in GSTR-2B portal, but missing in accounting books (Unclaimed ITC)"),

            # Case 5: Fully Matched (Tata Telecommunications)
            GSTRecord(record_type="PURCHASE_REGISTER", gstin_supplier="27AAACT2233M1ZV", supplier_name="Tata Telecommunications Ltd", invoice_number="INV-TTL-2026-903", invoice_date=nov_1, taxable_value=50000.0, cgst=4500.0, sgst=4500.0, igst=0.0, total_tax=9000.0, invoice_value=59000.0, match_status="FULLY_MATCHED", remarks="100% Matched with GSTR-2B"),
            GSTRecord(record_type="GSTR2B", gstin_supplier="27AAACT2233M1ZV", supplier_name="Tata Telecommunications Ltd", invoice_number="INV-TTL-2026-903", invoice_date=nov_1, taxable_value=50000.0, cgst=4500.0, sgst=4500.0, igst=0.0, total_tax=9000.0, invoice_value=59000.0, match_status="FULLY_MATCHED", remarks="100% Matched with Purchase Register"),
        ]
        db.add_all(gst_records_data)
        db.flush()

        # 10. TDS Records (Sections 194C, 194J, 194I, 194Q)
        tds_records_data = [
            # 194J (Professional fees to KPMG - 10% expected = 30,000. Verified & Filing Ready)
            TDSRecord(section="194J", entity_type="VENDOR", entity_name="KPMG Consulting India LLP", entity_pan="AABCK8899F", invoice_number="INV-KPMG-2026-015", transaction_date=nov_12, base_amount=300000.0, applicable_rate=10.0, expected_tds=30000.0, actual_deducted=30000.0, deduction_date=nov_12, deposit_due_date=date(2026, 12, 7), challan_bsr_code="0210001", challan_no="98712", challan_date=date(2026, 11, 15), status="FILING_READY", quarter="Q3", financial_year="2026-27", remarks="Challan verified and mapped for Form 26Q Q3 filing"),

            # 194C (Contractors - Sterling Logistics - 2% expected = 2,000. Short deduction alert: deducted 1% = 1,000)
            TDSRecord(section="194C", entity_type="VENDOR", entity_name="Sterling Logistics & Transport Co", entity_pan="AAACS1122E", invoice_number="INV-STL-2026-442", transaction_date=nov_10, base_amount=100000.0, applicable_rate=2.0, expected_tds=2000.0, actual_deducted=1000.0, deduction_date=nov_10, deposit_due_date=date(2026, 12, 7), status="SHORT_DEDUCTED", quarter="Q3", financial_year="2026-27", remarks="Short deduction of ₹1000.00 (Expected 2% for Corporate entity, deducted 1% individual rate)"),

            # 194I (Rent - Express Towers Commercial Rent - 10% expected = 15,000. Late Deposit alert)
            TDSRecord(section="194I", entity_type="VENDOR", entity_name="Express Towers Real Estate Corp", entity_pan="AAACE5544J", invoice_number="RENT-OCT-2026", transaction_date=date(2026, 10, 1), base_amount=150000.0, applicable_rate=10.0, expected_tds=15000.0, actual_deducted=15000.0, deduction_date=date(2026, 10, 1), deposit_due_date=date(2026, 11, 7), deposit_date=date(2026, 11, 15), challan_bsr_code="0210001", challan_no="12345", status="LATE_DEPOSIT", quarter="Q3", financial_year="2026-27", remarks="Deposited 8 days after due date (2026-11-07). Interest u/s 201(1A) applicable @ 1.5%/month."),

            # 194Q (Purchase of Goods > 50L - Tata Steel Ltd - 0.1% expected = 6,500. Verified)
            TDSRecord(section="194Q", entity_type="VENDOR", entity_name="Tata Steel Industrial Supply", entity_pan="AAACT9900L", invoice_number="TS-2026-194Q", transaction_date=nov_5, base_amount=6500000.0, applicable_rate=0.1, expected_tds=6500.0, actual_deducted=6500.0, deduction_date=nov_5, deposit_due_date=date(2026, 12, 7), status="VERIFIED", quarter="Q3", financial_year="2026-27", remarks="Compliant with Section 194Q threshold & rate guidelines"),
        ]
        db.add_all(tds_records_data)
        db.flush()

        # 11. Office Management: Attendance
        attendance_data = [
            Attendance(employee_id=employees_data[0].id, date=nov_14, status="PRESENT", check_in="09:15 AM", check_out="06:30 PM", total_hours=9.25),
            Attendance(employee_id=employees_data[1].id, date=nov_14, status="PRESENT", check_in="09:00 AM", check_out="06:00 PM", total_hours=9.0),
            Attendance(employee_id=employees_data[2].id, date=nov_14, status="HALF_DAY", check_in="09:30 AM", check_out="02:00 PM", total_hours=4.5, notes="Client offsite meeting"),
            Attendance(employee_id=employees_data[3].id, date=nov_14, status="PRESENT", check_in="08:45 AM", check_out="05:45 PM", total_hours=9.0),
            Attendance(employee_id=employees_data[1].id, date=nov_15, status="ON_LEAVE", leave_type="CASUAL", notes="Personal leave approved"),
        ]
        db.add_all(attendance_data)
        db.flush()

        # 12. Office Management: Expenses
        expenses_data = [
            Expense(title="Annual Team Offsite & Strategy Dinner", category="MEALS", amount=24500.0, expense_date=nov_10, employee_id=employees_data[0].id, status="APPROVED", approved_by="Rajesh Mehta", approved_at=datetime.utcnow() - timedelta(days=6), remarks="Approved per corporate policy"),
            Expense(title="Flight tickets Mumbai - Delhi Client Audit", category="TRAVEL", amount=18200.0, expense_date=nov_12, employee_id=employees_data[1].id, status="PENDING", remarks="Awaiting CFO sign-off for travel reimbursement"),
            Expense(title="Office Ergonomic Chairs & Stationaries", category="OFFICE_SUPPLIES", amount=14300.0, expense_date=nov_14, employee_id=employees_data[3].id, status="APPROVED", approved_by="Vikram Seth", approved_at=datetime.utcnow() - timedelta(days=2)),
            Expense(title="Slack & Zoom Enterprise Annual Billing", category="SOFTWARE", amount=45000.0, expense_date=nov_15, employee_id=employees_data[2].id, status="PENDING", remarks="Annual subscription invoice renewal"),
        ]
        db.add_all(expenses_data)
        db.flush()

        # 13. Office Management: Tasks
        tasks_data = [
            Task(title="Review GSTR-2B vs Purchase Register for Nov 2026", description="Verify ITC mismatches and send vendor reminder letters for missing GSTR-1 entries.", assigned_to_employee_id=employees_data[1].id, created_by_user_id=admin_user.id, priority="HIGH", status="IN_PROGRESS", due_date=today + timedelta(days=2)),
            Task(title="Execute Bank Reconciliation Statement (BRS) for HDFC Current A/c", description="Clear outstanding cheques and post bank charge vouchers.", assigned_to_employee_id=employees_data[1].id, created_by_user_id=admin_user.id, priority="MEDIUM", status="COMPLETED", due_date=today),
            Task(title="Prepare Form 26Q Q3 Draft and Challan Mapping", description="Consolidate 194C, 194J, and 194I records before filing due date.", assigned_to_employee_id=employees_data[1].id, created_by_user_id=admin_user.id, priority="URGENT", status="TODO", due_date=today + timedelta(days=5)),
            Task(title="Procure Office Supplies & Pantry Inventories", description="Monthly replenishment of stationaries, printing cartridges, and coffee beans.", assigned_to_employee_id=employees_data[3].id, created_by_user_id=admin_user.id, priority="LOW", status="TODO", due_date=today + timedelta(days=7)),
        ]
        db.add_all(tasks_data)
        db.flush()

        # 14. Documents
        documents_data = [
            Document(title="Master Financial Automation Policy 2026-27", document_category="POLICY", file_path="uploads/financial_policy_2026.pdf", file_size=245000, mime_type="application/pdf", uploaded_by_user_id=admin_user.id, access_role="ALL", tags="Policy, Compliance, Internal Controls"),
            Document(title="GSTR-2B November 2026 Official Portal Export", document_category="TAX_RECORD", file_path="uploads/gstr2b_nov_2026.xlsx", file_size=512000, mime_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", uploaded_by_user_id=acc_user.id, access_role="ACCOUNTANT", tags="GST, GSTR2B, Tax, ITC"),
            Document(title="HDFC Bank Statement - Nov 2026", document_category="BANK_STATEMENT", file_path="uploads/hdfc_statement_nov2026.pdf", file_size=180000, mime_type="application/pdf", uploaded_by_user_id=acc_user.id, access_role="ACCOUNTANT", tags="Banking, BRS, HDFC"),
        ]
        db.add_all(documents_data)
        db.flush()

        # 15. Excel Workflow Templates
        import json
        templates_data = [
            ExcelWorkflowTemplate(
                name="Tally Prime Purchase Register Normalizer",
                description="Standard cleanup: Strips currency symbols, standardizes date formats to YYYY-MM-DD, and eliminates duplicate invoices.",
                workflow_type="CLEANING",
                configuration_json=json.dumps({
                    "remove_duplicates": True,
                    "dedup_columns": ["Invoice No", "GSTIN"],
                    "normalize_dates": True,
                    "date_columns": ["Invoice Date", "Voucher Date"],
                    "normalize_amounts": True,
                    "amount_columns": ["Taxable Value", "CGST", "SGST", "IGST", "Total Amount"]
                }),
                created_by_user_id=acc_user.id,
                is_reusable=True
            ),
            ExcelWorkflowTemplate(
                name="Vendor Statement vs Books Comparison Engine",
                description="Performs automated key-based cell comparison between supplier statement and internal accounts ledger.",
                workflow_type="SHEET_COMPARE",
                configuration_json=json.dumps({
                    "key_column": "Invoice No",
                    "tolerance": 1.0,
                    "compare_columns": ["Amount", "Tax"]
                }),
                created_by_user_id=acc_user.id,
                is_reusable=True
            )
        ]
        db.add_all(templates_data)
        db.flush()

        # 16. Audit Logs
        audit_logs_data = [
            AuditLog(user_id=admin_user.id, user_email="admin@smartfin.ai", action="SYSTEM_INIT", entity_type="SYSTEM", entity_id="1", details_json=json.dumps({"message": "SmartFin AI System initialized with enterprise demo dataset."})),
            AuditLog(user_id=acc_user.id, user_email="accountant@smartfin.ai", action="GST_RECONCILIATION_RUN", entity_type="GST", entity_id="1", details_json=json.dumps({"matched": 2, "mismatched": 1, "missing_in_2b": 1, "missing_in_books": 1})),
            AuditLog(user_id=acc_user.id, user_email="accountant@smartfin.ai", action="BANK_RECONCILIATION_RUN", entity_type="BANK", entity_id="1", details_json=json.dumps({"matched_txns": 4, "unmatched": 2})),
        ]
        db.add_all(audit_logs_data)
        db.flush()

        # 17. Notifications
        notifications_data = [
            Notification(user_id=admin_user.id, title="GST ITC Mismatch Warning", message="Invoice #INV-BPM-2026-088 (₹47,200) from Bharat Paper Mills is missing in GSTR-2B. ITC cannot be claimed.", notification_type="WARNING", link_url="/gst"),
            Notification(user_id=admin_user.id, title="Expense Approval Request", message="Sneha Patel submitted office expense for ₹14,300 requiring your review.", notification_type="APPROVAL_REQUEST", link_url="/office"),
            Notification(user_id=acc_user.id, title="Bank Reconciliation Required", message="2 unmatched transactions detected in HDFC Bank current account.", notification_type="ALERT", link_url="/bank"),
        ]
        db.add_all(notifications_data)
        db.flush()

        db.commit()
        print("SmartFin AI Demo Data successfully seeded!")

    except Exception as e:
        db.rollback()
        print(f"Error seeding database: {e}")
        raise e
    finally:
        if own_session:
            db.close()

if __name__ == "__main__":
    seed_database()
