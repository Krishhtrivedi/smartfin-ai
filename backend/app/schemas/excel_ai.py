from pydantic import BaseModel
from typing import Optional, List, Dict, Any

class ExcelTemplateBase(BaseModel):
    name: str
    description: Optional[str] = None
    workflow_type: str # CLEANING, RECONCILIATION, MERGE, SHEET_COMPARE
    configuration_json: str # JSON string of rules
    is_reusable: bool = True

class ExcelTemplateCreate(ExcelTemplateBase):
    pass

class ExcelTemplateOut(ExcelTemplateBase):
    id: int
    created_at: str
    class Config:
        from_attributes = True

class ExcelProcessRequest(BaseModel):
    template_id: Optional[int] = None
    remove_duplicates: bool = True
    dedup_columns: Optional[List[str]] = None
    normalize_dates: bool = True
    date_columns: Optional[List[str]] = None
    normalize_amounts: bool = True
    amount_columns: Optional[List[str]] = None
    fill_missing: Optional[Dict[str, Any]] = None # {"col": "value"}
    drop_empty_rows: bool = True
    sheet_name: Optional[str] = None

class ExcelCompareRequest(BaseModel):
    key_column: str
    compare_columns: Optional[List[str]] = None
    tolerance: float = 0.0

class MISGenerateRequest(BaseModel):
    report_type: str # FINANCIAL_SUMMARY, PROFIT_LOSS, CASH_FLOW, GST_MIS, TDS_MIS, RECONCILIATION_STATUS, EXECUTIVE_DASHBOARD
    period_type: str = "MONTHLY" # DAILY, WEEKLY, MONTHLY, CUSTOM
    start_date: str
    end_date: str

class AIChatMessage(BaseModel):
    role: str # user or assistant
    content: str
    timestamp: Optional[str] = None

class AIChatRequest(BaseModel):
    prompt: str
    context_type: Optional[str] = "GENERAL" # GENERAL, GST, BANK, VENDOR, TDS, MIS

class AIChatResponse(BaseModel):
    reply: str
    sources: Optional[List[Dict[str, Any]]] = None
    suggested_actions: Optional[List[str]] = None
