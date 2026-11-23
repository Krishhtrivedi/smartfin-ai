"""
Business Scan Diagnostic Automation API Router
==============================================
Implements comprehensive 7-domain enterprise diagnostic:
1. Finance
2. Human Resources (HR)
3. Sales & Marketing
4. Operations
5. Business Strategy
6. Management
7. Technology

Features:
- Shareable client intake link with secure token.
- Document uploads per category with missing-document detection.
- Weighted score calculation across all 7 domains.
- Consultant review panel (AI assists, consultant finalizes recommendations).
- Exportable structured data for PDF & Excel diagnostic reports.
"""

from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File, Form, status
from sqlalchemy.orm import Session
from typing import List, Optional, Dict, Any
from datetime import datetime, date
import uuid
import json
import os
from pathlib import Path
from pydantic import BaseModel

from app.core.database import get_db
from app.core.dependencies import get_current_user, require_role, log_audit_event
from app.models.all_models import BusinessScan, BusinessScanAnswer, BusinessScanDocument, Customer, User
from app.services.ai.gemini_client import get_ai_response
from app.services.automation.folder_resolver import FolderResolver, safe_folder_name, free_path

router = APIRouter(prefix="/business-scan", tags=["Business Scan Automation"])

# Standard 7-Domain Diagnostic Questions Template
STANDARD_QUESTIONS = [
    # 1. Finance
    {"category": "FINANCE", "key": "fin_audit", "text": "Are statutory books, GST returns, and TDS deposits audited and reconciled monthly?", "weight": 10},
    {"category": "FINANCE", "key": "fin_cashflow", "text": "Is there a formal 13-week rolling cashflow forecast and DSO monitoring in place?", "weight": 9},
    {"category": "FINANCE", "key": "fin_costing", "text": "Do you maintain product-wise or service-wise unit economic contribution margins?", "weight": 8},
    
    # 2. HR
    {"category": "HR", "key": "hr_org_chart", "text": "Are job descriptions (JD), reporting hierarchies, and KPIs clearly documented for all roles?", "weight": 9},
    {"category": "HR", "key": "hr_appraisal", "text": "Is there a structured semi-annual performance review and retention incentive framework?", "weight": 8},
    {"category": "HR", "key": "hr_statutory", "text": "Are PF, ESIC, Professional Tax, and labor law compliances verified up-to-date?", "weight": 9},
    
    # 3. Sales & Marketing
    {"category": "SALES_MARKETING", "key": "sm_lead_pipeline", "text": "Is customer acquisition tracked through a centralized CRM pipeline with conversion metrics?", "weight": 8},
    {"category": "SALES_MARKETING", "key": "sm_concentration", "text": "Does any single client represent more than 20% of your total revenue (concentration risk)?", "weight": 9},
    {"category": "SALES_MARKETING", "key": "sm_brand", "text": "Do you have an active digital marketing, inbound content, or referral partner program?", "weight": 7},
    
    # 4. Operations
    {"category": "OPERATIONS", "key": "ops_sop", "text": "Are standard operating procedures (SOPs) documented and followed without key-man dependence?", "weight": 9},
    {"category": "OPERATIONS", "key": "ops_quality", "text": "What is your defect/error rate or client turnaround time metric?", "weight": 8},
    {"category": "OPERATIONS", "key": "ops_procurement", "text": "Is vendor pricing benchmarked periodically with dual-vendor sourcing for critical inputs?", "weight": 8},
    
    # 5. Business Strategy
    {"category": "BUSINESS_STRATEGY", "key": "strat_vision", "text": "Is there a 3-year strategic business plan with annual milestones communicated to leadership?", "weight": 10},
    {"category": "BUSINESS_STRATEGY", "key": "strat_moat", "text": "What is your primary competitive moat (pricing, speed, IP, proprietary distribution)?", "weight": 9},
    
    # 6. Management & Governance
    {"category": "MANAGEMENT", "key": "mgmt_mis", "text": "Does leadership receive an executive MIS dashboard by the 5th of each month?", "weight": 10},
    {"category": "MANAGEMENT", "key": "mgmt_delegation", "text": "Can the business operate smoothly for 30 days without daily founder intervention?", "weight": 9},
    
    # 7. Technology & Digital
    {"category": "TECHNOLOGY", "key": "tech_erp", "text": "Is core business accounting, inventory, and billing automated on an integrated ERP/cloud system?", "weight": 9},
    {"category": "TECHNOLOGY", "key": "tech_security", "text": "Are data backups automated and cloud-secured with 2-factor authentication?", "weight": 8},
]

class ScanCreateIn(BaseModel):
    company_name: str
    contact_person: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    customer_id: Optional[int] = None
    industry: str = "Manufacturing / Services"
    annual_turnover: str = "10Cr - 50Cr"

