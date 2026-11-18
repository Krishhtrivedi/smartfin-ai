from fastapi import APIRouter, Depends, UploadFile, File, Form, HTTPException, Response
from sqlalchemy.orm import Session
from datetime import datetime, date
from typing import List, Optional, Dict, Any
from app.core.database import get_db
from app.core.dependencies import get_current_user, require_role, log_audit_event
from app.models.all_models import User, GSTRecord, ReconciliationJob
from app.schemas.financial import GSTRecordOut
from app.services.reconciliation.gst_engine import GSTReconciliationEngine
from app.services.automation.excel_engine import ExcelAutomationEngine
import pandas as pd
import io

router = APIRouter(prefix="/gst", tags=["GST Reconciliation"])

@router.get("/records", response_model=List[GSTRecordOut])
def get_gst_records(
    record_type: Optional[str] = None,
    match_status: Optional[str] = None,
    return_period: Optional[str] = None,
    search: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = db.query(GSTRecord)
    if record_type:
        query = query.filter(GSTRecord.record_type == record_type)
    if match_status:
        query = query.filter(GSTRecord.match_status == match_status)
    if return_period:
        query = query.filter(GSTRecord.return_period == return_period)
    if search:
        search_filter = f"%{search}%"
        query = query.filter(
            (GSTRecord.supplier_name.ilike(search_filter)) |
            (GSTRecord.invoice_number.ilike(search_filter)) |
            (GSTRecord.gstin_supplier.ilike(search_filter))
        )
    return query.order_by(GSTRecord.invoice_date.desc()).all()

@router.post("/reconcile")
def run_gst_reconciliation(
    return_period: Optional[str] = None,
    financial_year: str = "2026-27",
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(["admin", "accountant", "manager"]))
):
    engine = GSTReconciliationEngine(db=db)
    result = engine.reconcile(
        return_period=return_period,
        financial_year=financial_year,
        created_by=current_user.full_name
    )
    log_audit_event(
        db, current_user, "RUN_GST_RECONCILIATION", "GST", str(result["job_id"]),
        {"financial_year": financial_year, "return_period": return_period, "summary": result["summary"]}
    )
    return result

@router.post("/upload")
async def upload_gst_file(
    file: UploadFile = File(...),
    record_type: str = Form(...), # PURCHASE_REGISTER or GSTR2B
    return_period: str = Form("112026"),
    financial_year: str = Form("2026-27"),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(["admin", "accountant"]))
):
    if record_type not in ["PURCHASE_REGISTER", "GSTR2B"]:
        raise HTTPException(status_code=400, detail="Invalid record_type. Must be PURCHASE_REGISTER or GSTR2B")

    content = await file.read()
    df, _ = ExcelAutomationEngine.read_file(content, file.filename)

    # Standardize column mapping flexibly
    col_map = {}
    for col in df.columns:
        c_low = str(col).lower().replace(" ", "").replace("_", "")
        if "gstin" in c_low:
            col_map["gstin"] = col
        elif "supp" in c_low or "trade" in c_low or "party" in c_low:
            col_map["supplier"] = col
        elif "inv" in c_low and ("no" in c_low or "num" in c_low):
            col_map["invoice_no"] = col
        elif "date" in c_low:
            col_map["date"] = col
        elif "taxable" in c_low or "taxval" in c_low:
            col_map["taxable"] = col
        elif "cgst" in c_low:
            col_map["cgst"] = col
        elif "sgst" in c_low:
            col_map["sgst"] = col
        elif "igst" in c_low:
            col_map["igst"] = col
        elif "total" in c_low or "invoiceval" in c_low:
            col_map["total"] = col

    if "gstin" not in col_map or "invoice_no" not in col_map:
        raise HTTPException(status_code=400, detail="Uploaded file missing required columns: GSTIN and Invoice Number")

    imported_count = 0
    for _, row in df.iterrows():
        try:
            gstin = str(row[col_map["gstin"]]).strip()
            inv_no = str(row[col_map["invoice_no"]]).strip()
            if not gstin or not inv_no or gstin.lower() == "nan":
                continue

            inv_date = date.today()
            if "date" in col_map and pd.notna(row[col_map["date"]]):
                try:
                    inv_date = pd.to_datetime(row[col_map["date"]]).date()
                except Exception:
                    inv_date = date.today()

            taxable = float(row.get(col_map.get("taxable", ""), 0.0) or 0.0)
            cgst = float(row.get(col_map.get("cgst", ""), 0.0) or 0.0)
            sgst = float(row.get(col_map.get("sgst", ""), 0.0) or 0.0)
            igst = float(row.get(col_map.get("igst", ""), 0.0) or 0.0)
            total_tax = cgst + sgst + igst
            inv_val = float(row.get(col_map.get("total", ""), taxable + total_tax) or (taxable + total_tax))

            rec = GSTRecord(
                record_type=record_type,
                gstin_supplier=gstin,
                supplier_name=str(row.get(col_map.get("supplier", ""), gstin)),
                invoice_number=inv_no,
                invoice_date=inv_date,
                taxable_value=round(taxable, 2),
                cgst=round(cgst, 2),
                sgst=round(sgst, 2),
                igst=round(igst, 2),
                total_tax=round(total_tax, 2),
                invoice_value=round(inv_val, 2),
                return_period=return_period,
                financial_year=financial_year,
                match_status="UNPROCESSED"
            )
            db.add(rec)
            imported_count += 1
        except Exception as e:
            continue

    db.commit()
    log_audit_event(db, current_user, f"UPLOAD_{record_type}", "GST", None, {"filename": file.filename, "records_imported": imported_count})

    return {
        "message": f"Successfully imported {imported_count} records from {file.filename}",
        "records_imported": imported_count,
        "record_type": record_type
    }

