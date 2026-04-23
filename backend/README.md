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

### DATABASE_URL examples

The app uses SQLAlchemy + `pymysql`, so any MySQL-compatible server works
(local MySQL, XAMPP/phpMyAdmin, MariaDB, MySQL on Docker, etc.):

```dotenv
# Local MySQL (e.g. XAMPP / WAMP / standalone phpMyAdmin setup)
DATABASE_URL=mysql+pymysql://root:@127.0.0.1:3306/gnnvp

# MySQL with a password
DATABASE_URL=mysql+pymysql://gnnvp_user:your-password@127.0.0.1:3306/gnnvp

# MariaDB (identical driver)
DATABASE_URL=mysql+pymysql://root:gnnvp_root@127.0.0.1:3306/gnnvp
```

Use `127.0.0.1` rather than `localhost` to force TCP (some MySQL/MariaDB
installs default to a Unix socket for `root@localhost`, which `pymysql`
will not use).

## 3. Apply MySQL / MariaDB schema

If you already have an existing `gnnvp` database on phpMyAdmin, you can
skip step (a) below and just run (b). Otherwise create the DB first.

**a) Create the database + tables (first-time setup):**

Through phpMyAdmin: open the `SQL` tab of the server and paste the
contents of `sql/001_init_schema.sql` then `sql/002_add_posts_training_json.sql`
(in that order). Or via CLI:

```bash
mysql -u root -p < sql/001_init_schema.sql
mysql -u root -p < sql/002_add_posts_training_json.sql
```

**b) Migrating an existing DB:** If your database already exists but is
missing the `posts.training_run_snapshot` JSON column (added later), apply
only the second migration:

```bash
mysql -u root -p your_db_name < sql/002_add_posts_training_json.sql
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
