from pydantic import BaseModel
from typing import List, Dict, Any, Optional

class FinancialKPIs(BaseModel):
    total_sales: float
    total_purchases: float
    gst_payable: float
    gst_receivable: float
    net_gst: float
    tds_summary: Dict[str, float]
    total_bank_balance: float
    vendor_outstanding: float
    customer_outstanding: float
    monthly_expenses: float
    net_profit: float
    invoices_pending_count: int

class MonthlyRevenueItem(BaseModel):
    month: str
    sales: float
    purchases: float
    expenses: float
    profit: float

class CategoryExpenseItem(BaseModel):
    category: str
    amount: float
    percentage: float

class StatusCountItem(BaseModel):
    name: str
    count: int
    amount: Optional[float] = 0.0

class PendingApprovalItem(BaseModel):
    id: int
    type: str # EXPENSE, GST_RECON, BANK_RECON, TDS
    title: str
    amount: float
    submitted_by: str
    date: str

class RecentActivityItem(BaseModel):
    id: int
    user_email: str
    action: str
    entity_type: Optional[str]
    created_at: str

class DashboardResponse(BaseModel):
    kpis: FinancialKPIs
    monthly_trends: List[MonthlyRevenueItem]
    expense_breakdown: List[CategoryExpenseItem]
    gst_status: Dict[str, int]
    bank_reconciliation_status: Dict[str, int]
    vendor_payment_status: Dict[str, int]
    customer_collection_status: Dict[str, int]
    pending_approvals: List[PendingApprovalItem]
    recent_activities: List[RecentActivityItem]
