from typing import Annotated
from urllib.parse import urlparse

from fastapi import Depends, Request
from sqlalchemy.orm import Session

from app.config import get_settings
from app.db import get_db
from app.errors import AppError
from app.models import AdminUser
from app.security import COOKIE_NAME, decode_admin_token

DB = Annotated[Session, Depends(get_db)]
SAFE_METHODS = {"GET", "HEAD", "OPTIONS"}


def _origin_allowed(request: Request) -> bool:
    origin = request.headers.get("origin")
    if not origin:
        return True  # non-browser clients (curl, tests); cookies still required
    allowed = set(get_settings().cors_origin_list)
    host = request.headers.get("host", "")
    allowed.add(f"{request.url.scheme}://{host}")
    return origin in allowed or urlparse(origin).netloc == host


def require_admin(request: Request, db: DB) -> AdminUser:
    """Backend authorization for every /admin route (cookie JWT + live DB check)."""
    token = request.cookies.get(COOKIE_NAME)
    claims = decode_admin_token(token) if token else None
    if not claims:
        raise AppError(401, "unauthorized", "Please sign in")
    admin = db.get(AdminUser, int(claims["sub"]))
    if not admin or not admin.is_active:
        raise AppError(401, "unauthorized", "Please sign in")
    if request.method not in SAFE_METHODS and not _origin_allowed(request):
        raise AppError(403, "bad_origin", "Cross-site request blocked")
    return admin


CurrentAdmin = Annotated[AdminUser, Depends(require_admin)]


def client_ip(request: Request) -> str:
    return request.client.host if request.client else "unknown"
