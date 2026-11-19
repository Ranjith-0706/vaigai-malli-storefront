import threading
import time
from collections import defaultdict, deque
from datetime import UTC, datetime, timedelta

import jwt
from argon2 import PasswordHasher
from argon2.exceptions import InvalidHashError, VerificationError

from app.config import get_settings
from app.errors import AppError

_hasher = PasswordHasher()
# Pre-computed hash so login takes similar time for unknown e-mails.
_DUMMY_HASH = _hasher.hash("not-a-real-password")
COOKIE_NAME = "vm_admin"


def hash_password(password: str) -> str:
    return _hasher.hash(password)


def verify_password(password: str, password_hash: str | None) -> bool:
    try:
        return _hasher.verify(password_hash or _DUMMY_HASH, password) and password_hash is not None
    except (VerificationError, InvalidHashError):
        return False


def create_admin_token(admin_id: int, email: str) -> str:
    s = get_settings()
    now = datetime.now(UTC)
    payload = {
        "sub": str(admin_id),
        "email": email,
        "aud": "admin",
        "iat": now,
        "exp": now + timedelta(hours=s.admin_session_hours),
    }
    return jwt.encode(payload, s.jwt_secret, algorithm="HS256")


def decode_admin_token(token: str) -> dict[str, str] | None:
    try:
        data = jwt.decode(token, get_settings().jwt_secret, algorithms=["HS256"], audience="admin")
    except jwt.PyJWTError:
        return None
    return data


class RateLimiter:
    """Small in-process sliding-window limiter (single API instance).

    For multiple API instances replace with a shared store (e.g. Redis) or put a
    rate limit at the reverse proxy.
    """

    def __init__(self, limit: int, window_seconds: int, name: str) -> None:
        self.limit = limit
        self.window = window_seconds
        self.name = name
        self._hits: dict[str, deque[float]] = defaultdict(deque)
        self._lock = threading.Lock()

    def reset(self) -> None:
        with self._lock:
            self._hits.clear()

    def check(self, key: str) -> None:
        now = time.monotonic()
        with self._lock:
            q = self._hits[key]
            while q and now - q[0] > self.window:
                q.popleft()
            if len(q) >= self.limit:
                raise AppError(429, "rate_limited", "Too many attempts. Please wait a few minutes.")
            q.append(now)


login_limiter = RateLimiter(10, 300, "login")
lookup_limiter = RateLimiter(20, 300, "lookup")
payment_limiter = RateLimiter(40, 300, "payment")
ALL_LIMITERS = (login_limiter, lookup_limiter, payment_limiter)
