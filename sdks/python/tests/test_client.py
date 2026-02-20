from __future__ import annotations

import asyncio
import unittest
from unittest.mock import Mock, patch

import jwt

from authkit import AuthKit
from authkit.errors import InvalidTokenError, TokenExpiredError


class ClientTests(unittest.TestCase):
    def test_empty_token_raises_invalid_token_error(self) -> None:
        client = AuthKit(base_url="https://auth.example.com", public_key="public")

        with self.assertRaises(InvalidTokenError):
            client.verify_token("")

    @patch("authkit.client.jwt.decode")
    def test_verify_token_with_public_key_uses_jwt_decode(self, decode_mock: Mock) -> None:
        decode_mock.return_value = {"sub": "user_1"}
        client = AuthKit(base_url="https://auth.example.com", public_key="public")

        claims = client.verify_token("token")

        self.assertEqual(claims["sub"], "user_1")
        decode_mock.assert_called_once()

    @patch("authkit.client.jwt.decode")
    def test_expired_token_maps_to_typed_error(self, decode_mock: Mock) -> None:
        decode_mock.side_effect = jwt.ExpiredSignatureError("expired")
        client = AuthKit(base_url="https://auth.example.com", public_key="public")

        with self.assertRaises(TokenExpiredError):
            client.verify_token("token")

    @patch("authkit.client.jwt.decode")
    def test_invalid_token_maps_to_typed_error(self, decode_mock: Mock) -> None:
        decode_mock.side_effect = jwt.InvalidTokenError("bad")
        client = AuthKit(base_url="https://auth.example.com", public_key="public")

        with self.assertRaises(InvalidTokenError):
            client.verify_token("token")

    @patch.object(AuthKit, "_resolve_jwk_key_async")
    @patch.object(AuthKit, "_decode_claims")
    def test_verify_token_async_uses_resolved_jwk(
        self,
        decode_claims_mock: Mock,
        resolve_jwk_mock: Mock,
    ) -> None:
        resolve_jwk_mock.return_value = "key"
        decode_claims_mock.return_value = {"sub": "user_1"}
        client = AuthKit(base_url="https://auth.example.com")

        claims = asyncio.run(client.verify_token_async("token"))

        self.assertEqual(claims["sub"], "user_1")
        resolve_jwk_mock.assert_called_once_with("token")
        decode_claims_mock.assert_called_once_with("token", "key")


if __name__ == "__main__":
    unittest.main()
