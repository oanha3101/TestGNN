# GNN-VP Backend (Phase 3 Scaffold)

FastAPI backend scaffold for:
- Auth (register/login/me)
- Profile update
- Training posts CRUD
- Likes + STYM Vault bookmarks
- Basic admin controls (user role/status, post moderation, overview)

## 1. Install

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
```

## 2. Configure

```bash
copy .env.example .env
```

Edit `DATABASE_URL` in `.env`.

## 3. Apply MySQL schema in phpMyAdmin

Run file:

`backend/sql/001_init_schema.sql`

This creates all tables used by the backend.

## 4. Start API

```bash
uvicorn app.main:app --reload --port 8000
```

## 5. API Docs

- Swagger UI: `http://localhost:8000/docs`
- OpenAPI JSON: `http://localhost:8000/openapi.json`

