from datetime import datetime, date
from typing import List, Dict, Any, Optional
from sqlalchemy.orm import Session
from app.models.all_models import Vendor, Invoice, Payment, ReconciliationJob, ReconciliationResult
import json

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

class VendorReconciliationEngine:
    def __init__(self, db: Session):
        self.db = db

    def reconcile_vendor(self, vendor_id: int, statement_records: List[Dict[str, Any]] = None, created_by: str = "User") -> Dict[str, Any]:
        """
        Reconcile vendor books against imported vendor statement or internal invoices/payments.
        """
        vendor = self.db.query(Vendor).filter(Vendor.id == vendor_id).first()
        if not vendor:
            raise ValueError(f"Vendor {vendor_id} not found")

        invoices = self.db.query(Invoice).filter(
            Invoice.vendor_id == vendor_id,
            Invoice.invoice_type == "PURCHASE"
        ).order_by(Invoice.invoice_date.asc()).all()

        payments = self.db.query(Payment).filter(
            Payment.entity_type == "VENDOR",
            Payment.entity_id == vendor_id
        ).order_by(Payment.payment_date.asc()).all()

        total_invoiced = sum(safe_float(inv.total_amount) for inv in invoices)
        total_paid = sum(safe_float(p.amount) for p in payments)
        calculated_outstanding = total_invoiced - total_paid

        # Update vendor balance
        vendor.outstanding_balance = round(calculated_outstanding, 2)

        # Aging breakdown based on today's date
        today = date.today()
        aging = {
            "current_0_30": 0.0,
            "period_31_60": 0.0,
            "period_61_90": 0.0,
            "over_90": 0.0
        }

        unpaid_invoices = [inv for inv in invoices if inv.status != "PAID"]
        for inv in unpaid_invoices:
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
                        "date": str(inv.invoice_date),
                        "books_amount": inv_total,
                        "statement_amount": stmt_amt,
                        "difference": round(diff, 2),
                        "status": "MATCHED" if diff < 1.0 else "DISCREPANCY"
                    })
                else:
                    matched_txns.append({
                        "invoice_number": inv.invoice_number,
                        "date": str(inv.invoice_date),
                        "books_amount": inv_total,
                        "statement_amount": 0.0,
                        "difference": inv_total,
                        "status": "MISSING_IN_STATEMENT"
                    })

        self.db.commit()

        return {
            "vendor_id": vendor.id,
            "vendor_name": vendor.name,
            "gstin": vendor.gstin,
            "total_purchases": round(total_invoiced, 2),
            "total_payments": round(total_paid, 2),
            "outstanding_balance": round(calculated_outstanding, 2),
            "aging": {k: round(v, 2) for k, v in aging.items()},
            "invoices_count": len(invoices),
            "payments_count": len(payments),
            "unpaid_invoices_count": len(unpaid_invoices),
            "statement_comparison": matched_txns
        }

    def get_all_vendor_summaries(self) -> List[Dict[str, Any]]:
        vendors = self.db.query(Vendor).all()
        summaries = []
        for v in vendors:
            invoices = self.db.query(Invoice).filter(Invoice.vendor_id == v.id, Invoice.invoice_type == "PURCHASE").all()
            payments = self.db.query(Payment).filter(Payment.entity_type == "VENDOR", Payment.entity_id == v.id).all()
            total_inv = sum(safe_float(i.total_amount) for i in invoices)
            total_pd = sum(safe_float(p.amount) for p in payments)
            summaries.append({
                "id": v.id,
                "name": v.name,
                "gstin": v.gstin,
                "payment_terms_days": v.payment_terms_days,
                "total_purchases": round(total_inv, 2),
                "total_payments": round(total_pd, 2),
                "outstanding_balance": round(total_inv - total_pd, 2),
                "invoice_count": len(invoices)
            })
        return summaries
