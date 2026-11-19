from typing import Any


class AppError(Exception):
    """Domain error rendered as {"error": {"code", "message", "details"}}."""

    def __init__(self, status_code: int, code: str, message: str, details: Any | None = None) -> None:
        super().__init__(message)
        self.status_code = status_code
        self.code = code
        self.message = message
        self.details = details


def not_found(message: str = "Not found") -> AppError:
    return AppError(404, "not_found", message)


def conflict(code: str, message: str, details: Any | None = None) -> AppError:
    return AppError(409, code, message, details)


def bad_request(code: str, message: str, details: Any | None = None) -> AppError:
    return AppError(400, code, message, details)
