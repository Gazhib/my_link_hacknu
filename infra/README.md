# Локальный запуск в Docker

Сервисы:
- db (Postgres 16)
- backend (FastAPI)
- frontend (Nginx + собранный React)

Запуск:
- docker compose up --build

URL‑адреса:
 - Frontend: http://localhost:8081/
 - Backend API: http://localhost:8001/api/v1
 - Загрузки бэкенда: http://localhost:8001/uploads
 - Postgres (хост): localhost:5433 (в контейнере 5432)

Примечания:
- Установите переменную окружения GEMINI_API_KEY в вашей оболочке перед `docker compose up`, если хотите реальный анализ LLM.
- Данные сохраняются в томах `db-data` и `backend-uploads`.
