"""Flask helpers for AuthKit token verification."""

from __future__ import annotations

from functools import wraps
from typing import Any, Callable, TypeVar

from .client import AuthKit
from .errors import AuthKitError
from .framework import extract_bearer_token

ViewFunction = TypeVar("ViewFunction", bound=Callable[..., Any])


def require_auth(authkit: AuthKit):
    from flask import g, jsonify, request

    def decorator(view_function: ViewFunction) -> ViewFunction:
        @wraps(view_function)
        def wrapped(*args: Any, **kwargs: Any):
            token = extract_bearer_token(request.headers.get("Authorization"))

            if token is None:
                return (
                    jsonify(
                        {
                            "error": {
                                "code": "UNAUTHORIZED",
                                "message": "Authentication required",
                                "details": {},
                            }
                        }
                    ),
                    401,
                )

            try:
                g.auth_user = authkit.verify_token(token)
            except AuthKitError as exc:
                return (
                    jsonify(
                        {
                            "error": {
                                "code": exc.code,
                                "message": str(exc),
                                "details": exc.details,
                            }
                        }
                    ),
                    exc.status_code,
                )

            return view_function(*args, **kwargs)

        return wrapped  # type: ignore[return-value]

    return decorator
