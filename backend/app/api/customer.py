from fastapi import APIRouter, Depends, UploadFile, File, HTTPException, Response, Query
from sqlalchemy.orm import Session
from typing import List, Optional, Dict, Any
from datetime import date, datetime
import re
import os
import shutil
from pydantic import BaseModel
from app.core.database import get_db
from app.core.dependencies import get_current_user, require_role, log_audit_event
from app.core.security import encrypt_credential
from app.models.all_models import Customer, Invoice, Payment, User
from app.schemas.financial import CustomerOut, CustomerCreate, CustomerUpdate, InvoiceOut, InvoiceCreate
from app.services.reconciliation.customer_engine import CustomerReconciliationEngine
from app.services.automation.excel_engine import ExcelAutomationEngine
from app.services.automation.master_importer import ClientMasterImporter, sanitize_folder_name
import pandas as pd

router = APIRouter(prefix="/customers", tags=["Customer Reconciliation"])

class CustomerReceiptIn(BaseModel):
    receipt_number: Optional[str] = None
    payment_date: date
    amount: float
    payment_mode: str = "NEFT"
    reference_number: Optional[str] = None
    bank_account_id: Optional[int] = None
    invoice_id: Optional[int] = None
    notes: Optional[str] = None

@router.get("/list")
def list_customers(
    q: Optional[str] = Query(None, description="Search query for name, GSTIN, PAN, TAN, or phone"),
    limit: Optional[int] = Query(None, description="Limit results"),
    offset: int = Query(0, description="Offset results"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    engine = CustomerReconciliationEngine(db=db)
    all_summaries = engine.get_all_customer_summaries()
    
    if q and q.strip():
        query = q.strip().upper()
        all_summaries = [
            c for c in all_summaries
            if (c.get("name") and query in c["name"].upper())
            or (c.get("gstin") and query in c["gstin"].upper())
            or (c.get("pan") and query in c["pan"].upper())
            or (c.get("tan") and query in c["tan"].upper())
            or (c.get("phone") and query in c["phone"])
            or (c.get("email") and query in c["email"].upper())
        ]
        
    if limit is not None and limit > 0:
        return all_summaries[offset:offset + limit]
        
    return all_summaries

@router.get("/{customer_id}")
def get_customer(
    customer_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    customer = db.query(Customer).filter(Customer.id == customer_id).first()
    if not customer:
        raise HTTPException(status_code=404, detail="Client not found")
        
    return {
        "id": customer.id,
        "name": customer.name,
        "trade_name": customer.trade_name,
        "gstin": customer.gstin,
        "pan": customer.pan,
        "tan": customer.tan,
        "email": customer.email,
        "phone": customer.phone,
        "address": customer.address,
        "state": customer.state,
        "state_code": customer.state_code,
        "folder_name": customer.folder_name,
        "compliance_status": customer.compliance_status or "ACTIVE",
        "gst_username": customer.gst_username,
        "it_username": customer.it_username,
        "tds_username": customer.tds_username,
        "has_gst_password": bool(customer.gst_password_enc),
        "has_it_password": bool(customer.it_password_enc),
        "has_tds_password": bool(customer.tds_password_enc),
        "credit_limit": customer.credit_limit,
        "outstanding_balance": customer.outstanding_balance,
        "created_at": customer.created_at.isoformat() if customer.created_at else None,
        "updated_at": customer.updated_at.isoformat() if customer.updated_at else None
    }

@router.post("/create")
def create_customer(
    customer_in: CustomerCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(["admin", "accountant"]))
):
    name = (customer_in.name or "").strip()
    if not name:
        raise HTTPException(status_code=400, detail="Client name is required")
    
    gstin = customer_in.gstin.strip().upper() if customer_in.gstin and customer_in.gstin.strip() else None
    if gstin:
        if len(gstin) != 15:
            raise HTTPException(status_code=400, detail="GSTIN must be exactly 15 characters")
        existing = db.query(Customer).filter(Customer.gstin == gstin).first()
        if existing:
            raise HTTPException(status_code=400, detail=f"A client with GSTIN {gstin} already exists ({existing.name})")

    pan = customer_in.pan.strip().upper() if customer_in.pan and customer_in.pan.strip() else None
    if not pan and gstin and len(gstin) >= 12:
        pan = gstin[2:12]

    folder_name = customer_in.folder_name.strip() if customer_in.folder_name and customer_in.folder_name.strip() else None
    if not folder_name:
        folder_name = sanitize_folder_name(name)

    customer = Customer(
        name=name,
        trade_name=customer_in.trade_name.strip() if customer_in.trade_name else None,
        gstin=gstin,
        pan=pan,
        tan=customer_in.tan.strip().upper() if customer_in.tan and customer_in.tan.strip() else None,
        email=customer_in.email.strip().lower() if customer_in.email and customer_in.email.strip() else None,
        phone=customer_in.phone.strip() if customer_in.phone and customer_in.phone.strip() else None,
        address=customer_in.address.strip() if customer_in.address else None,
        state=customer_in.state.strip() if customer_in.state else None,
        state_code=customer_in.state_code.strip() if customer_in.state_code else (gstin[:2] if gstin else None),
        folder_name=folder_name,
        gst_username=customer_in.gst_username.strip() if customer_in.gst_username else None,
        gst_password_enc=encrypt_credential(customer_in.gst_password) if customer_in.gst_password else None,
        it_username=customer_in.it_username.strip() if customer_in.it_username else (pan or None),
        it_password_enc=encrypt_credential(customer_in.it_password) if customer_in.it_password else None,
        tds_username=customer_in.tds_username.strip() if customer_in.tds_username else None,
        tds_password_enc=encrypt_credential(customer_in.tds_password) if customer_in.tds_password else None,
        compliance_status=customer_in.compliance_status or "ACTIVE",
        credit_limit=customer_in.credit_limit,
        outstanding_balance=customer_in.outstanding_balance
    )
    db.add(customer)
    db.commit()
    db.refresh(customer)
    log_audit_event(db, current_user, "CREATE_CLIENT", "Customer", str(customer.id), {
        "name": customer.name,
        "gstin": customer.gstin,
        "pan": customer.pan,
        "email": customer.email,
        "phone": customer.phone
    })
    return {
        "id": customer.id,
        "name": customer.name,
        "trade_name": customer.trade_name,
        "gstin": customer.gstin,
        "pan": customer.pan,
        "tan": customer.tan,
        "email": customer.email,
        "phone": customer.phone,
        "folder_name": customer.folder_name,
        "compliance_status": customer.compliance_status,
        "gst_username": customer.gst_username,
        "it_username": customer.it_username,
        "tds_username": customer.tds_username,
        "has_gst_password": bool(customer.gst_password_enc),
        "has_it_password": bool(customer.it_password_enc),
        "has_tds_password": bool(customer.tds_password_enc),
        "credit_limit": customer.credit_limit,
        "outstanding_balance": customer.outstanding_balance
    }

@router.put("/{customer_id}")
def update_customer(
    customer_id: int,
    customer_in: CustomerUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(["admin", "accountant"]))
):
    customer = db.query(Customer).filter(Customer.id == customer_id).first()
    if not customer:
        raise HTTPException(status_code=404, detail="Client not found")

    updated_fields = []
    if customer_in.name is not None and customer_in.name.strip():
        customer.name = customer_in.name.strip()
        updated_fields.append("name")

    if customer_in.trade_name is not None:
        customer.trade_name = customer_in.trade_name.strip() if customer_in.trade_name else None
        updated_fields.append("trade_name")

    if customer_in.gstin is not None:
        new_gstin = customer_in.gstin.strip().upper() if customer_in.gstin and customer_in.gstin.strip() else None
        if new_gstin and len(new_gstin) != 15:
            raise HTTPException(status_code=400, detail="GSTIN must be exactly 15 characters")
        if new_gstin and new_gstin != customer.gstin:
            existing = db.query(Customer).filter(Customer.gstin == new_gstin, Customer.id != customer_id).first()
            if existing:
                raise HTTPException(status_code=400, detail=f"GSTIN {new_gstin} is already assigned to {existing.name}")
        customer.gstin = new_gstin
        if new_gstin and len(new_gstin) >= 12 and not customer.pan:
            customer.pan = new_gstin[2:12]
        updated_fields.append("gstin")

    if customer_in.pan is not None:
        customer.pan = customer_in.pan.strip().upper() if customer_in.pan and customer_in.pan.strip() else None
        updated_fields.append("pan")

    if customer_in.tan is not None:
        customer.tan = customer_in.tan.strip().upper() if customer_in.tan and customer_in.tan.strip() else None
        updated_fields.append("tan")

    if customer_in.email is not None:
        customer.email = customer_in.email.strip().lower() if customer_in.email and customer_in.email.strip() else None
        updated_fields.append("email")

    if customer_in.phone is not None:
        customer.phone = customer_in.phone.strip() if customer_in.phone and customer_in.phone.strip() else None
        updated_fields.append("phone")

    if customer_in.folder_name is not None:
        customer.folder_name = customer_in.folder_name.strip() if customer_in.folder_name and customer_in.folder_name.strip() else None
        updated_fields.append("folder_name")

    if customer_in.compliance_status is not None:
        customer.compliance_status = customer_in.compliance_status
        updated_fields.append("compliance_status")

    if customer_in.gst_username is not None:
        customer.gst_username = customer_in.gst_username.strip() if customer_in.gst_username else None
        updated_fields.append("gst_username")

    if customer_in.gst_password is not None and customer_in.gst_password.strip():
        customer.gst_password_enc = encrypt_credential(customer_in.gst_password)
        updated_fields.append("gst_password")

    if customer_in.it_username is not None:
        customer.it_username = customer_in.it_username.strip() if customer_in.it_username else None
        updated_fields.append("it_username")

    if customer_in.it_password is not None and customer_in.it_password.strip():
        customer.it_password_enc = encrypt_credential(customer_in.it_password)
        updated_fields.append("it_password")

    if customer_in.tds_username is not None:
        customer.tds_username = customer_in.tds_username.strip() if customer_in.tds_username else None
        updated_fields.append("tds_username")

    if customer_in.tds_password is not None and customer_in.tds_password.strip():
        customer.tds_password_enc = encrypt_credential(customer_in.tds_password)
        updated_fields.append("tds_password")

    if customer_in.credit_limit is not None:
        customer.credit_limit = customer_in.credit_limit

    if customer_in.outstanding_balance is not None:
        customer.outstanding_balance = customer_in.outstanding_balance

    customer.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(customer)

    log_audit_event(db, current_user, "UPDATE_CLIENT", "Customer", str(customer.id), {
        "client_name": customer.name,
        "updated_fields": updated_fields
    })

    return {
        "id": customer.id,
        "name": customer.name,
        "trade_name": customer.trade_name,
        "gstin": customer.gstin,
        "pan": customer.pan,
        "tan": customer.tan,
        "email": customer.email,
        "phone": customer.phone,
        "folder_name": customer.folder_name,
        "compliance_status": customer.compliance_status,
        "gst_username": customer.gst_username,
        "it_username": customer.it_username,
        "tds_username": customer.tds_username,
        "has_gst_password": bool(customer.gst_password_enc),
        "has_it_password": bool(customer.it_password_enc),
        "has_tds_password": bool(customer.tds_password_enc),
        "credit_limit": customer.credit_limit,
        "outstanding_balance": customer.outstanding_balance
    }

@router.delete("/{customer_id}")
def delete_customer(
    customer_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(["admin"]))
):
    customer = db.query(Customer).filter(Customer.id == customer_id).first()
    if not customer:
        raise HTTPException(status_code=404, detail="Client not found")

    # Check invoices
    inv_count = db.query(Invoice).filter(Invoice.customer_id == customer_id).count()
    if inv_count > 0:
        raise HTTPException(status_code=400, detail=f"Cannot delete client with {inv_count} existing invoices. Set status to INACTIVE instead.")

    name = customer.name
    db.delete(customer)
    db.commit()
    log_audit_event(db, current_user, "DELETE_CLIENT", "Customer", str(customer_id), {"name": name})
    return {"status": "SUCCESS", "message": f"Client '{name}' successfully removed."}

