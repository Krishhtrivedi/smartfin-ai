import json
from datetime import date, datetime, timedelta
from sqlalchemy.orm import Session
from sqlalchemy import text
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

def purge_dummy_data(db: Session):
    """
    Purges any sample/dummy data so all operational & financial metrics start at 0.
    Retains the 4 real organizational production accounts and employee profiles.
    """
    dummy_vendor_names = [
        "Apex Cloud Hosting Pvt Ltd",
        "Bharat Paper Mills & Office Depot",
        "Sterling Logistics & Transport Co",
        "Tata Telecommunications Ltd",
        "KPMG Consulting India LLP"
    ]
    # Check if any dummy vendor or legacy sample account exists
    has_dummy = (
        db.query(Vendor).filter(Vendor.name.in_(dummy_vendor_names)).first() is not None
        or db.query(User).filter(User.email.in_(["admin@smartfin.ai", "priya@smartfin.ai", "vikram@smartfin.ai"])).first() is not None
    )
    
    if has_dummy:
        print("Purging dummy records to enforce 0 initial entries for live production...")
        is_postgres = not str(engine.url).startswith("sqlite")
        if is_postgres:
            db.execute(text("""
                TRUNCATE TABLE 
                    reconciliation_results,
                    reconciliation_jobs,
                    gst_records, 
                    tds_records, 
                    bank_transactions, 
                    payments, 
                    purchases, 
                    sales, 
                    invoices, 
                    expenses, 
                    attendances, 
                    tasks, 
                    documents, 
                    mis_reports,
                    bank_accounts, 
                    vendors, 
                    customers 
                CASCADE;
            """))
            db.execute(text("""
                DELETE FROM audit_logs WHERE user_id NOT IN (SELECT id FROM users WHERE email IN ('pinal@smartfin.ai', 'nilesh@smartfin.ai', 'birju@smartfin.ai', 'employee@smartfin.ai'));
            """))
            db.execute(text("""
                DELETE FROM notifications WHERE user_id NOT IN (SELECT id FROM users WHERE email IN ('pinal@smartfin.ai', 'nilesh@smartfin.ai', 'birju@smartfin.ai', 'employee@smartfin.ai'));
            """))
            db.execute(text("""
                DELETE FROM employees WHERE email NOT IN ('pinal@smartfin.ai', 'nilesh@smartfin.ai', 'birju@smartfin.ai', 'employee@smartfin.ai');
            """))
            db.execute(text("""
                DELETE FROM users WHERE email NOT IN ('pinal@smartfin.ai', 'nilesh@smartfin.ai', 'birju@smartfin.ai', 'employee@smartfin.ai');
            """))
            db.commit()
        else:
            db.execute(text("PRAGMA foreign_keys = OFF;"))
            db.query(GSTRecord).delete(synchronize_session=False)
            db.query(TDSRecord).delete(synchronize_session=False)
            db.query(BankTransaction).delete(synchronize_session=False)
            db.query(Payment).delete(synchronize_session=False)
            db.query(Purchase).delete(synchronize_session=False)
            db.query(Sale).delete(synchronize_session=False)
            db.query(Invoice).delete(synchronize_session=False)
            db.query(Attendance).delete(synchronize_session=False)
            db.query(Expense).delete(synchronize_session=False)
            db.query(Task).delete(synchronize_session=False)
            db.query(Document).delete(synchronize_session=False)
            db.query(BankAccount).delete(synchronize_session=False)
            db.query(Vendor).delete(synchronize_session=False)
            db.query(Customer).delete(synchronize_session=False)
            prod_emails = [a["email"] for a in PROD_ACCOUNTS]
            db.query(Employee).filter(~Employee.email.in_(prod_emails)).delete(synchronize_session=False)
            db.query(User).filter(~User.email.in_(prod_emails)).delete(synchronize_session=False)
            db.execute(text("PRAGMA foreign_keys = ON;"))
            db.commit()
        print("Dummy records purged successfully. All starting financial values are 0.")

def seed_database(db: Session = None):
    own_session = False
    if db is None:
        Base.metadata.create_all(bind=engine)
        db = SessionLocal()
        own_session = True

    try:
        # Purge any dummy records so every operational value starts at 0
        purge_dummy_data(db)

        # Ensure all 4 production accounts are provisioned
        ensure_production_accounts(db)

    except Exception as e:
        db.rollback()
        print(f"Error initializing database: {e}")
        raise e
    finally:
        if own_session:
            db.close()

if __name__ == "__main__":
    seed_database()
