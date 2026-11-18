import json
from datetime import date, datetime, timedelta
from sqlalchemy.orm import Session
from app.core.database import SessionLocal, engine, Base
from app.core.security import hash_password
from app.models.all_models import (
    User, Employee, Vendor, Customer, BankAccount, Invoice, Purchase, Sale,
    Payment, BankTransaction, GSTRecord, TDSRecord, Attendance, Expense,
    Task, Document, AuditLog, Notification, ExcelWorkflowTemplate
)

DEFAULT_INITIAL_PASSWORD = "SmartFin@2026!"

PROD_ACCOUNTS = [
    {
        "email": "pinal@smartfin.ai",
        "full_name": "Pinal Patel",
        "role": "admin",
        "department": "Executive Management",
        "designation": "Executive Director & System Administrator",
        "employee_code": "EMP-ADM01",
        "phone": "+91 98200 11001",
        "salary": 300000.0,
        "joining_date": date(2023, 1, 1)
    },
    {
        "email": "nilesh@smartfin.ai",
        "full_name": "Nilesh Shah",
        "role": "admin",
        "department": "Executive Management",
        "designation": "Executive Director & System Administrator",
        "employee_code": "EMP-ADM02",
        "phone": "+91 98200 11002",
        "salary": 300000.0,
        "joining_date": date(2023, 1, 1)
    },
    {
        "email": "birju@smartfin.ai",
        "full_name": "Birju Trivedi",
        "role": "admin",
        "department": "Executive Management",
        "designation": "Executive Director & System Administrator",
        "employee_code": "EMP-ADM03",
        "phone": "+91 98200 11003",
        "salary": 300000.0,
        "joining_date": date(2023, 1, 1)
    },
    {
        "email": "employee@smartfin.ai",
        "full_name": "Operations Employee",
        "role": "employee",
        "department": "Operations",
        "designation": "Operations Executive",
        "employee_code": "EMP-OPS01",
        "phone": "+91 98200 22001",
        "salary": 75000.0,
        "joining_date": date(2024, 1, 15)
    }
]

def ensure_production_accounts(db: Session):
    """
    Guarantees the required SmartFin.AI production administrator and employee accounts
    exist with secure initial credentials and must_change_password enforcement.
    """
    for acc in PROD_ACCOUNTS:
        email = acc["email"].strip().lower()
        user = db.query(User).filter(User.email == email).first()
        
        if not user:
            user = User(
                email=email,
                full_name=acc["full_name"],
                role=acc["role"],
                department=acc["department"],
                hashed_password=hash_password(DEFAULT_INITIAL_PASSWORD),
                must_change_password=True,
                is_active=True
            )
            db.add(user)
            db.flush()
            print(f"Created production account: {email} (role: {acc['role']})")
        else:
            # Ensure permissions match specification
            user.role = acc["role"]
            user.department = acc["department"]
            user.full_name = acc["full_name"]
            user.is_active = True
            if email == "employee@smartfin.ai":
                user.hashed_password = hash_password(DEFAULT_INITIAL_PASSWORD)
                user.must_change_password = True
            db.flush()

        # Ensure matching employee profile
        emp = db.query(Employee).filter(Employee.email == email).first()
        names = acc["full_name"].split(" ", 1)
        first_name = names[0]
        last_name = names[1] if len(names) > 1 else "Executive"

        if not emp:
            emp = Employee(
                user_id=user.id,
                employee_code=acc["employee_code"],
                first_name=first_name,
                last_name=last_name,
                email=email,
                phone=acc["phone"],
                department=acc["department"],
                designation=acc["designation"],
                salary=acc["salary"],
                joining_date=acc["joining_date"],
                is_active=True
            )
            db.add(emp)
            db.flush()
        else:
            emp.user_id = user.id
            emp.first_name = first_name
            emp.last_name = last_name
            emp.department = acc["department"]
            emp.designation = acc["designation"]
            db.flush()

    db.commit()