@router.post("/import-masters")
async def import_client_masters(
    gst_file: Optional[UploadFile] = File(None),
    it_file: Optional[UploadFile] = File(None),
    tds_file: Optional[UploadFile] = File(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(["admin"]))
):
    upload_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))), "uploads", "client_masters")
    os.makedirs(upload_dir, exist_ok=True)
    
    gst_path = None
    if gst_file and gst_file.filename:
        gst_path = os.path.join(upload_dir, f"uploaded_{gst_file.filename}")
        with open(gst_path, "wb") as f:
            shutil.copyfileobj(gst_file.file, f)
            
    it_path = None
    if it_file and it_file.filename:
        it_path = os.path.join(upload_dir, f"uploaded_{it_file.filename}")
        with open(it_path, "wb") as f:
            shutil.copyfileobj(it_file.file, f)
            
    tds_path = None
    if tds_file and tds_file.filename:
        tds_path = os.path.join(upload_dir, f"uploaded_{tds_file.filename}")
        with open(tds_path, "wb") as f:
            shutil.copyfileobj(tds_file.file, f)
            
    importer = ClientMasterImporter(db=db)
    result = importer.import_all_masters(
        gst_path=gst_path,
        it_path=it_path,
        tds_path=tds_path,
        current_user=current_user
    )
    return result

