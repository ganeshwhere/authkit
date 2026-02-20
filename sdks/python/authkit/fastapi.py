"""FastAPI helpers for AuthKit token verification."""

from __future__ import annotations

from typing import Any

from .client import AuthKit
from .errors import AuthKitError


def require_auth(authkit: AuthKit):
    from fastapi import Depends, HTTPException
    from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

    bearer = HTTPBearer(auto_error=False)

    async def dependency(
        credentials: HTTPAuthorizationCredentials | None = Depends(bearer),
    ) -> dict[str, Any]:
        token = credentials.credentials if credentials else None

        if not token:
            raise HTTPException(
                status_code=401,
                detail={
                    "code": "UNAUTHORIZED",
                    "message": "Authentication required",
                    "details": {},
                },
            )

        try:
            return await authkit.verify_token_async(token)
        except AuthKitError as exc:
            raise HTTPException(
                status_code=exc.status_code,
                detail={
                    "code": exc.code,
                    "message": str(exc),
                    "details": exc.details,
                },
            ) from exc

    return dependency
