from __future__ import annotations
from typing import Any, Dict, List, Optional, Sequence
import httpx
import json
import re
import logging

import google.generativeai as genai
from app.core.config import settings


SYSTEM_INSTRUCTION = (
    "Ты — бот-ассистент для подбора кандидатов. Говоришь дружелюбно, понятно, без давления. "
    "Верни СТРОГО JSON без какого‑либо дополнительного текста вне JSON. Ключи — на английском. "
    "ВСЕ текстовые значения (включая items в mismatches и поля внутри candidate_profile) — на русском языке, краткие и по делу."
)

logger = logging.getLogger(__name__)

_GEMINI_MODELS_CACHE: dict[str, Any] = {}
_OPENROUTER_CLIENT: Optional[httpx.Client] = None

if getattr(settings, "GEMINI_API_KEY", None):
    try:
        genai.configure(api_key=settings.GEMINI_API_KEY)
        logger.info("Gemini SDK configured")
    except Exception as e:
        logger.exception("Failed to configure Gemini SDK: %s", e)
else:
    logger.warning("GEMINI_API_KEY is not set. Gemini provider will be unavailable.")


def _get_http_client() -> httpx.Client:
    global _OPENROUTER_CLIENT
    if _OPENROUTER_CLIENT is None:
        _OPENROUTER_CLIENT = httpx.Client(timeout=30)
    return _OPENROUTER_CLIENT


def _clip_text(text: str, limit: int = 12000) -> str:
    if not isinstance(text, str):
        return ""
    if len(text) <= limit:
        return text
    head = text[: int(limit * 0.8)]
    tail = text[-int(limit * 0.2) :]
    return head + "\n…\n" + tail


def _normalize_model_name(name: str) -> str:
    return name.split("/", 1)[-1]


def _get_model(model_name: str):
    if not settings.GEMINI_API_KEY:
        logger.debug("Skipping Gemini model '%s' because GEMINI_API_KEY is missing", model_name)
        return None
    name = _normalize_model_name(model_name)
    if name in _GEMINI_MODELS_CACHE:
        return _GEMINI_MODELS_CACHE[name]
    try:
        model = genai.GenerativeModel(
            name,
            system_instruction=SYSTEM_INSTRUCTION,
            generation_config={
                "response_mime_type": "application/json",
                "temperature": 0.6,
                "top_p": 0.9,
            },
        )
    except TypeError:
        model = genai.GenerativeModel(
            name,
            generation_config={
                "response_mime_type": "application/json",
                "temperature": 0.6,
                "top_p": 0.9,
            },
        )
    _GEMINI_MODELS_CACHE[name] = model
    return model


def _resolve_model_candidates() -> list[str]:
    return [
        "gemini-2.5-flash",
        "gemini-1.5-flash-latest",
        "gemini-1.5-flash",
        "gemini-1.5-pro-latest",
        "gemini-1.5-pro",
        "gemini-1.0-pro",
    ]


def _format_chat_context(chat_context: Optional[Sequence[dict]] = None) -> str:
    if not chat_context:
        return ""
    lines: list[str] = []
    for m in chat_context:
        role = (m.get("role") or m.get("sender") or "").lower()
        content = (m.get("content") or "").strip()
        if not content:
            continue
        if role in ("user", "candidate"):
            lines.append(f"Кандидат: {content}")
        elif role in ("assistant", "bot", "system"):
            lines.append(f"Бот: {content}")
        else:
            lines.append(content)
    if not lines:
        return ""
    return "\n".join(lines[-15:])  


def _requirements_text(vacancy: dict) -> str:
    parts: list[str] = []
    title = vacancy.get("title")
    if title:
        parts.append(f"Позиция: {title}")
    city = vacancy.get("city")
    if city:
        parts.append(f"Город: {city}")
    desc = vacancy.get("description")
    if desc:
        parts.append(f"Описание: {desc}")
    exp = vacancy.get("min_experience_years")
    if isinstance(exp, (int, float)) and exp > 0:
        parts.append(f"Мин. опыт: {int(exp)} лет")
    emp = vacancy.get("employment_type")
    if emp:
        parts.append(f"Тип занятости: {emp}")
    edu = vacancy.get("education_level")
    if edu:
        parts.append(f"Образование: {edu}")
    langs = vacancy.get("languages")
    if isinstance(langs, str):
        langs = [x.strip() for x in langs.split(",") if x.strip()]
    if isinstance(langs, list) and langs:
        parts.append("Языки: " + ", ".join(langs))
    sal_min = vacancy.get("salary_min")
    sal_max = vacancy.get("salary_max")
    cur = vacancy.get("currency") or ""
    if sal_min or sal_max:
        if sal_min and sal_max:
            parts.append(f"Зарплата: {sal_min}-{sal_max} {cur}".strip())
        elif sal_min:
            parts.append(f"Зарплата от: {sal_min} {cur}".strip())
        elif sal_max:
            parts.append(f"Зарплата до: {sal_max} {cur}".strip())
    skills = vacancy.get("skills")
    if isinstance(skills, str):
        skills = [x.strip() for x in skills.split(",") if x.strip()]
    if isinstance(skills, list) and skills:
        parts.append("Навыки: " + ", ".join(skills))
    return "\n".join(parts)


