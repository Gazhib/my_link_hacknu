from fastapi import APIRouter, Depends, HTTPException, File, UploadFile, Response
from sqlalchemy.orm import Session
from pydantic import BaseModel
import os

from app.core.deps import get_db
from app.core.security import create_access_token, verify_password, get_password_hash, get_current_user
from app.db import models
from app.services.files import save_upload
from app.services.cv import extract_text_from_pdf


router = APIRouter(prefix="/auth", tags=["auth"])


class LoginRequest(BaseModel):
    email: str
    password: str


@router.post("/login")
def login(payload: LoginRequest, response: Response, db: Session = Depends(get_db)):
    identity = (payload.email or "").strip()
    user = db.query(models.User).filter(models.User.email == identity).first()
    if not user and "@" not in identity:
        alt = f"{identity}@example.com"
        user = db.query(models.User).filter(models.User.email == alt).first()
    if not user or not verify_password(payload.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    token = create_access_token(subject=f"user:{user.id}", extra_claims={"role": user.role})
    
    response.set_cookie(
        key="access_token",
        value=token,
        httponly=True,
        secure=False,
        samesite="lax",
        max_age=3600 * 24 * 7,
    )
    
    return {"role": user.role, "email": user.email}


class RegisterRequest(BaseModel):
    email: str
    password: str
    role: str | None = None  


@router.post("/register")
def register(payload: RegisterRequest, response: Response, db: Session = Depends(get_db)):
    email_norm = (payload.email or "").strip().lower()
    exists = db.query(models.User).filter(models.User.email == email_norm).first()
    if exists:
        raise HTTPException(status_code=400, detail="Email already registered")
    role = (payload.role or "user").lower()
    user = models.User(email=email_norm, password_hash=get_password_hash(payload.password), role=role)
    db.add(user)
    db.commit()
    db.refresh(user)
    token = create_access_token(subject=f"user:{user.id}", extra_claims={"role": user.role})
    
    response.set_cookie(
        key="access_token",
        value=token,
        httponly=True,
        secure=False,
        samesite="lax",
        max_age=3600 * 24 * 7,
    )
    
    return {"role": user.role, "email": user.email}


@router.get("/me")
def me(current=Depends(get_current_user), db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.id == current.id).first()
    
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    return {
        "id": user.id,
        "email": user.email,
        "role": user.role,
        "cvUrl": user.cv_file_path if user.cv_file_path else None,
        "created_at": user.created_at.isoformat() if user.created_at else None,
    }


@router.post("/me/cv")
async def upload_cv(
    cv: UploadFile = File(...),
    current=Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Upload or update user's CV in their profile.
    """
    user = db.query(models.User).filter(models.User.id == current.id).first()
    
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Save the CV file
    cv_path = await save_upload(cv)
    
    # Extract text from the CV
    cv_text = extract_text_from_pdf(cv_path)
    
    # Update user's CV information
    user.cv_file_path = cv_path
    user.cv_text = cv_text
    
    db.commit()
    db.refresh(user)
    
    return {
        "id": user.id,
        "email": user.email,
        "role": user.role,
        "cvUrl": user.cv_file_path,
        "created_at": user.created_at.isoformat() if user.created_at else None,
    }


@router.get("/me/cv-url")
def get_cv_url(current=Depends(get_current_user), db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.id == current.id).first()
    
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    if not user.cv_file_path:
        raise HTTPException(status_code=404, detail="No CV uploaded")
    
    # Return the relative URL path
    filename = os.path.basename(user.cv_file_path)
    return {"url": f"/uploads/{filename}"}


@router.get("/get-ws-token")
def get_ws_token(application_id: int | None = None, current=Depends(get_current_user), db: Session = Depends(get_db)):

    if application_id:
        app = db.get(models.Application, application_id)
        if not app:
            raise HTTPException(status_code=404, detail="Application not found")
        if (app.candidate_email or "").lower() != (current.email or "").lower():
            raise HTTPException(status_code=403, detail="Forbidden")
    else:
        app = (
            db.query(models.Application)
            .filter(models.Application.candidate_email == current.email)
            .order_by(models.Application.created_at.desc())
            .first()
        )
        
        if not app:
            raise HTTPException(status_code=404, detail="No application found")
    
    token = create_access_token(
        subject=f"user:{current.id}", 
        extra_claims={"role": current.role, "application_id": app.id}
    )
    
    return {"token": token, "application_id": app.id}


@router.post("/logout")
def logout(response: Response):
    response.delete_cookie(key="access_token")
    return {"message": "Logged out successfully"}
