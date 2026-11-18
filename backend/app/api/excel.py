from fastapi import APIRouter, Depends, UploadFile, File, Form, HTTPException, Response
from sqlalchemy.orm import Session
from typing import List, Optional, Dict, Any
import json
import io
import pandas as pd

from app.core.database import get_db
from app.core.dependencies import get_current_user, require_role, log_audit_event
from app.models.all_models import ExcelWorkflowTemplate, User
from app.schemas.excel_ai import ExcelTemplateOut, ExcelTemplateCreate, ExcelProcessRequest, ExcelCompareRequest
from app.services.automation.excel_engine import ExcelAutomationEngine

router = APIRouter(prefix="/excel", tags=["Excel Workflow Automation"])

@router.post("/inspect")
async def inspect_excel_file(
    file: UploadFile = File(...),
    sheet_name: Optional[str] = Form(None),
    current_user: User = Depends(get_current_user)
):
    content = await file.read()
    df, sheet_names = ExcelAutomationEngine.read_file(content, file.filename, sheet_name=sheet_name)
    inspection = ExcelAutomationEngine.inspect_dataframe(df)
    inspection["available_sheets"] = sheet_names
    inspection["filename"] = file.filename
    return inspection

@router.post("/process")
async def process_and_clean_file(
    file: UploadFile = File(...),
    options: str = Form(...), # JSON string of ExcelProcessRequest
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    content = await file.read()
    req_dict = json.loads(options)

    df, _ = ExcelAutomationEngine.read_file(content, file.filename, sheet_name=req_dict.get("sheet_name"))
    df_cleaned, stats = ExcelAutomationEngine.clean_and_normalize(
        df=df,
        remove_duplicates=req_dict.get("remove_duplicates", True),
        dedup_columns=req_dict.get("dedup_columns"),
        normalize_dates=req_dict.get("normalize_dates", True),
        date_columns=req_dict.get("date_columns"),
        normalize_amounts=req_dict.get("normalize_amounts", True),
        amount_columns=req_dict.get("amount_columns"),
        fill_missing=req_dict.get("fill_missing"),
        drop_empty_rows=req_dict.get("drop_empty_rows", True)
    )

    log_audit_event(db, current_user, "PROCESS_EXCEL_DATA", "Excel", None, {"filename": file.filename, "stats": stats})

    return {
        "stats": stats,
        "preview": df_cleaned.head(20).replace({float("nan"): None}).to_dict(orient="records"),
        "columns": list(df_cleaned.columns),
        "total_rows": len(df_cleaned)
    }

@router.post("/download-cleaned")
async def download_cleaned_file(
    file: UploadFile = File(...),
    options: str = Form(...),
    current_user: User = Depends(get_current_user)
):
    content = await file.read()
    req_dict = json.loads(options)

    df, _ = ExcelAutomationEngine.read_file(content, file.filename, sheet_name=req_dict.get("sheet_name"))
    df_cleaned, _ = ExcelAutomationEngine.clean_and_normalize(
        df=df,
        remove_duplicates=req_dict.get("remove_duplicates", True),
        dedup_columns=req_dict.get("dedup_columns"),
        normalize_dates=req_dict.get("normalize_dates", True),
        date_columns=req_dict.get("date_columns"),
        normalize_amounts=req_dict.get("normalize_amounts", True),
        amount_columns=req_dict.get("amount_columns"),
        fill_missing=req_dict.get("fill_missing"),
        drop_empty_rows=req_dict.get("drop_empty_rows", True)
    )

    excel_bytes = ExcelAutomationEngine.export_to_excel_bytes(df_cleaned, sheet_name="Cleaned_Data")

    return Response(
        content=excel_bytes,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f"attachment; filename=Cleaned_{file.filename}.xlsx"}
    )

@router.post("/compare")
async def compare_excel_sheets(
    file_a: UploadFile = File(...),
    file_b: UploadFile = File(...),
    key_column: str = Form(...),
    tolerance: float = Form(0.0),
    compare_columns: Optional[str] = Form(None), # Comma-separated
    current_user: User = Depends(get_current_user)
):
    content_a = await file_a.read()
    content_b = await file_b.read()

    df_a, _ = ExcelAutomationEngine.read_file(content_a, file_a.filename)
    df_b, _ = ExcelAutomationEngine.read_file(content_b, file_b.filename)

    cols = [c.strip() for c in compare_columns.split(",")] if compare_columns else None
    result = ExcelAutomationEngine.compare_sheets(
        df_a=df_a,
        df_b=df_b,
        key_column=key_column,
        compare_columns=cols,
        tolerance=tolerance
    )
    return result

@router.get("/templates", response_model=List[ExcelTemplateOut])
def get_workflow_templates(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return db.query(ExcelWorkflowTemplate).all()

@router.post("/templates", response_model=ExcelTemplateOut)
def create_workflow_template(
    template_in: ExcelTemplateCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    tmpl = ExcelWorkflowTemplate(
        name=template_in.name,
        description=template_in.description,
        workflow_type=template_in.workflow_type,
        configuration_json=template_in.configuration_json,
        created_by_user_id=current_user.id,
        is_reusable=template_in.is_reusable
    )
    db.add(tmpl)
    db.commit()
    db.refresh(tmpl)
    log_audit_event(db, current_user, "CREATE_WORKFLOW_TEMPLATE", "ExcelTemplate", str(tmpl.id), {"name": tmpl.name})
    return tmpl
