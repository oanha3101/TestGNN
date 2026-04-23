# Deployment guide

## Quick start — docker compose

Bring up the full stack (MariaDB + backend + frontend):

```bash
docker compose up --build
```

Services available after bootstrap:

| Service  | URL                        | Purpose                              |
|----------|----------------------------|--------------------------------------|
| Frontend | http://localhost:5173      | Vite SPA served by nginx             |
| Backend  | http://localhost:8000      | FastAPI + PyTorch Geometric          |
| Swagger  | http://localhost:8000/docs | OpenAPI UI                           |
| DB       | 127.0.0.1:3306             | MariaDB (user/pw: `gnnvp` / `gnnvp`) |

Bootstrap admin is seeded on first startup (`admin@gnn-vp.com` / `admin123`).
Schema files in `backend/sql/` are applied only on a fresh DB volume.

Enable the optional Adminer DB UI:

```bash
docker compose --profile tools up --build
```

→ http://localhost:8080 (server `db`, user `gnnvp`).

Tear everything down, including the DB volume and saved ML artifacts:

```bash
docker compose down -v
```

## Production notes

Before deploying `docker-compose.yml` to a shared environment:

1. Override `JWT_SECRET_KEY` with a strong random value.
2. Set `APP_ENV=production` (backend refuses to boot if `JWT_SECRET_KEY` is still
   the default at that point).
3. Change `BOOTSTRAP_ADMIN_PASSWORD` and rotate the admin password after first
   login.
4. Restrict `CORS_ORIGINS` to your real frontend hostname.
5. Consider fronting the frontend with a TLS-terminating reverse proxy
   (Caddy / nginx / Traefik) instead of exposing `:5173` directly.

## CI

GitHub Actions workflow `.github/workflows/ci.yml`:

- **frontend** job: `npm ci` → `npm run lint` → `npm run build`.
- **backend** job: boots a MariaDB 10.6 service, installs torch (CPU wheel) +
  requirements, applies `backend/sql/*.sql`, runs `pytest -q`.

Both run on every push to `main` and on every PR.
