"""
CRM Leads & Pipeline Management Router
======================================
Implements full lead tracking: New -> Contacted -> Meeting Scheduled ->
Proposal Sent -> Negotiation -> Converted / Lost.
Allows 1-click conversion from Lead to registered Customer in Master Directory.
"""

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from typing import List, Optional, Dict, Any
from datetime import datetime, date
from pydantic import BaseModel

from app.core.database import get_db
from app.core.dependencies import get_current_user, require_role, log_audit_event
from app.models.all_models import Lead, LeadActivity, Customer, User
from app.services.automation.master_importer import sanitize_folder_name

router = APIRouter(prefix="/crm", tags=["CRM & Leads"])

class LeadCreateIn(BaseModel):
    company_name: str
    contact_person: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    pan: Optional[str] = None
    gstin: Optional[str] = None
    stage: str = "NEW"
    service_interest: str = "TAX_AUDIT_ADVISORY"
    expected_value: float = 0.0
    probability: int = 20
    source: str = "DIRECT_INQUIRY"
    next_follow_up_date: Optional[date] = None
    notes: Optional[str] = None

class LeadUpdateIn(BaseModel):
    company_name: Optional[str] = None
    contact_person: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    pan: Optional[str] = None
    gstin: Optional[str] = None
    stage: Optional[str] = None
    service_interest: Optional[str] = None
    expected_value: Optional[float] = None
    probability: Optional[int] = None
    source: Optional[str] = None
    next_follow_up_date: Optional[date] = None
    notes: Optional[str] = None

class ActivityCreateIn(BaseModel):
    activity_type: str # CALL, EMAIL, WHATSAPP, MEETING, PROPOSAL, NOTE
    title: str
    description: Optional[str] = None

