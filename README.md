# Blue/Green Deployment Demo

Node.js + Express service packaged for blue/green delivery behind Nginx with Docker Compose orchestration.

```
.
├── Dockerfile
├── .dockerignore
├── app/                     # Express app (serves /health)
│   ├── package.json
│   ├── package-lock.json
│   └── src/
├── compose.yml
├── nginx-site.conf
├── nginx/
│   ├── upstream-active.conf
│   ├── upstream-blue.conf
│   └── upstream-green.conf
├── scripts/
│   ├── deploy_green.sh
│   ├── rollback.sh
│   ├── switch_to_blue.sh
│   └── switch_to_green.sh
└── .github/
    └── workflows/
        ├── build.yml
        └── deploy-ec2.yml
```

## Features

- Root `/` endpoint returning deployment metadata
- Health probe `/health` with fast responses for load-balancer checks
- Version endpoint `/version` exposing the active color label
- Task CRUD API under `/tasks` with PostgreSQL backend (falls back to in-memory)
- Structured logging (`pino`) with HTTP request logging via `morgan`
- Nginx-level `/healthz` endpoint returning `200` for proxy health monitoring
- Docker image listening on port `3000`
- Docker Compose + Nginx configuration for blue/green switching

## Getting Started (local dev)

```bash
cd app
npm install
npm run dev
```

Environment variables can be stored in `app/.env`. Defaults:

- `PORT=3000`
- `VERSION=blue`
- `DEPLOYMENT_LABEL=Blue`

Example `.env`:

```ini
PORT=3000
VERSION=green
DEPLOYMENT_LABEL=Green
DATABASE_URL=postgres://postgres:postgres@localhost:5432/tasks
```

## Task API

| Method | Path         | Description        |
| ------ | ------------ | ------------------ |
| GET    | `/tasks`     | List tasks         |
| GET    | `/tasks/:id` | Fetch single task  |
| POST   | `/tasks`     | Create new task    |
| PUT    | `/tasks/:id` | Replace task       |
| PATCH  | `/tasks/:id` | Update task fields |
| DELETE | `/tasks/:id` | Remove task        |

Payload template:

```json
{
  "title": "string",
  "description": "string (optional)",
  "completed": false
}
```

## Docker

Build the production image:

```bash
docker build -t bg-app .
```

Run a single container:

```bash
docker run --rm -p 3000:3000 \
  -e VERSION=green \
  -e DEPLOYMENT_LABEL=Green \
  bg-app
```

Include PostgreSQL:

```bash
docker run --rm -p 3000:3000 \
  -e DATABASE_URL=postgres://user:pass@postgres-host:5432/tasks \
  -e VERSION=green \
  -e DEPLOYMENT_LABEL=Green \
  -e DATABASE_SSL=true \
  bg-app
```

## Blue/Green with Docker Compose

1. Publish separate images for each color (tags can be the same repo):
   ```bash
   docker build -t ghcr.io/you/bg-app:v1 .
   docker push ghcr.io/you/bg-app:v1
   docker build -t ghcr.io/you/bg-app:v2 .
   docker push ghcr.io/you/bg-app:v2
   ```
2. Create the shared Docker network once:
   ```bash
   docker network create app-net
   ```
3. Export image metadata and start the stack:
   ```bash
   export IMAGE_REPO=ghcr.io/you/bg-app
   export BLUE_TAG=v1
   export GREEN_TAG=v2
   docker compose -f compose.yml up -d
   ```

- `app-blue` and `app-green` expose port `3000` and include `/health` checks.
- `bg-nginx` fronts the two containers and proxies to the active upstream configured in `nginx/upstream-active.conf`.
- Switch traffic:

  ```bash
  ./scripts/switch_to_blue.sh
  ./scripts/switch_to_green.sh
  ```

- Update the idle environment, then flip traffic:

  ```bash
  ./scripts/deploy_green.sh   # pulls latest green image
  ./scripts/switch_to_green.sh
  ```

- Roll back to the opposite color:

  ```bash
  ./scripts/rollback.sh
  ```

## CI/CD

- `.github/workflows/build.yml` checks out the repo, runs `npm ci && npm run lint`, and builds the Docker image on every push / PR.
- `.github/workflows/deploy-ec2.yml` is a manual dispatch workflow that SSHes to your EC2 host, rebuilds the requested color (`blue` or `green`), and runs the corresponding switch script. Provide `EC2_SSH_KEY`, `EC2_USER`, `EC2_HOST`, and optional `EC2_DEPLOY_PATH` secrets.

## Logging

- `morgan` streams HTTP access logs into the `pino` logger.
- Development uses pretty-printed logs; production emits JSON to stdout for aggregation.
