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

## Framework integrations

```python
# FastAPI
from authkit import AuthKit
from authkit.fastapi import require_auth as fastapi_auth

client = AuthKit(base_url="https://auth.example.com")

@app.get("/protected")
async def protected(user = Depends(fastapi_auth(client))):
    return {"user_id": user["sub"]}
```

```python
# Flask
from authkit.flask import require_auth

@app.get("/protected")
@require_auth(client)
def protected():
    return {"user_id": g.auth_user["sub"]}
```

```python
# Django
MIDDLEWARE = [
    # ...
    "authkit.django.AuthKitMiddleware",
]
```
