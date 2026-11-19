# Vaigai Malli — demo saree storefront

A portfolio-quality saree e-commerce storefront with a protected admin console. **Everything is demo data**: the brand, products, prices, policies and contact details are fictional, and payments are simulated (no money moves, no credentials needed).

| Layer | Tech |
|---|---|
| Frontend | Next.js 16 (App Router), React 19, TypeScript 6, Tailwind CSS 4 |
| API | FastAPI 0.165, SQLAlchemy 2.1, Alembic, Pydantic 2, Argon2 password hashing |
| Database | PostgreSQL 17 (Docker Compose) |
| Tests | pytest, Vitest + Testing Library, Playwright (+ axe accessibility scans) |

## Quick start (Windows PowerShell shown; macOS/Linux notes in docs)

```powershell
docker compose up -d                                   # PostgreSQL on localhost:5433

cd backend
py -3.12 -m venv .venv
.\.venv\Scripts\pip install -r requirements-dev.txt
copy .env.example .env                                 # then set JWT_SECRET (see file)
$env:PYTHONPATH="."
.\.venv\Scripts\python -m app.cli migrate
.\.venv\Scripts\python -m app.cli seed --demo-orders   # 15 sarees, 4 collections, 6 sample orders
.\.venv\Scripts\python -m app.cli create-admin         # prompts for email + password (no default exists)
.\.venv\Scripts\python -m uvicorn app.main:app --port 8010

# second terminal
cd frontend
npm ci
copy .env.example .env.local
npm run dev                                            # http://localhost:3000
```

* Storefront: <http://localhost:3000> · Admin: <http://localhost:3000/admin> · API docs: <http://localhost:8010/docs>
* The API uses port **8010** (not 8000) to avoid clashing with other local tools.
* Full details: [docs/SETUP_AND_DEPLOYMENT.md](docs/SETUP_AND_DEPLOYMENT.md)

## Documentation

| Doc | Purpose |
|---|---|
| [PRODUCT_REQUIREMENTS](docs/PRODUCT_REQUIREMENTS.md) | users, pages, features, acceptance criteria, demo vs live |
| [ARCHITECTURE](docs/ARCHITECTURE.md) | diagrams, data model, API flows, state model, decisions |
| [SETUP_AND_DEPLOYMENT](docs/SETUP_AND_DEPLOYMENT.md) | commands, env vars, migrations, tests, deployment path |
| [TEST_REPORT](docs/TEST_REPORT.md) | what was run, results, failures fixed |
| [FINAL_REPORT](docs/FINAL_REPORT.md) | what works, limitations, next steps |
| [CLIENT_HANDOFF](docs/CLIENT_HANDOFF.md) | plain-English demo walkthrough + launch checklist |
| [ASSETS](docs/ASSETS.md) | asset provenance and licences |
| [DEPLOY_RAILWAY_VERCEL](docs/DEPLOY_RAILWAY_VERCEL.md) | $0 portfolio deployment steps and limitations |

## Repository layout

```
backend/    FastAPI app (app/), Alembic migrations (alembic/), pytest suite (tests/)
frontend/   Next.js app (src/), unit tests (src/**/*.test.ts[x]), Playwright (e2e/)
scripts/    generate_product_art.py (original SVG artwork), init-db.sql
docs/       requirements, architecture, setup, reports, screenshots
```
