from datetime import datetime, date
from typing import List, Dict, Any, Optional
from sqlalchemy.orm import Session
from app.models.all_models import Customer, Invoice, Payment, BankAccount
import json
import uuid

def safe_parse_date(d: Any) -> date:
    if isinstance(d, datetime):
        return d.date()
    if isinstance(d, date):
        return d
    if isinstance(d, str):
        try:
            return datetime.strptime(d[:10], "%Y-%m-%d").date()
        except Exception:
            return date.today()
    return date.today()

def safe_float(v: Any) -> float:
    if v is None:
        return 0.0
    try:
        return float(v)
    except (ValueError, TypeError):
        return 0.0

class CustomerReconciliationEngine:
    def __init__(self, db: Session):
        self.db = db

    def reconcile_customer(
        self,
        customer_id: int,
        statement_records: Optional[List[Dict[str, Any]]] = None,
        created_by: str = "System"
    ) -> Dict[str, Any]:
        """
        Reconcile customer sales invoices against payment receipts and imported customer ledger.
        """
        customer = self.db.query(Customer).filter(Customer.id == customer_id).first()
        if not customer:
            raise ValueError(f"Customer {customer_id} not found")

        invoices = self.db.query(Invoice).filter(
            Invoice.customer_id == customer_id,
            Invoice.invoice_type == "SALES"
        ).order_by(Invoice.invoice_date.asc()).all()

        receipts = self.db.query(Payment).filter(
            Payment.entity_type == "CUSTOMER",
            Payment.entity_id == customer_id
        ).order_by(Payment.payment_date.desc()).all()

        total_sales = sum(safe_float(inv.total_amount) for inv in invoices)
        total_received = sum(safe_float(r.amount) for r in receipts)
        calculated_outstanding = max(0.0, total_sales - total_received)

        customer.outstanding_balance = round(calculated_outstanding, 2)

        # Aging breakdown
        today = date.today()
        aging = {
            "current_0_30": 0.0,
            "period_31_60": 0.0,
            "period_61_90": 0.0,
            "over_90": 0.0
        }

        uncollected_invoices = [inv for inv in invoices if inv.status != "PAID"]
        for inv in uncollected_invoices:
            due_amount = safe_float(inv.balance_due) if safe_float(inv.balance_due) > 0 else safe_float(inv.total_amount)
            inv_date = safe_parse_date(inv.invoice_date)
            days_old = max(0, (today - inv_date).days)
            if days_old <= 30:
                aging["current_0_30"] += due_amount
            elif days_old <= 60:
                aging["period_31_60"] += due_amount
            elif days_old <= 90:
                aging["period_61_90"] += due_amount
            else:
                aging["over_90"] += due_amount

        credit_limit = safe_float(customer.credit_limit)
        credit_utilization_pct = 0.0
        if credit_limit > 0:
            credit_utilization_pct = round((calculated_outstanding / credit_limit) * 100, 1)

        # Statement reconciliation if provided
        matched_txns = []
        unmatched_statement_items = []
        if statement_records:
            statement_inv_nos = {str(item.get("invoice_number", "")).strip().upper(): item for item in statement_records}
            for inv in invoices:
                clean_no = inv.invoice_number.strip().upper()
                inv_total = safe_float(inv.total_amount)
                if clean_no in statement_inv_nos:
                    stmt_item = statement_inv_nos[clean_no]
                    stmt_amt = safe_float(stmt_item.get("amount", 0.0))
                    diff = abs(inv_total - stmt_amt)
                    matched_txns.append({
                        "invoice_number": inv.invoice_number,
                        "ledger_amount": inv_total,
                        "statement_amount": stmt_amt,
                        "difference": round(diff, 2),
                        "status": "MATCHED" if diff <= 1.0 else "DISCREPANCY"
                    })
                    statement_inv_nos.pop(clean_no, None)
            for clean_no, item in statement_inv_nos.items():
                if clean_no:
                    unmatched_statement_items.append({
                        "invoice_number": item.get("invoice_number"),
                        "statement_amount": safe_float(item.get("amount", 0.0)),
                        "status": "UNMATCHED_IN_LEDGER"
                    })

        self.db.commit()

        receipts_list = [
            {
                "id": r.id,
                "payment_number": r.payment_number,
                "payment_date": str(r.payment_date),
                "amount": safe_float(r.amount),
                "payment_mode": r.payment_mode or "NEFT",
                "reference_number": r.reference_number or "",
                "invoice_id": r.invoice_id,
                "created_at": str(r.created_at) if hasattr(r, 'created_at') and r.created_at else ""
            }
            for r in receipts
        ]

        return {
            "customer_id": customer.id,
            "customer_name": customer.name,
            "gstin": customer.gstin,
            "credit_limit": credit_limit,
            "credit_utilization_pct": credit_utilization_pct,
            "total_sales": round(total_sales, 2),
            "total_received": round(total_received, 2),
            "total_receipts": round(total_received, 2),
            "outstanding_balance": round(calculated_outstanding, 2),
            "aging": {k: round(v, 2) for k, v in aging.items()},
            "invoices_count": len(invoices),
            "receipts_count": len(receipts),
            "unpaid_invoices_count": len(uncollected_invoices),
            "uncollected_invoices_count": len(uncollected_invoices),
            "receipts": receipts_list,
            "matched_transactions": matched_txns,
            "unmatched_statement_items": unmatched_statement_items,
            "reconciliation_status": "RECONCILED" if not unmatched_statement_items and all(m["status"] == "MATCHED" for m in matched_txns) else "DISCREPANCIES_FOUND"
        }

    def record_payment_receipt(
        self,
        customer_id: int,
        amount: float,
        payment_date: date,
        payment_mode: str = "NEFT",
        reference_number: Optional[str] = None,
        receipt_number: Optional[str] = None,
        bank_account_id: Optional[int] = None,
        invoice_id: Optional[int] = None,
        notes: Optional[str] = None
    ) -> Payment:
        customer = self.db.query(Customer).filter(Customer.id == customer_id).first()
        if not customer:
            raise ValueError(f"Customer {customer_id} not found")

        amount = safe_float(amount)
        if amount <= 0:
            raise ValueError("Receipt amount must be greater than zero")

        # Resolve Bank Account
        if not bank_account_id:
            bank = self.db.query(BankAccount).first()
            if not bank:
                bank = BankAccount(
                    bank_name="HDFC Bank",
                    account_number="50200012345678",
                    account_type="CURRENT",
                    ifsc_code="HDFC0000060",
                    branch="Navrangpura, Ahmedabad",
                    opening_balance=0.0,
                    current_balance=0.0
                )
                self.db.add(bank)
                self.db.commit()
                self.db.refresh(bank)
            bank_account_id = bank.id

        # Generate Receipt Number if missing
        if not receipt_number:
            receipt_number = f"REC-{datetime.now().strftime('%Y%m%d')}-{uuid.uuid4().hex[:4].upper()}"

        payment = Payment(
            payment_number=receipt_number,
            payment_type="RECEIPT",
            entity_type="CUSTOMER",
            entity_id=customer_id,
            entity_name=customer.name,
            invoice_id=invoice_id,
            payment_date=payment_date,
            amount=amount,
            payment_mode=payment_mode or "NEFT",
            reference_number=reference_number or f"UTR-{receipt_number}",
            bank_account_id=bank_account_id,
            status="COMPLETED"
        )
        self.db.add(payment)

        # Allocate against invoice if specified, otherwise allocate FIFO
        remaining_amount = amount
        if invoice_id:
            inv = self.db.query(Invoice).filter(Invoice.id == invoice_id, Invoice.customer_id == customer_id).first()
            if inv:
                cur_bal = safe_float(inv.balance_due) if safe_float(inv.balance_due) > 0 else safe_float(inv.total_amount)
                paid = safe_float(inv.paid_amount) + remaining_amount
                new_bal = max(0.0, cur_bal - remaining_amount)
                inv.paid_amount = round(paid, 2)
                inv.balance_due = round(new_bal, 2)
                inv.status = "PAID" if new_bal <= 0.0 else "PARTIAL"
        else:
            unpaid_invoices = self.db.query(Invoice).filter(
                Invoice.customer_id == customer_id,
                Invoice.invoice_type == "SALES",
                Invoice.status != "PAID"
            ).order_by(Invoice.invoice_date.asc()).all()

            for inv in unpaid_invoices:
                if remaining_amount <= 0:
                    break
                cur_bal = safe_float(inv.balance_due) if safe_float(inv.balance_due) > 0 else safe_float(inv.total_amount)
                alloc = min(cur_bal, remaining_amount)
                inv.paid_amount = round(safe_float(inv.paid_amount) + alloc, 2)
                new_bal = max(0.0, cur_bal - alloc)
                inv.balance_due = round(new_bal, 2)
                inv.status = "PAID" if new_bal <= 0.0 else "PARTIAL"
                remaining_amount -= alloc

        # Recalculate customer total outstanding balance
        all_invoices = self.db.query(Invoice).filter(Invoice.customer_id == customer_id, Invoice.invoice_type == "SALES").all()
        all_receipts = self.db.query(Payment).filter(Payment.entity_type == "CUSTOMER", Payment.entity_id == customer_id).all()
        total_sales = sum(safe_float(i.total_amount) for i in all_invoices)
        total_received = sum(safe_float(r.amount) for r in all_receipts) + amount
        customer.outstanding_balance = round(max(0.0, total_sales - total_received), 2)

        self.db.commit()
        self.db.refresh(payment)
        return payment

    def get_all_customer_summaries(self) -> List[Dict[str, Any]]:
        customers = self.db.query(Customer).order_by(Customer.name.asc()).all()
        summaries = []
        for c in customers:
            invoices = self.db.query(Invoice).filter(Invoice.customer_id == c.id, Invoice.invoice_type == "SALES").all()
            receipts = self.db.query(Payment).filter(Payment.entity_type == "CUSTOMER", Payment.entity_id == c.id).all()
            total_sales = sum(safe_float(i.total_amount) for i in invoices)
            total_rcvd = sum(safe_float(r.amount) for r in receipts)
            summaries.append({
                "id": c.id,
                "name": c.name,
                "trade_name": c.trade_name,
                "gstin": c.gstin,
                "pan": c.pan,
                "tan": c.tan,
                "email": c.email,
                "phone": c.phone,
                "address": c.address,
                "state": c.state,
                "state_code": c.state_code,
                "folder_name": c.folder_name,
                "compliance_status": c.compliance_status or "ACTIVE",
                "gst_username": c.gst_username,
                "it_username": c.it_username,
                "tds_username": c.tds_username,
                "has_gst_password": bool(c.gst_password_enc),
                "has_it_password": bool(c.it_password_enc),
                "has_tds_password": bool(c.tds_password_enc),
                "credit_limit": safe_float(c.credit_limit),
                "total_sales": round(total_sales, 2),
                "total_received": round(total_rcvd, 2),
                "outstanding_balance": round(max(0.0, total_sales - total_rcvd), 2),
                "invoice_count": len(invoices),
                "receipt_count": len(receipts),
                "created_at": c.created_at.isoformat() if c.created_at else None,
                "updated_at": c.updated_at.isoformat() if hasattr(c, 'updated_at') and c.updated_at else None
            })
        return summaries
