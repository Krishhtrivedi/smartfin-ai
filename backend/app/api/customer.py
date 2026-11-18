from fastapi import APIRouter, Depends, UploadFile, File, HTTPException, Response
from sqlalchemy.orm import Session
from typing import List, Optional, Dict, Any
from app.core.database import get_db
from app.core.dependencies import get_current_user, require_role, log_audit_event
from app.models.all_models import Customer, Invoice, Payment, User
from app.schemas.financial import CustomerOut, CustomerCreate, InvoiceOut, InvoiceCreate
from app.services.reconciliation.customer_engine import CustomerReconciliationEngine
from app.services.automation.excel_engine import ExcelAutomationEngine
import pandas as pd

router = APIRouter(prefix="/customers", tags=["Customer Reconciliation"])

@router.get("/list")
def list_customers(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    engine = CustomerReconciliationEngine(db=db)
    return engine.get_all_customer_summaries()

@router.post("/create", response_model=CustomerOut)
def create_customer(
    customer_in: CustomerCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(["admin", "accountant"]))
):
    customer = Customer(**customer_in.dict())
    db.add(customer)
    db.commit()
    db.refresh(customer)
    log_audit_event(db, current_user, "CREATE_CUSTOMER", "Customer", str(customer.id), {"name": customer.name, "gstin": customer.gstin})
    return customer

@router.get("/{customer_id}/reconcile")
def reconcile_customer(
    customer_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    engine = CustomerReconciliationEngine(db=db)
    return engine.reconcile_customer(customer_id=customer_id)

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
