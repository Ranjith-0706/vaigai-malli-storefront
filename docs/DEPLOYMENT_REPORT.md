# Deployment report — Vaigai Malli demo storefront

Date: 2026-11-19 (India). Source: `main`, commit `9a2f001f16499bcacd8f25f9dfb2e48d8019213f` for the verified deployment.

## Live services

| Component | Location | Verification |
| --- | --- | --- |
| Storefront (Vercel Hobby) | https://vaigai-malli-storefront.vercel.app | Production deployment `dpl_B71DYjJP2ek8Z926JZg9buRSehxV` READY; homepage and product page rendered |
| API (Railway Free) | https://vaigai-api-production.up.railway.app | Production deployment `6355e165-7644-48b1-9815-c41111be114b` SUCCESS; `/health` returned database up and demo payment mode |
| PostgreSQL (Railway) | Private service; no public database URL | Template deployment `af0886e3-b210-4f38-9975-8f09042d15b3` SUCCESS; API health query connected |
| GitHub | https://github.com/Ranjith-0706/vaigai-malli-storefront | Vercel and Railway connected to `main`; deployment preparation PR #1 CI passed |

Vercel project root is `frontend` (Next.js 16, Node 24); Railway API root is `/backend` (Dockerfile). The Vercel server-side `API_URL` points to the Railway API, `NEXT_PUBLIC_SITE_URL` points to the production Vercel domain, and Railway `CORS_ORIGINS` contains that exact origin. No secret values are in this report or the repository.

## Live smoke test

- Railway `/health`: `{"status":"ok","database":"up","payment_mode":"demo"}`.
- Seeded catalogue: 15 sample products; a request through the Vercel same-origin `/api/v1/products?page_size=1` proxy returned `total: 15`. The seed command ran once and was removed from the startup configuration. Subsequent normal API deployment succeeded.
- Homepage showed collection counts and featured products. Product detail rendered price, stock, images, and demo labels.
- Guest cart and checkout worked with fictional test details. Flat-rate sample shipping was free. Simulated payment completed and the order confirmation showed reference `VM-8FB777BU`, total ₹28,500, and `Paid (demo)`. No money moved and nothing will ship. This test order remains in the demo database.
- GitHub Actions passed the backend, frontend, end-to-end and Docker build checks on the deployment preparation PR before the live deploy. The live test above covers the deployed path; it is not a full staging suite.

## Deliberate demo limits and follow-up

- The storefront uses fictional products, prices, artwork, policies and contact details. Payments are simulated only. The demo banner and `noindex` remain active. Do not accept real customer information or use this as a real shop.
- No admin account was created in Railway. Admin login and live upload behavior were not smoke tested. Railway Free's one persistent volume is used by PostgreSQL; `UPLOAD_DIR` is temporary, so admin-uploaded files will not survive restarts. Use bundled artwork for the demo.
- Railway Free has a limited monthly usage allowance and can sleep or stop when the allowance is exhausted. No paid plan or payment method was used in this setup. This deployment has no uptime or backup commitment.
- Before real client use: supply verified catalogue and business/legal details, integrate a real payment gateway, email, GST invoices, durable image storage, reservation-expiry scheduling, backups and restore testing, monitoring, and a paid or otherwise sustainable hosting budget.
