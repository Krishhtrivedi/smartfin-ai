from pydantic import BaseModel
from typing import Optional, List
from datetime import date, datetime

class EmployeeBase(BaseModel):
    employee_code: str
    first_name: str
    last_name: str
    email: str
    phone: Optional[str] = None
    department: str
    designation: str
    joining_date: date = date.today()
    salary: float = 0.0
    is_active: bool = True

class EmployeeCreate(EmployeeBase):
    user_id: Optional[int] = None

class EmployeeOut(EmployeeBase):
    id: int
    user_id: Optional[int] = None
    created_at: datetime
    class Config:
        from_attributes = True

class AttendanceBase(BaseModel):
    employee_id: int
    date: date
    status: str = "PRESENT" # PRESENT, ABSENT, HALF_DAY, ON_LEAVE
    check_in: Optional[str] = None
    check_out: Optional[str] = None
    total_hours: float = 8.0
    leave_type: Optional[str] = None
    notes: Optional[str] = None

class AttendanceCreate(AttendanceBase):
    pass

class AttendanceOut(AttendanceBase):
    id: int
    employee: Optional[EmployeeOut] = None
    created_at: datetime
    class Config:
        from_attributes = True

class ExpenseBase(BaseModel):
    title: str
    category: str # OFFICE_SUPPLIES, TRAVEL, UTILITIES, SOFTWARE, MARKETING, REPAIRS, MEALS, MISC
    amount: float
    expense_date: date
    employee_id: int
    receipt_url: Optional[str] = None
    status: str = "PENDING"
    remarks: Optional[str] = None

class ExpenseCreate(ExpenseBase):
    pass

class ExpenseOut(ExpenseBase):
    id: int
    approved_by: Optional[str] = None
    approved_at: Optional[datetime] = None
    employee: Optional[EmployeeOut] = None
    created_at: datetime
    class Config:
        from_attributes = True

class TaskBase(BaseModel):
    title: str
    description: Optional[str] = None
    assigned_to_employee_id: int
    priority: str = "MEDIUM" # LOW, MEDIUM, HIGH, URGENT
    status: str = "TODO" # TODO, IN_PROGRESS, REVIEW, COMPLETED
    due_date: Optional[date] = None

class TaskCreate(TaskBase):
    pass

class TaskOut(TaskBase):
    id: int
    created_by_user_id: Optional[int] = None
    assigned_employee: Optional[EmployeeOut] = None
    created_at: datetime
    updated_at: datetime
    class Config:
        from_attributes = True

class DocumentBase(BaseModel):
    title: str
    document_category: str # INVOICE, CONTRACT, TAX_RECORD, BANK_STATEMENT, POLICY, EMPLOYEE_DOC, MISC
    file_path: str
    file_size: int = 0
    mime_type: str = "application/pdf"
    access_role: str = "ALL"
    tags: Optional[str] = None

class DocumentCreate(DocumentBase):
    pass

class DocumentOut(DocumentBase):
    id: int
    uploaded_by_user_id: Optional[int] = None
    created_at: datetime
    class Config:
        from_attributes = True
