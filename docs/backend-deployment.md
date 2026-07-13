# Backend Deployment

The repository contains a production Docker image and a Render Blueprint. The
Blueprint provisions one Django web service, Render Postgres, and private Render
Key Value (Redis-compatible) storage for shared throttling state.

## Required production configuration

Production starts only when all of the following are set:

| Variable | Production value |
| --- | --- |
| `DEBUG` | `False` |
| `SECRET_KEY` | A unique, randomly generated secret |
| `DATABASE_URL` | Internal PostgreSQL connection URL |
| `CACHE_URL` | Shared Redis-compatible connection URL |
| `ALLOWED_HOSTS` | API hostnames only, such as `.onrender.com` and any custom API domain |
| `CORS_ALLOWED_ORIGINS` | `https://redeeming-time.vercel.app` |
| `CSRF_TRUSTED_ORIGINS` | `https://redeeming-time.vercel.app` when cross-origin CSRF-protected flows are added |

`CORS_ALLOW_ALL_ORIGINS` must remain `False`. The browser client uses Bearer
tokens, so CORS credentials are deliberately disabled.

## Deploy with Render

1. Push the P0 commit to the branch connected to Render.
2. In Render, create a Blueprint from the root [render.yaml](../render.yaml).
   It deploys in Singapore, uses the Dockerfile in `backend/`, and runs database
   migrations before each deploy.
3. Wait for the service health check at `/healthz/` to return `200`.
4. Copy the API service URL into Vercel as
   `VITE_API_BASE_URL=https://<your-api-host>/api`, then redeploy the web app.
5. Add any custom API domain to `ALLOWED_HOSTS`. Do not add the Vercel frontend
   hostname there; it belongs only in `CORS_ALLOWED_ORIGINS`.

The Blueprint generates `SECRET_KEY`, keeps Redis private, and connects to the
database through Render's internal network. Its `starter` service plan is
intentional: Render's pre-deploy migration command is available on paid web
services. If you use another host, run `python manage.py migrate --noinput` as a
single pre-deploy job, not concurrently in every web worker.

## Verify a release

Run these checks before connecting the frontend:

```bash
cd backend
DEBUG=False \
SECRET_KEY='replace-with-a-long-random-production-secret' \
ALLOWED_HOSTS=api.example.com \
DATABASE_URL=postgresql://user:password@host:5432/redeeming_time \
CACHE_URL=redis://host:6379/0 \
CORS_ALLOWED_ORIGINS=https://redeeming-time.vercel.app \
uv run manage.py check --deploy

uv run manage.py test
docker build -f Dockerfile .
```

Then check `GET https://<your-api-host>/healthz/`, register a test account,
log in, and confirm that an `OPTIONS` request from
`https://redeeming-time.vercel.app` receives the matching CORS origin header.

## Operational decisions

- The Django admin remains available only to staff accounts.
- `/api/schema/` and `/api/docs/` are open locally but staff-only in production.
- Refresh tokens rotate and are blacklisted on refresh, logout, and password
  change. A password change also invalidates existing access tokens.
- Login, registration, refresh, logout, and password change use scoped throttles
  backed by the shared cache.
