"""Shared framework integration helpers."""

from __future__ import annotations


def extract_bearer_token(authorization_header: str | None) -> str | None:
    if authorization_header is None:
        return None

    header_value = authorization_header.strip()
    if not header_value:
        return None

    parts = header_value.split(" ", 1)
    if len(parts) != 2:
        return None

    scheme, token = parts[0].strip().lower(), parts[1].strip()
    if scheme != "bearer" or not token:
        return None

    return token
