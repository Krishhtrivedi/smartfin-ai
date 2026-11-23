"""
Projects, Tasks & Meetings API Router
====================================
Manages consulting projects, Kanban milestones, and executive client/internal meetings.
Includes AI meeting summarization and action item extraction.
"""

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from typing import List, Optional, Dict, Any
from datetime import datetime, date
from pydantic import BaseModel

from app.core.database import get_db
from app.core.dependencies import get_current_user, require_role, log_audit_event
from app.models.all_models import Project, Task, Meeting, Customer, Employee, User
from app.services.ai.gemini_client import get_ai_response

router = APIRouter(tags=["Projects & Meetings"])

# ----------------- Projects Schemas -----------------
class ProjectCreateIn(BaseModel):
    name: str
    code: str
    customer_id: Optional[int] = None
    manager_employee_id: Optional[int] = None
    priority: str = "MEDIUM" # LOW, MEDIUM, HIGH, URGENT
    start_date: Optional[date] = None
    due_date: Optional[date] = None
    budget: float = 0.0
    description: Optional[str] = None

class ProjectUpdateIn(BaseModel):
    name: Optional[str] = None
    customer_id: Optional[int] = None
    manager_employee_id: Optional[int] = None
    status: Optional[str] = None # PLANNING, ACTIVE, ON_HOLD, COMPLETED, CANCELLED
    priority: Optional[str] = None
    due_date: Optional[date] = None
    budget: Optional[float] = None
    spent_amount: Optional[float] = None
    completion_percentage: Optional[float] = None
    description: Optional[str] = None

class ProjectTaskIn(BaseModel):
    title: str
    description: Optional[str] = None
    assigned_to_employee_id: int
    priority: str = "MEDIUM"
    status: str = "TODO" # TODO, IN_PROGRESS, REVIEW, COMPLETED
    due_date: Optional[date] = None

# ----------------- Meetings Schemas -----------------
class MeetingCreateIn(BaseModel):
    title: str
    meeting_type: str = "CLIENT_CONSULTATION"
    customer_id: Optional[int] = None
    lead_id: Optional[int] = None
    project_id: Optional[int] = None
    scheduled_time: datetime
    duration_minutes: int = 45
    location_or_link: str = "Vichar Vimarsh Boardroom / Google Meet"
    agenda: Optional[str] = None
    discussion_notes: Optional[str] = None

class MeetingUpdateIn(BaseModel):
    title: Optional[str] = None
    scheduled_time: Optional[datetime] = None
    duration_minutes: Optional[int] = None
    location_or_link: Optional[str] = None
    status: Optional[str] = None # SCHEDULED, COMPLETED, CANCELLED, RESCHEDULED
    agenda: Optional[str] = None
    discussion_notes: Optional[str] = None
    ai_summary: Optional[str] = None
    action_items_json: Optional[str] = None


# ==============================================================================
# PROJECTS & KANBAN TASKS
# ==============================================================================

@router.get("/projects")
def list_projects(
    status: Optional[str] = Query(None),
    q: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = db.query(Project)
    if status:
        query = query.filter(Project.status == status.upper())
    if q and q.strip():
        term = f"%{q.strip()}%"
        query = query.filter((Project.name.ilike(term)) | (Project.code.ilike(term)))
    
    projects = query.order_by(Project.created_at.desc()).all()
    results = []
    for p in projects:
        client_name = p.customer.name if p.customer else "Internal Initiative"
        manager = db.query(Employee).filter(Employee.id == p.manager_employee_id).first()
        manager_name = f"{manager.first_name} {manager.last_name}" if manager else "Unassigned"
        
        # Calculate task counts
        tasks = db.query(Task).filter(Task.project_id == p.id).all()
        completed_tasks = len([t for t in tasks if t.status == "COMPLETED"])
        
        calc_pct = round((completed_tasks / max(1, len(tasks))) * 100, 1) if tasks else p.completion_percentage

        results.append({
            "id": p.id,
            "name": p.name,
            "code": p.code,
            "client_name": client_name,
            "customer_id": p.customer_id,
            "manager_name": manager_name,
            "manager_employee_id": p.manager_employee_id,
            "status": p.status,
            "priority": p.priority,
            "start_date": p.start_date.isoformat() if p.start_date else None,
            "due_date": p.due_date.isoformat() if p.due_date else None,
            "budget": p.budget,
            "spent_amount": p.spent_amount,
            "completion_percentage": calc_pct,
            "task_count": len(tasks),
            "completed_tasks": completed_tasks,
            "description": p.description,
            "created_at": p.created_at.isoformat() if p.created_at else None
        })
    return results

@router.post("/projects")
def create_project(
    payload: ProjectCreateIn,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(["admin", "manager"]))
):
    existing = db.query(Project).filter(Project.code == payload.code.strip().upper()).first()
    if existing:
        raise HTTPException(status_code=400, detail=f"Project code '{payload.code}' already exists.")
    
    project = Project(
        name=payload.name.strip(),
        code=payload.code.strip().upper(),
        customer_id=payload.customer_id,
        manager_employee_id=payload.manager_employee_id,
        status="ACTIVE",
        priority=payload.priority.upper(),
        start_date=payload.start_date or date.today(),
        due_date=payload.due_date,
        budget=payload.budget,
        spent_amount=0.0,
        completion_percentage=0.0,
        description=payload.description
    )
    db.add(project)
    db.commit()
    db.refresh(project)
    log_audit_event(db, current_user, "CREATE_PROJECT", "Project", str(project.id), {"name": project.name, "code": project.code})
    return {"status": "SUCCESS", "id": project.id, "message": f"Project '{project.name}' initialized."}

