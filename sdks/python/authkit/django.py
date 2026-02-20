"""Django middleware integration for AuthKit token verification."""

from __future__ import annotations

from typing import Callable

from .client import AuthKit
from .errors import AuthKitError, ConfigurationError
from .framework import extract_bearer_token


class AuthKitMiddleware:
    def __init__(self, get_response: Callable):
        self.get_response = get_response
        self._authkit = self._build_client_from_settings()

    @staticmethod
    def _build_client_from_settings() -> AuthKit:
        from django.conf import settings

        base_url = getattr(settings, "AUTHKIT_BASE_URL", None)
        public_key = getattr(settings, "AUTHKIT_PUBLIC_KEY", None)
        issuer = getattr(settings, "AUTHKIT_ISSUER", None)
        audience = getattr(settings, "AUTHKIT_AUDIENCE", None)

        if not base_url:
            raise ConfigurationError("AUTHKIT_BASE_URL is required for AuthKitMiddleware")

        return AuthKit(
            base_url=base_url,
            public_key=public_key,
            issuer=issuer,
            audience=audience,
        )

    def __call__(self, request):
        from django.http import JsonResponse

        token = extract_bearer_token(request.META.get("HTTP_AUTHORIZATION"))

        if token is None:
            return self.get_response(request)

        try:
            request.auth_user = self._authkit.verify_token(token)
        except AuthKitError as exc:
            return JsonResponse(
                {
                    "error": {
                        "code": exc.code,
                        "message": str(exc),
                        "details": exc.details,
                    }
                },
                status=exc.status_code,
            )

        return self.get_response(request)
