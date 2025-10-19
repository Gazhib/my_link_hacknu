from __future__ import annotations
from typing import Optional
import asyncio
import random
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


# Fallback question builder when LLM cannot provide one
def _question_for_mismatch(mismatch: str, vacancy: dict) -> Optional[str]:
    m = (mismatch or "").strip().lower()
    title = (vacancy.get("title") or "позиции").strip()
    if m == "город":
        city = (vacancy.get("city") or "").strip()
        if city:
            return f"Наша вакансия предполагает работу в городе {city}. Вам удобна локация или рассматриваете удалённый формат/переезд?"
        return "Рассматриваете ли вы нужную нам локацию или удалённый формат работы?"
    if m == "опыт":
        return f"Расскажите, пожалуйста, подробнее про ваш релевантный опыт для {title}: сколько лет и какие задачи выполняли?"
    if m == "языки":
        langs = vacancy.get("languages") or []
        if isinstance(langs, str):
            langs = [x.strip() for x in langs.split(",") if x.strip()]
        if langs:
            lst = ", ".join(langs)
            return f"Подскажите, пожалуйста, как у вас с {lst} — уровень владения и в каких задачах использовали?"
        return "Подскажите, пожалуйста, ваш уровень владения требуемыми языками и где применяли их на практике?"
    if m == "зарплата":
        smin = vacancy.get("salary_min")
        smax = vacancy.get("salary_max")
        cur = (vacancy.get("currency") or "").strip()
        if smin and smax:
            return f"Уточните, пожалуйста, ваши ожидания по зарплате. Диапазон по вакансии {smin}-{smax} {cur}."
        if smin:
            return f"Уточните, пожалуйста, ваши ожидания по зарплате. По вакансии предлагаем от {smin} {cur}."
        return "Подскажите, пожалуйста, ваши ожидания по зарплате?"
    if m == "занятость":
        emp = (vacancy.get("employment_type") or "").strip()
        if emp:
            return f"В вакансии указана занятость: {emp}. Насколько вам подходит такой формат?"
        return "Какой формат занятости вам предпочтителен (полная/частичная/проектная/гибкая)?"
    if m == "образование":
        edu = (vacancy.get("education_level") or "").strip()
        if edu:
            return f"Подтвердите, пожалуйста, уровень образования: {edu} или аналогичный — верно ли это про вас?"
        return "Расскажите, пожалуйста, про ваш уровень образования и профиль."
    return None


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
    mismatches = (app.mismatch_reasons or "").split(",") if app.mismatch_reasons else []
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

    # Fallback: synthesize a first question from local relevance if LLM failed
    if not llm_first_question:
        try:
            _, mm_fallback, _ = compute_relevance(app.cv_text or "", vacancy_dict)
            for m in mm_fallback:
                q = _question_for_mismatch(m, vacancy_dict)
                if q:
                    llm_first_question = q
                    break
            if not llm_first_question:
                t = vacancy_dict.get("title") or "вакансии"
                llm_first_question = (
                    f"Коротко расскажите, пожалуйста, о вашем самом релевантном опыте для {t}: какие задачи решали и сколько лет этим занимались?"
                )
        except Exception:
            pass

    # Only close if there's truly no way to generate a question
    if llm_first_question:
        q = llm_first_question
        await websocket.send_json({"type": "question", "id": 1, "text": q})
        db.add(models.ChatMessage(session_id=session.id, sender="bot", content=q))
        chat_ctx.append({"role": "bot", "content": q})
        asked.add(1)
        asked_texts.add(q.strip().lower())
        db.commit()
    else:
        # No valid question from LLM or fallback - end gracefully
        logger.warning(f"No questions available for application {application_id}, closing chat")
        await websocket.send_json({
            "type": "final_summary",
            "message": "Спасибо за интерес! Мы рассмотрим ваше резюме и свяжемся с вами.",
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
                    score, new_mismatches, summary = compute_relevance(app.cv_text or "", vacancy_dict)
                    next_q = None
                
                await websocket.send_json({"type": "bot_typing", "value": False})
                app.relevance_score = score
                app.mismatch_reasons = ",".join(new_mismatches) if new_mismatches else None
                app.summary_text = summary
                ack_messages = [
                    "Спасибо, учёл ваш ответ.",
                    "Принял, спасибо за ответ.",
                    "Отлично, записал.",
                    "Спасибо, учту при оценке.",
                ]
                await websocket.send_json({
                    "type": "analysis_update",
                    "message": random.choice(ack_messages),
                })

                if not new_mismatches or len(asked) >= max_turns:
                    await websocket.send_json({
                        "type": "final_summary",
                        "message": "Спасибо! Мы учли ваши ответы и передадим их рекрутеру.",
                    })
                    session.state = "closed"
                    db.commit()
                    await websocket.close()
                    break

                # Prioritize LLM-generated question, end conversation if LLM fails
                if next_q and next_q.strip().lower() not in asked_texts:
                    qid += 1
                    await websocket.send_json({"type": "question", "id": qid, "text": next_q})
                    db.add(models.ChatMessage(session_id=session.id, sender="bot", content=next_q))
                    chat_ctx.append({"role": "bot", "content": next_q})
                    db.commit()
                    asked.add(qid)
                    asked_texts.add(next_q.strip().lower())
                else:
                    # Fallback: try to synthesize a next question from remaining mismatches
                    fallback_q = None
                    for m in new_mismatches or []:
                        q_try = _question_for_mismatch(m, vacancy_dict)
                        if q_try and q_try.strip().lower() not in asked_texts:
                            fallback_q = q_try
                            break
                    if fallback_q:
                        qid += 1
                        await websocket.send_json({"type": "question", "id": qid, "text": fallback_q})
                        db.add(models.ChatMessage(session_id=session.id, sender="bot", content=fallback_q))
                        chat_ctx.append({"role": "bot", "content": fallback_q})
                        db.commit()
                        asked.add(qid)
                        asked_texts.add(fallback_q.strip().lower())
                    else:
                        await websocket.send_json({
                            "type": "final_summary",
                            "message": "Спасибо! Мы учли ваши ответы и передадим их рекрутеру.",
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
                    "message": "Спасибо! Мы учли ваши ответы и передадим их рекрутеру.",
                })
                await websocket.close()
                break
            else:
                await websocket.send_json({"type": "error", "message": "unknown message"})
    except WebSocketDisconnect:
        pass
