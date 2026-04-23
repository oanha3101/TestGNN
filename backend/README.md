# GNN-VP Backend

FastAPI backend for the GNN Visualization Platform.

Features:
- Auth (register / login / me / logout)
- Profile update
- Training runs CRUD (CPU-based real GNN models land in a follow-up PR)
- Social: training posts CRUD, likes, STYM Vault bookmarks
- Admin: user role/status, post moderation, overview
- Audit log for every mutating action

## 1. Install

```bash
cd backend
python -m venv .venv

# Windows
.venv\Scripts\activate
# macOS / Linux
source .venv/bin/activate

pip install -r requirements.txt
```

## 2. Configure

```bash
# Windows
copy .env.example .env
# macOS / Linux
cp .env.example .env
```

Edit `DATABASE_URL`, `JWT_SECRET_KEY`, `CORS_ORIGINS` in `.env`.

> **Production safety:** set `APP_ENV=production` and override `JWT_SECRET_KEY` with a
> long random value. The app refuses to boot if the default dev secret is used
> while `APP_ENV=production`.

## 3. Apply MySQL / MariaDB schema

Run both migrations (in order) via phpMyAdmin, `mysql` CLI, or any client:

```bash
mysql -u root -p < sql/001_init_schema.sql
mysql -u root -p < sql/002_add_posts_training_json.sql
```

## 4. Start API

```bash
uvicorn app.main:app --reload --port 8000
```

## 5. API Docs

- Swagger UI: `http://localhost:8000/docs`
- OpenAPI JSON: `http://localhost:8000/openapi.json`

## 6. Smoke test

With the server running:

```bash
python smoke_api_flow.py
```
