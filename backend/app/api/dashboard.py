from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func
from datetime import datetime, date, timedelta
from typing import Dict, Any, List, Optional
from app.core.database import get_db
from app.core.dependencies import get_current_user, require_role
from app.models.all_models import (
    User, Employee, Invoice, Payment, BankAccount, BankTransaction,
    GSTRecord, TDSRecord, Vendor, Customer, Expense, Task, Attendance,
    AuditLog, Notification, Project, Meeting, Lead, StatutoryNotice,
    PortalNotice, GSTRDispatchLog, BusinessScan
)

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])

@router.get("/summary")
def get_dashboard_summary(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> Dict[str, Any]:
    """
    Computes all Financial & Operational KPIs strictly from actual database records.
    """
    # 1. Sales & Purchases
    sales_invoices = db.query(Invoice).filter(Invoice.invoice_type == "SALES").all()
    purchase_invoices = db.query(Invoice).filter(Invoice.invoice_type == "PURCHASE").all()

    total_sales_taxable = sum(i.taxable_amount or 0.0 for i in sales_invoices)
    total_sales_gross = sum(i.total_amount or 0.0 for i in sales_invoices)
    total_output_gst = sum(i.total_tax or 0.0 for i in sales_invoices)

    total_purchases_taxable = sum(i.taxable_amount or 0.0 for i in purchase_invoices)
    total_purchases_gross = sum(i.total_amount or 0.0 for i in purchase_invoices)
    total_input_gst = sum(i.total_tax or 0.0 for i in purchase_invoices)

    # 2. Expenses
    expenses = db.query(Expense).all()
    total_expenses = sum(e.amount or 0.0 for e in expenses)

    # 3. Profit & Loss
    gross_profit = total_sales_taxable - total_purchases_taxable
    net_profit = gross_profit - total_expenses

    # 4. Bank Balances
    bank_accounts = db.query(BankAccount).all()
    total_bank_balance = sum(b.current_balance or 0.0 for b in bank_accounts)

    # 5. Vendor & Customer Outstanding
    vendors = db.query(Vendor).all()
    customers = db.query(Customer).all()
    total_vendor_outstanding = sum(v.outstanding_balance or 0.0 for v in vendors)
    total_customer_outstanding = sum(c.outstanding_balance or 0.0 for c in customers)

    # 6. TDS Summary
    tds_records = db.query(TDSRecord).all()
    tds_expected = sum(t.expected_tds or 0.0 for t in tds_records)
    tds_actual = sum(t.actual_deducted or 0.0 for t in tds_records)
    tds_shortfall = max(0.0, tds_expected - tds_actual)
    tds_deposited = sum(t.actual_deducted or 0.0 for t in tds_records if t.status in ["DEPOSITED", "FILING_READY"])

    # 7. Actual Monthly Trends from Database Records (No hardcoded months)
    monthly_data: Dict[str, Dict[str, Any]] = {}
    
    for inv in sales_invoices:
        if inv.invoice_date:
            m_key = inv.invoice_date.strftime("%b %Y")
            if m_key not in monthly_data:
                monthly_data[m_key] = {"month": m_key, "sales": 0.0, "purchases": 0.0, "expenses": 0.0, "profit": 0.0}
            monthly_data[m_key]["sales"] += (inv.taxable_amount or 0.0)

    for inv in purchase_invoices:
        if inv.invoice_date:
            m_key = inv.invoice_date.strftime("%b %Y")
            if m_key not in monthly_data:
                monthly_data[m_key] = {"month": m_key, "sales": 0.0, "purchases": 0.0, "expenses": 0.0, "profit": 0.0}
            monthly_data[m_key]["purchases"] += (inv.taxable_amount or 0.0)

    for exp in expenses:
        if exp.expense_date:
            m_key = exp.expense_date.strftime("%b %Y")
            if m_key not in monthly_data:
                monthly_data[m_key] = {"month": m_key, "sales": 0.0, "purchases": 0.0, "expenses": 0.0, "profit": 0.0}
            monthly_data[m_key]["expenses"] += (exp.amount or 0.0)

    for m_key, item in monthly_data.items():
        item["sales"] = round(item["sales"], 2)
        item["purchases"] = round(item["purchases"], 2)
        item["expenses"] = round(item["expenses"], 2)
        item["profit"] = round(item["sales"] - item["purchases"] - item["expenses"], 2)

    monthly_trends = list(monthly_data.values())

    # 8. Expense Breakdown by Category strictly from actual database records
    cat_totals: Dict[str, float] = {}
    for e in expenses:
        cat = e.category or "General"
        cat_totals[cat] = cat_totals.get(cat, 0.0) + (e.amount or 0.0)

    expense_breakdown = [
        {
            "category": cat.replace("_", " ").title(),
            "amount": round(amt, 2),
            "percentage": round((amt / total_expenses * 100), 1) if total_expenses > 0 else 0
        }
        for cat, amt in cat_totals.items()
    ]

    # 9. GST Status counts
    gst_records = db.query(GSTRecord).all()
    gst_status = {
        "fully_matched": sum(1 for g in gst_records if g.match_status == "FULLY_MATCHED"),
        "partially_matched": sum(1 for g in gst_records if g.match_status == "PARTIALLY_MATCHED"),
        "missing_in_gstr2b": sum(1 for g in gst_records if g.match_status == "MISSING_IN_GSTR2B"),
        "missing_in_books": sum(1 for g in gst_records if g.match_status == "MISSING_IN_BOOKS"),
        "tax_mismatch": sum(1 for g in gst_records if g.match_status == "TAX_MISMATCH"),
        "duplicate": sum(1 for g in gst_records if g.match_status == "DUPLICATE")
    }

    # 10. Bank Reconciliation Status
    bank_txns = db.query(BankTransaction).all()
    bank_reconciliation_status = {
        "matched": sum(1 for t in bank_txns if t.reconciliation_status == "MATCHED"),
        "unmatched": sum(1 for t in bank_txns if t.reconciliation_status == "UNMATCHED"),
        "bank_charges": sum(1 for t in bank_txns if t.category == "BANK_CHARGES"),
        "interest": sum(1 for t in bank_txns if t.category == "INTEREST")
    }

    # 11. Vendor Payment Status & Customer Collection Status
    vendor_payment_status = {
        "paid": sum(1 for i in purchase_invoices if i.status == "PAID"),
        "unpaid": sum(1 for i in purchase_invoices if i.status == "UNPAID"),
        "partial": sum(1 for i in purchase_invoices if i.status == "PARTIAL")
    }
    customer_collection_status = {
        "collected": sum(1 for i in sales_invoices if i.status == "PAID"),
        "outstanding": sum(1 for i in sales_invoices if i.status == "UNPAID"),
        "partial": sum(1 for i in sales_invoices if i.status == "PARTIAL")
    }

    # 12. Actual Pending Approvals
    pending_approvals = []
    pending_expenses = db.query(Expense).filter(Expense.status == "PENDING").all()
    for pe in pending_expenses:
        emp_name = f"{pe.employee.first_name} {pe.employee.last_name}" if pe.employee else "Employee"
        pending_approvals.append({
            "id": pe.id,
            "type": "EXPENSE",
            "title": f"Office Expense: {pe.title}",
            "amount": pe.amount,
            "submitted_by": emp_name,
            "date": str(pe.expense_date)
        })

    unverified_gst = db.query(GSTRecord).filter(
        GSTRecord.match_status.in_(["MISSING_IN_GSTR2B", "TAX_MISMATCH"]),
        GSTRecord.verified_at == None
    ).limit(5).all()
    for g in unverified_gst:
        pending_approvals.append({
            "id": g.id,
            "type": "GST_MISMATCH",
            "title": f"GST Mismatch #{g.invoice_number} ({g.supplier_name or g.gstin_supplier})",
            "amount": g.total_tax,
            "submitted_by": "GST Reconciliation Engine",
            "date": str(g.invoice_date)
        })

    # 13. Recent Activities from AuditLog
    recent_logs = db.query(AuditLog).order_by(AuditLog.created_at.desc()).limit(8).all()
    recent_activities = [
        {
            "id": log.id,
            "user_email": log.user_email,
            "action": log.action,
            "entity_type": log.entity_type,
            "created_at": log.created_at.strftime("%d %b %Y, %I:%M %p")
        }
        for log in recent_logs
    ]

    # 14. Organisational Totals & Management KPIs
    employee_count = db.query(Employee).filter(Employee.is_active == True).count()
    active_users_count = db.query(User).filter(User.is_active == True).count()
    total_clients_count = len(customers)

    active_projects_count = db.query(Project).filter(Project.status == "ACTIVE").count()
    active_leads_count = db.query(Lead).filter(~Lead.stage.in_(["CONVERTED", "LOST"])).count()
    scheduled_meetings_count = db.query(Meeting).filter(Meeting.status == "SCHEDULED").count()
    pending_tasks_count = db.query(Task).filter(Task.status != "COMPLETED").count()
    overdue_tasks_count = db.query(Task).filter(Task.due_date < date.today(), Task.status != "COMPLETED").count()
    completed_tasks_count = db.query(Task).filter(Task.status == "COMPLETED").count()
    business_scans_count = db.query(BusinessScan).count()

    # Statutory Notices Countdown & Breakdown
    all_notices = db.query(StatutoryNotice).all()
    today_dt = date.today()
    notices_7d = sum(1 for n in all_notices if n.issue_date and (today_dt - n.issue_date).days <= 7)
    notices_15d = sum(1 for n in all_notices if n.issue_date and (today_dt - n.issue_date).days <= 15)
    notices_30d = sum(1 for n in all_notices if n.issue_date and (today_dt - n.issue_date).days <= 30)
    notices_due_soon = sum(1 for n in all_notices if n.due_date and 0 <= (n.due_date - today_dt).days <= 15)
    total_demand = sum(n.demand_amount or 0.0 for n in all_notices)

    # GSTR Dispatches
    gstr_sent_count = db.query(GSTRDispatchLog).filter(GSTRDispatchLog.status == "SENT").count()
    gstr_failed_count = db.query(GSTRDispatchLog).filter(GSTRDispatchLog.status != "SENT").count()

    total_organisational_records = (
        db.query(Invoice).count() +
        db.query(Payment).count() +
        db.query(BankTransaction).count() +
        db.query(GSTRecord).count() +
        db.query(TDSRecord).count()
    )

    # 15. Upcoming Consultations / Meetings
    meetings_rows = db.query(Meeting).order_by(Meeting.scheduled_time.asc()).limit(4).all()
    upcoming_meetings = []
    for m in meetings_rows:
        c_name = m.customer.name if m.customer else (m.lead.company_name if m.lead else "Advisory Assessee")
        upcoming_meetings.append({
            "id": m.id,
            "title": m.title,
            "client_name": c_name,
            "meeting_type": m.meeting_type or "CONSULTATION",
            "scheduled_time": m.scheduled_time.strftime("%d %b, %I:%M %p") if m.scheduled_time else "Scheduled",
            "status": m.status,
            "agenda": m.agenda or "",
            "has_ai_summary": bool(m.ai_summary)
        })

    # 16. Active Engagements / Projects
    projects_rows = db.query(Project).order_by(Project.created_at.desc()).limit(4).all()
    active_projects = []
    for p in projects_rows:
        c_name = p.customer.name if p.customer else "Corporate Client"
        active_projects.append({
            "id": p.id,
            "name": p.name,
            "code": p.code,
            "client_name": c_name,
            "status": p.status,
            "priority": p.priority,
            "completion_percentage": p.completion_percentage or 0,
            "due_date": str(p.due_date) if p.due_date else None
        })

    # 17. Leads Pipeline Summary
    lead_stages = ["NEW", "CONTACTED", "MEETING_SCHEDULED", "PROPOSAL_SENT", "NEGOTIATION", "CONVERTED", "LOST"]
    pipeline_counts = {
        st: db.query(Lead).filter(Lead.stage == st).count()
        for st in lead_stages
    }

    return {
        "kpis": {
            "total_sales": round(total_sales_taxable, 2),
            "total_purchases": round(total_purchases_taxable, 2),
            "gst_payable": round(total_output_gst, 2),
            "gst_receivable": round(total_input_gst, 2),
            "net_gst": round(total_output_gst - total_input_gst, 2),
            "tds_summary": {
                "expected": round(tds_expected, 2),
                "actual_deducted": round(tds_actual, 2),
                "deposited": round(tds_deposited, 2),
                "shortfall": round(tds_shortfall, 2)
            },
            "total_bank_balance": round(total_bank_balance, 2),
            "vendor_outstanding": round(total_vendor_outstanding, 2),
            "customer_outstanding": round(total_customer_outstanding, 2),
            "monthly_expenses": round(total_expenses, 2),
            "net_profit": round(net_profit, 2),
            "invoices_pending_count": sum(1 for i in purchase_invoices if i.status == "UNPAID"),
            "clients_count": total_clients_count,
            "active_projects_count": active_projects_count,
            "inquiries_and_leads_count": active_leads_count,
            "meetings_scheduled_count": scheduled_meetings_count,
            "pending_tasks_count": pending_tasks_count,
            "overdue_tasks_count": overdue_tasks_count,
            "completed_tasks_count": completed_tasks_count,
            "business_scans_count": business_scans_count,
            "notices_summary": {
                "total": len(all_notices),
                "last_7_days": notices_7d,
                "last_15_days": notices_15d,
                "last_30_days": notices_30d,
                "due_within_15_days": notices_due_soon,
                "total_demand": round(total_demand, 2)
            },
            "gst_dispatch_summary": {
                "sent": gstr_sent_count,
                "failed": gstr_failed_count
            },
            "employee_count": employee_count,
            "active_users_count": active_users_count,
            "total_organisational_records": total_organisational_records,
            "completed_activities_count": db.query(AuditLog).count()
        },
        "monthly_trends": monthly_trends,
        "expense_breakdown": expense_breakdown,
        "gst_status": gst_status,
        "bank_reconciliation_status": bank_reconciliation_status,
        "vendor_payment_status": vendor_payment_status,
        "customer_collection_status": customer_collection_status,
        "pending_approvals": pending_approvals,
        "recent_activities": recent_activities,
        "upcoming_meetings": upcoming_meetings,
        "active_projects": active_projects,
        "pipeline_counts": pipeline_counts
    }

@router.get("/employee")
def get_employee_dashboard(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> Dict[str, Any]:
    """
    Returns actual personal employee dashboard: personal tasks, personal attendance,
    submitted expenses, and assigned resources.
    """
    employee = db.query(Employee).filter(Employee.user_id == current_user.id).first()
    if not employee:
        # Fallback by email
        employee = db.query(Employee).filter(Employee.email == current_user.email).first()

    emp_id = employee.id if employee else None

    # 1. Personal Tasks
    tasks = db.query(Task).filter(Task.assigned_to_employee_id == emp_id).order_by(Task.due_date.asc()).all() if emp_id else []
    
    # 2. Personal Expenses
    expenses = db.query(Expense).filter(Expense.employee_id == emp_id).order_by(Expense.expense_date.desc()).limit(10).all() if emp_id else []

    # 3. Personal Attendance (current month)
    attendances = db.query(Attendance).filter(Attendance.employee_id == emp_id).order_by(Attendance.date.desc()).limit(15).all() if emp_id else []

    # 4. Personal Notifications
    notifications = db.query(Notification).filter(Notification.user_id == current_user.id).order_by(Notification.created_at.desc()).limit(10).all()

    # 5. Personal Statistics
    total_tasks = len(tasks)
    pending_tasks = sum(1 for t in tasks if t.status in ["PENDING", "IN_PROGRESS"])
    completed_tasks = sum(1 for t in tasks if t.status == "COMPLETED")
    
    total_expenses_claimed = sum(e.amount or 0.0 for e in expenses)
    total_expenses_approved = sum(e.amount or 0.0 for e in expenses if e.status == "APPROVED")
    pending_expenses_count = sum(1 for e in expenses if e.status == "PENDING")

    days_present = sum(1 for a in attendances if a.status == "PRESENT")

    return {
        "profile": {
            "name": current_user.full_name,
            "email": current_user.email,
            "role": current_user.role,
            "department": current_user.department,
            "employee_code": employee.employee_code if employee else "N/A",
            "designation": employee.designation if employee else "Staff Member",
            "phone": employee.phone if employee else "N/A",
            "joining_date": str(employee.joining_date) if employee and employee.joining_date else "N/A"
        },
        "stats": {
            "total_tasks": total_tasks,
            "pending_tasks": pending_tasks,
            "completed_tasks": completed_tasks,
            "total_expenses_claimed": round(total_expenses_claimed, 2),
            "total_expenses_approved": round(total_expenses_approved, 2),
            "pending_expenses_count": pending_expenses_count,
            "days_present_recent": days_present
        },
        "tasks": [
            {
                "id": t.id,
                "title": t.title,
                "description": t.description,
                "priority": t.priority,
                "status": t.status,
                "due_date": str(t.due_date) if t.due_date else None
            }
            for t in tasks
        ],
        "expenses": [
            {
                "id": e.id,
                "title": e.title,
                "category": e.category,
                "amount": e.amount,
                "date": str(e.expense_date),
                "status": e.status
            }
            for e in expenses
        ],
        "attendance": [
            {
                "id": a.id,
                "date": str(a.date),
                "status": a.status,
                "check_in": a.check_in,
                "check_out": a.check_out,
                "work_hours": a.total_hours
            }
            for a in attendances
        ],
        "notifications": [
            {
                "id": n.id,
                "title": n.title,
                "message": n.message,
                "type": n.notification_type,
                "is_read": n.is_read,
                "date": n.created_at.strftime("%d %b %Y, %I:%M %p")
            }
            for n in notifications
        ]
    }