@router.get("/leads")
def list_leads(
    stage: Optional[str] = Query(None, description="Filter by stage"),
    q: Optional[str] = Query(None, description="Search company, contact, email or phone"),
    limit: int = Query(100, ge=1, le=500),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = db.query(Lead)
    if stage:
        query = query.filter(Lead.stage == stage)
    if q and q.strip():
        term = f"%{q.strip()}%"
        query = query.filter(
            (Lead.company_name.ilike(term)) |
            (Lead.contact_person.ilike(term)) |
            (Lead.email.ilike(term)) |
            (Lead.phone.ilike(term))
        )
    
    total = query.count()
    leads = query.order_by(Lead.updated_at.desc()).offset(offset).limit(limit).all()

    return {
        "total": total,
        "leads": [
            {
                "id": l.id,
                "company_name": l.company_name,
                "contact_person": l.contact_person,
                "email": l.email,
                "phone": l.phone,
                "pan": l.pan,
                "gstin": l.gstin,
                "stage": l.stage,
                "service_interest": l.service_interest,
                "expected_value": l.expected_value,
                "probability": l.probability,
                "source": l.source,
                "next_follow_up_date": l.next_follow_up_date.isoformat() if l.next_follow_up_date else None,
                "notes": l.notes,
                "customer_id": l.customer_id,
                "created_at": l.created_at.isoformat() if l.created_at else None,
                "updated_at": l.updated_at.isoformat() if l.updated_at else None,
            }
            for l in leads
        ]
    }

@router.get("/pipeline-summary")
def get_pipeline_summary(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    stages = ["NEW", "CONTACTED", "MEETING_SCHEDULED", "PROPOSAL_SENT", "NEGOTIATION", "CONVERTED", "LOST"]
    summary = {s: {"count": 0, "total_value": 0.0} for s in stages}
    
    all_leads = db.query(Lead).all()
    total_pipeline_value = 0.0
    active_leads_count = 0
    converted_count = 0

    for l in all_leads:
        st = l.stage if l.stage in summary else "NEW"
        val = l.expected_value or 0.0
        summary[st]["count"] += 1
        summary[st]["total_value"] += val

        if st not in ("CONVERTED", "LOST"):
            total_pipeline_value += val
            active_leads_count += 1
        elif st == "CONVERTED":
            converted_count += 1

    conversion_rate = (converted_count / max(1, len(all_leads))) * 100

    return {
        "stages": summary,
        "total_leads": len(all_leads),
        "active_leads": active_leads_count,
        "converted_leads": converted_count,
        "conversion_rate_pct": round(conversion_rate, 1),
        "total_pipeline_value": round(total_pipeline_value, 2)
    }

@router.get("/leads/{lead_id}")
def get_lead_details(
    lead_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    lead = db.query(Lead).filter(Lead.id == lead_id).first()
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
    
    activities = db.query(LeadActivity).filter(LeadActivity.lead_id == lead_id).order_by(LeadActivity.created_at.desc()).all()
    
    return {
        "lead": {
            "id": lead.id,
            "company_name": lead.company_name,
            "contact_person": lead.contact_person,
            "email": lead.email,
            "phone": lead.phone,
            "pan": lead.pan,
            "gstin": lead.gstin,
            "stage": lead.stage,
            "service_interest": lead.service_interest,
            "expected_value": lead.expected_value,
            "probability": lead.probability,
            "source": lead.source,
            "next_follow_up_date": lead.next_follow_up_date.isoformat() if lead.next_follow_up_date else None,
            "notes": lead.notes,
            "customer_id": lead.customer_id,
            "created_at": lead.created_at.isoformat() if lead.created_at else None,
            "updated_at": lead.updated_at.isoformat() if lead.updated_at else None,
        },
        "activities": [
            {
                "id": a.id,
                "activity_type": a.activity_type,
                "title": a.title,
                "description": a.description,
                "performed_by_email": a.performed_by_email,
                "created_at": a.created_at.isoformat() if a.created_at else None
            }
            for a in activities
        ]
    }

@router.post("/leads")
def create_lead(
    payload: LeadCreateIn,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    lead = Lead(
        company_name=payload.company_name.strip(),
        contact_person=payload.contact_person.strip() if payload.contact_person else None,
        email=payload.email.strip().lower() if payload.email else None,
        phone=payload.phone.strip() if payload.phone else None,
        pan=payload.pan.strip().upper() if payload.pan else None,
        gstin=payload.gstin.strip().upper() if payload.gstin else None,
        stage=payload.stage.upper(),
        service_interest=payload.service_interest,
        expected_value=payload.expected_value,
        probability=payload.probability,
        source=payload.source,
        next_follow_up_date=payload.next_follow_up_date,
        notes=payload.notes,
        assigned_to_user_id=current_user.id
    )
    db.add(lead)
    db.commit()
    db.refresh(lead)

    # Initial activity
    act = LeadActivity(
        lead_id=lead.id,
        activity_type="NOTE",
        title="Lead Created",
        description=f"Inquired about {lead.service_interest}. Source: {lead.source}",
        performed_by_email=current_user.email
    )
    db.add(act)
    db.commit()

    log_audit_event(db, current_user, "CREATE_LEAD", "Lead", str(lead.id), {"company": lead.company_name, "stage": lead.stage})
    return {"status": "SUCCESS", "id": lead.id, "message": f"Lead for '{lead.company_name}' created successfully."}

@router.put("/leads/{lead_id}")
def update_lead(
    lead_id: int,
    payload: LeadUpdateIn,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    lead = db.query(Lead).filter(Lead.id == lead_id).first()
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
    
    old_stage = lead.stage

    if payload.company_name is not None:
        lead.company_name = payload.company_name.strip()
    if payload.contact_person is not None:
        lead.contact_person = payload.contact_person.strip()
    if payload.email is not None:
        lead.email = payload.email.strip().lower()
    if payload.phone is not None:
        lead.phone = payload.phone.strip()
    if payload.pan is not None:
        lead.pan = payload.pan.strip().upper()
    if payload.gstin is not None:
        lead.gstin = payload.gstin.strip().upper()
    if payload.stage is not None:
        lead.stage = payload.stage.upper()
    if payload.service_interest is not None:
        lead.service_interest = payload.service_interest
    if payload.expected_value is not None:
        lead.expected_value = payload.expected_value
    if payload.probability is not None:
        lead.probability = payload.probability
    if payload.source is not None:
        lead.source = payload.source
    if payload.next_follow_up_date is not None:
        lead.next_follow_up_date = payload.next_follow_up_date
    if payload.notes is not None:
        lead.notes = payload.notes

    lead.updated_at = datetime.utcnow()

    # If stage changed, log activity
    if payload.stage and payload.stage.upper() != old_stage:
        act = LeadActivity(
            lead_id=lead.id,
            activity_type="STAGE_CHANGE",
            title=f"Stage moved to {payload.stage.upper()}",
            description=f"Pipeline status updated from {old_stage} to {payload.stage.upper()}",
            performed_by_email=current_user.email
        )
        db.add(act)

    db.commit()
    db.refresh(lead)

    return {"status": "SUCCESS", "id": lead.id, "message": f"Lead '{lead.company_name}' updated."}

@router.delete("/leads/{lead_id}")
def delete_lead(
    lead_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(["admin", "manager"]))
):
    lead = db.query(Lead).filter(Lead.id == lead_id).first()
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
    
    name = lead.company_name
    db.delete(lead)
    db.commit()
    log_audit_event(db, current_user, "DELETE_LEAD", "Lead", str(lead_id), {"company": name})
    return {"status": "SUCCESS", "message": f"Lead '{name}' deleted."}

@router.post("/leads/{lead_id}/activities")
def add_lead_activity(
    lead_id: int,
    payload: ActivityCreateIn,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    lead = db.query(Lead).filter(Lead.id == lead_id).first()
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
    
    act = LeadActivity(
        lead_id=lead.id,
        activity_type=payload.activity_type.upper(),
        title=payload.title.strip(),
        description=payload.description,
        performed_by_email=current_user.email
    )
    db.add(act)
    lead.updated_at = datetime.utcnow()
    db.commit()

    return {"status": "SUCCESS", "id": act.id, "message": "Activity logged."}

@router.post("/leads/{lead_id}/convert")
def convert_lead_to_customer(
    lead_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(["admin", "accountant"]))
):
    lead = db.query(Lead).filter(Lead.id == lead_id).first()
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
    
    # Check if already converted
    if lead.customer_id:
        existing_c = db.query(Customer).filter(Customer.id == lead.customer_id).first()
        if existing_c:
            return {"status": "ALREADY_CONVERTED", "customer_id": existing_c.id, "name": existing_c.name}

    # Clean identifiers
    clean_gstin = lead.gstin.strip().upper() if lead.gstin else None
    clean_pan = lead.pan.strip().upper() if lead.pan else (clean_gstin[2:12] if clean_gstin and len(clean_gstin) >= 12 else None)

    # Check if customer already exists by GSTIN or PAN
    existing = None
    if clean_gstin:
        existing = db.query(Customer).filter(Customer.gstin == clean_gstin).first()
    if not existing and clean_pan:
        existing = db.query(Customer).filter(Customer.pan == clean_pan).first()

    if existing:
        lead.customer_id = existing.id
        lead.stage = "CONVERTED"
        lead.probability = 100
        db.commit()
        return {"status": "LINKED_EXISTING", "customer_id": existing.id, "name": existing.name}

    folder_name = sanitize_folder_name(lead.company_name)
    new_customer = Customer(
        name=lead.company_name.strip(),
        trade_name=lead.company_name.strip(),
        contact_person=lead.contact_person,
        gstin=clean_gstin,
        pan=clean_pan,
        email=lead.email,
        phone=lead.phone,
        folder_name=folder_name,
        aliases=lead.company_name.strip(),
        auto_email_dispatch=True,
        auto_whatsapp_dispatch=True,
        compliance_status="ACTIVE",
        credit_limit=100000.0,
        outstanding_balance=0.0
    )
    db.add(new_customer)
    db.commit()
    db.refresh(new_customer)

    lead.customer_id = new_customer.id
    lead.stage = "CONVERTED"
    lead.probability = 100
    lead.updated_at = datetime.utcnow()

    act = LeadActivity(
        lead_id=lead.id,
        activity_type="CONVERSION",
        title="Converted to Active Client",
        description=f"Successfully onboarded into Master Directory (Customer #{new_customer.id})",
        performed_by_email=current_user.email
    )
    db.add(act)
    db.commit()

    log_audit_event(db, current_user, "CONVERT_LEAD", "Customer", str(new_customer.id), {"lead_id": lead.id, "company": new_customer.name})
    return {
        "status": "SUCCESS",
        "customer_id": new_customer.id,
        "name": new_customer.name,
        "message": f"Lead '{lead.company_name}' successfully converted to active client in Master Directory!"
    }
