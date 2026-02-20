from __future__ import annotations

import unittest

from authkit.framework import extract_bearer_token


class FrameworkHelperTests(unittest.TestCase):
    def test_extract_bearer_token_returns_token_for_valid_header(self) -> None:
        self.assertEqual(extract_bearer_token("Bearer token_123"), "token_123")
        self.assertEqual(extract_bearer_token("bearer token_123"), "token_123")

    def test_extract_bearer_token_rejects_invalid_headers(self) -> None:
        self.assertIsNone(extract_bearer_token(None))
        self.assertIsNone(extract_bearer_token(""))
        self.assertIsNone(extract_bearer_token("Basic abc"))
        self.assertIsNone(extract_bearer_token("Bearer"))


if __name__ == "__main__":
    unittest.main()
