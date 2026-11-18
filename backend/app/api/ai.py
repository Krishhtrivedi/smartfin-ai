from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.dependencies import get_current_user, log_audit_event
from app.models.all_models import User
from app.schemas.excel_ai import AIChatRequest, AIChatResponse
from app.services.ai.assistant import AIFinanceAssistant

router = APIRouter(prefix="/ai", tags=["AI Finance Assistant"])

@router.post("/chat", response_model=AIChatResponse)
def ask_ai_assistant(
    request: AIChatRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if not request.prompt.strip():
        raise HTTPException(status_code=400, detail="Prompt cannot be empty")

    assistant = AIFinanceAssistant(db=db)
    result = assistant.ask(prompt=request.prompt, context_type=request.context_type)

    log_audit_event(db, current_user, "AI_ASSISTANT_QUERY", "AI", None, {"prompt": request.prompt[:100]})

    return result
