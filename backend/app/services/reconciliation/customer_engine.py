from datetime import datetime, date
from typing import List, Dict, Any
from sqlalchemy.orm import Session
from app.models.all_models import Customer, Invoice, Payment
import json

class CustomerReconciliationEngine:
    def __init__(self, db: Session):
        self.db = db

    def reconcile_customer(self, customer_id: int, statement_records: List[Dict[str, Any]] = None) -> Dict[str, Any]:
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
        ).order_by(Payment.payment_date.asc()).all()

        total_sales = sum(inv.total_amount for inv in invoices)
        total_received = sum(r.amount for r in receipts)
        calculated_outstanding = total_sales - total_received

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
            due_amount = inv.balance_due if inv.balance_due > 0 else inv.total_amount
            days_old = (today - inv.invoice_date).days
            if days_old <= 30:
                aging["current_0_30"] += due_amount
            elif days_old <= 60:
                aging["period_31_60"] += due_amount
            elif days_old <= 90:
                aging["period_61_90"] += due_amount
            else:
                aging["over_90"] += due_amount

        credit_utilization_pct = 0.0
        if customer.credit_limit and customer.credit_limit > 0:
            credit_utilization_pct = round((calculated_outstanding / customer.credit_limit) * 100, 1)

        self.db.commit()

        return {
            "customer_id": customer.id,
            "customer_name": customer.name,
            "gstin": customer.gstin,
            "credit_limit": customer.credit_limit or 0.0,
            "credit_utilization_pct": credit_utilization_pct,
            "total_sales": round(total_sales, 2),
            "total_received": round(total_received, 2),
            "total_receipts": round(total_received, 2),
            "outstanding_balance": round(calculated_outstanding, 2),
            "aging": {k: round(v, 2) for k, v in aging.items()},
            "invoices_count": len(invoices),
            "receipts_count": len(receipts),
            "unpaid_invoices_count": len(uncollected_invoices),
            "uncollected_invoices_count": len(uncollected_invoices)
        }

    def get_all_customer_summaries(self) -> List[Dict[str, Any]]:
        customers = self.db.query(Customer).all()
        summaries = []
        for c in customers:
            invoices = self.db.query(Invoice).filter(Invoice.customer_id == c.id, Invoice.invoice_type == "SALES").all()
            receipts = self.db.query(Payment).filter(Payment.entity_type == "CUSTOMER", Payment.entity_id == c.id).all()
            total_sales = sum(i.total_amount for i in invoices)
            total_rcvd = sum(r.amount for r in receipts)
            summaries.append({
                "id": c.id,
                "name": c.name,
                "gstin": c.gstin,
                "credit_limit": c.credit_limit,
                "total_sales": round(total_sales, 2),
                "total_received": round(total_rcvd, 2),
                "outstanding_balance": round(total_sales - total_rcvd, 2),
                "invoice_count": len(invoices)
            })
        return summaries