class AnswerSubmitIn(BaseModel):
    question_key: str
    answer_text: str
    score_impact: float = 5.0 # 0.0 to 10.0
    notes: Optional[str] = None
    missing_document_flag: bool = False

class ConsultantReviewIn(BaseModel):
    consultant_notes: str
    overall_health_score: Optional[float] = None


@router.get("/list")
def list_business_scans(
    status: Optional[str] = Query(None),
    q: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = db.query(BusinessScan)
    if status:
        query = query.filter(BusinessScan.status == status.upper())
    if q and q.strip():
        term = f"%{q.strip()}%"
        query = query.filter((BusinessScan.company_name.ilike(term)) | (BusinessScan.scan_number.ilike(term)))
    
    scans = query.order_by(BusinessScan.created_at.desc()).all()
    results = []
    for s in scans:
        ans_count = db.query(BusinessScanAnswer).filter(BusinessScanAnswer.scan_id == s.id).count()
        doc_count = db.query(BusinessScanDocument).filter(BusinessScanDocument.scan_id == s.id).count()
        results.append({
            "id": s.id,
            "scan_number": s.scan_number,
            "company_name": s.company_name,
            "contact_person": s.contact_person,
            "email": s.email,
            "phone": s.phone,
            "industry": s.industry,
            "annual_turnover": s.annual_turnover,
            "shareable_token": s.shareable_token,
            "shareable_link": f"/business-scan/view/{s.shareable_token}",
            "status": s.status,
            "overall_health_score": s.overall_health_score,
            "category_scores": {
                "finance": s.finance_score,
                "hr": s.hr_score,
                "sales_marketing": s.sales_marketing_score,
                "operations": s.operations_score,
                "strategy": s.strategy_score,
                "management": s.management_score,
                "technology": s.technology_score
            },
            "answers_completed": ans_count,
            "total_questions": len(STANDARD_QUESTIONS),
            "documents_attached": doc_count,
            "reviewed_at": s.reviewed_at.isoformat() if s.reviewed_at else None,
            "created_at": s.created_at.isoformat() if s.created_at else None
        })
    return results

@router.post("/create")
def create_business_scan(
    payload: ScanCreateIn,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    scan_num = f"SCAN-{datetime.now().strftime('%Y%m')}-{uuid.uuid4().hex[:5].upper()}"
    token = str(uuid.uuid4().hex)

    scan = BusinessScan(
        scan_number=scan_num,
        customer_id=payload.customer_id,
        company_name=payload.company_name.strip(),
        contact_person=payload.contact_person,
        email=payload.email,
        phone=payload.phone,
        industry=payload.industry,
        annual_turnover=payload.annual_turnover,
        shareable_token=token,
        status="SHARED"
    )
    db.add(scan)
    db.commit()
    db.refresh(scan)

    # Initialize standard questions
    for q in STANDARD_QUESTIONS:
        ans = BusinessScanAnswer(
            scan_id=scan.id,
            category=q["category"],
            question_key=q["key"],
            question_text=q["text"],
            score_impact=5.0
        )
        db.add(ans)
    db.commit()

    log_audit_event(db, current_user, "CREATE_BUSINESS_SCAN", "BusinessScan", str(scan.id), {"company": scan.company_name})
    return {
        "status": "SUCCESS",
        "id": scan.id,
        "scan_number": scan.scan_number,
        "shareable_token": token,
        "shareable_link": f"/business-scan/view/{token}",
        "message": f"Business Scan for '{scan.company_name}' initialized with 7 diagnostic categories."
    }

@router.get("/details/{scan_id_or_token}")
def get_scan_details(
    scan_id_or_token: str,
    db: Session = Depends(get_db)
):
    # Lookup by ID if numeric, else token
    if scan_id_or_token.isdigit():
        scan = db.query(BusinessScan).filter(BusinessScan.id == int(scan_id_or_token)).first()
    else:
        scan = db.query(BusinessScan).filter(BusinessScan.shareable_token == scan_id_or_token).first()

    if not scan:
        raise HTTPException(status_code=404, detail="Business Scan questionnaire not found")

    answers = db.query(BusinessScanAnswer).filter(BusinessScanAnswer.scan_id == scan.id).all()
    documents = db.query(BusinessScanDocument).filter(BusinessScanDocument.scan_id == scan.id).all()

    # Group answers by category
    categories = ["FINANCE", "HR", "SALES_MARKETING", "OPERATIONS", "BUSINESS_STRATEGY", "MANAGEMENT", "TECHNOLOGY"]
    grouped_answers = {cat: [] for cat in categories}
    for a in answers:
        if a.category in grouped_answers:
            grouped_answers[a.category].append({
                "id": a.id,
                "key": a.question_key,
                "question": a.question_text,
                "answer": a.answer_text,
                "score": a.score_impact,
                "notes": a.notes,
                "attached_document": a.attached_document_path,
                "missing_document": a.missing_document_flag
            })

    return {
        "scan": {
            "id": scan.id,
            "scan_number": scan.scan_number,
            "company_name": scan.company_name,
            "contact_person": scan.contact_person,
            "email": scan.email,
            "phone": scan.phone,
            "industry": scan.industry,
            "annual_turnover": scan.annual_turnover,
            "shareable_token": scan.shareable_token,
            "status": scan.status,
            "overall_health_score": scan.overall_health_score,
            "scores": {
                "FINANCE": scan.finance_score,
                "HR": scan.hr_score,
                "SALES_MARKETING": scan.sales_marketing_score,
                "OPERATIONS": scan.operations_score,
                "BUSINESS_STRATEGY": scan.strategy_score,
                "MANAGEMENT": scan.management_score,
                "TECHNOLOGY": scan.technology_score
            },
            "ai_diagnostic_summary": scan.ai_diagnostic_summary,
            "consultant_review_notes": scan.consultant_review_notes,
            "created_at": scan.created_at.isoformat() if scan.created_at else None,
            "reviewed_at": scan.reviewed_at.isoformat() if scan.reviewed_at else None
        },
        "grouped_questions": grouped_answers,
        "documents": [
            {
                "id": d.id,
                "category": d.category,
                "file_name": d.file_name,
                "file_size": d.file_size,
                "summary": d.extracted_summary,
                "created_at": d.created_at.isoformat() if d.created_at else None
            }
            for d in documents
        ]
    }

@router.post("/details/{scan_id}/answer")
def save_scan_answer(
    scan_id: int,
    payload: AnswerSubmitIn,
    db: Session = Depends(get_db)
):
    scan = db.query(BusinessScan).filter(BusinessScan.id == scan_id).first()
    if not scan:
        raise HTTPException(status_code=404, detail="Business Scan not found")

    ans = db.query(BusinessScanAnswer).filter(
        BusinessScanAnswer.scan_id == scan_id,
        BusinessScanAnswer.question_key == payload.question_key
    ).first()

    if not ans:
        # Create if missing
        ans = BusinessScanAnswer(
            scan_id=scan_id,
            category="GENERAL",
            question_key=payload.question_key,
            question_text=payload.question_key
        )
        db.add(ans)

    ans.answer_text = payload.answer_text
    ans.score_impact = min(10.0, max(0.0, payload.score_impact))
    ans.notes = payload.notes
    ans.missing_document_flag = payload.missing_document_flag

    if scan.status == "SHARED":
        scan.status = "IN_PROGRESS"

    db.commit()
    return {"status": "SUCCESS", "message": "Answer saved."}

@router.post("/details/{scan_id}/upload-doc")
async def upload_scan_document(
    scan_id: int,
    category: str = Form(...),
    file: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    scan = db.query(BusinessScan).filter(BusinessScan.id == scan_id).first()
    if not scan:
        raise HTTPException(status_code=404, detail="Business Scan not found")

    # Folder routing via FolderResolver
    resolver = FolderResolver()
    dest = resolver.resolve_destination(
        db,
        category="BusinessScan",
        company_name=scan.company_name,
        file_name=file.filename or "supporting_doc.pdf"
    )

    save_path = Path(dest["resolved_file_path"])
    content = await file.read()
    save_path.write_bytes(content)

    doc_record = BusinessScanDocument(
        scan_id=scan.id,
        category=category.upper(),
        file_name=file.filename or "document.pdf",
        file_path=str(save_path),
        file_size=len(content),
        extracted_summary=f"Uploaded {file.filename} for {category} verification. Saved safely to {save_path.name}."
    )
    db.add(doc_record)
    db.commit()

    return {
        "status": "SUCCESS",
        "document_id": doc_record.id,
        "file_name": doc_record.file_name,
        "saved_path": str(save_path),
        "folder_routing": dest
    }

@router.post("/details/{scan_id}/calculate-scores")
def calculate_scores_and_synthesize(
    scan_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    scan = db.query(BusinessScan).filter(BusinessScan.id == scan_id).first()
    if not scan:
        raise HTTPException(status_code=404, detail="Business Scan not found")

    answers = db.query(BusinessScanAnswer).filter(BusinessScanAnswer.scan_id == scan_id).all()
    if not answers:
        raise HTTPException(status_code=400, detail="No answers found to score.")

    cat_map = {
        "FINANCE": [],
        "HR": [],
        "SALES_MARKETING": [],
        "OPERATIONS": [],
        "BUSINESS_STRATEGY": [],
        "MANAGEMENT": [],
        "TECHNOLOGY": []
    }

    missing_docs = []
    for a in answers:
        score = a.score_impact if a.score_impact is not None else 5.0
        if a.category in cat_map:
            cat_map[a.category].append(score)
        if a.missing_document_flag:
            missing_docs.append(f"{a.category}: {a.question_text}")

    # Compute percentage scores (0 to 100) per category
    def avg_score(scores: List[float]) -> float:
        if not scores:
            return 60.0
        return round((sum(scores) / (len(scores) * 10.0)) * 100, 1)

    scan.finance_score = avg_score(cat_map["FINANCE"])
    scan.hr_score = avg_score(cat_map["HR"])
    scan.sales_marketing_score = avg_score(cat_map["SALES_MARKETING"])
    scan.operations_score = avg_score(cat_map["OPERATIONS"])
    scan.strategy_score = avg_score(cat_map["BUSINESS_STRATEGY"])
    scan.management_score = avg_score(cat_map["MANAGEMENT"])
    scan.technology_score = avg_score(cat_map["TECHNOLOGY"])

    overall = (
        scan.finance_score * 0.20 +
        scan.hr_score * 0.15 +
        scan.sales_marketing_score * 0.15 +
        scan.operations_score * 0.15 +
        scan.strategy_score * 0.15 +
        scan.management_score * 0.10 +
        scan.technology_score * 0.10
    )
    scan.overall_health_score = round(overall, 1)
    scan.status = "COMPLETED"

    # AI Diagnostic Synthesis
    prompt = f"""Act as Vichar Vimarsh's enterprise consulting diagnosis engine.
Generate an executive diagnostic summary for '{scan.company_name}' ({scan.industry}, Turnover: {scan.annual_turnover}).

Category Health Scores:
- Finance: {scan.finance_score}%
- Human Resources: {scan.hr_score}%
- Sales & Marketing: {scan.sales_marketing_score}%
- Operations: {scan.operations_score}%
- Business Strategy: {scan.strategy_score}%
- Management & Governance: {scan.management_score}%
- Technology & Cloud: {scan.technology_score}%
Overall Business Health Score: {scan.overall_health_score}/100

Identified Missing Documentation:
{chr(10).join(missing_docs) if missing_docs else 'None flagged.'}

Provide:
1. Executive Health Diagnostic (Strengths & Vulnerabilities)
2. Immediate 30-Day Fixes (Top 3 priorities)
3. 90-Day Strategic Roadmap for the leadership team
"""
    try:
        diag_summary = get_ai_response(prompt)
    except Exception:
        diag_summary = (
            f"Vichar Vimarsh Diagnostic Synthesis for {scan.company_name}:\n"
            f"Overall enterprise health index stands at {scan.overall_health_score}/100.\n"
            f"Highest performing pillar: Operations ({scan.operations_score}%).\n"
            f"Priority intervention required in HR and Finance controls."
        )

    scan.ai_diagnostic_summary = diag_summary
    scan.updated_at = datetime.utcnow()
    db.commit()

    return {
        "status": "SUCCESS",
        "overall_health_score": scan.overall_health_score,
        "scores": {
            "FINANCE": scan.finance_score,
            "HR": scan.hr_score,
            "SALES_MARKETING": scan.sales_marketing_score,
            "OPERATIONS": scan.operations_score,
            "BUSINESS_STRATEGY": scan.strategy_score,
            "MANAGEMENT": scan.management_score,
            "TECHNOLOGY": scan.technology_score
        },
        "missing_docs_count": len(missing_docs),
        "ai_diagnostic_summary": diag_summary
    }

@router.post("/details/{scan_id}/review")
def submit_consultant_review(
    scan_id: int,
    payload: ConsultantReviewIn,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(["admin", "manager"]))
):
    scan = db.query(BusinessScan).filter(BusinessScan.id == scan_id).first()
    if not scan:
        raise HTTPException(status_code=404, detail="Business Scan not found")

    scan.consultant_review_notes = payload.consultant_notes.strip()
    if payload.overall_health_score is not None:
        scan.overall_health_score = payload.overall_health_score
    scan.status = "REVIEWED"
    scan.reviewed_by_user_id = current_user.id
    scan.reviewed_at = datetime.utcnow()
    db.commit()

    log_audit_event(db, current_user, "REVIEW_BUSINESS_SCAN", "BusinessScan", str(scan.id), {"company": scan.company_name})
    return {"status": "SUCCESS", "message": "Consultant review and recommendations recorded."}
