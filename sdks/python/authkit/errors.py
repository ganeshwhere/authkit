"""Typed errors exposed by the AuthKit Python SDK."""

from __future__ import annotations

from typing import Any, Mapping


class AuthKitError(Exception):
    """Base exception for all AuthKit SDK failures."""

    def __init__(
        self,
        message: str,
        *,
        code: str = "AUTHKIT_ERROR",
        status_code: int = 400,
        details: Mapping[str, Any] | None = None,
    ) -> None:
        super().__init__(message)
        self.code = code
        self.status_code = status_code
        self.details = dict(details or {})


class InvalidTokenError(AuthKitError):
    """Raised when a JWT is malformed or fails signature/claims checks."""

    def __init__(
        self,
        message: str = "Invalid token",
        *,
        details: Mapping[str, Any] | None = None,
    ) -> None:
        super().__init__(
            message,
            code="INVALID_TOKEN",
            status_code=401,
            details=details,
        )


class TokenExpiredError(AuthKitError):
    """Raised when a JWT has expired."""

    def __init__(
        self,
        message: str = "Token has expired",
        *,
        details: Mapping[str, Any] | None = None,
    ) -> None:
        super().__init__(
            message,
            code="TOKEN_EXPIRED",
            status_code=401,
            details=details,
        )


class JWKSFetchError(AuthKitError):
    """Raised when the SDK cannot retrieve or parse JWKS keys."""

    def __init__(
        self,
        message: str = "Failed to fetch JWKS",
        *,
        details: Mapping[str, Any] | None = None,
    ) -> None:
        super().__init__(
            message,
            code="JWKS_FETCH_FAILED",
            status_code=502,
            details=details,
        )


class ConfigurationError(AuthKitError):
    """Raised when SDK configuration is missing or invalid."""

    def __init__(
        self,
        message: str,
        *,
        details: Mapping[str, Any] | None = None,
    ) -> None:
        super().__init__(
            message,
            code="INVALID_CONFIGURATION",
            status_code=400,
            details=details,
        )
