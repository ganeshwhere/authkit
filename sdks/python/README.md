# authkit-python

Python SDK for verifying AuthKit JWTs with automatic JWKS caching and key rotation handling.

## Usage

```python
from authkit import AuthKit

client = AuthKit(
    base_url="https://auth.example.com",
    audience="project_123",
)

claims = client.verify_token(token)
print(claims["sub"])
```

Use `verify_token_async` for asyncio applications.
