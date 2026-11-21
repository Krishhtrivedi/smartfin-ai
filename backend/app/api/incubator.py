import os
import re
from datetime import datetime
from typing import Dict, Any, Optional, List
from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session
from pydantic import BaseModel, EmailStr

from app.core.database import get_db
from app.core.dependencies import get_current_user, require_role, log_audit_event, get_client_ip
from app.models.all_models import User, PublicClientInquiry

router = APIRouter(tags=["Incubator & Standalone Products"])

# ==============================================================================
# 1. VV-PMSC INTERNAL SOP & POLICY CHATBOT
# ==============================================================================

SOP_KNOWLEDGE_BASE = [
    {
        "topic": "148A Statutory Notice SOP",
        "keywords": ["148a", "notice", "income tax", "reassessment", "scrutiny", "birju"],
        "section": "Statutory Notice SOP §1.4",
        "content": (
            "Under Section 148A of the Income Tax Act, replies must be filed within the specified window (typically 14-30 days). "
            "SOP Procedure: 1. Verify jurisdiction and Din (Document Identification Number) on IT portal. "
            "2. Reconcile transactions against AIS/TIS and bank statements. "
            "3. Draft preliminary objection on lack of nexus if information does not suggest escaped income. "
            "4. File reply under digital signature of Birju sir or designated Authorized Representative. "
            "Escalation: Birju sir (birju@smartfin.ai) owns all 148A, 143(2), and 271(1)(c) submissions."
        ),
        "citation": "VV-PMSC Statutory Defense Manual (Rev 2026)",
        "owner": "Biraju Bhai"
    },
    {
        "topic": "GSTR-1 & 3B Reconciliation & Pre-Filing SOP",
        "keywords": ["gstr-1", "gstr-3b", "gstr-2b", "gst", "itc", "sales register", "e-way bill"],
        "section": "GST Compliance Manual §3.1",
        "content": (
            "Prior to GSTR-1 dispatch or GSTR-3B filing: "
            "1. Run automated variance check between Sales Ledger and E-Way bill portal. "
            "2. Ineligible ITC under Section 17(5) must be segregated before filing 3B. "
            "3. Verify GSTR-2B vs Purchase Register: any invoice missing in 2B must be flagged for provisional deferral under Rule 37A. "
            "4. Obtain human review approval from Partner before executing portal submission."
        ),
        "citation": "GST Technical Filing Circular 2026/04",
        "owner": "Pinal Shah"
    },
    {
        "topic": "TDS Section 194Q vs 206C(1H) Cross-Compliance",
        "keywords": ["194q", "206c", "tds", "tcs", "buyer", "seller", "50 lakhs"],
        "section": "Direct Taxes Practice Notes §6.2",
        "content": (
            "When aggregate purchase/sale of goods exceeds ₹50 Lakhs in a financial year: "
            "1. If buyer's turnover in preceding FY exceeds ₹10 Crore, Section 194Q takes precedence over Section 206C(1H). "
            "2. Buyer must deduct TDS at 0.1% on the amount exceeding ₹50 Lakhs at the time of credit or payment. "
            "3. Seller should NOT collect TCS under 206C(1H) once buyer provides 194Q deduction undertaking."
        ),
        "citation": "CBDT Circular No. 13/2021 & Firm Standard Tax Practice",
        "owner": "Nilesh Jain"
    },
    {
        "topic": "PMS Client Onboarding & SEBI Compliance Rules",
        "keywords": ["pms", "portfolio", "sebi", "50 lakhs", "onboarding", "minimum investment", "kyc"],
        "section": "PMSC Client Mandate Framework §2.0",
        "content": (
            "For PMSC Portfolio Management Client Onboarding: "
            "1. Minimum investment threshold mandated by SEBI is ₹50 Lakhs per client. "
            "2. Mandatory documents: PAN, Aadhaar/Passport, CKYC form, Demat holding statement, and Risk Tolerance Questionnaire. "
            "3. All client funds must be received directly into designated segregated client bank accounts; cash handling is strictly prohibited. "
            "4. Client fee options: Fixed Management Fee (e.g., 1.5% p.a.) or Performance Fee with High Water Mark hurdle rate (e.g., 10% hurdle)."
        ),
        "citation": "SEBI (Portfolio Managers) Regulations & PMSC Charter",
        "owner": "Pinal Shah & Investment Committee"
    },
    {
        "topic": "Office Timings, Leave Policy & Expense Reimbursement",
        "keywords": ["timing", "leave", "holiday", "expense", "reimbursement", "office", "working hours"],
        "section": "VV-PMSC Internal HR & Governance Code §5.1",
        "content": (
            "1. Core office hours: 9:30 AM to 6:30 PM (Monday through Saturday). "
            "2. Leave policy: Planned leaves must be submitted via the Office Management tab at least 48 hours in advance for admin sign-off. "
            "3. Expense Reimbursement: All client-related travel, filing fees, or stamp duty expenses must have supporting digital bills uploaded within 5 working days. "
            "4. Approval threshold: Expenses over ₹5,000 require Nilesh Jain's approval."
        ),
        "citation": "VV-PMSC Employee Handbook 2026",
        "owner": "Administration"
    },
    {
        "topic": "Bank Reconciliation & Suspense Ledger Treatment",
        "keywords": ["bank", "suspense", "unmatched", "reconciliation", "cheque", "neft"],
        "section": "Financial Accounting Standards §4.3",
        "content": (
            "1. Bank reconciliations must be executed weekly. "
            "2. Any bank credit without customer tagging must be temporarily booked to 'Sundry Receipts Suspense' and resolved within 72 hours. "
            "3. Stale cheques older than 90 days must be reversed to the original creditor account with remark."
        ),
        "citation": "Internal Audit Checklist §7",
        "owner": "Nilesh Jain"
    }
]

