from fastapi import APIRouter, Depends, HTTPException, Response
from sqlalchemy.orm import Session
from datetime import datetime, date
from typing import List, Optional, Dict, Any
from app.core.database import get_db
from app.core.dependencies import get_current_user, require_role, log_audit_event
from app.models.all_models import TDSRecord, User
from app.schemas.financial import TDSRecordOut, TDSRecordCreate
from app.services.reconciliation.tds_engine import TDSReconciliationEngine, STATUTORY_RULES
from app.services.automation.excel_engine import ExcelAutomationEngine
import pandas as pd

router = APIRouter(prefix="/tds", tags=["TDS / TCS Reconciliation"])

@router.get("/rules")
def get_statutory_rules():
    return STATUTORY_RULES

@router.get("/records", response_model=List[TDSRecordOut])
def get_tds_records(
    section: Optional[str] = None,
    status: Optional[str] = None,
    quarter: Optional[str] = None,
    financial_year: str = "2026-27",
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = db.query(TDSRecord).filter(TDSRecord.financial_year == financial_year)
    if section:
        query = query.filter(TDSRecord.section == section)
    if status:
        query = query.filter(TDSRecord.status == status)
    if quarter:
        query = query.filter(TDSRecord.quarter == quarter)
    return query.order_by(TDSRecord.transaction_date.desc()).all()

@router.post("/reconcile")
def run_tds_compliance_check(
    quarter: Optional[str] = None,
    financial_year: str = "2026-27",
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(["admin", "accountant", "manager"]))
):
    engine = TDSReconciliationEngine(db=db)
    result = engine.check_compliance_and_reconcile(financial_year=financial_year, quarter=quarter)
    log_audit_event(db, current_user, "RUN_TDS_RECONCILIATION", "TDS", None, result)
    return result

@router.post("/challan/update")
def update_challan_mapping(
    record_id: int,
    challan_bsr_code: str,
    challan_no: str,
    challan_date: date,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(["admin", "accountant"]))
):
    rec = db.query(TDSRecord).filter(TDSRecord.id == record_id).first()
    if not rec:
        raise HTTPException(status_code=404, detail="TDS record not found")

    rec.challan_bsr_code = challan_bsr_code
    rec.challan_no = challan_no
    rec.challan_date = challan_date
    rec.deposit_date = challan_date
    rec.status = "FILING_READY"
    rec.remarks = f"Mapped to Challan 281 #{challan_no} (BSR: {challan_bsr_code}) by {current_user.full_name}"

    db.commit()
    log_audit_event(db, current_user, "MAP_TDS_CHALLAN", "TDSRecord", str(rec.id), {"challan_no": challan_no})
    return {"message": "Challan mapped successfully", "record_id": rec.id, "status": rec.status}

@router.get("/export-26q")
def export_form_26q(
    quarter: Optional[str] = "Q3",
    financial_year: str = "2026-27",
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    records = db.query(TDSRecord).filter(
        TDSRecord.financial_year == financial_year,
        TDSRecord.quarter == quarter
    ).all()

    rows = []
    for r in records:
        rows.append({
            "Section Code": r.section,
            "Deductee PAN": r.entity_pan,
            "Deductee Name": r.entity_name,
            "Invoice/Ref No": r.invoice_number or "",
            "Payment Date": str(r.transaction_date),
            "Base Amount (₹)": r.base_amount,
            "Rate (%)": r.applicable_rate,
            "TDS Expected (₹)": r.expected_tds,
            "TDS Deducted (₹)": r.actual_deducted,
            "Deduction Date": str(r.deduction_date or r.transaction_date),
            "Challan BSR Code": r.challan_bsr_code or "",
            "Challan No": r.challan_no or "",
            "Challan Date": str(r.challan_date or ""),
            "Compliance Status": r.status,
            "Remarks": r.remarks or ""
        })

    df = pd.DataFrame(rows)
    excel_bytes = ExcelAutomationEngine.export_to_excel_bytes(df, sheet_name=f"Form26Q_{quarter}")

    return Response(
        content=excel_bytes,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f"attachment; filename=Form_26Q_{financial_year}_{quarter}.xlsx"}
    )