@router.put("/projects/{project_id}")
def update_project(
    project_id: int,
    payload: ProjectUpdateIn,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    if payload.name is not None:
        project.name = payload.name.strip()
    if payload.customer_id is not None:
        project.customer_id = payload.customer_id
    if payload.manager_employee_id is not None:
        project.manager_employee_id = payload.manager_employee_id
    if payload.status is not None:
        project.status = payload.status.upper()
    if payload.priority is not None:
        project.priority = payload.priority.upper()
    if payload.due_date is not None:
        project.due_date = payload.due_date
    if payload.budget is not None:
        project.budget = payload.budget
    if payload.spent_amount is not None:
        project.spent_amount = payload.spent_amount
    if payload.completion_percentage is not None:
        project.completion_percentage = payload.completion_percentage
    if payload.description is not None:
        project.description = payload.description

    project.updated_at = datetime.utcnow()
    db.commit()
    return {"status": "SUCCESS", "id": project.id, "message": "Project updated."}

@router.delete("/projects/{project_id}")
def delete_project(
    project_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(["admin", "manager"]))
):
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    name = project.name
    db.delete(project)
    db.commit()
    return {"status": "SUCCESS", "message": f"Project '{name}' deleted."}

@router.get("/projects/{project_id}/tasks")
def list_project_tasks(
    project_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    tasks = db.query(Task).filter(Task.project_id == project_id).order_by(Task.due_date.asc()).all()
    results = []
    for t in tasks:
        emp = db.query(Employee).filter(Employee.id == t.assigned_to_employee_id).first()
        results.append({
            "id": t.id,
            "project_id": t.project_id,
            "title": t.title,
            "description": t.description,
            "assigned_to": f"{emp.first_name} {emp.last_name}" if emp else "Unassigned",
            "assigned_employee_id": t.assigned_to_employee_id,
            "priority": t.priority,
            "status": t.status, # TODO, IN_PROGRESS, REVIEW, COMPLETED
            "due_date": t.due_date.isoformat() if t.due_date else None,
            "created_at": t.created_at.isoformat() if t.created_at else None
        })
    return results

@router.post("/projects/{project_id}/tasks")
def add_project_task(
    project_id: int,
    payload: ProjectTaskIn,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    task = Task(
        title=payload.title.strip(),
        description=payload.description,
        project_id=project_id,
        assigned_to_employee_id=payload.assigned_to_employee_id,
        created_by_user_id=current_user.id,
        priority=payload.priority.upper(),
        status=payload.status.upper(),
        due_date=payload.due_date
    )
    db.add(task)
    db.commit()
    db.refresh(task)
    return {"status": "SUCCESS", "id": task.id, "message": "Task added to project."}

@router.put("/tasks/{task_id}/status")
def update_task_status(
    task_id: int,
    status_in: str = Query(..., regex="^(TODO|IN_PROGRESS|REVIEW|COMPLETED)$"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    task = db.query(Task).filter(Task.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    task.status = status_in.upper()
    task.updated_at = datetime.utcnow()
    db.commit()
    return {"status": "SUCCESS", "id": task.id, "new_status": task.status}


# ==============================================================================
# MEETINGS & EXECUTIVE REVIEWS
# ==============================================================================

@router.get("/meetings")
def list_meetings(
    status: Optional[str] = Query(None),
    q: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = db.query(Meeting)
    if status:
        query = query.filter(Meeting.status == status.upper())
    if q and q.strip():
        term = f"%{q.strip()}%"
        query = query.filter((Meeting.title.ilike(term)) | (Meeting.agenda.ilike(term)))
    
    meetings = query.order_by(Meeting.scheduled_time.desc()).all()
    results = []
    for m in meetings:
        client_name = m.customer.name if m.customer else (m.lead.company_name if m.lead else "General / Internal")
        results.append({
            "id": m.id,
            "title": m.title,
            "meeting_type": m.meeting_type,
            "client_name": client_name,
            "customer_id": m.customer_id,
            "lead_id": m.lead_id,
            "project_id": m.project_id,
            "scheduled_time": m.scheduled_time.isoformat() if m.scheduled_time else None,
            "duration_minutes": m.duration_minutes,
            "location_or_link": m.location_or_link,
            "status": m.status,
            "agenda": m.agenda,
            "discussion_notes": m.discussion_notes,
            "ai_summary": m.ai_summary,
            "action_items_json": m.action_items_json,
            "google_calendar_event_id": m.google_calendar_event_id,
            "created_at": m.created_at.isoformat() if m.created_at else None
        })
    return results

@router.post("/meetings")
def schedule_meeting(
    payload: MeetingCreateIn,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    meeting = Meeting(
        title=payload.title.strip(),
        meeting_type=payload.meeting_type.upper(),
        customer_id=payload.customer_id,
        lead_id=payload.lead_id,
        project_id=payload.project_id,
        organizer_user_id=current_user.id,
        scheduled_time=payload.scheduled_time,
        duration_minutes=payload.duration_minutes,
        location_or_link=payload.location_or_link,
        status="SCHEDULED",
        agenda=payload.agenda,
        discussion_notes=payload.discussion_notes
    )
    db.add(meeting)
    db.commit()
    db.refresh(meeting)
    log_audit_event(db, current_user, "SCHEDULE_MEETING", "Meeting", str(meeting.id), {"title": meeting.title, "time": str(meeting.scheduled_time)})
    return {"status": "SUCCESS", "id": meeting.id, "message": f"Meeting '{meeting.title}' scheduled."}

@router.put("/meetings/{meeting_id}")
def update_meeting(
    meeting_id: int,
    payload: MeetingUpdateIn,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    meeting = db.query(Meeting).filter(Meeting.id == meeting_id).first()
    if not meeting:
        raise HTTPException(status_code=404, detail="Meeting not found")

    if payload.title is not None:
        meeting.title = payload.title.strip()
    if payload.scheduled_time is not None:
        meeting.scheduled_time = payload.scheduled_time
    if payload.duration_minutes is not None:
        meeting.duration_minutes = payload.duration_minutes
    if payload.location_or_link is not None:
        meeting.location_or_link = payload.location_or_link
    if payload.status is not None:
        meeting.status = payload.status.upper()
    if payload.agenda is not None:
        meeting.agenda = payload.agenda
    if payload.discussion_notes is not None:
        meeting.discussion_notes = payload.discussion_notes
    if payload.ai_summary is not None:
        meeting.ai_summary = payload.ai_summary
    if payload.action_items_json is not None:
        meeting.action_items_json = payload.action_items_json

    meeting.updated_at = datetime.utcnow()
    db.commit()
    return {"status": "SUCCESS", "id": meeting.id, "message": "Meeting updated."}

@router.delete("/meetings/{meeting_id}")
def delete_meeting(
    meeting_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    meeting = db.query(Meeting).filter(Meeting.id == meeting_id).first()
    if not meeting:
        raise HTTPException(status_code=404, detail="Meeting not found")
    db.delete(meeting)
    db.commit()
    return {"status": "SUCCESS", "message": "Meeting deleted."}

@router.post("/meetings/{meeting_id}/generate-summary")
def generate_meeting_ai_summary(
    meeting_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    meeting = db.query(Meeting).filter(Meeting.id == meeting_id).first()
    if not meeting:
        raise HTTPException(status_code=404, detail="Meeting not found")
    
    notes = meeting.discussion_notes or meeting.agenda or ""
    if not notes.strip():
        raise HTTPException(status_code=400, detail="Cannot generate AI summary: no discussion notes or agenda recorded yet.")

    prompt = f"""You are Vichar Vimarsh's executive meeting synthesizer.
Analyze the following meeting notes for '{meeting.title}' and provide:
1. Concise executive summary (3-4 bullet points)
2. Decisions taken
3. Action items with recommended owners and deadlines

Meeting Notes:
{notes}
"""
    try:
        summary_text = get_ai_response(prompt)
    except Exception as e:
        summary_text = f"Executive Summary:\n• Discussion centered on {meeting.title}.\n• Notes recorded: {notes[:200]}...\n\nAction Items:\n1. Follow up on key deliverables.\n2. Circulate notes to attendees."

    meeting.ai_summary = summary_text
    meeting.status = "COMPLETED"
    meeting.updated_at = datetime.utcnow()
    db.commit()

    return {
        "status": "SUCCESS",
        "meeting_id": meeting.id,
        "ai_summary": summary_text
    }