def _sanitize_and_parse_json(text: str) -> Optional[dict[str, Any]]:
    t = (text or "").strip()
    if not t:
        return None
    if t.startswith("```"):
        t = re.sub(r"^```json\s*", "", t, flags=re.IGNORECASE).lstrip("`").rstrip("`").strip()
    try:
        return json.loads(t)
    except Exception as e:
        m = re.search(r"\{[\s\S]*\}$", t, flags=re.MULTILINE)
        if m:
            try:
                return json.loads(m.group(0))
            except Exception:
                logger.debug("Failed to parse JSON from fenced block: %s", t[:2000])
                return None
        logger.debug("Failed to parse JSON from model text: %s", t[:2000])
        return None


def analyze_cv_with_gemini(cv_text: str, vacancy: dict, chat_context: Optional[Sequence[dict]] = None) -> Optional[dict[str, Any]]:
    model_names = _resolve_model_candidates()

    chat_block = _format_chat_context(chat_context)
    req_text = _requirements_text(vacancy)

    prompt = (
        f"ТРЕБОВАНИЯ ВАКАНСИИ (текст):\n{_clip_text(req_text, 4000)}\n\n"
        f"ВАКАНСИЯ(JSON): {json.dumps(vacancy, ensure_ascii=False)}\n\n"
        f"РЕЗЮМЕ(ПОЛНЫЙ ТЕКСТ):\n{_clip_text(cv_text, 12000)}\n\n"
        + (f"КОНТЕКСТ ИЗ ЧАТА (последние сообщения):\n{chat_block}\n\n" if chat_block else "") +
        "Требования к ответу: верни СТРОГО JSON следующей структуры, без текста вне JSON. \n"
        "Все значения-строки — НА РУССКОМ ЯЗЫКЕ. Тексты — короткие и понятные. Если данных нет, ставь null или пустой список.\n"
        "{\n"
        "  \"candidate_profile\": {\"city\": str|null, \"experience_years\": number|null, \"education\": str|null, \"languages\": [str]|null, \"skills\": [str]|null, \"employment_type\": str|null, \"salary_expectation\": number|null},\n"
        "  \"mismatches\": [str],\n"
        "  \"summary\": str,\n"
        "  \"score\": number,\n"
        "  \"question\": str\n"
        "}\n"
        "Пояснения: \n"
        "- mismatches — это КОРОТКИЕ формулировки ключевых несоответствий ТОЛЬКО относительно требований ВАКАНСИИ (не добавляй пункты, которых нет в описании вакансии).\n"
        "- score — целое число 0..100, основанное на соответствии требованиям.\n"
        "- question — ОДИН естественный, разговорный вопрос кандидату. "
        + (
            "КРИТИЧЕСКИ ВАЖНО: \n"
            "  * Внимательно изучи КОНТЕКСТ ДИАЛОГА — какие вопросы уже задавались и какие ответы получены.\n"
            "  * НЕ ПОВТОРЯЙ уже заданные вопросы даже если они были сформулированы по-другому.\n"
            "  * Задавай вопрос только про НОВОЕ несоответствие, которое ещё НЕ обсуждалось.\n"
            "  * Если ответ кандидата был достаточным и устранил несоответствие, НЕ спрашивай про него снова.\n"
            "  * Если все критичные несоответствия уже обсуждены, верни question: null — это сигнал завершить диалог.\n"
            if chat_block 
            else "Сформулируй первый вопрос про САМОЕ критичное несоответствие из mismatches.\n"
        )
        + "Формулируй вопрос как живой HR-менеджер (без шаблонов, перечислений, списков). "
        "Вопрос должен быть конкретным, на 1–2 предложения, дружелюбным тоном. "
        "Примеры хороших вопросов: 'Расскажите, пожалуйста, подробнее о вашем опыте с React — сколько времени работали и какие проекты делали?', "
        "'Вижу, что в вакансии указан Санкт-Петербург. Вы готовы к переезду или рассматриваете удалённую работу?'\n"
        "- summary — краткая выжимка по соответствию кандидата вакансии.\n"
    )
    if not settings.GEMINI_API_KEY:
        logger.warning("analyze_cv_with_gemini: GEMINI_API_KEY not set; skipping Gemini calls")
        return None
    for name in model_names:
        try:
            model = _get_model(name)
            if not model:
                continue
            logger.info("Gemini: trying model '%s'", name)
            resp = model.generate_content([prompt])
            text = (getattr(resp, "text", None) or "").strip()
            if not text:
                logger.warning("Gemini model '%s' returned empty text", name)
                continue
            data = _sanitize_and_parse_json(text)
            if not data:
                logger.warning("Gemini model '%s' returned non-JSON or invalid JSON", name)
                continue
            return data
        except Exception as e:
            logger.exception("Gemini model '%s' failed: %s", name, e)
            continue
    logger.error("All Gemini model attempts failed or returned invalid output")
    return None


