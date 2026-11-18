from fastapi import APIRouter, Depends, UploadFile, File, HTTPException, Response
from sqlalchemy.orm import Session
from typing import List, Optional, Dict, Any
from app.core.database import get_db
from app.core.dependencies import get_current_user, require_role, log_audit_event
from app.models.all_models import Customer, Invoice, Payment, User
from app.schemas.financial import CustomerOut, CustomerCreate, InvoiceOut
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
