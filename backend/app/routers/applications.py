from typing import Any
from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from sqlalchemy.orm import Session

from app.core.deps import get_db
from app.core.security import create_access_token
from app.db import models
from app.schemas.application import ApplicationRead, ApplicationSummary, ApplicationListItem
from app.services.files import save_upload
from app.services.cv import extract_text_from_pdf, compute_relevance
from app.services.llm import analyze_cv, score_from_llm_result
from app.core.security import get_current_user


router = APIRouter(prefix="/applications", tags=["applications"])


@router.post("")
async def create_application(
    vacancy_id: int = Form(...),
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
) -> dict[str, Any]:
    user = db.query(models.User).filter(models.User.id == current_user.id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    if not user.cv_file_path or not user.cv_text:
        raise HTTPException(status_code=400, detail="Please upload your CV in your profile before applying")
    
    v = db.get(models.Vacancy, vacancy_id)
    if not v:
        raise HTTPException(status_code=404, detail="Vacancy not found")
    
    existing = db.query(models.Application).filter(
        models.Application.vacancy_id == vacancy_id,
        models.Application.candidate_email == user.email
    ).first()
    if existing:
        raise HTTPException(status_code=409, detail="You have already applied to this vacancy")
    
    cv_text = user.cv_text
    path = user.cv_file_path
    
    vacancy_dict = {
        "title": v.title,
        "city": v.city,
        "description": v.description,
        "min_experience_years": v.min_experience_years,
        "employment_type": v.employment_type,
        "education_level": v.education_level,
        "languages": v.languages.split(",") if v.languages else [],
        "salary_min": v.salary_min,
        "salary_max": v.salary_max,
        "currency": v.currency,
        "skills": v.skills.split(",") if v.skills else [],
    }
    score: int
    mismatches: list[str]
    summary: str
    llm = analyze_cv(cv_text, vacancy_dict)
    if llm is not None:
        score, mismatches, summary = score_from_llm_result(llm, vacancy_dict)
    else:
        score, mismatches, summary = compute_relevance(cv_text, vacancy_dict)

    app = models.Application(
        vacancy_id=v.id,
        candidate_name=user.email.split("@")[0],
        candidate_email=user.email,
        cv_file_path=path,
        cv_text=cv_text,
        relevance_score=score,
        mismatch_reasons=",".join(mismatches) if mismatches else None,
        summary_text=summary,
    )
    db.add(app)
    db.commit()
    db.refresh(app)

    chat_token = create_access_token(
        subject=f"user:{user.id}", 
        extra_claims={"role": user.role, "application_id": app.id}
    )
    ws_url = f"/ws/applications/{app.id}?token={chat_token}"
    return {"application_id": app.id, "chat_token": chat_token, "ws_url": ws_url}


@router.get("/{application_id}/summary", response_model=ApplicationSummary)
def get_summary(application_id: int, db: Session = Depends(get_db)):
    app = db.get(models.Application, application_id)
    if not app:
        raise HTTPException(status_code=404, detail="Application not found")
    return ApplicationSummary(
        relevance_score=app.relevance_score,
        mismatch_reasons=app.mismatch_reasons.split(",") if app.mismatch_reasons else None,
        summary_text=app.summary_text,
    )


@router.get("/mine", response_model=list[ApplicationListItem])
def list_my_applications(db: Session = Depends(get_db), user=Depends(get_current_user)):
    rows = (
        db.query(models.Application, models.Vacancy)
        .join(models.Vacancy, models.Application.vacancy_id == models.Vacancy.id)
        .filter(models.Application.candidate_email == user.email)
        .order_by(models.Application.created_at.desc())
        .all()
    )
    out: list[ApplicationListItem] = []
    for app, vac in rows:
        out.append(
            ApplicationListItem(
                id=app.id,
                vacancy_id=app.vacancy_id,
                vacancy_title=vac.title if vac else "",
                relevance_score=app.relevance_score,
                status=app.status,
                created_at=app.created_at.isoformat() if app.created_at else None,
            )
        )
    return out


@router.delete("/{application_id}")
def delete_application(application_id: int, db: Session = Depends(get_db), user=Depends(get_current_user)):
    app = db.get(models.Application, application_id)
    if not app:
        raise HTTPException(status_code=404, detail="Application not found")
    vac = db.get(models.Vacancy, app.vacancy_id)
    is_admin = (user.role or "").lower() == "admin"
    is_owner = vac and vac.created_by == getattr(user, "id", None)
    is_candidate = (user.email or "").lower() == (app.candidate_email or "").lower()
    if not (is_admin or is_owner or is_candidate):
        raise HTTPException(status_code=403, detail="Forbidden")

    sessions = db.query(models.ChatSession).filter(models.ChatSession.application_id == app.id).all()
    if sessions:
        session_ids = [s.id for s in sessions]
        db.query(models.ChatMessage).filter(models.ChatMessage.session_id.in_(session_ids)).delete(synchronize_session=False)
        db.query(models.ChatSession).filter(models.ChatSession.id.in_(session_ids)).delete(synchronize_session=False)
    db.delete(app)
    db.commit()
    return {"deleted": True}


@router.get("/{application_id}/messages")
def get_application_messages(application_id: int, db: Session = Depends(get_db), user=Depends(get_current_user)):

    app = db.get(models.Application, application_id)
    if not app:
        raise HTTPException(status_code=404, detail="Application not found")
    
    is_admin = (user.role or "").lower() == "admin"
    is_candidate = (user.email or "").lower() == (app.candidate_email or "").lower()
    
    is_employer = False
    if (user.role or "").lower() == "employer":
        vac = db.get(models.Vacancy, app.vacancy_id)
        is_employer = vac and vac.created_by == user.id
    
    if not (is_admin or is_employer or is_candidate):
        raise HTTPException(status_code=403, detail="Forbidden")
    
    sessions = (
        db.query(models.ChatSession)
        .filter(models.ChatSession.application_id == application_id)
        .all()
    )
    
    if not sessions:
        return []
    
    session_ids = [s.id for s in sessions]
    rows = (
        db.query(models.ChatMessage)
        .filter(models.ChatMessage.session_id.in_(session_ids))
        .order_by(models.ChatMessage.created_at.asc())
        .all()
    )
    
    return [
        {
            "id": m.id,
            "session_id": m.session_id,
            "sender": m.sender,
            "body": m.content,
            "userId": None if m.sender == "bot" else 1,
            "created_at": m.created_at.isoformat(),
        }
        for m in rows
    ]


@router.get("/{application_id}/session")
def get_chat_session(application_id: int, db: Session = Depends(get_db), user=Depends(get_current_user)):
    app = db.get(models.Application, application_id)
    if not app:
        raise HTTPException(status_code=404, detail="Application not found")
    
    # Check permissions (same as messages endpoint)
    is_admin = (user.role or "").lower() == "admin"
    is_candidate = (user.email or "").lower() == (app.candidate_email or "").lower()
    
    is_employer = False
    if (user.role or "").lower() == "employer":
        vac = db.get(models.Vacancy, app.vacancy_id)
        is_employer = vac and vac.created_by == user.id
    
    if not (is_admin or is_employer or is_candidate):
        raise HTTPException(status_code=403, detail="Forbidden")
    
    session = (
        db.query(models.ChatSession)
        .filter(models.ChatSession.application_id == application_id)
        .order_by(models.ChatSession.started_at.desc())
        .first()
    )
    
    if not session:
        return {"exists": False, "state": "open"}
    
    return {
        "exists": True,
        "state": session.state,
        "sessionId": session.id,
    }
