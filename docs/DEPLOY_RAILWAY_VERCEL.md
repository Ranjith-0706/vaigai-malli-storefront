# Deploy the portfolio demo on Railway Free and Vercel

This path is for a **public demo only**. Payments are simulated. The brand, stock, policies and product artwork are fictional. Do not accept real customer details or advertise real fulfilment.

## Free-plan limits

Railway Free currently provides $1 of resource usage per month. Services sleep when idle and stop for the rest of the cycle if usage is exhausted. This is not an uptime commitment. The plan has one persistent volume, which PostgreSQL uses. The API's admin-uploaded images are therefore **ephemeral** on this deployment; use the committed SVG artwork and do not use admin uploads. Do not buy a plan or enter a payment method to follow this guide.

## 1. Railway database and API

1. Create a Railway project using the Free plan; add PostgreSQL. Keep it private, with no public database TCP proxy unless a specific operation requires one.
2. Add a GitHub service from `Ranjith-0706/vaigai-malli-storefront`, root directory `/backend`, branch `main`. Railway builds `backend/Dockerfile`. The container starts by running Alembic migrations and then Uvicorn on `$PORT`.
3. Give the API a generated public HTTPS domain. Set health check path `/health`. Keep a single API instance: the rate limiter is in-process.
4. Set API variables on Railway (do not commit the values):
   - `DATABASE_URL`: a reference to the PostgreSQL service's `DATABASE_URL`. The app converts ordinary `postgres://` and `postgresql://` URLs to the psycopg 3 dialect.
   - `ENVIRONMENT=production`
   - `JWT_SECRET`: a newly generated random secret, at least 32 characters
   - `PAYMENT_PROVIDER=demo`
   - `COOKIE_SECURE=true`
   - `CORS_ORIGINS`: the exact Vercel frontend origin after its URL is known. Add a comma-separated preview origin only when needed.
   - `UPLOAD_DIR=/tmp/vaigai-uploads` on Free. This directory is temporary and must not be used for durable images.
5. Wait for `/health` to return `{"status":"ok","database":"up","payment_mode":"demo"}`.
6. Run `python -m app.cli seed` **once**, using the Railway service shell/CLI with the production environment. Never run the seed on every startup: it resets demo product stock and prices on existing products. The `--demo-orders` option adds fictional order rows but is not idempotent; omit it for a clean public demo.
7. If an admin login is required, run `python -m app.cli create-admin` once with credentials supplied privately in the service shell. Do not put `ADMIN_PASSWORD` in GitHub or persistent Railway variables. Do not publish an admin password. Admin uploads will disappear on restart; use image URL entries pointing to committed frontend assets instead.

## 2. Vercel frontend

1. Import the same GitHub repo to Vercel. Set the project's root directory to `frontend` and framework to Next.js.
2. Set `API_URL=https://<Railway API domain>` (server-side variable, without trailing slash) and `NEXT_PUBLIC_SITE_URL=https://<Vercel storefront domain>` for Production. Redeploy after changing environment variables.
3. Verify homepage, collections, product detail, cart, checkout with **fictional** address/email, demo payment, order lookup and admin login. Product SVGs are bundled with the frontend.
4. Keep the demo banner and `noindex` metadata while payments and product details remain fictional. Do not collect real customer data or expose the admin credentials.

## 3. Verify and record

- Confirm GitHub Actions green for the deployment commit.
- Confirm Railway health and actual database connectivity.
- In a private browser session, run a fake order and verify its status; check the backend logs for errors.
- Inspect mobile and desktop layouts and `/media` behavior if testing uploads.
- Record actual URLs, deploy IDs, date, command outcomes and limitations in `docs/DEPLOYMENT_REPORT.md`; never include secrets.
- Set spending/usage alerts and watch Railway's quota. If Free shuts down, the storefront may show API errors until the next cycle.

## Before real commerce or a durable long-term launch

Use a plan with enough compute and persistent storage or move images to object storage; configure regular database backups and rehearse a restore, add scheduled reservation expiry, real payment verification and refunds, notifications, approved business policies, tax/invoicing decisions, and monitoring. The current code refuses non-demo payment providers.