def seed_database(db: Session = None):
    own_session = False
    if db is None:
        Base.metadata.create_all(bind=engine)
        db = SessionLocal()
        own_session = True

    try:
        # First ensure all production accounts are provisioned
        ensure_production_accounts(db)

        # Check if financial records are already seeded
        if db.query(Vendor).first():
            print("Production financial entities already exist. Skipping base seeding.")
            return

        print("Seeding SmartFin AI organizational database records...")

        pinal_admin = db.query(User).filter(User.email == "pinal@smartfin.ai").first()
        emp_user = db.query(User).filter(User.email == "employee@smartfin.ai").first()
        emp_record = db.query(Employee).filter(Employee.email == "employee@smartfin.ai").first()

        # 1. Vendors
        vendors_data = [
            Vendor(name="Apex Cloud Hosting Pvt Ltd", gstin="27AABCA9876K1ZQ", pan="AABCA9876K", email="billing@apexcloud.in", phone="+91 22 4001 2345", state="Maharashtra", state_code="27", bank_name="HDFC Bank", account_number="50200098765432", ifsc_code="HDFC0000240", payment_terms_days=30, outstanding_balance=188800.0),
            Vendor(name="Bharat Paper Mills & Office Depot", gstin="07AAACB5566D1Z2", pan="AAACB5566D", email="orders@bharatpaper.com", phone="+91 11 2345 6789", state="Delhi", state_code="07", bank_name="State Bank of India", account_number="30987654321", ifsc_code="SBIN0001234", payment_terms_days=15, outstanding_balance=47200.0),
            Vendor(name="Sterling Logistics & Transport Co", gstin="24AAACS1122E1Z8", pan="AAACS1122E", email="accounts@sterlinglogistics.com", phone="+91 79 2654 3210", state="Gujarat", state_code="24", bank_name="ICICI Bank", account_number="001105001234", ifsc_code="ICIC0000011", payment_terms_days=30, outstanding_balance=118000.0),
            Vendor(name="Tata Telecommunications Ltd", gstin="27AAACT2233M1ZV", pan="AAACT2233M", email="corp-billing@tatatele.com", phone="+91 22 6655 4433", state="Maharashtra", state_code="27", bank_name="Axis Bank", account_number="91202003456789", ifsc_code="UTIB0000045", payment_terms_days=15, outstanding_balance=0.0),
            Vendor(name="KPMG Consulting India LLP", gstin="27AABCK8899F1Z1", pan="AABCK8899F", email="in-finance@kpmg.com", phone="+91 22 3090 1200", state="Maharashtra", state_code="27", bank_name="Citibank", account_number="0543218765", ifsc_code="CITI0000002", payment_terms_days=45, outstanding_balance=354000.0),
        ]
        db.add_all(vendors_data)
        db.flush()

        # 2. Customers
        customers_data = [
            Customer(name="Reliance Digital Services Ltd", gstin="27AABCR1234A1Z9", pan="AABCR1234A", email="vendor-desk@reliancedigital.in", phone="+91 22 4477 8899", state="Maharashtra", state_code="27", credit_limit=2500000.0, outstanding_balance=472000.0),
            Customer(name="Mahindra Auto Components Ltd", gstin="27AAACM4321B1Z3", pan="AAACM4321B", email="purchase@mahindra-auto.com", phone="+91 22 2490 1441", state="Maharashtra", state_code="27", credit_limit=1500000.0, outstanding_balance=295000.0),
            Customer(name="Wipro Enterprise Solutions", gstin="29AABCW8899C1ZM", pan="AABCW8899C", email="ap@wipro.com", phone="+91 80 2844 0011", state="Karnataka", state_code="29", credit_limit=3000000.0, outstanding_balance=708000.0),
            Customer(name="Zomato Media Logistics", gstin="07AABCZ7788P1ZR", pan="AABCZ7788P", email="finance@zomato.com", phone="+91 11 4050 6070", state="Delhi", state_code="07", credit_limit=1000000.0, outstanding_balance=0.0),
        ]
        db.add_all(customers_data)
        db.flush()

        # 3. Bank Accounts
        bank_accounts_data = [
            BankAccount(bank_name="HDFC Bank", account_number="50200012345678", account_type="Current", ifsc_code="HDFC0000123", branch="Nariman Point, Mumbai", opening_balance=1250000.0, current_balance=2845000.0, currency="INR"),
            BankAccount(bank_name="ICICI Bank", account_number="001105009876", account_type="Current", ifsc_code="ICIC0000011", branch="BKC, Mumbai", opening_balance=850000.0, current_balance=1420000.0, currency="INR"),
        ]
        db.add_all(bank_accounts_data)
        db.flush()
        primary_bank = bank_accounts_data[0]

        # 4. Invoices
        today = date.today()
        nov_1 = date(2026, 11, 1)
        nov_5 = date(2026, 11, 5)
        nov_6 = date(2026, 11, 6)
        nov_8 = date(2026, 11, 8)
        nov_10 = date(2026, 11, 10)
        nov_12 = date(2026, 11, 12)
        nov_15 = date(2026, 11, 15)

        invoices_data = [
            # Purchases
            Invoice(invoice_number="INV-APX-2026-001", invoice_type="PURCHASE", vendor_id=vendors_data[0].id, invoice_date=nov_1, due_date=nov_1 + timedelta(days=30), taxable_amount=160000.0, cgst_amount=14400.0, sgst_amount=14400.0, igst_amount=0.0, total_tax=28800.0, total_amount=188800.0, status="UNPAID", reconciliation_status="MATCHED"),
            Invoice(invoice_number="INV-BPM-2026-088", invoice_type="PURCHASE", vendor_id=vendors_data[1].id, invoice_date=nov_5, due_date=nov_5 + timedelta(days=15), taxable_amount=40000.0, cgst_amount=0.0, sgst_amount=0.0, igst_amount=7200.0, total_tax=7200.0, total_amount=47200.0, status="UNPAID", reconciliation_status="MISMATCH"),
            Invoice(invoice_number="INV-STL-2026-402", invoice_type="PURCHASE", vendor_id=vendors_data[2].id, invoice_date=nov_8, due_date=nov_8 + timedelta(days=30), taxable_amount=100000.0, cgst_amount=0.0, sgst_amount=0.0, igst_amount=18000.0, total_tax=18000.0, total_amount=118000.0, status="UNPAID", reconciliation_status="MATCHED"),
            Invoice(invoice_number="INV-TTL-2026-919", invoice_type="PURCHASE", vendor_id=vendors_data[3].id, invoice_date=nov_10, due_date=nov_10 + timedelta(days=15), taxable_amount=25000.0, cgst_amount=2250.0, sgst_amount=2250.0, igst_amount=0.0, total_tax=4500.0, total_amount=29500.0, status="PAID", reconciliation_status="MATCHED", payment_reference="PAY-2026-001"),
            Invoice(invoice_number="INV-KPMG-2026-11", invoice_type="PURCHASE", vendor_id=vendors_data[4].id, invoice_date=nov_12, due_date=nov_12 + timedelta(days=45), taxable_amount=300000.0, cgst_amount=27000.0, sgst_amount=27000.0, igst_amount=0.0, total_tax=54000.0, total_amount=354000.0, status="UNPAID", reconciliation_status="UNMATCHED"),

            # Sales
            Invoice(invoice_number="SMARTFIN-SALE-101", invoice_type="SALES", customer_id=customers_data[0].id, invoice_date=nov_1, due_date=nov_1 + timedelta(days=30), taxable_amount=400000.0, cgst_amount=36000.0, sgst_amount=36000.0, igst_amount=0.0, total_tax=72000.0, total_amount=472000.0, status="UNPAID", reconciliation_status="MATCHED"),
            Invoice(invoice_number="SMARTFIN-SALE-102", invoice_type="SALES", customer_id=customers_data[1].id, invoice_date=nov_6, due_date=nov_6 + timedelta(days=30), taxable_amount=250000.0, cgst_amount=22500.0, sgst_amount=22500.0, igst_amount=0.0, total_tax=45000.0, total_amount=295000.0, status="UNPAID", reconciliation_status="MATCHED"),
            Invoice(invoice_number="SMARTFIN-SALE-103", invoice_type="SALES", customer_id=customers_data[2].id, invoice_date=nov_10, due_date=nov_10 + timedelta(days=30), taxable_amount=600000.0, cgst_amount=0.0, sgst_amount=0.0, igst_amount=108000.0, total_tax=108000.0, total_amount=708000.0, status="UNPAID", reconciliation_status="MATCHED"),
            Invoice(invoice_number="SMARTFIN-SALE-104", invoice_type="SALES", customer_id=customers_data[3].id, invoice_date=nov_15, due_date=nov_15 + timedelta(days=15), taxable_amount=150000.0, cgst_amount=0.0, sgst_amount=0.0, igst_amount=27000.0, total_tax=27000.0, total_amount=177000.0, status="PAID", reconciliation_status="MATCHED", payment_reference="REC-2026-001"),
        ]
        db.add_all(invoices_data)
        db.flush()

        # 5. Purchases & Sales details
        purchases_records = [
            Purchase(invoice_id=invoices_data[0].id, vendor_id=vendors_data[0].id, description="Dedicated Enterprise Kubernetes Cluster & S3 Storage", quantity=1.0, unit_price=160000.0, hsn_sac="998315", tax_rate=18.0),
            Purchase(invoice_id=invoices_data[1].id, vendor_id=vendors_data[1].id, description="A4 Copier Paper, Executive Folders & Stationery Cartridges", quantity=100.0, unit_price=400.0, hsn_sac="4802", tax_rate=18.0),
            Purchase(invoice_id=invoices_data[2].id, vendor_id=vendors_data[2].id, description="Inter-State Express Logistics & Heavy Equipment Drayage", quantity=1.0, unit_price=100000.0, hsn_sac="996511", tax_rate=18.0),
            Purchase(invoice_id=invoices_data[3].id, vendor_id=vendors_data[3].id, description="Dedicated 1Gbps Leased Line Internet & SIP Trunking", quantity=1.0, unit_price=25000.0, hsn_sac="998422", tax_rate=18.0),
            Purchase(invoice_id=invoices_data[4].id, vendor_id=vendors_data[4].id, description="Statutory Internal Audit & Enterprise Transfer Pricing Advisory", quantity=1.0, unit_price=300000.0, hsn_sac="998222", tax_rate=18.0),
        ]
        sales_records = [
            Sale(invoice_id=invoices_data[5].id, customer_id=customers_data[0].id, item_description="SmartFin AI Enterprise License - 50 Seats Annual", quantity=1.0, unit_price=400000.0, hsn_sac="998314", tax_rate=18.0),
            Sale(invoice_id=invoices_data[6].id, customer_id=customers_data[1].id, item_description="Automated GST & BRS Engine Integration Services", quantity=1.0, unit_price=250000.0, hsn_sac="998313", tax_rate=18.0),
            Sale(invoice_id=invoices_data[7].id, customer_id=customers_data[2].id, item_description="Custom Excel Automation Pipelines & Cloud Connectors", quantity=1.0, unit_price=600000.0, hsn_sac="998314", tax_rate=18.0),
            Sale(invoice_id=invoices_data[8].id, customer_id=customers_data[3].id, item_description="AI Financial Copilot Model Fine-Tuning & Deployment", quantity=1.0, unit_price=150000.0, hsn_sac="998314", tax_rate=18.0),
        ]
        db.add_all(purchases_records)
        db.add_all(sales_records)
        db.flush()

        # 6. Payments
        payments_data = [
            Payment(payment_number="PAY-2026-001", payment_type="VENDOR_PAYMENT", vendor_id=vendors_data[3].id, invoice_id=invoices_data[3].id, bank_account_id=primary_bank.id, amount=29500.0, payment_date=nov_12, payment_mode="NEFT", reference_number="NEFT9988776655", status="SUCCESS"),
            Payment(payment_number="REC-2026-001", payment_type="CUSTOMER_RECEIPT", customer_id=customers_data[3].id, invoice_id=invoices_data[8].id, bank_account_id=primary_bank.id, amount=177000.0, payment_date=nov_15, payment_mode="RTGS", reference_number="RTGS1122334455", status="SUCCESS"),
        ]
        db.add_all(payments_data)
        db.flush()

        # 7. Bank Transactions
        bank_txns = [
            BankTransaction(bank_account_id=primary_bank.id, transaction_date=nov_12, value_date=nov_12, description="NEFT DR TATA TELECOMMUNICATIONS CORP", reference_number="NEFT9988776655", debit=29500.0, credit=0.0, balance=2668000.0, category="VENDOR_PAYMENT", reconciliation_status="MATCHED", matched_invoice_id=invoices_data[3].id, matched_payment_id=payments_data[0].id),
            BankTransaction(bank_account_id=primary_bank.id, transaction_date=nov_15, value_date=nov_15, description="RTGS CR ZOMATO MEDIA LOGISTICS INWARD", reference_number="RTGS1122334455", debit=0.0, credit=177000.0, balance=2845000.0, category="CUSTOMER_COLLECTION", reconciliation_status="MATCHED", matched_invoice_id=invoices_data[8].id, matched_payment_id=payments_data[1].id),
            BankTransaction(bank_account_id=primary_bank.id, transaction_date=nov_10, value_date=nov_10, description="HDFC SWEEP AUTO CREDIT INTEREST", reference_number="INT20261110", debit=0.0, credit=4200.0, balance=2697500.0, category="INTEREST", reconciliation_status="MATCHED"),
            BankTransaction(bank_account_id=primary_bank.id, transaction_date=nov_5, value_date=nov_5, description="ANNUAL CURRENT ACCOUNT MAINTENANCE CHARGE", reference_number="CHG20261105", debit=750.0, credit=0.0, balance=2693300.0, category="BANK_CHARGES", reconciliation_status="MATCHED"),
            BankTransaction(bank_account_id=primary_bank.id, transaction_date=nov_14, value_date=nov_14, description="DIRECT ACH DEBIT UTILITY POWER CORP", reference_number="ACH44332211", debit=12400.0, credit=0.0, balance=2832600.0, category="UTILITIES", reconciliation_status="UNMATCHED"),
            BankTransaction(bank_account_id=primary_bank.id, transaction_date=nov_16, value_date=nov_16, description="UPI INWARD SETTLEMENT CASHFREE PAYMENTS", reference_number="UPI66778899", debit=0.0, credit=14800.0, balance=2847400.0, category="REVENUE", reconciliation_status="UNMATCHED"),
        ]
        db.add_all(bank_txns)
        db.flush()

        # 8. GST Records
        gst_records = [
            GSTRecord(record_type="GSTR_2B", source="PORTAL", gstin_supplier=vendors_data[0].gstin, supplier_name=vendors_data[0].name, invoice_number="INV-APX-2026-001", invoice_date=nov_1, taxable_amount=160000.0, cgst_amount=14400.0, sgst_amount=14400.0, igst_amount=0.0, total_tax=28800.0, rate=18.0, pos="27", filing_period="112026", itc_eligibility="Y", match_status="FULLY_MATCHED", variance_tax=0.0, matched_invoice_id=invoices_data[0].id),
            GSTRecord(record_type="PURCHASE_REGISTER", source="BOOKS", gstin_supplier=vendors_data[0].gstin, supplier_name=vendors_data[0].name, invoice_number="INV-APX-2026-001", invoice_date=nov_1, taxable_amount=160000.0, cgst_amount=14400.0, sgst_amount=14400.0, igst_amount=0.0, total_tax=28800.0, rate=18.0, pos="27", filing_period="112026", itc_eligibility="Y", match_status="FULLY_MATCHED", variance_tax=0.0, matched_invoice_id=invoices_data[0].id),
            GSTRecord(record_type="PURCHASE_REGISTER", source="BOOKS", gstin_supplier=vendors_data[1].gstin, supplier_name=vendors_data[1].name, invoice_number="INV-BPM-2026-088", invoice_date=nov_5, taxable_amount=40000.0, cgst_amount=0.0, sgst_amount=0.0, igst_amount=7200.0, total_tax=7200.0, rate=18.0, pos="07", filing_period="112026", itc_eligibility="Y", match_status="MISSING_IN_GSTR2B", variance_tax=7200.0, matched_invoice_id=invoices_data[1].id),
            GSTRecord(record_type="GSTR_2B", source="PORTAL", gstin_supplier=vendors_data[2].gstin, supplier_name=vendors_data[2].name, invoice_number="INV-STL-2026-402", invoice_date=nov_8, taxable_amount=100000.0, cgst_amount=0.0, sgst_amount=0.0, igst_amount=18000.0, total_tax=18000.0, rate=18.0, pos="24", filing_period="112026", itc_eligibility="Y", match_status="FULLY_MATCHED", variance_tax=0.0, matched_invoice_id=invoices_data[2].id),
            GSTRecord(record_type="GSTR_2B", source="PORTAL", gstin_supplier=vendors_data[3].gstin, supplier_name=vendors_data[3].name, invoice_number="INV-TTL-2026-919", invoice_date=nov_10, taxable_amount=25000.0, cgst_amount=2250.0, sgst_amount=2250.0, igst_amount=0.0, total_tax=4500.0, rate=18.0, pos="27", filing_period="112026", itc_eligibility="Y", match_status="FULLY_MATCHED", variance_tax=0.0, matched_invoice_id=invoices_data[3].id),
            GSTRecord(record_type="PURCHASE_REGISTER", source="BOOKS", gstin_supplier=vendors_data[4].gstin, supplier_name=vendors_data[4].name, invoice_number="INV-KPMG-2026-11", invoice_date=nov_12, taxable_amount=300000.0, cgst_amount=27000.0, sgst_amount=27000.0, igst_amount=0.0, total_tax=54000.0, rate=18.0, pos="27", filing_period="112026", itc_eligibility="Y", match_status="TAX_MISMATCH", variance_tax=6000.0, matched_invoice_id=invoices_data[4].id),
            GSTRecord(record_type="GSTR_2B", source="PORTAL", gstin_supplier=vendors_data[4].gstin, supplier_name=vendors_data[4].name, invoice_number="INV-KPMG-2026-11", invoice_date=nov_12, taxable_amount=300000.0, cgst_amount=24000.0, sgst_amount=24000.0, igst_amount=0.0, total_tax=48000.0, rate=16.0, pos="27", filing_period="112026", itc_eligibility="Y", match_status="TAX_MISMATCH", variance_tax=6000.0, matched_invoice_id=invoices_data[4].id),
            GSTRecord(record_type="GSTR_2B", source="PORTAL", gstin_supplier="27AAACW9988D1Z4", supplier_name="Western Equipment Spares Ltd", invoice_number="WES-8991", invoice_date=nov_14, taxable_amount=50000.0, cgst_amount=4500.0, sgst_amount=4500.0, igst_amount=0.0, total_tax=9000.0, rate=18.0, pos="27", filing_period="112026", itc_eligibility="Y", match_status="MISSING_IN_BOOKS", variance_tax=9000.0),
        ]
        db.add_all(gst_records)
        db.flush()

        # 9. TDS Records
        tds_records = [
            TDSRecord(vendor_id=vendors_data[4].id, invoice_id=invoices_data[4].id, section="194J", financial_year="2026-27", quarter="Q3", transaction_amount=300000.0, applicable_threshold=30000.0, tds_rate=10.0, expected_tds=30000.0, actual_deducted=30000.0, shortfall_amount=0.0, challan_number="CHL-194J-9921", bsr_code="0210001", deposit_date=nov_15, due_date=date(2026, 12, 7), status="FILING_READY"),
            TDSRecord(vendor_id=vendors_data[2].id, invoice_id=invoices_data[2].id, section="194C", financial_year="2026-27", quarter="Q3", transaction_amount=100000.0, applicable_threshold=100000.0, tds_rate=2.0, expected_tds=2000.0, actual_deducted=2000.0, shortfall_amount=0.0, challan_number="CHL-194C-3341", bsr_code="0210001", deposit_date=nov_15, due_date=date(2026, 12, 7), status="FILING_READY"),
            TDSRecord(vendor_id=vendors_data[0].id, invoice_id=invoices_data[0].id, section="194C", financial_year="2026-27", quarter="Q3", transaction_amount=160000.0, applicable_threshold=100000.0, tds_rate=2.0, expected_tds=3200.0, actual_deducted=2000.0, shortfall_amount=1200.0, challan_number=None, bsr_code=None, deposit_date=None, due_date=date(2026, 12, 7), status="SHORT_DEDUCTED"),
            TDSRecord(vendor_id=vendors_data[3].id, invoice_id=invoices_data[3].id, section="194C", financial_year="2026-27", quarter="Q3", transaction_amount=25000.0, applicable_threshold=30000.0, tds_rate=2.0, expected_tds=0.0, actual_deducted=0.0, shortfall_amount=0.0, challan_number=None, bsr_code=None, deposit_date=None, due_date=date(2026, 12, 7), status="NOT_APPLICABLE"),
        ]
        db.add_all(tds_records)
        db.flush()

        # 10. Attendance Records for Employee
        attendances = [
            Attendance(employee_id=emp_record.id, date=nov_10, status="PRESENT", check_in="09:15", check_out="18:30", work_hours=9.25),
            Attendance(employee_id=emp_record.id, date=nov_11, status="PRESENT", check_in="09:05", check_out="18:15", work_hours=9.15),
            Attendance(employee_id=emp_record.id, date=nov_12, status="PRESENT", check_in="09:30", check_out="19:00", work_hours=9.5),
            Attendance(employee_id=emp_record.id, date=nov_13, status="PRESENT", check_in="09:00", check_out="18:00", work_hours=9.0),
            Attendance(employee_id=emp_record.id, date=nov_14, status="LEAVE", check_in=None, check_out=None, work_hours=0.0, notes="Casual Leave approved"),
            Attendance(employee_id=emp_record.id, date=nov_15, status="PRESENT", check_in="09:10", check_out="18:20", work_hours=9.15),
        ]
        db.add_all(attendances)
        db.flush()

        # 11. Expenses for Employee
        expenses = [
            Expense(employee_id=emp_record.id, title="Client Site Travel (Ahmedabad West)", category="TRAVEL", amount=1200.0, expense_date=nov_10, status="APPROVED", approved_by_user_id=pinal_admin.id, approved_at=datetime.utcnow(), notes="Uber receipts attached"),
            Expense(employee_id=emp_record.id, title="Office Stationery & Files Depot", category="OFFICE_SUPPLIES", amount=3400.0, expense_date=nov_12, status="PENDING", notes="GST invoice attached"),
            Expense(employee_id=emp_record.id, title="Vendor Reconciliation Review Refreshments", category="MEALS", amount=1850.0, expense_date=nov_14, status="APPROVED", approved_by_user_id=pinal_admin.id, approved_at=datetime.utcnow()),
        ]
        db.add_all(expenses)
        db.flush()

        # 12. Tasks assigned to Employee
        tasks = [
            Task(title="Complete GSTR-2B Mismatch Verification", description="Follow up with Bharat Paper Mills regarding unfiled invoice INV-BPM-2026-088.", assigned_to_employee_id=emp_record.id, assigned_by_user_id=pinal_admin.id, priority="HIGH", status="IN_PROGRESS", due_date=today + timedelta(days=2)),
            Task(title="Collect Bank Statement PDF for ICICI Bank", description="Download November 2026 statement and import into BRS module.", assigned_to_employee_id=emp_record.id, assigned_by_user_id=pinal_admin.id, priority="MEDIUM", status="PENDING", due_date=today + timedelta(days=4)),
            Task(title="Archive Signed Vendor Ledgers for Q2", description="Scan and upload signed confirmation balances to Document Vault.", assigned_to_employee_id=emp_record.id, assigned_by_user_id=pinal_admin.id, priority="LOW", status="COMPLETED", completed_at=datetime.utcnow()),
        ]
        db.add_all(tasks)
        db.flush()

        # 13. Audit Log
        db.add(AuditLog(user_id=pinal_admin.id, user_email="pinal@smartfin.ai", action="SYSTEM_INIT", entity_type="SYSTEM", entity_id="1", details_json=json.dumps({"message": "SmartFin.AI production system database initialized."})))
        
        # 14. Notifications
        db.add(Notification(user_id=pinal_admin.id, title="SmartFin.AI System Live", message="Production financial database successfully online with secure RBAC.", notification_type="INFO", link_url="/dashboard"))
        db.add(Notification(user_id=emp_user.id, title="Welcome to SmartFin.AI", message="Your operations employee portal is active. Please review your assigned tasks.", notification_type="INFO", link_url="/dashboard"))

        db.commit()
        print("SmartFin.AI production database seeded and ready.")

    except Exception as e:
        db.rollback()
        print(f"Error seeding database: {e}")
        raise e
    finally:
        if own_session:
            db.close()

if __name__ == "__main__":
    seed_database()
