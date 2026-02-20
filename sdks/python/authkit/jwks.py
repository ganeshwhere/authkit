"""JWKS retrieval and caching helpers for AuthKit token verification."""

from __future__ import annotations

import re
import time
from dataclasses import dataclass
from typing import Any, Callable

import httpx

from .errors import JWKSFetchError

_CACHE_CONTROL_MAX_AGE_PATTERN = re.compile(r"max-age=(?P<seconds>\d+)")


def _normalize_base_url(base_url: str) -> str:
    return base_url.rstrip("/")


def _extract_cache_ttl_seconds(headers: httpx.Headers, default_ttl_seconds: int) -> int:
    cache_control = headers.get("cache-control")
    if not cache_control:
        return default_ttl_seconds

    match = _CACHE_CONTROL_MAX_AGE_PATTERN.search(cache_control)
    if not match:
        return default_ttl_seconds

    try:
        return max(1, int(match.group("seconds")))
    except ValueError:
        return default_ttl_seconds


@dataclass
class _CachedJWKS:
    payload: dict[str, Any]
    expires_at_epoch_seconds: float


class JWKSCache:
    """Caches JWKS responses and supports sync + async retrieval."""

    def __init__(
        self,
        *,
        base_url: str,
        default_ttl_seconds: int = 3600,
        sync_client: httpx.Client | None = None,
        async_client: httpx.AsyncClient | None = None,
        now_fn: Callable[[], float] = time.time,
    ) -> None:
        self._jwks_url = f"{_normalize_base_url(base_url)}/.well-known/jwks.json"
        self._default_ttl_seconds = default_ttl_seconds
        self._sync_client = sync_client or httpx.Client(timeout=5.0)
        self._async_client = async_client or httpx.AsyncClient(timeout=5.0)
        self._now_fn = now_fn
        self._cached: _CachedJWKS | None = None

    def _is_cache_valid(self) -> bool:
        if not self._cached:
            return False
        return self._cached.expires_at_epoch_seconds > self._now_fn()

    def _cache_payload(self, payload: dict[str, Any], headers: httpx.Headers) -> dict[str, Any]:
        ttl = _extract_cache_ttl_seconds(headers, self._default_ttl_seconds)
        self._cached = _CachedJWKS(
            payload=payload,
            expires_at_epoch_seconds=self._now_fn() + ttl,
        )
        return payload

    def _validate_payload(self, payload: Any) -> dict[str, Any]:
        if not isinstance(payload, dict):
            raise JWKSFetchError("JWKS payload must be a JSON object")
        keys = payload.get("keys")
        if not isinstance(keys, list):
            raise JWKSFetchError("JWKS payload must include a keys array")
        return payload

    def get_sync(self, *, force_refresh: bool = False) -> dict[str, Any]:
        if not force_refresh and self._is_cache_valid():
            return self._cached.payload

        try:
            response = self._sync_client.get(self._jwks_url)
        except httpx.HTTPError as exc:
            raise JWKSFetchError(
                "Unable to contact JWKS endpoint",
                details={"reason": str(exc)},
            ) from exc

        if response.status_code != 200:
            raise JWKSFetchError(
                "JWKS endpoint returned non-success status",
                details={"status_code": response.status_code},
            )

        payload = self._validate_payload(response.json())
        return self._cache_payload(payload, response.headers)

    async def get_async(self, *, force_refresh: bool = False) -> dict[str, Any]:
        if not force_refresh and self._is_cache_valid():
            return self._cached.payload

        try:
            response = await self._async_client.get(self._jwks_url)
        except httpx.HTTPError as exc:
            raise JWKSFetchError(
                "Unable to contact JWKS endpoint",
                details={"reason": str(exc)},
            ) from exc

        if response.status_code != 200:
            raise JWKSFetchError(
                "JWKS endpoint returned non-success status",
                details={"status_code": response.status_code},
            )

        payload = self._validate_payload(response.json())
        return self._cache_payload(payload, response.headers)

    def close(self) -> None:
        self._sync_client.close()

    async def aclose(self) -> None:
        await self._async_client.aclose()
