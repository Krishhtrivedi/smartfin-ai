from datetime import datetime, timedelta, date
from typing import List, Dict, Any, Optional
from sqlalchemy.orm import Session
from app.models.all_models import BankTransaction, Payment, BankAccount, ReconciliationJob, ReconciliationResult
import re
import json

class BankReconciliationEngine:
    def __init__(self, db: Session, date_tolerance_days: int = 4, amount_tolerance: float = 0.0):
        self.db = db
        self.date_tolerance_days = date_tolerance_days
        self.amount_tolerance = amount_tolerance

    def reconcile(self, bank_account_id: int, created_by: str = "User") -> Dict[str, Any]:
        """
        Reconcile Bank Transactions with Book Payments/Receipts.
        """
        bank_account = self.db.query(BankAccount).filter(BankAccount.id == bank_account_id).first()
        if not bank_account:
            raise ValueError(f"Bank account {bank_account_id} not found")

        bank_txns = self.db.query(BankTransaction).filter(
            BankTransaction.bank_account_id == bank_account_id
        ).all()

        book_payments = self.db.query(Payment).filter(
            Payment.bank_account_id == bank_account_id
        ).all()

        job = ReconciliationJob(
            job_type="BANK",
            title=f"Bank Reconciliation - {bank_account.bank_name} ({bank_account.account_number[-4:]})",
            status="PROCESSING",
            total_records_a=len(bank_txns),
            total_records_b=len(book_payments),
            created_by=created_by
        )
        self.db.add(job)
        self.db.flush()

        matched_payment_ids = set()
        results = []

        matched_count = 0
        unmatched_count = 0
        bank_charges_count = 0
        interest_count = 0
        suspicious_count = 0

        # Build book payments map by reference number and amount
        payments_by_ref = {}
        for p in book_payments:
            if p.reference_number:
                clean_ref = re.sub(r'[\s\-_/]+', '', p.reference_number.upper())
                payments_by_ref[clean_ref] = p

        for txn in bank_txns:
            # 1. Identify Bank Charges & Interest based on description
            desc_upper = txn.description.upper()
            if any(term in desc_upper for term in ["CHG", "CHARGE", "ANNUAL FEE", "SMS CHARGE", "PROCESSING FEE", "FOLIO"]):
                txn.category = "BANK_CHARGES"
                txn.reconciliation_status = "MATCHED" # auto-tagged expense
                bank_charges_count += 1
                matched_count += 1
                continue

            if any(term in desc_upper for term in ["INTEREST", "INT.COLL", "INT CREDITED", "SWEEP INT"]):
                txn.category = "INTEREST"
                txn.reconciliation_status = "MATCHED" # auto-tagged income
                interest_count += 1
                matched_count += 1
                continue

            # Determine txn amount and direction
            is_debit = txn.debit_amount > 0
            txn_amount = txn.debit_amount if is_debit else txn.credit_amount
            expected_type = "PAYMENT" if is_debit else "RECEIPT"

            # 2. Try match by Reference Number
            matched_payment = None
            if txn.reference_number:
                clean_txn_ref = re.sub(r'[\s\-_/]+', '', txn.reference_number.upper())
                if clean_txn_ref in payments_by_ref:
                    candidate = payments_by_ref[clean_txn_ref]
                    if candidate.id not in matched_payment_ids and abs(candidate.amount - txn_amount) <= self.amount_tolerance:
                        matched_payment = candidate

            # 3. If not matched by ref, search by Amount and Date Tolerance
            if not matched_payment:
                candidates = [
                    p for p in book_payments
                    if p.id not in matched_payment_ids
                    and p.payment_type == expected_type
                    and abs(p.amount - txn_amount) <= self.amount_tolerance
                ]

                # Check date proximity
                for cand in candidates:
                    day_diff = abs((txn.transaction_date - cand.payment_date).days)
                    if day_diff <= self.date_tolerance_days:
                        matched_payment = cand
                        break

            if matched_payment:
                txn.reconciliation_status = "MATCHED"
                txn.matched_payment_id = matched_payment.id
                matched_payment_ids.add(matched_payment.id)
                matched_count += 1

                results.append(ReconciliationResult(
                    job_id=job.id,
                    entity_type="BANK",
                    record_id_a=str(txn.id),
                    record_id_b=str(matched_payment.id),
                    match_type="FULLY_MATCHED",
                    confidence_score=1.0,
                    difference_amount=0.0,
                    notes=f"Matched with Book Payment #{matched_payment.payment_number} ({matched_payment.entity_name})"
                ))
            else:
                # Check for suspicious partial or large difference
                txn.reconciliation_status = "UNMATCHED"
                unmatched_count += 1

                results.append(ReconciliationResult(
                    job_id=job.id,
                    entity_type="BANK",
                    record_id_a=str(txn.id),
                    record_id_b=None,
                    match_type="MISSING_IN_BOOKS",
                    confidence_score=0.0,
                    difference_amount=txn_amount,
                    notes="Transaction present in bank statement but missing in general ledger"
                ))

        # Check payments in books not cleared in bank
        uncredited_payments = [p for p in book_payments if p.id not in matched_payment_ids]
        for p in uncredited_payments:
            results.append(ReconciliationResult(
                job_id=job.id,
                entity_type="BANK",
                record_id_a=None,
                record_id_b=str(p.id),
                match_type="MISSING_IN_BANK",
                confidence_score=0.0,
                difference_amount=p.amount,
                notes=f"Book voucher #{p.payment_number} not yet reflected in bank statement"
            ))

        # Calculate BRS Statement
        # Balance as per Bank Statement:
        latest_bank_txn = sorted(bank_txns, key=lambda t: t.transaction_date, reverse=True)
        bank_balance = latest_bank_txn[0].balance_after if latest_bank_txn else bank_account.current_balance
        
        # Cheques issued but not presented (debits in books not in bank)
        cheques_issued_not_presented = sum(p.amount for p in uncredited_payments if p.payment_type == "PAYMENT")
        # Cheques deposited but not credited (receipts in books not in bank)
        cheques_deposited_not_credited = sum(p.amount for p in uncredited_payments if p.payment_type == "RECEIPT")

        # Bank charges not entered in books
        unbooked_bank_charges = sum(t.debit_amount for t in bank_txns if t.category == "BANK_CHARGES")
        # Interest credited by bank not entered in books
        unbooked_interest = sum(t.credit_amount for t in bank_txns if t.category == "INTEREST")

        calculated_book_balance = bank_balance + cheques_deposited_not_credited - cheques_issued_not_presented - unbooked_bank_charges + unbooked_interest

        job.status = "COMPLETED"
        job.matched_count = matched_count
        job.mismatched_count = suspicious_count
        job.missing_count = unmatched_count + len(uncredited_payments)
        job.completed_at = datetime.utcnow()

        summary_data = {
            "bank_account": bank_account.bank_name,
            "account_number": bank_account.account_number,
            "balance_as_per_bank": round(bank_balance, 2),
            "cheques_issued_not_presented": round(cheques_issued_not_presented, 2),
            "cheques_deposited_not_credited": round(cheques_deposited_not_credited, 2),
            "unbooked_bank_charges": round(unbooked_bank_charges, 2),
            "unbooked_interest": round(unbooked_interest, 2),
            "balance_as_per_books": round(calculated_book_balance, 2),
            "matched_transactions_count": matched_count,
            "unmatched_bank_transactions": unmatched_count,
            "unpresented_book_vouchers": len(uncredited_payments),
            "bank_charges_count": bank_charges_count,
            "interest_count": interest_count
        }
        job.summary_json = json.dumps(summary_data)

        for r in results:
            self.db.add(r)

        self.db.commit()
        self.db.refresh(job)

        return {
            "job_id": job.id,
            "status": "COMPLETED",
            "summary": summary_data
        }
