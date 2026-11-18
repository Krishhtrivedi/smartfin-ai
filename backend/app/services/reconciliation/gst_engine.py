import re
from datetime import datetime, date
from typing import List, Dict, Any, Tuple
from sqlalchemy.orm import Session
from app.models.all_models import GSTRecord, ReconciliationJob, ReconciliationResult, Invoice

def normalize_invoice_no(inv_no: str) -> str:
    """Normalize invoice number by stripping whitespace, slashes, dashes, and leading zeros"""
    if not inv_no:
        return ""
    cleaned = re.sub(r'[\s\-_/]+', '', str(inv_no).upper())
    return cleaned.lstrip('0')

class GSTReconciliationEngine:
    def __init__(self, db: Session, tolerance: float = 1.0):
        self.db = db
        self.tolerance = tolerance

    def reconcile(self, return_period: str = None, financial_year: str = "2026-27", created_by: str = "User") -> Dict[str, Any]:
        """
        Reconcile Purchase Register (Books) records with GSTR-2B (Govt Portal) records.
        """
        # Fetch records
        query_books = self.db.query(GSTRecord).filter(
            GSTRecord.record_type == "PURCHASE_REGISTER",
            GSTRecord.financial_year == financial_year
        )
        query_gstr2b = self.db.query(GSTRecord).filter(
            GSTRecord.record_type == "GSTR2B",
            GSTRecord.financial_year == financial_year
        )

        if return_period:
            query_books = query_books.filter(GSTRecord.return_period == return_period)
            query_gstr2b = query_gstr2b.filter(GSTRecord.return_period == return_period)

        books_records = query_books.all()
        gstr2b_records = query_gstr2b.all()

        job = ReconciliationJob(
            job_type="GST",
            title=f"GST Reconciliation - {financial_year} {return_period or 'All Periods'}",
            status="PROCESSING",
            total_records_a=len(books_records),
            total_records_b=len(gstr2b_records),
            created_by=created_by
        )
        self.db.add(job)
        self.db.flush()

        # Track processed gstr2b records
        gstr2b_matched_ids = set()
        results = []

        matched_count = 0
        mismatched_count = 0
        missing_in_gstr2b_count = 0
        missing_in_books_count = 0
        duplicate_count = 0
        total_discrepancy = 0.0

        # Build index for GSTR2B by GSTIN and normalized invoice number
        gstr2b_by_key: Dict[str, List[GSTRecord]] = {}
        for r2b in gstr2b_records:
            norm_inv = normalize_invoice_no(r2b.invoice_number)
            key = f"{r2b.gstin_supplier.strip().upper()}_{norm_inv}"
            gstr2b_by_key.setdefault(key, []).append(r2b)

        # 1. Process Books records
        seen_books_keys = set()
        for b in books_records:
            norm_b_inv = normalize_invoice_no(b.invoice_number)
            b_key = f"{b.gstin_supplier.strip().upper()}_{norm_b_inv}"

            if b_key in seen_books_keys:
                # Duplicate in books
                b.match_status = "DUPLICATE"
                b.difference_amount = b.total_tax
                b.remarks = "Duplicate invoice number detected in Purchase Register"
                b.job_id = job.id
                duplicate_count += 1
                total_discrepancy += b.total_tax
                continue
            seen_books_keys.add(b_key)

            candidates = gstr2b_by_key.get(b_key, [])
            # Filter candidates not already matched
            available_candidates = [c for c in candidates if c.id not in gstr2b_matched_ids]

            if not available_candidates:
                # Missing in GSTR-2B
                b.match_status = "MISSING_IN_GSTR2B"
                b.difference_amount = b.total_tax
                b.remarks = "Invoice present in books, but supplier has not filed GSTR-1 (Missing in 2B)"
                b.job_id = job.id
                missing_in_gstr2b_count += 1
                total_discrepancy += b.total_tax

                results.append(ReconciliationResult(
                    job_id=job.id,
                    entity_type="GST",
                    record_id_a=str(b.id),
                    record_id_b=None,
                    match_type="MISSING_IN_GSTR2B",
                    confidence_score=0.0,
                    difference_amount=b.total_tax,
                    notes=b.remarks
                ))
            else:
                # Compare taxes & amounts
                cand = available_candidates[0]
                tax_diff = abs(b.total_tax - cand.total_tax)
                val_diff = abs(b.taxable_value - cand.taxable_value)

                if tax_diff <= self.tolerance and val_diff <= self.tolerance:
                    # Fully matched
                    b.match_status = "FULLY_MATCHED"
                    b.difference_amount = tax_diff
                    b.remarks = "100% Matched with GSTR-2B"
                    b.job_id = job.id

                    cand.match_status = "FULLY_MATCHED"
                    cand.difference_amount = tax_diff
                    cand.remarks = "100% Matched with Purchase Register"
                    cand.job_id = job.id

                    gstr2b_matched_ids.add(cand.id)
                    matched_count += 1

                    results.append(ReconciliationResult(
                        job_id=job.id,
                        entity_type="GST",
                        record_id_a=str(b.id),
                        record_id_b=str(cand.id),
                        match_type="FULLY_MATCHED",
                        confidence_score=1.0,
                        difference_amount=tax_diff,
                        notes="Eligible for full ITC claim"
                    ))
                elif tax_diff <= 10.0:
                    # Partially matched (minor rounding or decimal differences)
                    b.match_status = "PARTIALLY_MATCHED"
                    b.difference_amount = tax_diff
                    b.remarks = f"Minor tax discrepancy of ₹{tax_diff:.2f} (Within rounding limit)"
                    b.job_id = job.id

                    cand.match_status = "PARTIALLY_MATCHED"
                    cand.difference_amount = tax_diff
                    cand.remarks = b.remarks
                    cand.job_id = job.id

                    gstr2b_matched_ids.add(cand.id)
                    mismatched_count += 1
                    total_discrepancy += tax_diff

                    results.append(ReconciliationResult(
                        job_id=job.id,
                        entity_type="GST",
                        record_id_a=str(b.id),
                        record_id_b=str(cand.id),
                        match_type="PARTIALLY_MATCHED",
                        confidence_score=0.85,
                        difference_amount=tax_diff,
                        notes=b.remarks
                    ))
                else:
                    # Significant Tax Mismatch
                    b.match_status = "TAX_MISMATCH"
                    b.difference_amount = tax_diff
                    b.remarks = f"Tax mismatch: Books ₹{b.total_tax:.2f} vs GSTR-2B ₹{cand.total_tax:.2f}"
                    b.job_id = job.id

                    cand.match_status = "TAX_MISMATCH"
                    cand.difference_amount = tax_diff
                    cand.remarks = b.remarks
                    cand.job_id = job.id

                    gstr2b_matched_ids.add(cand.id)
                    mismatched_count += 1
                    total_discrepancy += tax_diff

                    results.append(ReconciliationResult(
                        job_id=job.id,
                        entity_type="GST",
                        record_id_a=str(b.id),
                        record_id_b=str(cand.id),
                        match_type="TAX_MISMATCH",
                        confidence_score=0.5,
                        difference_amount=tax_diff,
                        notes=b.remarks
                    ))

        # 2. Check remaining GSTR-2B records (Missing in Books)
        for r2b in gstr2b_records:
            if r2b.id not in gstr2b_matched_ids:
                r2b.match_status = "MISSING_IN_BOOKS"
                r2b.difference_amount = r2b.total_tax
                r2b.remarks = "Invoice present in GSTR-2B portal, but missing in accounting books (Unclaimed ITC)"
                r2b.job_id = job.id
                missing_in_books_count += 1
                total_discrepancy += r2b.total_tax

                results.append(ReconciliationResult(
                    job_id=job.id,
                    entity_type="GST",
                    record_id_a=None,
                    record_id_b=str(r2b.id),
                    match_type="MISSING_IN_BOOKS",
                    confidence_score=0.0,
                    difference_amount=r2b.total_tax,
                    notes=r2b.remarks
                ))

        # Update Job summary
        job.status = "COMPLETED"
        job.matched_count = matched_count
        job.mismatched_count = mismatched_count
        job.missing_count = missing_in_gstr2b_count + missing_in_books_count
        job.discrepancy_total = round(total_discrepancy, 2)
        job.completed_at = datetime.utcnow()

        summary_data = {
            "fully_matched": matched_count,
            "partially_matched": mismatched_count,
            "missing_in_gstr2b": missing_in_gstr2b_count,
            "missing_in_books": missing_in_books_count,
            "duplicate": duplicate_count,
            "total_discrepancy": round(total_discrepancy, 2),
            "itc_at_risk": round(missing_in_gstr2b_count * 15000 + total_discrepancy, 2)
        }
        import json
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