@router.post("/verify/{record_id}")
def verify_gst_record(
    record_id: int,
    action: str = "APPROVE", # APPROVE or REJECT
    notes: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(["admin", "accountant"]))
):
    rec = db.query(GSTRecord).filter(GSTRecord.id == record_id).first()
    if not rec:
        raise HTTPException(status_code=404, detail="GST record not found")

    rec.verified_by_user_id = current_user.id
    rec.verified_at = datetime.utcnow()
    if action == "APPROVE":
        rec.match_status = "FULLY_MATCHED"
        rec.remarks = f"Manually verified & approved by {current_user.full_name}. Notes: {notes or 'ITC Claim accepted'}"
    else:
        rec.match_status = "REJECTED_ITC"
        rec.remarks = f"ITC Claim rejected by {current_user.full_name}. Notes: {notes or 'Disallowed'}"

    db.commit()
    log_audit_event(db, current_user, f"VERIFY_GST_{action}", "GSTRecord", str(rec.id), {"notes": notes})
    return {"message": "Record verification recorded successfully", "record_id": rec.id, "status": rec.match_status}

@router.get("/export")
def export_gst_report(
    return_period: Optional[str] = None,
    financial_year: str = "2026-27",
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = db.query(GSTRecord).filter(GSTRecord.financial_year == financial_year)
    if return_period:
        query = query.filter(GSTRecord.return_period == return_period)

    records = query.all()
    rows = []
    for r in records:
        rows.append({
            "Record Type": r.record_type,
            "Supplier GSTIN": r.gstin_supplier,
            "Supplier Name": r.supplier_name,
            "Invoice No": r.invoice_number,
            "Invoice Date": str(r.invoice_date),
            "Taxable Value": r.taxable_value,
            "CGST": r.cgst,
            "SGST": r.sgst,
            "IGST": r.igst,
            "Total Tax": r.total_tax,
            "Invoice Value": r.invoice_value,
            "Match Status": r.match_status,
            "Difference": r.difference_amount,
            "Remarks": r.remarks
        })

    df = pd.DataFrame(rows)
    excel_bytes = ExcelAutomationEngine.export_to_excel_bytes(df, sheet_name="GST_Reconciliation")

    return Response(
        content=excel_bytes,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f"attachment; filename=GST_Reconciliation_{financial_year}_{return_period or 'all'}.xlsx"}
    )
