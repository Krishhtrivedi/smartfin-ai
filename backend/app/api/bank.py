from fastapi import APIRouter, Depends, UploadFile, File, Form, HTTPException, Response
from sqlalchemy.orm import Session
from datetime import datetime, date
from typing import List, Optional, Dict, Any
from app.core.database import get_db
from app.core.dependencies import get_current_user, require_role, log_audit_event
from app.models.all_models import BankAccount, BankTransaction, Payment, User
from app.schemas.financial import BankAccountOut, BankTransactionOut
from app.services.reconciliation.bank_engine import BankReconciliationEngine
from app.services.automation.excel_engine import ExcelAutomationEngine
import pandas as pd

router = APIRouter(prefix="/bank", tags=["Bank Reconciliation"])

@router.get("/accounts", response_model=List[BankAccountOut])
def get_bank_accounts(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return db.query(BankAccount).all()

@router.get("/transactions", response_model=List[BankTransactionOut])
def get_bank_transactions(
    bank_account_id: int,
    status: Optional[str] = None,
    category: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = db.query(BankTransaction).filter(BankTransaction.bank_account_id == bank_account_id)
    if status:
        query = query.filter(BankTransaction.reconciliation_status == status)
    if category:
        query = query.filter(BankTransaction.category == category)
    return query.order_by(BankTransaction.transaction_date.desc()).all()

@router.post("/reconcile")
def run_bank_reconciliation(
    bank_account_id: int,
    date_tolerance_days: int = 4,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(["admin", "accountant", "manager"]))
):
    engine = BankReconciliationEngine(db=db, date_tolerance_days=date_tolerance_days)
    result = engine.reconcile(bank_account_id=bank_account_id, created_by=current_user.full_name)
    log_audit_event(db, current_user, "RUN_BANK_RECONCILIATION", "BankAccount", str(bank_account_id), result["summary"])
    return result

@router.post("/match-manual")
def manual_match_transaction(
    transaction_id: int,
    payment_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(["admin", "accountant"]))
):
    txn = db.query(BankTransaction).filter(BankTransaction.id == transaction_id).first()
    payment = db.query(Payment).filter(Payment.id == payment_id).first()
    if not txn or not payment:
        raise HTTPException(status_code=404, detail="Bank transaction or payment record not found")

    txn.reconciliation_status = "MATCHED"
    txn.matched_payment_id = payment.id
    db.commit()

    log_audit_event(db, current_user, "MANUAL_MATCH_BANK_TXN", "BankTransaction", str(txn.id), {"payment_id": payment.id})
    return {"message": "Transaction manually matched successfully", "transaction_id": txn.id, "payment_id": payment.id}

@router.post("/upload-statement")
async def upload_bank_statement(
    bank_account_id: int = Form(...),
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(["admin", "accountant"]))
):
    account = db.query(BankAccount).filter(BankAccount.id == bank_account_id).first()
    if not account:
        raise HTTPException(status_code=404, detail="Bank account not found")

    content = await file.read()
    df, _ = ExcelAutomationEngine.read_file(content, file.filename)

    # Detect date, description, debit, credit, ref
    col_map = {}
    for col in df.columns:
        c_low = str(col).lower().replace(" ", "").replace("_", "")
        if "date" in c_low or "txn" in c_low and "dt" in c_low:
            col_map["date"] = col
        elif "desc" in c_low or "narration" in c_low or "particular" in c_low:
            col_map["description"] = col
        elif "debit" in c_low or "withdrawal" in c_low:
            col_map["debit"] = col
        elif "credit" in c_low or "deposit" in c_low:
            col_map["credit"] = col
        elif "ref" in c_low or "chq" in c_low or "cheque" in c_low or "utr" in c_low:
            col_map["ref"] = col

    imported_count = 0
    current_bal = account.current_balance
    for _, row in df.iterrows():
        try:
            desc = str(row.get(col_map.get("description", ""), "Bank Entry")).strip()
            if not desc or desc.lower() == "nan":
                continue

            txn_date = date.today()
            if "date" in col_map and pd.notna(row[col_map["date"]]):
                try:
                    txn_date = pd.to_datetime(row[col_map["date"]]).date()
                except Exception:
                    txn_date = date.today()

            debit = float(row.get(col_map.get("debit", ""), 0.0) or 0.0)
            credit = float(row.get(col_map.get("credit", ""), 0.0) or 0.0)
            ref_no = str(row.get(col_map.get("ref", ""), "")) if "ref" in col_map else None

            current_bal = current_bal - debit + credit

            txn = BankTransaction(
                bank_account_id=bank_account_id,
                transaction_date=txn_date,
                description=desc,
                reference_number=ref_no,
                debit_amount=round(debit, 2),
                credit_amount=round(credit, 2),
                balance_after=round(current_bal, 2),
                category="UNCATEGORIZED",
                reconciliation_status="UNMATCHED"
            )
            db.add(txn)
            imported_count += 1
        except Exception:
            continue

    account.current_balance = round(current_bal, 2)
    db.commit()

    log_audit_event(db, current_user, "UPLOAD_BANK_STATEMENT", "BankAccount", str(bank_account_id), {"imported_count": imported_count, "filename": file.filename})
    return {"message": f"Successfully imported {imported_count} bank statement transactions", "imported_count": imported_count}

@router.get("/export-brs")
def export_brs_statement(
    bank_account_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    engine = BankReconciliationEngine(db=db)
    result = engine.reconcile(bank_account_id=bank_account_id)
    summary = result["summary"]

    rows = [
        {"Item": "Bank Account", "Details": f"{summary['bank_account']} ({summary['account_number']})"},
        {"Item": "Balance as per Bank Statement", "Details": f"₹{summary['balance_as_per_bank']:,.2f}"},
        {"Item": "Add: Cheques deposited but not credited", "Details": f"₹{summary['cheques_deposited_not_credited']:,.2f}"},
        {"Item": "Add: Interest directly credited by bank", "Details": f"₹{summary['unbooked_interest']:,.2f}"},
        {"Item": "Less: Cheques issued but not presented", "Details": f"₹{summary['cheques_issued_not_presented']:,.2f}"},
        {"Item": "Less: Bank charges not recorded in books", "Details": f"₹{summary['unbooked_bank_charges']:,.2f}"},
        {"Item": "Balance as per General Ledger (Books)", "Details": f"₹{summary['balance_as_per_books']:,.2f}"},
    ]

    df = pd.DataFrame(rows)
    excel_bytes = ExcelAutomationEngine.export_to_excel_bytes(df, sheet_name="Bank_Reconciliation_BRS")

    return Response(
        content=excel_bytes,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f"attachment; filename=BRS_Account_{summary['account_number']}.xlsx"}
    )
