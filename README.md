# SitePing (self-hosted)

Minimal production-ready [SitePing](https://siteping.dev) server for Docker Compose on a Synology NAS. This repository hosts:

- the SitePing API at `/api/siteping`
- the `@siteping/dashboard` triage UI at `/`
- PostgreSQL persistence via `@siteping/adapter-prisma`

Public URL (via DSM reverse proxy): `https://siteping.slavanossar.dev`

## Architecture

```text
Browser
    ↓
siteping.slavanossar.dev (HTTPS, DSM TLS termination)
    ↓
NAS localhost:8130
    ↓
Next.js container :3000
    ├── Dashboard (session-protected)
    ├── SitePing API
    └── Prisma → PostgreSQL (Compose network only)
```

## Requirements

- Docker and Docker Compose (Synology Container Manager or Portainer)
- Node.js 20+ for local development

## Environment variables

Copy `.env.example` to `.env` and fill in values:

```bash
cp .env.example .env
```

| Variable | Description |
| --- | --- |
| `POSTGRES_PASSWORD` | PostgreSQL password for the `siteping` user |
| `DATABASE_URL` | Prisma connection string, e.g. `postgresql://siteping:<password>@postgres:5432/siteping` |
| `SITEPING_API_KEY` | Bearer token for protected SitePing API methods (GET/PATCH/DELETE) |
| `SITEPING_ADMIN_PASSWORD` | Dashboard login password (single admin user) |
| `SITEPING_SESSION_SECRET` | Secret used to sign dashboard session cookies |
| `SITEPING_ALLOWED_ORIGINS` | Comma-separated exact CORS origins for widget submissions |
| `SITEPING_DASHBOARD_PROJECTS` | Comma-separated project names shown in the dashboard |
| `SITEPING_BASE_URL` | Public app URL, e.g. `https://siteping.slavanossar.dev` |

Generate long random secrets (32+ bytes):

```bash
openssl rand -base64 32
```

Example `.env` for NAS deployment:

```env
POSTGRES_PASSWORD=...
DATABASE_URL=postgresql://siteping:...@postgres:5432/siteping
SITEPING_API_KEY=...
SITEPING_ADMIN_PASSWORD=...
SITEPING_SESSION_SECRET=...
SITEPING_ALLOWED_ORIGINS=https://siteping.slavanossar.dev
SITEPING_DASHBOARD_PROJECTS=my-staging-app,another-staging-site
SITEPING_BASE_URL=https://siteping.slavanossar.dev
```

Do not commit `.env`.

## Local development

1. Install dependencies:

```bash
npm install
```

2. Start PostgreSQL locally (or use Docker Compose for postgres only).

3. Set `DATABASE_URL` in `.env` pointing at your local database.

4. Apply migrations:

```bash
npx prisma migrate dev
```

5. Start the dev server:

```bash
npm run dev
```

Open `http://localhost:3000/login` and sign in with `SITEPING_ADMIN_PASSWORD`.

## Production Docker deployment

1. Create the NAS data directory:

```bash
sudo mkdir -p /volume1/docker/siteping/postgres
```

2. Configure `.env` on the NAS (same directory as `docker-compose.yml`).

3. Build and start:

```bash
docker compose up -d --build
```

The app listens on container port `3000` and is published on host port `8130`.

PostgreSQL is **not** exposed on the host. It is reachable only from the `siteping` service over the Compose network.

Persistent PostgreSQL data is stored at:

```text
/volume1/docker/siteping/postgres
```

### Database initialization

On container startup, `docker-entrypoint.sh` runs:

```bash
npx prisma migrate deploy
```

before starting the Next.js server. Migrations are committed in `prisma/migrations/` and are non-destructive for normal upgrades.

### DSM reverse proxy

TLS is handled by DSM, not by this container. Create a reverse proxy rule:

| Setting | Value |
| --- | --- |
| Source | HTTPS, `siteping.slavanossar.dev`, port 443 |
| Destination | HTTP, `localhost`, port 8130 |

Set `SITEPING_BASE_URL=https://siteping.slavanossar.dev` so secure session cookies are issued correctly behind the proxy.

### Health check

Verify the stack is healthy:

```bash
curl http://localhost:8130/api/health
```

Expected response:

```json
{ "status": "ok" }
```

If PostgreSQL is unreachable, the endpoint returns HTTP `503`.

## Security model

- **Public SitePing methods:** `POST` and `OPTIONS` at `/api/siteping` (for future widget submissions)
- **Protected SitePing methods:** `GET`, `PATCH`, `DELETE` require `Authorization: Bearer <SITEPING_API_KEY>`
- **Dashboard:** requires admin session cookie; uses `/api/internal/siteping` which adds the API key server-side
- **API key:** never exposed via `NEXT_PUBLIC_*` or client bundles

## Adding staging sites later

1. Add each staging origin to `SITEPING_ALLOWED_ORIGINS` (exact match, comma-separated).
2. Add the corresponding project name to `SITEPING_DASHBOARD_PROJECTS`.
3. Restart the container: `docker compose up -d`.

Widget integration in Nuxt projects is intentionally out of scope for this repository.

## Backing up PostgreSQL

Stop the stack (optional but safer for a file-level backup):

```bash
docker compose down
```

Back up the data directory:

```bash
sudo tar -czf siteping-postgres-backup.tar.gz /volume1/docker/siteping/postgres
```

Or use `pg_dump` from a one-off container attached to the Compose network.

## Upgrading dependencies

1. Update packages:

```bash
npm update @siteping/adapter-prisma @siteping/dashboard @siteping/cli
npx @siteping/cli sync
npx prisma migrate dev
```

2. Rebuild and redeploy:

```bash
docker compose up -d --build
```

## Scripts

```bash
npm run dev        # local development
npm run typecheck  # TypeScript check
npm run lint       # ESLint
npm run build      # production build
./scripts/verify.sh  # Docker integration checks (requires Docker)
```

## Future extensions

- **Screenshot storage:** configure `screenshotStorage` in `src/lib/siteping-handler.ts` (e.g. Cloudflare R2)
- **Webhooks:** configure `webhooks` in the same module (e.g. GitHub issue creation)
