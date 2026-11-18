from fastapi import APIRouter, Depends, HTTPException, Response, Query
from sqlalchemy.orm import Session
from datetime import datetime, date, timedelta
from typing import Optional, Dict, Any

from app.core.database import get_db
from app.core.dependencies import get_current_user, log_audit_event
from app.models.all_models import User, MISReport
from app.services.reports.mis_generator import MISReportGenerator

router = APIRouter(prefix="/mis", tags=["MIS Management"])

@router.get("/report")
def get_mis_report(
    period_type: str = Query("MONTHLY", regex="^(DAILY|WEEKLY|MONTHLY|CUSTOM)$"),
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> Dict[str, Any]:
    today = date.today()

    if period_type == "DAILY":
        s_date = today
        e_date = today
    elif period_type == "WEEKLY":
        s_date = today - timedelta(days=7)
        e_date = today
    elif period_type == "MONTHLY":
        s_date = date(today.year, today.month, 1)
        e_date = today
    else: # CUSTOM
        if not start_date or not end_date:
            s_date = date(today.year, today.month, 1)
            e_date = today
        else:
            s_date = datetime.strptime(start_date, "%Y-%m-%d").date()
            e_date = datetime.strptime(end_date, "%Y-%m-%d").date()

    generator = MISReportGenerator(db=db)
    report_data = generator.generate_financial_mis(start_date=s_date, end_date=e_date)
    return report_data

@router.get("/export-excel")
def export_mis_excel(
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    today = date.today()
    s_date = datetime.strptime(start_date, "%Y-%m-%d").date() if start_date else date(today.year, today.month, 1)
    e_date = datetime.strptime(end_date, "%Y-%m-%d").date() if end_date else today

    generator = MISReportGenerator(db=db)
    report_data = generator.generate_financial_mis(start_date=s_date, end_date=e_date)
    excel_bytes = generator.generate_excel_workbook(report_data)

    log_audit_event(db, current_user, "EXPORT_MIS_EXCEL", "MISReport", None, {"start_date": str(s_date), "end_date": str(e_date)})

    return Response(
        content=excel_bytes,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f"attachment; filename=SmartFin_MIS_Report_{s_date}_{e_date}.xlsx"}
    )
