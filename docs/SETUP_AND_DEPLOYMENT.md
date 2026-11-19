# Setup and deployment

Prerequisites: Docker (for PostgreSQL), Python 3.12, Node 24 (npm 11), Git. Verified on Windows 11 in this session; the CI workflow runs the same steps on Ubuntu.

## 1. Local setup (step by step)

### Database
```bash
docker compose up -d        # postgres:17-alpine, host port 5433
```
Creates databases `saree` (dev), `saree_test` (pytest) and `saree_e2e` (Playwright) via `scripts/init-db.sql`. Local-only credentials are in `docker-compose.yml`. (If you created the volume before `init-db.sql` existed, run `docker compose down -v` once.)

### Backend
```powershell
cd backend
py -3.12 -m venv .venv
.\.venv\Scripts\pip install -r requirements-dev.txt     # Linux/macOS: .venv/bin/pip …
copy .env.example .env                                  # edit JWT_SECRET
$env:PYTHONPATH = "."                                   # Linux/macOS: export PYTHONPATH=.
.\.venv\Scripts\python -m app.cli migrate               # alembic upgrade head
.\.venv\Scripts\python -m app.cli seed                  # idempotent; add --demo-orders for sample orders, --reset to wipe first
.\.venv\Scripts\python -m app.cli create-admin          # prompts for email + password
.\.venv\Scripts\python -m uvicorn app.main:app --port 8010 --reload
```
**Admin account**: there is no default or committed password. `create-admin` reads `--email/--password`, else `ADMIN_EMAIL` / `ADMIN_PASSWORD` from the environment/`.env`, else prompts (password hidden, ≥ 10 characters). Re-running it for an existing email resets that admin's password. The password is stored as an Argon2id hash. Note: admin emails must pass strict e-mail validation (use a real-looking domain such as `@example.com`, not `.test`).

Generate a secret: `python -c "import secrets; print(secrets.token_urlsafe(48))"`.

### Frontend
```powershell
cd frontend
npm ci
copy .env.example .env.local        # API_URL=http://localhost:8010
npm run dev                         # http://localhost:3000
```
Production-style: `npm run build` then `npm run start`.

### URLs
Storefront `http://localhost:3000` · Admin `http://localhost:3000/admin/login` · API docs `http://localhost:8010/docs` · Health `http://localhost:8010/health`.

## 2. Environment variables

**Backend (`backend/.env`)**
| Var | Default | Notes |
|---|---|---|
| `DATABASE_URL` | local compose DB | `postgresql+psycopg://user:pw@host:port/db` |
| `JWT_SECRET` | dev placeholder | **Required, ≥ 32 random chars when `ENVIRONMENT=production`** (the app refuses to start otherwise) |
| `ENVIRONMENT` | `development` | `production` enables the secret check |
| `CORS_ORIGINS` | `http://localhost:3000` | comma-separated; also used for the admin Origin check |
| `PAYMENT_PROVIDER` | `demo` | only `demo` is accepted |
| `COOKIE_SECURE` | `false` | **set `true` behind HTTPS** |
| `UPLOAD_DIR` | `uploads` | served at `/media`; needs a persistent volume in production |
| `RESERVATION_MINUTES` | `30` | unpaid stock hold |
| `ADMIN_EMAIL`, `ADMIN_PASSWORD` | – | used only by `create-admin` |

**Frontend (`frontend/.env.local`)**: `API_URL` (server-side URL of the API), `NEXT_PUBLIC_SITE_URL` (canonical URL for metadata/sitemap).

**Tests**: `TEST_DATABASE_URL` (pytest), `E2E_DATABASE_URL`, `E2E_API_PORT` (8011), `E2E_WEB_PORT` (3100), `E2E_ADMIN_EMAIL`, `E2E_ADMIN_PASSWORD` (throw-away values for the e2e database only).

## 3. Migrations
```bash
python -m app.cli migrate                            # = alembic upgrade head
alembic revision --autogenerate -m "describe change" --rev-id 0002
alembic check                                        # fails if models drift from migrations
alembic downgrade -1
```
Verified in this project: upgrade on an empty DB, `alembic check` (no drift), downgrade to base, upgrade again, and seeding twice yields 15 products / 45 images / 4 collections / 2 shipping methods (idempotent).

## 4. Tests and checks
```powershell
# backend (needs the compose DB running)
cd backend; $env:PYTHONPATH="."
.\.venv\Scripts\ruff check .; .\.venv\Scripts\ruff format --check .
.\.venv\Scripts\mypy app
.\.venv\Scripts\pytest --cov=app

# frontend
cd frontend
npm run lint; npm run typecheck; npm test; npm run build

# browser journeys + accessibility (builds the app, resets saree_e2e, starts its own API on 8011 and web on 3100)
npx playwright install chromium     # first time
npm run test:e2e
```
`npm run test:e2e` is self-contained: it migrates/seeds `saree_e2e`, creates the e2e admin, and starts both servers (so your dev servers can keep running). Reports: `frontend/playwright-report/`, traces/screenshots of failures in `frontend/test-results/`.
Screenshots: with the dev stack running, `node scripts/screenshots.mjs ../docs/screenshots` (set `ADMIN_EMAIL`/`ADMIN_PASSWORD` to include admin pages).
Regenerate product art: `python scripts/generate_product_art.py`.

## 5. CI
`.github/workflows/ci.yml`: **backend** (ruff, format check, mypy, migration drift, pytest + coverage, against a Postgres service), **frontend** (lint, typecheck, vitest, build), **e2e** (Playwright desktop + mobile + axe, uploads the report). It uses only throw-away credentials for the ephemeral Postgres container; no secrets. *The workflow file has not been executed on GitHub in this session; its commands were each run locally.*

## 6. Practical deployment path (low cost, single region)
1. **PostgreSQL**: managed Postgres (e.g. Neon, Supabase, Railway, or a cloud provider's managed instance) in an Indian region if possible. Enable daily backups and point-in-time recovery. Use a strong password; restrict network access to the API.
2. **API** (FastAPI): containerise (`python:3.12-slim`, `pip install -r requirements.txt`, `uvicorn app.main:app --host 0.0.0.0 --port $PORT --workers 2`) and run on Render / Railway / Fly.io / a small VM. Set `ENVIRONMENT=production`, a random `JWT_SECRET`, `DATABASE_URL`, `CORS_ORIGINS=https://<shop-domain>`, `COOKIE_SECURE=true`. Run `python -m app.cli migrate` as a release step, then `create-admin` once. Mount a persistent volume at `UPLOAD_DIR` (or move uploads to object storage). Scale beyond one instance only after replacing the in-process rate limiter. No Dockerfile is included yet (see FINAL_REPORT next steps).
3. **Frontend** (Next.js): Vercel (simplest) or `next start` in a container. Set `API_URL` to the API's **internal/public URL** and `NEXT_PUBLIC_SITE_URL` to the public domain. Because the app proxies `/api/v1` and `/media`, the browser only ever talks to the shop domain.
4. **Domain/TLS** on the frontend host; make the API reachable by the frontend host (private network or HTTPS) and **not** needed by browsers directly.
5. Before indexing: flip `robots.ts` and the `robots` metadata in `layout.tsx`, remove the demo banner/labels, replace sample content (see CLIENT_HANDOFF.md).
6. Monitoring: ship API stdout (JSON logs) to a log service; alert on `/health` ≠ 200 and on `payment_failed`/5xx spikes; back up the uploads volume.
