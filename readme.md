# Room Manager

## Getting started

Requirements: **Docker** (with the compose plugin), **Node.js** (version in `.nvmrc`) and **[mkcert](apps/nginx/readme.md)**.

```bash
git clone <repo-url> && cd room-manager
./setup.sh
```

Then open **https://localhost**.

`setup.sh` runs:

```bash
npm ci
npm run build -w @repo/shared-types
mkcert -install                             # trust the local CA (asks for sudo once)
./apps/nginx/dev/generate-certs.sh          # cert for localhost
docker compose -f docker-compose.dev.yml up -d --build --wait
docker compose -f docker-compose.dev.yml exec api npm run seed   # 5 rooms, 2 users, 1 admin
```

If ports 80/443 are taken, set `NGINX_HTTP_PORT` / `NGINX_HTTPS_PORT` (and a matching `WEB_ORIGIN`) in `./.env`.

| URL | What |
| --- | --- |
| https://localhost | web (Next.js) via nginx |
| https://localhost/api | API via nginx (`/api` prefix is stripped) |
| http://localhost:4000 | API direct |
| http://localhost:5173 | web direct |

### Day to day

```bash
docker compose -f docker-compose.dev.yml up -d        # start
docker compose -f docker-compose.dev.yml logs -f api  # logs
docker compose -f docker-compose.dev.yml down         # stop
docker compose -f docker-compose.dev.yml exec api npm run seed   # reseed

npm test            # all tests (turbo)
npm run lint        # lint api + web
npm run ci          # lint + types + tests + build, same as CI
```

## Deploy

Deploy das imagens de api e web (Registro de imagens em ECR) em ECS Fargate subnet privada. Serviços internos atrás de um ALB (substituindo nginx). RDS PostgreSQL (Multi-AZ in prod) no lugar SQLite. Segredos guardados em Secrets Manager e configurações em SSM Parameter Store, ambos injetodos em ECS. Logs no Cloud Watch.

Requisições de reserva de sala concorrentes poderão ser tratadas pelo próprio Postgres:

```
ALTER TABLE reserved_rooms
  ADD CONSTRAINT reserved_rooms_no_overlap
  EXCLUDE USING gist (room_id WITH =, tsrange(start_at, end_at, '[)') WITH &&);
```