@router.get("/{customer_id}/reconcile")
def reconcile_customer(
    customer_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    engine = CustomerReconciliationEngine(db=db)
    return engine.reconcile_customer(customer_id=customer_id)

@router.post("/{customer_id}/upload-statement")
async def upload_customer_statement(
    customer_id: int,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(["admin", "accountant"]))
):
    customer = db.query(Customer).filter(Customer.id == customer_id).first()
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")

    content = await file.read()
    df, _ = ExcelAutomationEngine.read_file(content, file.filename)

    records = []
    for _, row in df.iterrows():
        records.append({
            "invoice_number": str(row.get("Invoice No", row.get("Invoice Number", row.get("Bill No", "")))),
            "amount": float(row.get("Amount", row.get("Total", row.get("Balance", 0.0))) or 0.0)
        })

    engine = CustomerReconciliationEngine(db=db)
    result = engine.reconcile_customer(customer_id=customer_id, statement_records=records, created_by=current_user.full_name)
    log_audit_event(db, current_user, "UPLOAD_CUSTOMER_STATEMENT", "Customer", str(customer_id), {"filename": file.filename})
    return result

@router.get("/{customer_id}/invoices", response_model=List[InvoiceOut])
def get_customer_invoices(
    customer_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return db.query(Invoice).filter(
        Invoice.customer_id == customer_id,
        Invoice.invoice_type == "SALES"
    ).order_by(Invoice.invoice_date.desc()).all()

@router.post("/{customer_id}/invoices", response_model=InvoiceOut)
def create_customer_invoice(
    customer_id: int,
    invoice_in: InvoiceCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(["admin", "accountant"]))
):
    customer = db.query(Customer).filter(Customer.id == customer_id).first()
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")

    existing_inv = db.query(Invoice).filter(
        Invoice.customer_id == customer_id,
        Invoice.invoice_number == invoice_in.invoice_number
    ).first()
    if existing_inv:
        raise HTTPException(status_code=400, detail="Invoice with this number already exists for this customer")

    inv = Invoice(
        invoice_number=invoice_in.invoice_number,
        invoice_type="SALES",
        customer_id=customer_id,
        invoice_date=invoice_in.invoice_date,
        due_date=invoice_in.due_date,
        taxable_amount=invoice_in.taxable_amount,
        cgst_amount=invoice_in.cgst_amount,
        sgst_amount=invoice_in.sgst_amount,
        igst_amount=invoice_in.igst_amount,
        total_tax=invoice_in.total_tax,
        total_amount=invoice_in.total_amount,
        tds_deducted=invoice_in.tds_deducted,
        paid_amount=invoice_in.paid_amount,
        balance_due=invoice_in.balance_due or invoice_in.total_amount,
        status=invoice_in.status or "UNPAID",
        notes=invoice_in.notes
    )
    customer.outstanding_balance += (inv.balance_due or inv.total_amount or 0.0)
    db.add(inv)
    db.commit()
    db.refresh(inv)
    log_audit_event(db, current_user, "CREATE_SALES_INVOICE", "Invoice", str(inv.id), {
        "customer_id": customer_id,
        "invoice_number": inv.invoice_number,
        "amount": inv.total_amount
    })
    return inv