def analyze_cv_with_openrouter(cv_text: str, vacancy: dict, chat_context: Optional[Sequence[dict]] = None) -> Optional[dict[str, Any]]:
    if not settings.OPENROUTER_API_KEY:
        logger.debug("OpenRouter API key not set; skipping OpenRouter")
        return None
    chat_block = _format_chat_context(chat_context)
    req_text = _requirements_text(vacancy)
    prompt = (
        f"ТРЕБОВАНИЯ ВАКАНСИИ (текст):\n{_clip_text(req_text, 4000)}\n\n"
        f"ВАКАНСИЯ(JSON): {json.dumps(vacancy, ensure_ascii=False)}\n\n"
        f"РЕЗЮМЕ(ПОЛНЫЙ ТЕКСТ):\n{_clip_text(cv_text, 16000)}\n\n"
        + (f"КОНТЕКСТ ИЗ ЧАТА (последние сообщения):\n{chat_block}\n\n" if chat_block else "") +
        "Требования к ответу: верни СТРОГО JSON следующей структуры, без текста вне JSON. \n"
        "Все значения-строки — НА РУССКОМ ЯЗЫКЕ. Тексты — короткие и понятные. Если данных нет, ставь null или пустой список.\n"
        "{\n"
        "  \"candidate_profile\": {\"city\": str|null, \"experience_years\": number|null, \"education\": str|null, \"languages\": [str]|null, \"skills\": [str]|null, \"employment_type\": str|null, \"salary_expectation\": number|null},\n"
        "  \"mismatches\": [str],\n"
        "  \"summary\": str,\n"
        "  \"score\": number,\n"
        "  \"question\": str  \n"
        "}\n"
        "Пояснения: \n"
        "- mismatches — КОРОТКИЕ формулировки ключевых несоответствий ТОЛЬКО относительно требований ВАКАНСИИ (не добавляй пункты, которых нет в описании вакансии).\n"
        "- score — целое число 0..100, чем выше, тем лучше соответствие.\n"
        "- question — один естественный вопрос кандидату по САМЫМ критичным несоответствиям из mismatches (без перечислений, 1–2 предложения).\n"
        "- summary — краткая выжимка.\n"
    )
    model = settings.LLM_MODEL or "deepseek/deepseek-v3"
    try:
        headers = {
            "Authorization": f"Bearer {settings.OPENROUTER_API_KEY}",
            "Content-Type": "application/json",
        }
        payload = {
            "model": model,
            "messages": [
                {"role": "system", "content": SYSTEM_INSTRUCTION},
                {"role": "user", "content": prompt},
            ],
            "response_format": {"type": "json_object"},
        }
        client = _get_http_client()
        r = client.post("https://openrouter.ai/api/v1/chat/completions", headers=headers, json=payload)
        try:
            r.raise_for_status()
        except Exception as http_err:
            logger.error("OpenRouter error: %s | status=%s | body=%s", http_err, r.status_code, r.text[:1000])
            return None
        data = r.json()
        content = (data.get("choices", [{}])[0].get("message", {}).get("content") or "").strip()
        if not content:
            logger.warning("OpenRouter returned empty content for model '%s'", model)
            return None
        try:
            return json.loads(content)
        except Exception as e:
            logger.warning("OpenRouter returned non-JSON content: %s", content[:1000])
            return None
    except Exception as e:
        logger.exception("OpenRouter call failed: %s", e)
        return None


def analyze_cv(cv_text: str, vacancy: dict, chat_context: Optional[Sequence[dict]] = None) -> Optional[dict[str, Any]]:
    provider = (settings.LLM_PROVIDER or "").lower()
    logger.info("LLM provider selected: %s", provider or "<default>")
    if provider == "openrouter":
        out = analyze_cv_with_openrouter(cv_text, vacancy, chat_context)
        if out is not None:
            return out
        logger.info("Falling back to Gemini after OpenRouter returned no result")
    out = analyze_cv_with_gemini(cv_text, vacancy, chat_context)
    return out


def score_from_llm_result(llm: dict[str, Any], vacancy: dict) -> tuple[int, list[str], str]:
    mismatches = llm.get("mismatches") or []
    summary = llm.get("summary") or ""
    score_raw = llm.get("score")
    score: int
    try:
        if isinstance(score_raw, (int, float)):
            score = int(max(0, min(100, round(score_raw))))
        else:
            raise ValueError()
    except Exception:
        score = max(30, 100 - 10 * len(mismatches))
    return score, mismatches, summary
