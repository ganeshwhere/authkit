from __future__ import annotations

import unittest

import httpx

from authkit.jwks import JWKSCache


class SyncClientStub:
    def __init__(self) -> None:
        self.calls = 0

    def get(self, url: str) -> httpx.Response:
        self.calls += 1
        return httpx.Response(
            200,
            json={"keys": [{"kid": "k1"}]},
            headers={"cache-control": "max-age=120"},
        )

    def close(self) -> None:
        return None


class AsyncClientStub:
    def __init__(self) -> None:
        self.calls = 0

    async def get(self, url: str) -> httpx.Response:
        self.calls += 1
        return httpx.Response(
            200,
            json={"keys": [{"kid": "k1"}]},
            headers={"cache-control": "max-age=120"},
        )

    async def aclose(self) -> None:
        return None


class JWKSCacheTests(unittest.TestCase):
    def test_sync_cache_reuses_jwks_until_expired(self) -> None:
        sync_client = SyncClientStub()
        cache = JWKSCache(
            base_url="https://auth.example.com",
            sync_client=sync_client,
            async_client=AsyncClientStub(),
        )

        first = cache.get_sync()
        second = cache.get_sync()

        self.assertEqual(first, second)
        self.assertEqual(sync_client.calls, 1)

    def test_force_refresh_fetches_again(self) -> None:
        sync_client = SyncClientStub()
        cache = JWKSCache(
            base_url="https://auth.example.com",
            sync_client=sync_client,
            async_client=AsyncClientStub(),
        )

        cache.get_sync()
        cache.get_sync(force_refresh=True)

        self.assertEqual(sync_client.calls, 2)


if __name__ == "__main__":
    unittest.main()