@router.get("/{customer_id}/receipts")
def get_customer_receipts(
    customer_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    receipts = db.query(Payment).filter(
        Payment.entity_type == "CUSTOMER",
        Payment.entity_id == customer_id
    ).order_by(Payment.payment_date.desc()).all()
    return [
        {
            "id": r.id,
            "payment_number": r.payment_number,
            "payment_date": str(r.payment_date),
            "amount": float(r.amount or 0.0),
            "payment_mode": r.payment_mode or "NEFT",
            "reference_number": r.reference_number or "",
            "invoice_id": r.invoice_id,
            "status": r.status or "COMPLETED"
        }
        for r in receipts
    ]

@router.post("/{customer_id}/receipts")
def record_customer_receipt(
    customer_id: int,
    receipt_in: CustomerReceiptIn,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(["admin", "accountant"]))
):
    engine = CustomerReconciliationEngine(db=db)
    try:
        payment = engine.record_payment_receipt(
            customer_id=customer_id,
            amount=receipt_in.amount,
            payment_date=receipt_in.payment_date,
            payment_mode=receipt_in.payment_mode,
            reference_number=receipt_in.reference_number,
            receipt_number=receipt_in.receipt_number,
            bank_account_id=receipt_in.bank_account_id,
            invoice_id=receipt_in.invoice_id,
            notes=receipt_in.notes
        )
        log_audit_event(db, current_user, "RECORD_CUSTOMER_RECEIPT", "Payment", str(payment.id), {
            "customer_id": customer_id,
            "receipt_number": payment.payment_number,
            "amount": payment.amount,
            "mode": payment.payment_mode
        })
        return {
            "status": "SUCCESS",
            "message": f"Payment receipt {payment.payment_number} of ₹{payment.amount:,.2f} recorded successfully.",
            "payment_id": payment.id,
            "payment_number": payment.payment_number,
            "amount": payment.amount
        }
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))
