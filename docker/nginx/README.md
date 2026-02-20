Nginx configuration for production reverse proxy setups.

- `authkit.conf` proxies external traffic to the internal `authkit:3001` service.
- Used by `docker/docker-compose.yml` as the default reverse proxy.
