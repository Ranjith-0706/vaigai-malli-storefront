import logging
import time
import uuid
from collections.abc import Awaitable, Callable
from pathlib import Path

from fastapi import FastAPI, Request, Response
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
from sqlalchemy import text

from app.config import get_settings
from app.db import SessionLocal
from app.errors import AppError
from app.logging_config import log_event, setup_logging
from app.routers import admin, public

setup_logging()
log = logging.getLogger("app.http")
settings = get_settings()

DESCRIPTION = """
Storefront + admin API for the **Vaigai Malli** demo saree shop.

* Money is integer **paise**; totals are always recomputed on the server.
* Payments run in **demo mode** only (simulated, no money moves).
* Admin routes (`/api/v1/admin/*`) require the `vm_admin` httpOnly session cookie.
"""

app = FastAPI(
    title="Vaigai Malli API (demo)",
    version="1.0.0",
    description=DESCRIPTION,
    docs_url="/docs",
    redoc_url="/redoc",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE"],
    allow_headers=["Content-Type", "Idempotency-Key"],
)


@app.middleware("http")
async def request_context(request: Request, call_next: Callable[[Request], Awaitable[Response]]) -> Response:
    rid = request.headers.get("x-request-id") or uuid.uuid4().hex[:12]
    start = time.perf_counter()
    try:
        response = await call_next(request)
    except Exception:
        log.exception("unhandled_error", extra={"ctx": {"request_id": rid, "path": request.url.path}})
        response = JSONResponse(
            status_code=500,
            content={"error": {"code": "server_error", "message": "Something went wrong", "details": None}},
        )
    response.headers["X-Request-ID"] = rid
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    response.headers["Permissions-Policy"] = "camera=(), microphone=(), geolocation=()"
    if request.url.path.startswith("/api/v1/admin"):
        response.headers["Cache-Control"] = "no-store"
    if response.status_code >= 500 or (time.perf_counter() - start) > 1.5:
        log_event(
            log, logging.WARNING, "slow_or_failed_request", request_id=rid, path=request.url.path,
            status=response.status_code, ms=round((time.perf_counter() - start) * 1000),
        )  # fmt: skip
    return response


@app.exception_handler(AppError)
async def app_error_handler(_: Request, exc: AppError) -> JSONResponse:
    return JSONResponse(
        status_code=exc.status_code,
        content={"error": {"code": exc.code, "message": exc.message, "details": exc.details}},
    )


@app.exception_handler(RequestValidationError)
async def validation_handler(_: Request, exc: RequestValidationError) -> JSONResponse:
    fields = [
        {"field": ".".join(str(p) for p in e["loc"] if p not in ("body", "query")), "message": e["msg"].removeprefix("Value error, ")}
        for e in exc.errors()
    ]  # fmt: skip
    return JSONResponse(
        status_code=422,
        content={
            "error": {"code": "validation_error", "message": "Please check the highlighted fields", "details": fields}
        },
    )


@app.get("/health", tags=["ops"])
def health() -> JSONResponse:
    try:
        with SessionLocal() as db:
            db.execute(text("SELECT 1"))
    except Exception:
        log.exception("health_db_failed")
        return JSONResponse(status_code=503, content={"status": "degraded", "database": "down"})
    return JSONResponse({"status": "ok", "database": "up", "payment_mode": settings.payment_provider})


app.include_router(public.router)
app.include_router(admin.auth_router)
app.include_router(admin.router)

_upload_dir = Path(settings.upload_dir)
_upload_dir.mkdir(parents=True, exist_ok=True)
app.mount("/media", StaticFiles(directory=_upload_dir), name="media")
