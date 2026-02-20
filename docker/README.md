# AuthKit Docker

## Compose stacks

- `docker/docker-compose.yml`: production-like stack with `authkit`, `postgres`, `redis`, and `nginx`.
- `docker/docker-compose.dev.yml`: local development stack with live-mounted source and watch mode.

## Usage

```bash
docker compose -f docker/docker-compose.yml up -d
```

```bash
docker compose -f docker/docker-compose.dev.yml up -d postgres redis authkit
```

Ensure `.env` includes at least:
- `POSTGRES_PASSWORD`
- `REDIS_PASSWORD`
- `BASE_URL`
- `JWT_PRIVATE_KEY`
- `JWT_PUBLIC_KEY`
- `ENCRYPTION_KEY`
- `HMAC_SECRET`