class SOPQueryRequest(BaseModel):
    query: str
    category: Optional[str] = "ALL"

@router.post("/chatbot/sop-query")
def answer_sop_query(
    payload: SOPQueryRequest,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    VV-PMSC Internal SOP & Policy Assistant.
    Provides verified firm procedures, checklists, and escalation routing with source citations.
    """
    user_query = payload.query.strip().lower()
    if not user_query:
        raise HTTPException(status_code=400, detail="Query cannot be empty.")

    # Match against internal SOP knowledge base
    matched_entry = None
    best_score = 0

    for entry in SOP_KNOWLEDGE_BASE:
        score = sum(1 for kw in entry["keywords"] if kw in user_query)
        if score > best_score:
            best_score = score
            matched_entry = entry

    if matched_entry and best_score >= 1:
        response_text = matched_entry["content"]
        citation = f"{matched_entry['citation']} — {matched_entry['section']}"
        owner = matched_entry["owner"]
        escalation = f"For non-standard cases, please contact {owner} or log an escalation task in the Office Management tab."
    else:
        response_text = (
            "This query is not specifically codified in the automated VV-PMSC SOP index. "
            "General Firm Guideline: For statutory notices, consult Biraju Bhai. "
            "For GST/Income tax filings and PMS onboarding, consult Pinal Shah. "
            "For accounting entries, banking, or TDS calculations, consult Nilesh Jain."
        )
        citation = "VV-PMSC General Administrative Protocol §1.1"
        owner = "Birju sir / Pinal Shah / Nilesh Jain"
        escalation = "Please escalate this to senior partners if this involves a statutory deadline."

    log_audit_event(
        db, current_user, "INTERNAL_SOP_BOT_QUERY", "SOPBot", "KnowledgeQuery",
        {"query": payload.query[:100], "matched_topic": matched_entry["topic"] if matched_entry else "GENERAL"},
        request=request
    )

    return {
        "query": payload.query,
        "answer": response_text,
        "citation": citation,
        "designated_owner": owner,
        "escalation_path": escalation,
        "suggested_topics": [
            "148A Notice Response Checklist",
            "GSTR-1 Pre-Filing Review SOP",
            "PMS Client Onboarding & ₹50L Rule",
            "TDS 194Q vs 206C(1H) Priority",
            "Office Timings & Leave Submissions",
            "Bank Suspense Reconciliation"
        ]
    }


# ==============================================================================
# 2. PMSC PUBLIC WEBSITE & CLIENT INTAKE
# ==============================================================================

class ClientIntakeRequest(BaseModel):
    full_name: str
    entity_name: Optional[str] = None
    service_type: str
    email: str
    phone: str
    message: Optional[str] = None

@router.post("/public/client-intake")
def submit_public_client_intake(
    payload: ClientIntakeRequest,
    request: Request,
    db: Session = Depends(get_db)
):
    """
    Public-facing client inquiry endpoint for PMSC institutional website.
    No login required. Captures inbound consultation requests with audit IP.
    """
    if not payload.full_name.strip():
        raise HTTPException(status_code=400, detail="Full name is required.")
    if not payload.email.strip() or "@" not in payload.email:
        raise HTTPException(status_code=400, detail="Valid email address is required.")
    if not payload.phone.strip():
        raise HTTPException(status_code=400, detail="Phone number is required.")

    client_ip = get_client_ip(request)
    
    inquiry = PublicClientInquiry(
        full_name=payload.full_name.strip(),
        entity_name=payload.entity_name.strip() if payload.entity_name else None,
        service_type=payload.service_type,
        email=payload.email.strip().lower(),
        phone=payload.phone.strip(),
        message=payload.message.strip() if payload.message else None,
        status="NEW",
        client_ip=client_ip
    )
    db.add(inquiry)
    db.commit()
    db.refresh(inquiry)

    return {
        "success": True,
        "inquiry_id": f"PMSC-INTAKE-{inquiry.id:04d}",
        "message": "Thank you for reaching out to PMSC (Vichar Vimarsh Group). Our advisory desk will contact you within 24 business hours.",
        "received_at": inquiry.created_at.strftime("%Y-%m-%d %H:%M:%S UTC")
    }

@router.get("/public/client-intake/inquiries")
def get_public_inquiries(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(["admin"]))
):
    """
    Admin-only review of inbound consultation leads from the public PMSC website.
    """
    inquiries = db.query(PublicClientInquiry).order_by(PublicClientInquiry.created_at.desc()).limit(100).all()
    return [
        {
            "id": inq.id,
            "intake_code": f"PMSC-INTAKE-{inq.id:04d}",
            "full_name": inq.full_name,
            "entity_name": inq.entity_name or "Individual",
            "service_type": inq.service_type,
            "email": inq.email,
            "phone": inq.phone,
            "message": inq.message,
            "status": inq.status,
            "client_ip": inq.client_ip,
            "created_at": inq.created_at.strftime("%Y-%m-%d %H:%M:%S")
        }
        for inq in inquiries
    ]


# ==============================================================================
# 3. SEPARATE ONLINE PRODUCT STARTERS (MODULAR ENGINES)
# ==============================================================================

# Product A: What My Family Should Know AI (WMFSK)
class FamilyAIEvalRequest(BaseModel):
    has_demat_details: bool
    has_insurance_nominee_updated: bool
    has_locker_access_shared: bool
    has_ca_contact_documented: bool
    has_digital_will_or_wishes: bool
    test_message_for_fraud: Optional[str] = None

@router.post("/portals/family-ai/evaluate")
def evaluate_family_emergency_readiness(payload: FamilyAIEvalRequest):
    """
    Evaluates emergency preparedness score and scans suspicious communications for fraud.
    """
    items = [
        payload.has_demat_details,
        payload.has_insurance_nominee_updated,
        payload.has_locker_access_shared,
        payload.has_ca_contact_documented,
        payload.has_digital_will_or_wishes
    ]
    score = int((sum(items) / len(items)) * 100)

    # Fraud evaluation
    fraud_analysis = None
    if payload.test_message_for_fraud:
        msg = payload.test_message_for_fraud.lower()
        phishing_words = ["lottery", "win", "electricity disconnect", "kyc expired", "apk", "pan blocked", "urgent refund", "click link", "upi pin"]
        matched = [w for w in phishing_words if w in msg]
        if matched:
            fraud_analysis = {
                "verdict": "HIGH_RISK_SUSPICIOUS",
                "risk_score": 92,
                "warning": f"Detected red-flag triggers: {', '.join(matched)}. Official banks, income tax portal, or utility providers never ask for UPI PINs or send APK links via SMS/WhatsApp.",
                "recommendation": "Do not click any embedded links. Verify directly on official portals (e.g. incometax.gov.in or your bank app)."
            }
        else:
            fraud_analysis = {
                "verdict": "LOW_SUSPICION",
                "risk_score": 15,
                "warning": "No blatant phishing keywords detected, but always ensure never to enter your UPI PIN to receive money.",
                "recommendation": "Remain vigilant for unsolicited requests asking for OTPs or personal credentials."
            }

    checklist = [
        {"item": "Demat & Mutual Fund Folios Registry", "status": "COMPLETED" if payload.has_demat_details else "PENDING", "priority": "CRITICAL"},
        {"item": "Life & Health Insurance Nominee Update", "status": "COMPLETED" if payload.has_insurance_nominee_updated else "PENDING", "priority": "HIGH"},
        {"item": "Bank Locker Key & Location Access Guide", "status": "COMPLETED" if payload.has_locker_access_shared else "PENDING", "priority": "HIGH"},
        {"item": "Family Chartered Accountant & Legal Contact", "status": "COMPLETED" if payload.has_ca_contact_documented else "PENDING", "priority": "MEDIUM"},
        {"item": "Digital Estate Wishes & Account Handover", "status": "COMPLETED" if payload.has_digital_will_or_wishes else "PENDING", "priority": "MEDIUM"}
    ]

    return {
        "readiness_score": score,
        "grade": "EXCELLENT" if score >= 80 else ("MODERATE" if score >= 50 else "AT_RISK"),
        "checklist": checklist,
        "fraud_scanner_result": fraud_analysis
    }


# Product B: Career Pathway AI
class CareerRoadmapRequest(BaseModel):
    current_role: str
    target_role: str
    experience_years: int = 1
    focus_domain: Optional[str] = "TAX_ACCOUNTING" # TAX_ACCOUNTING, AUDIT, FP&A, FINTECH

@router.post("/portals/career-ai/roadmap")
def generate_career_pathway_roadmap(payload: CareerRoadmapRequest):
    """
    Generates a personalized milestone career roadmap with certification benchmarks.
    """
    benchmarks = {
        "Statutory Auditor": {"median_ctc": "₹10L – ₹16L", "key_cert": "CA, DISA, Ind AS Certification"},
        "FP&A Manager": {"median_ctc": "₹14L – ₹22L", "key_cert": "CMA, CFA, Financial Modeling (FMVA)"},
        "Corporate Tax Manager": {"median_ctc": "₹12L – ₹18L", "key_cert": "CA, LLB / Tax Litigation Diploma"},
        "FinTech / Systems Accountant": {"median_ctc": "₹12L – ₹20L", "key_cert": "Alteryx, Python for Finance, SQL, SAP/ERP"}
    }

    target_info = benchmarks.get(payload.target_role, {"median_ctc": "₹9L – ₹15L", "key_cert": "CA / Professional Diploma"})

    milestones = [
        {
            "phase": "Months 1–3: Core Fundamentals & Statutory Mastery",
            "skills": ["Ind AS / IFRS compliance", "Advanced Excel & Financial Modeling", "GST / TDS advanced reconciliation"],
            "action": "Complete intensive case study analysis on real balance sheet closures."
        },
        {
            "phase": "Months 4–6: Strategic Certifications & Automation",
            "skills": ["Python / SQL for Finance automation", "Target certification modules", "Corporate tax defense drafting"],
            "action": "Enroll in target certification and automate routine office ledger audits."
        },
        {
            "phase": "Months 7–12: Leadership, Advisory & Career Pivot",
            "skills": ["Management Reporting & MIS presentation", "Direct stakeholder negotiation", "Audit committee briefing"],
            "action": "Lead end-to-end statutory audit or FP&A forecast cycle and apply for target tier-1 positions."
        }
    ]

    return {
        "current_role": payload.current_role,
        "target_role": payload.target_role,
        "experience_years": payload.experience_years,
        "salary_trajectory": target_info["median_ctc"],
        "recommended_certifications": target_info["key_cert"],
        "milestones": milestones
    }


# Product C: Collection AI (Trade Receivables Recovery Engine)
class CollectionDraftRequest(BaseModel):
    customer_name: str
    invoice_number: str
    amount_due: float
    days_overdue: int

@router.post("/portals/collection-ai/draft")
def generate_collection_recovery_sequence(payload: CollectionDraftRequest):
    """
    Generates customized B2B collection sequences with WhatsApp text, email drafts, and statutory interest clauses.
    """
    amt_formatted = f"₹{payload.amount_due:,.2f}"

    if payload.days_overdue <= 15:
        tier = "COURTESY_REMINDER"
        tone = "Polite and supportive"
        wa_text = (
            f"Dear Team {payload.customer_name},\n\n"
            f"This is a gentle courtesy note regarding Invoice #{payload.invoice_number} for {amt_formatted}, "
            f"which was due a few days ago. We kindly request you to process the payment at your earliest convenience.\n\n"
            f"Thank you for your valued partnership.\nAccounts Team | SMARTFIN.AI / Vichar Vimarsh"
        )
        email_subject = f"Gentle Courtesy: Invoice #{payload.invoice_number} ({amt_formatted}) - {payload.customer_name}"
    elif payload.days_overdue <= 30:
        tier = "DUE_DATE_ADVISORY"
        tone = "Professional and firm"
        wa_text = (
            f"Dear Accounts Team ({payload.customer_name}),\n\n"
            f"Our records indicate that Invoice #{payload.invoice_number} ({amt_formatted}) is now {payload.days_overdue} days overdue. "
            f"To ensure uninterrupted ledger reconciliation and services, kindly confirm the payment reference (UTR) by tomorrow.\n\n"
            f"Best regards,\nCredit Control Team"
        )
        email_subject = f"Payment Reminder: Invoice #{payload.invoice_number} is {payload.days_overdue} days overdue"
    elif payload.days_overdue <= 60:
        tier = "CREDIT_HOLD_WARNING"
        tone = "Urgent and escalating"
        wa_text = (
            f"URGENT ATTENTION: Finance Head ({payload.customer_name})\n\n"
            f"Invoice #{payload.invoice_number} for {amt_formatted} is now {payload.days_overdue} days overdue. "
            f"Please note that continued delay may lead to a temporary pause in ongoing credit terms and dispatch clearances.\n"
            f"Please arrange payment today or reach out to our partner desk.\n\n"
            f"Credit Control & Compliance Desk"
        )
        email_subject = f"URGENT: Formal Credit Notice for Overdue Invoice #{payload.invoice_number}"
    else:
        tier = "STATUTORY_MSME_ESCALATION"
        tone = "Legal and formal statutory escalation"
        wa_text = (
            f"FORMAL NOTICE: Overdue Invoice #{payload.invoice_number} ({amt_formatted})\n\n"
            f"Despite multiple reminders, payment of {amt_formatted} remains pending for {payload.days_overdue} days. "
            f"Please be advised that as per Section 16 of the MSMED Act, delayed payments attract compound interest at three times the RBI bank rate.\n"
            f"Please clear the outstanding dues within 48 hours to avoid formal dispute escalation.\n\n"
            f"Legal & Compliance Desk | Vichar Vimarsh Group"
        )
        email_subject = f"STATUTORY DEMAND NOTICE: Unsettled Account #{payload.invoice_number} ({payload.customer_name})"

    return {
        "customer": payload.customer_name,
        "invoice": payload.invoice_number,
        "amount": payload.amount_due,
        "days_overdue": payload.days_overdue,
        "tier": tier,
        "tone": tone,
        "whatsapp_draft": wa_text,
        "email_subject": email_subject,
        "statutory_msme_applicable": payload.days_overdue > 45
    }
