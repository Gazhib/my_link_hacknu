from __future__ import annotations
from typing import Optional
import asyncio
import logging
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Depends, Cookie, Query
from sqlalchemy.orm import Session

from app.core.deps import get_db
from app.core.security import decode_token
from app.db import models
from app.services.llm import analyze_cv, score_from_llm_result
from app.services.cv import compute_relevance


router = APIRouter()

logger = logging.getLogger(__name__)


@router.websocket("/ws/applications/{application_id}")
async def ws_app_chat(
    websocket: WebSocket,
    application_id: int,
    db: Session = Depends(get_db),
    access_token: Optional[str] = Cookie(None),
    token: Optional[str] = Query(None)  # Accept token from query parameter
):
    await websocket.accept()

    # Get token from query parameter or cookie
    auth_token = token or access_token
    if not auth_token:
        await websocket.send_json({"type": "error", "message": "No authentication token found"})
        await websocket.close()
        return

    payload = decode_token(auth_token)
    if not payload:
        await websocket.send_json({"type": "error", "message": "Invalid token"})
        await websocket.close()
        return
    
    # Verify user has access to this application
    sub = str(payload.get("sub", ""))
    logger.info(f"WebSocket auth - token payload: {payload}")
    logger.info(f"WebSocket auth - subject: {sub}")
    
    if not sub.startswith("user:"):
        await websocket.send_json({"type": "error", "message": "Invalid token subject"})
        await websocket.close()
        return
    
    try:
        user_id = int(sub.split(":", 1)[1])
    except Exception:
        await websocket.send_json({"type": "error", "message": "Invalid user ID"})
        await websocket.close()
        return

    app = db.get(models.Application, application_id)
    if not app:
        await websocket.send_json({"type": "error", "message": "application not found"})
        await websocket.close()
        return
    
    # Verify the user owns this application
    user = db.get(models.User, user_id)
    if not user or (app.candidate_email or "").lower() != (user.email or "").lower():
        await websocket.send_json({"type": "error", "message": "Forbidden: not your application"})
        await websocket.close()
        return

    session = (
        db.query(models.ChatSession)
        .filter(models.ChatSession.application_id == app.id, models.ChatSession.state == "open")
        .first()
    )
    if not session:
        session = models.ChatSession(application_id=app.id, last_relevance_score=app.relevance_score)
        db.add(session)
        db.commit()
        db.refresh(session)

    vacancy = db.get(models.Vacancy, app.vacancy_id)
    vacancy_dict = {
        "title": vacancy.title if vacancy else None,
        "city": vacancy.city if vacancy else None,
        "description": vacancy.description if vacancy else None,
        "min_experience_years": vacancy.min_experience_years if vacancy else None,
        "employment_type": vacancy.employment_type if vacancy else None,
        "education_level": vacancy.education_level if vacancy else None,
        "languages": vacancy.languages.split(",") if vacancy and vacancy.languages else [],
        "salary_min": vacancy.salary_min if vacancy else None,
        "salary_max": vacancy.salary_max if vacancy else None,
        "currency": vacancy.currency if vacancy else None,
        "skills": vacancy.skills.split(",") if vacancy and vacancy.skills else [],
    }

    existing_msgs = (
        db.query(models.ChatMessage)
        .filter(models.ChatMessage.session_id == session.id)
        .order_by(models.ChatMessage.created_at.asc())
        .all()
    )
    chat_ctx = [
        {"role": (m.sender or "bot"), "content": (m.content or "")}
        for m in existing_msgs
    ]

    await websocket.send_json({
        "type": "welcome",
        "session_id": session.id,
    })

    asked = set()
    asked_texts: set[str] = set()
    max_turns = 8 
    llm_first_question = None
    try:
        await websocket.send_json({"type": "analysis_status", "message": "Идёт оценка портфолио…"})
        await websocket.send_json({"type": "bot_typing", "value": True})
        
        logger.info(f"Calling LLM for application {application_id}")
        llm_once = await asyncio.to_thread(analyze_cv, app.cv_text or "", vacancy_dict)
        logger.info(f"LLM response for application {application_id}: {llm_once}")
        
        if isinstance(llm_once, dict):
            llm_first_question = (llm_once.get("question") or "").strip() or None
            logger.info(f"Extracted question: {llm_first_question}")
        else:
            logger.error(f"LLM returned non-dict response: {type(llm_once)}")
    except Exception as e:
        logger.error(f"Error calling LLM for application {application_id}: {e}", exc_info=True)
        llm_first_question = None
    finally:
        await websocket.send_json({"type": "bot_typing", "value": False})

    # Only proceed if the LLM provided a question; otherwise, end gracefully
    if llm_first_question:
        q = llm_first_question
        await websocket.send_json({"type": "question", "id": 1, "text": q})
        db.add(models.ChatMessage(session_id=session.id, sender="bot", content=q))
        chat_ctx.append({"role": "bot", "content": q})
        asked.add(1)
        asked_texts.add(q.strip().lower())
        db.commit()
    else:
        # Fallback: craft a simple first question heuristically if LLM is unavailable
        logger.warning(f"LLM did not return an initial question for application {application_id}. Using heuristic fallback.")

        def _fallback_question(mismatch: str, vacancy: dict) -> str:
            m = (mismatch or "").strip().lower()
            title = (vacancy.get("title") or "позиции").strip()
            city = (vacancy.get("city") or "").strip()
            if m == "город":
                if city:
                    return f"Вакансия предполагает работу в городе {city}. Вам удобно работать из этого города или рассматриваете переезд/удалённый формат?"
                return "Подскажите, пожалуйста, из какого вы города и насколько вам удобен формат работы, который предполагает вакансия?"
            if m == "опыт":
                return f"Расскажите, пожалуйста, подробнее про ваш релевантный опыт для {title}: сколько лет и с какими задачами сталкивались?"
            if m == "занятость":
                return "Какой формат занятости вам удобен сейчас (полная, частичная, проектная, гибкий график)?"
            if m == "образование":
                return "Уточните, пожалуйста, ваше профильное образование или курсы/сертификаты по теме вакансии."
            if m == "языки":
                return "Какими языками вы владеете и на каком уровне? Есть ли опыт делового общения?"
            if m == "зарплата":
                return "Какие у вас ожидания по зарплате на этой позиции?"
            # generic
            return f"Расскажите, пожалуйста, кратко о самом релевантном опыте для {title}: что делали и какие результаты получили?"

        # Update quick baseline relevance
        score, mismatches, summary = compute_relevance(app.cv_text or "", vacancy_dict)
        app.relevance_score = score
        app.mismatch_reasons = ",".join(mismatches) if mismatches else None
        app.summary_text = summary
        db.commit()

        if mismatches:
            q = _fallback_question(mismatches[0], vacancy_dict)
            await websocket.send_json({"type": "question", "id": 1, "text": q})
            db.add(models.ChatMessage(session_id=session.id, sender="bot", content=q))
            chat_ctx.append({"role": "bot", "content": q})
            asked.add(1)
            asked_texts.add(q.strip().lower())
            db.commit()
        else:
            await websocket.send_json({
                "type": "final_summary",
                "message": summary or "Спасибо! Мы оценили резюме и передадим информацию рекрутеру.",
            })
            session.state = "closed"
            db.commit()
            await websocket.close()
            return

    try:
        qid = 1
        while True:
            data = await websocket.receive_json()
            if data.get("type") == "answer":
                user_text = data.get("text", "").strip()
                db.add(models.ChatMessage(session_id=session.id, sender="user", content=user_text))
                chat_ctx.append({"role": "user", "content": user_text})
                await websocket.send_json({"type": "bot_typing", "value": True})
                updated = await asyncio.to_thread(analyze_cv, app.cv_text or "", vacancy_dict, chat_ctx)
                if updated is not None:
                    score, new_mismatches, summary = score_from_llm_result(updated, vacancy_dict)
                    next_q = (updated.get("question") or "").strip() or None
                else:
                    # Keep non-scripted behavior: do not synthesize questions
                    score, new_mismatches, summary = compute_relevance(app.cv_text or "", vacancy_dict)
                    next_q = None
                
                await websocket.send_json({"type": "bot_typing", "value": False})
                app.relevance_score = score
                app.mismatch_reasons = ",".join(new_mismatches) if new_mismatches else None
                app.summary_text = summary

                # If no more mismatches or turns exhausted, end
                if not new_mismatches or len(asked) >= max_turns:
                    await websocket.send_json({
                        "type": "final_summary",
                        "message": summary or "Спасибо! Мы учли ваши ответы и передадим их рекрутеру.",
                    })
                    session.state = "closed"
                    db.commit()
                    await websocket.close()
                    break

                # Ask only if LLM produced a new question; otherwise end gracefully
                if next_q and next_q.strip().lower() not in asked_texts:
                    qid += 1
                    await websocket.send_json({"type": "question", "id": qid, "text": next_q})
                    db.add(models.ChatMessage(session_id=session.id, sender="bot", content=next_q))
                    chat_ctx.append({"role": "bot", "content": next_q})
                    db.commit()
                    asked.add(qid)
                    asked_texts.add(next_q.strip().lower())
                else:
                    await websocket.send_json({
                        "type": "final_summary",
                        "message": summary or "Спасибо! Мы учли ваши ответы и передадим их рекрутеру.",
                    })
                    session.state = "closed"
                    db.commit()
                    await websocket.close()
                    break
            elif data.get("type") == "end":
                updated = await asyncio.to_thread(analyze_cv, app.cv_text or "", vacancy_dict, chat_ctx)
                if updated is not None:
                    score, new_mismatches, summary = score_from_llm_result(updated, vacancy_dict)
                else:
                    score, new_mismatches, summary = compute_relevance(app.cv_text or "", vacancy_dict)

                app.relevance_score = score
                app.mismatch_reasons = ",".join(new_mismatches) if new_mismatches else None
                app.summary_text = summary
                session.state = "closed"
                if summary:
                    db.add(models.ChatMessage(session_id=session.id, sender="system", content=f"Итоговая выжимка: {summary}"))
                    chat_ctx.append({"role": "system", "content": f"Итоговая выжимка: {summary}"})
                db.commit()

                await websocket.send_json({
                    "type": "final_summary",
                    "message": summary or "Спасибо! Мы учли ваши ответы и передадим их рекрутеру.",
                })
                await websocket.close()
                break
            else:
                await websocket.send_json({"type": "error", "message": "unknown message"})
    except WebSocketDisconnect:
        pass
