from fastapi import APIRouter, Depends, UploadFile, File, HTTPException, Response
from sqlalchemy.orm import Session
from typing import List, Optional, Dict, Any
from app.core.database import get_db
from app.core.dependencies import get_current_user, require_role, log_audit_event
from app.models.all_models import Vendor, Invoice, Payment, User
from app.schemas.financial import VendorOut, VendorCreate, InvoiceOut, InvoiceCreate
from app.services.reconciliation.vendor_engine import VendorReconciliationEngine
from app.services.automation.excel_engine import ExcelAutomationEngine
import pandas as pd

router = APIRouter(prefix="/vendors", tags=["Vendor Reconciliation"])

@router.get("/list")
def list_vendors(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    engine = VendorReconciliationEngine(db=db)
    return engine.get_all_vendor_summaries()

@router.post("/create", response_model=VendorOut)
def create_vendor(
    vendor_in: VendorCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(["admin", "accountant"]))
):
    existing = db.query(Vendor).filter(Vendor.gstin == vendor_in.gstin).first()
    if existing:
        raise HTTPException(status_code=400, detail="Vendor with this GSTIN already registered")

    vendor = Vendor(**vendor_in.dict())
    db.add(vendor)
    db.commit()
    db.refresh(vendor)
    log_audit_event(db, current_user, "CREATE_VENDOR", "Vendor", str(vendor.id), {"name": vendor.name, "gstin": vendor.gstin})
    return vendor

@router.get("/{vendor_id}/reconcile")
def reconcile_vendor(
    vendor_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    engine = VendorReconciliationEngine(db=db)
    return engine.reconcile_vendor(vendor_id=vendor_id)

@router.post("/{vendor_id}/upload-statement")
async def upload_vendor_statement(
    vendor_id: int,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(["admin", "accountant"]))
):
    content = await file.read()
    df, _ = ExcelAutomationEngine.read_file(content, file.filename)

    # Convert rows to dict
    records = []
    for _, row in df.iterrows():
        records.append({
            "invoice_number": str(row.get("Invoice No", row.get("Invoice Number", row.get("Bill No", "")))),
            "amount": float(row.get("Amount", row.get("Total", row.get("Balance", 0.0))) or 0.0)
        })

    engine = VendorReconciliationEngine(db=db)
    result = engine.reconcile_vendor(vendor_id=vendor_id, statement_records=records, created_by=current_user.full_name)
    log_audit_event(db, current_user, "UPLOAD_VENDOR_STATEMENT", "Vendor", str(vendor_id), {"filename": file.filename})
    return result

@router.get("/{vendor_id}/invoices", response_model=List[InvoiceOut])
def get_vendor_invoices(
    vendor_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return db.query(Invoice).filter(
        Invoice.vendor_id == vendor_id,
        Invoice.invoice_type == "PURCHASE"
    ).order_by(Invoice.invoice_date.desc()).all()

@router.post("/{vendor_id}/invoices", response_model=InvoiceOut)
def create_vendor_invoice(
    vendor_id: int,
    invoice_in: InvoiceCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(["admin", "accountant"]))
):
    vendor = db.query(Vendor).filter(Vendor.id == vendor_id).first()
    if not vendor:
        raise HTTPException(status_code=404, detail="Vendor not found")

    existing_inv = db.query(Invoice).filter(
        Invoice.vendor_id == vendor_id,
        Invoice.invoice_number == invoice_in.invoice_number
    ).first()
    if existing_inv:
        raise HTTPException(status_code=400, detail="Invoice with this number already exists for this vendor")

    inv = Invoice(
        invoice_number=invoice_in.invoice_number,
        invoice_type="PURCHASE",
        vendor_id=vendor_id,
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
    vendor.outstanding_balance += (inv.balance_due or inv.total_amount or 0.0)
    db.add(inv)
    db.commit()
    db.refresh(inv)
    log_audit_event(db, current_user, "CREATE_PURCHASE_INVOICE", "Invoice", str(inv.id), {
        "vendor_id": vendor_id,
        "invoice_number": inv.invoice_number,
        "amount": inv.total_amount
    })
    return inv
