from datetime import datetime, date, timedelta
from typing import List, Dict, Any, Optional
from sqlalchemy.orm import Session
from app.models.all_models import TDSRecord, Invoice, Vendor, Customer
import calendar

# Configurable statutory TDS / TCS Section Rules
STATUTORY_RULES = {
    "194C": {
        "description": "Payment to Contractors & Sub-contractors",
        "threshold_single": 30000.0,
        "threshold_aggregate": 100000.0,
        "rate_individual": 1.0,
        "rate_company": 2.0,
        "default_rate": 2.0
    },
    "194J": {
        "description": "Fees for Professional or Technical Services",
        "threshold_single": 30000.0,
        "threshold_aggregate": 30000.0,
        "rate_professional": 10.0,
        "rate_technical": 2.0,
        "default_rate": 10.0
    },
    "194I": {
        "description": "Rent of Land, Building, Furniture or Equipment",
        "threshold_single": 240000.0,
        "threshold_aggregate": 240000.0,
        "rate_plant_machinery": 2.0,
        "rate_land_building": 10.0,
        "default_rate": 10.0
    },
    "194Q": {
        "description": "TDS on Purchase of Goods exceeding ₹50 Lakhs",
        "threshold_single": 5000000.0,
        "threshold_aggregate": 5000000.0,
        "default_rate": 0.1
    },
    "206C_TCS": {
        "description": "TCS on Sale of Goods exceeding ₹50 Lakhs",
        "threshold_single": 5000000.0,
        "threshold_aggregate": 5000000.0,
        "default_rate": 0.1
    }
}

def get_due_date_for_deposit(deduction_date: date) -> date:
    """Due date for TDS deposit is generally 7th of the following month (except March: 30th April)"""
    year = deduction_date.year
    month = deduction_date.month

    if month == 3: # March
        return date(year, 4, 30)
    elif month == 12:
        return date(year + 1, 1, 7)
    else:
        return date(year, month + 1, 7)

class TDSReconciliationEngine:
    def __init__(self, db: Session):
        self.db = db

    def check_compliance_and_reconcile(self, financial_year: str = "2026-27", quarter: str = None) -> Dict[str, Any]:
        """
        Validate all TDS/TCS entries against expected deductions, thresholds, and deposit due dates.
        """
        query = self.db.query(TDSRecord).filter(TDSRecord.financial_year == financial_year)
        if quarter:
            query = query.filter(TDSRecord.quarter == quarter)

        records = query.all()

        total_base_amount = 0.0
        total_expected_tds = 0.0
        total_actual_deducted = 0.0
        short_deduction_count = 0
        late_deposit_count = 0
        deposited_count = 0
        filing_ready_count = 0

        section_summary = {}

        for r in records:
            total_base_amount += r.base_amount
            total_expected_tds += r.expected_tds
            total_actual_deducted += r.actual_deducted

            # 1. Check Short Deduction
            shortfall = r.expected_tds - r.actual_deducted
            if shortfall > 1.0: # Short deduction exists
                r.status = "SHORT_DEDUCTED"
                r.remarks = f"Short deduction of ₹{shortfall:.2f} (Expected ₹{r.expected_tds:.2f} @ {r.applicable_rate}%)"
                short_deduction_count += 1
            else:
                # 2. Check Deposit Timing
                if not r.deposit_due_date and r.deduction_date:
                    r.deposit_due_date = get_due_date_for_deposit(r.deduction_date)

                if r.deposit_date and r.deposit_due_date:
                    if r.deposit_date > r.deposit_due_date:
                        days_late = (r.deposit_date - r.deposit_due_date).days
                        r.status = "LATE_DEPOSIT"
                        r.remarks = f"Deposited {days_late} days after due date ({r.deposit_due_date}). Interest u/s 201(1A) applicable @ 1.5%/month."
                        late_deposit_count += 1
                    else:
                        r.status = "DEPOSITED" if not r.challan_no else "FILING_READY"
                        deposited_count += 1
                elif r.challan_no:
                    r.status = "FILING_READY"
                    filing_ready_count += 1
                else:
                    today = date.today()
                    if r.deposit_due_date and today > r.deposit_due_date:
                        r.status = "LATE_DEPOSIT"
                        r.remarks = f"Pending deposit! Past due date {r.deposit_due_date}"
                        late_deposit_count += 1
                    else:
                        r.status = "VERIFIED"

            # Aggregate per section
            sec = r.section
            if sec not in section_summary:
                section_summary[sec] = {
                    "count": 0,
                    "base_amount": 0.0,
                    "expected_tds": 0.0,
                    "actual_deducted": 0.0
                }
            section_summary[sec]["count"] += 1
            section_summary[sec]["base_amount"] += r.base_amount
            section_summary[sec]["expected_tds"] += r.expected_tds
            section_summary[sec]["actual_deducted"] += r.actual_deducted

        self.db.commit()

        return {
            "financial_year": financial_year,
            "quarter": quarter or "All Quarters",
            "total_records": len(records),
            "total_base_amount": round(total_base_amount, 2),
            "total_expected_tds": round(total_expected_tds, 2),
            "total_actual_deducted": round(total_actual_deducted, 2),
            "net_shortfall": round(max(0.0, total_expected_tds - total_actual_deducted), 2),
            "short_deduction_count": short_deduction_count,
            "late_deposit_count": late_deposit_count,
            "deposited_count": deposited_count,
            "filing_ready_count": filing_ready_count,
            "section_summary": {
                k: {
                    "count": v["count"],
                    "base_amount": round(v["base_amount"], 2),
                    "expected_tds": round(v["expected_tds"], 2),
                    "actual_deducted": round(v["actual_deducted"], 2)
                } for k, v in section_summary.items()
            }
        }
