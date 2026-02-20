"""AuthKit token verification client for Python."""

from __future__ import annotations

import json
from typing import Any

import jwt
from jwt import algorithms

from .errors import (
    ConfigurationError,
    InvalidTokenError,
    TokenExpiredError,
)
from .jwks import JWKSCache


def _normalize_base_url(base_url: str) -> str:
    return base_url.rstrip("/")


class AuthKit:
    """Verifies AuthKit JWT access tokens using local keys or JWKS."""

    def __init__(
        self,
        *,
        base_url: str,
        public_key: str | None = None,
        issuer: str | None = None,
        audience: str | None = None,
        jwks_ttl_seconds: int = 3600,
        jwks_cache: JWKSCache | None = None,
    ) -> None:
        if not base_url:
            raise ConfigurationError("base_url is required")

        self._base_url = _normalize_base_url(base_url)
        self._public_key = public_key
        self._issuer = issuer
        self._audience = audience
        self._jwks_cache = jwks_cache or JWKSCache(
            base_url=self._base_url,
            default_ttl_seconds=jwks_ttl_seconds,
        )

    def _decode_claims(self, token: str, key: Any) -> dict[str, Any]:
        options = {
            "verify_aud": self._audience is not None,
        }

        kwargs: dict[str, Any] = {
            "algorithms": ["RS256"],
            "options": options,
        }

        if self._issuer is not None:
            kwargs["issuer"] = self._issuer

        if self._audience is not None:
            kwargs["audience"] = self._audience

        try:
            claims = jwt.decode(token, key=key, **kwargs)
        except jwt.ExpiredSignatureError as exc:
            raise TokenExpiredError() from exc
        except jwt.InvalidTokenError as exc:
            raise InvalidTokenError(str(exc)) from exc

        if not isinstance(claims, dict):
            raise InvalidTokenError("Decoded token claims are invalid")

        return claims

    def _resolve_jwk_key_sync(self, token: str) -> Any:
        kid = self._extract_kid(token)

        jwks = self._jwks_cache.get_sync(force_refresh=False)
        key = self._find_key_in_jwks(jwks, kid)

        if key is None:
            # Refresh once to handle key rotation and retry.
            jwks = self._jwks_cache.get_sync(force_refresh=True)
            key = self._find_key_in_jwks(jwks, kid)

        if key is None:
            raise InvalidTokenError("No matching JWKS key found for token kid")

        return key

    async def _resolve_jwk_key_async(self, token: str) -> Any:
        kid = self._extract_kid(token)

        jwks = await self._jwks_cache.get_async(force_refresh=False)
        key = self._find_key_in_jwks(jwks, kid)

        if key is None:
            # Refresh once to handle key rotation and retry.
            jwks = await self._jwks_cache.get_async(force_refresh=True)
            key = self._find_key_in_jwks(jwks, kid)

        if key is None:
            raise InvalidTokenError("No matching JWKS key found for token kid")

        return key

    @staticmethod
    def _extract_kid(token: str) -> str:
        try:
            header = jwt.get_unverified_header(token)
        except jwt.InvalidTokenError as exc:
            raise InvalidTokenError("Token header is invalid") from exc

        kid = header.get("kid")
        if not isinstance(kid, str) or not kid:
            raise InvalidTokenError("Token header must include kid")

        return kid

    @staticmethod
    def _find_key_in_jwks(jwks: dict[str, Any], kid: str) -> Any | None:
        keys = jwks.get("keys")
        if not isinstance(keys, list):
            return None

        for jwk in keys:
            if isinstance(jwk, dict) and jwk.get("kid") == kid:
                try:
                    return algorithms.RSAAlgorithm.from_jwk(json.dumps(jwk))
                except Exception as exc:  # pragma: no cover - defensive failure path
                    raise InvalidTokenError("JWKS key is invalid") from exc
        return None

    def verify_token(self, token: str) -> dict[str, Any]:
        if not token:
            raise InvalidTokenError("Token must not be empty")

        if self._public_key:
            return self._decode_claims(token, self._public_key)

        key = self._resolve_jwk_key_sync(token)
        return self._decode_claims(token, key)

    async def verify_token_async(self, token: str) -> dict[str, Any]:
        if not token:
            raise InvalidTokenError("Token must not be empty")

        if self._public_key:
            return self._decode_claims(token, self._public_key)

        key = await self._resolve_jwk_key_async(token)
        return self._decode_claims(token, key)

    def close(self) -> None:
        self._jwks_cache.close()

    async def aclose(self) -> None:
        await self._jwks_cache.aclose()
