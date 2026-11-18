from fastapi import APIRouter, Depends, UploadFile, File, Form, HTTPException, Response
from sqlalchemy.orm import Session
from datetime import datetime, date
from typing import List, Optional, Dict, Any
import os
import shutil

from app.core.database import get_db
from app.core.config import settings
from app.core.dependencies import get_current_user, require_role, log_audit_event
from app.models.all_models import Employee, Attendance, Expense, Task, Document, User
from app.schemas.office import (
    EmployeeOut, EmployeeCreate,
    AttendanceOut, AttendanceCreate,
    ExpenseOut, ExpenseCreate,
    TaskOut, TaskCreate,
    DocumentOut, DocumentCreate
)

router = APIRouter(prefix="/office", tags=["Office Management"])

# 1. Employees
@router.get("/employees", response_model=List[EmployeeOut])
def get_employees(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return db.query(Employee).filter(Employee.is_active == True).all()

@router.post("/employees", response_model=EmployeeOut)
def create_employee(
    emp_in: EmployeeCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(["admin", "manager"]))
):
    existing = db.query(Employee).filter(Employee.employee_code == emp_in.employee_code).first()
    if existing:
        raise HTTPException(status_code=400, detail="Employee code already exists")

    employee = Employee(**emp_in.dict())
    db.add(employee)
    db.commit()
    db.refresh(employee)
    log_audit_event(db, current_user, "CREATE_EMPLOYEE", "Employee", str(employee.id), {"name": f"{employee.first_name} {employee.last_name}"})
    return employee

# 2. Attendance
@router.get("/attendance", response_model=List[AttendanceOut])
def get_attendance(
    employee_id: Optional[int] = None,
    month: Optional[int] = None,
    year: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = db.query(Attendance)
    if employee_id:
        query = query.filter(Attendance.employee_id == employee_id)
    return query.order_by(Attendance.date.desc()).all()

@router.post("/attendance", response_model=AttendanceOut)
def record_attendance(
    att_in: AttendanceCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    att = Attendance(**att_in.dict())
    db.add(att)
    db.commit()
    db.refresh(att)
    log_audit_event(db, current_user, "RECORD_ATTENDANCE", "Attendance", str(att.id), {"status": att.status, "date": str(att.date)})
    return att

# 3. Expenses
@router.get("/expenses", response_model=List[ExpenseOut])
def get_expenses(
    status: Optional[str] = None,
    category: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = db.query(Expense)
    if status:
        query = query.filter(Expense.status == status)
    if category:
        query = query.filter(Expense.category == category)
    return query.order_by(Expense.expense_date.desc()).all()

@router.post("/expenses", response_model=ExpenseOut)
def create_expense(
    exp_in: ExpenseCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    expense = Expense(**exp_in.dict())
    db.add(expense)
    db.commit()
    db.refresh(expense)
    log_audit_event(db, current_user, "SUBMIT_EXPENSE", "Expense", str(expense.id), {"amount": expense.amount, "title": expense.title})
    return expense

@router.post("/expenses/{expense_id}/approve")
def approve_expense(
    expense_id: int,
    action: str = "APPROVED", # APPROVED or REJECTED
    remarks: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(["admin", "manager"]))
):
    exp = db.query(Expense).filter(Expense.id == expense_id).first()
    if not exp:
        raise HTTPException(status_code=404, detail="Expense record not found")

    exp.status = action
    exp.approved_by = current_user.full_name
    exp.approved_at = datetime.utcnow()
    if remarks:
        exp.remarks = remarks

    db.commit()
    log_audit_event(db, current_user, f"EXPENSE_{action}", "Expense", str(exp.id), {"remarks": remarks})
    return {"message": f"Expense {action.lower()} successfully", "expense_id": exp.id, "status": exp.status}

# 4. Tasks
@router.get("/tasks", response_model=List[TaskOut])
def get_tasks(
    status: Optional[str] = None,
    priority: Optional[str] = None,
    employee_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = db.query(Task)
    if status:
        query = query.filter(Task.status == status)
    if priority:
        query = query.filter(Task.priority == priority)
    if employee_id:
        query = query.filter(Task.assigned_to_employee_id == employee_id)
    return query.order_by(Task.due_date.asc()).all()

@router.post("/tasks", response_model=TaskOut)
def create_task(
    task_in: TaskCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    task = Task(
        title=task_in.title,
        description=task_in.description,
        assigned_to_employee_id=task_in.assigned_to_employee_id,
        created_by_user_id=current_user.id,
        priority=task_in.priority,
        status=task_in.status,
        due_date=task_in.due_date
    )
    db.add(task)
    db.commit()
    db.refresh(task)
    log_audit_event(db, current_user, "CREATE_TASK", "Task", str(task.id), {"title": task.title, "priority": task.priority})
    return task

@router.patch("/tasks/{task_id}/status")
def update_task_status(
    task_id: int,
    status: str, # TODO, IN_PROGRESS, REVIEW, COMPLETED
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    task = db.query(Task).filter(Task.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    task.status = status
    task.updated_at = datetime.utcnow()
    db.commit()
    log_audit_event(db, current_user, "UPDATE_TASK_STATUS", "Task", str(task.id), {"new_status": status})
    return {"message": "Task status updated successfully", "task_id": task.id, "status": task.status}

# 5. Documents
@router.get("/documents", response_model=List[DocumentOut])
def get_documents(
    category: Optional[str] = None,
    search: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = db.query(Document)
    if category:
        query = query.filter(Document.document_category == category)
    if search:
        search_term = f"%{search}%"
        query = query.filter((Document.title.ilike(search_term)) | (Document.tags.ilike(search_term)))
    return query.order_by(Document.created_at.desc()).all()

@router.post("/documents/upload")
async def upload_document(
    title: str = Form(...),
    document_category: str = Form(...),
    access_role: str = Form("ALL"),
    tags: Optional[str] = Form(None),
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    file_bytes = await file.read()
    file_size = len(file_bytes)

    # Save to disk
    safe_filename = f"{datetime.utcnow().strftime('%Y%m%d%H%M%S')}_{file.filename}"
    file_path = os.path.join(settings.UPLOAD_DIR, safe_filename)
    with open(file_path, "wb") as f:
        f.write(file_bytes)

    doc = Document(
        title=title,
        document_category=document_category,
        file_path=file_path,
        file_size=file_size,
        mime_type=file.content_type or "application/octet-stream",
        uploaded_by_user_id=current_user.id,
        access_role=access_role,
        tags=tags
    )
    db.add(doc)
    db.commit()
    db.refresh(doc)
    log_audit_event(db, current_user, "UPLOAD_DOCUMENT", "Document", str(doc.id), {"title": title, "category": document_category})
    return {"message": "Document uploaded successfully", "document_id": doc.id, "title": doc.title}
