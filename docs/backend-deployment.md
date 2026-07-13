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
| `PLANNER_TIME_ZONE` | `Asia/Seoul` for the current shared calendar-day policy |

`CORS_ALLOW_ALL_ORIGINS` must remain `False`. The browser client uses Bearer
tokens, so CORS credentials are deliberately disabled.

## Deploy with Render

1. Deploy the matching frontend build before the paginated backend. Its shared
   API client understands both the old array response and the new paginated
   response, so it is safe against the current API while this deployment is in
   progress.
2. In Render, create or update a Blueprint from the root
   [render.yaml](../render.yaml).
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

## API list contract and filters

All collection endpoints now use the standard page envelope:

```json
{
  "count": 243,
  "next": "https://api.example.com/api/events/?page=2&page_size=100",
  "previous": null,
  "results": []
}
```

The default page size is 100 and `page_size` may be increased to at most 200.
The deployed shared client follows the page links and keeps its existing array
contract, so the current web and Expo screens do not lose data during the
rollout. New range-aware screens should use the filters instead of loading full
history. Authenticated profile code should use `GET /api/users/me/`; the shared
client temporarily falls back to the legacy `/api/users/` list while the P1
frontend-first rollout is in progress.

| Endpoint | Filters | Boundary rule |
| --- | --- | --- |
| `/api/categories/` | `calendar` | Accessible calendar only |
| `/api/events/` | `calendar`, `starts_at`, `ends_at` | Datetimes are paired, timezone-aware, and overlap `[starts_at, ends_at)`; max span 93 days |
| `/api/tasks/` | `calendar`, `target_date_from`, `target_date_to`, `is_completed` | Dates use `[target_date_from, target_date_to)` and booleans are `true` or `false` |
| `/api/calendar-members/` | `calendar` | Owner-visible memberships only |
| `/api/event-attendees/` | `event` | Accessible event only |

An inaccessible calendar or event ID returns an empty result rather than
revealing whether it exists. Invalid filter formats return `400`.

## Rollover operations

The Blueprint includes `redeeming-time-rollover`, a Docker Cron Job that runs
once daily at `15:05 UTC` (`00:05 Asia/Seoul`). Render Cron schedules are UTC;
the Singapore region does not change that. The job uses the same
`PLANNER_TIME_ZONE` as the planner's daily schedule calculation and performs a
single idempotent database update for incomplete tasks due before today.

Run it manually when recovering from an outage or checking a release:

```bash
cd backend
uv run manage.py rollover_overdue_tasks --dry-run
uv run manage.py rollover_overdue_tasks --date 2026-07-13
uv run manage.py rollover_overdue_tasks --date 2026-07-13 --calendar-id 42
```

Only the web service runs migrations before deployment; the cron job must not
run migrations. After the first Render deployment, manually trigger the cron
once and check its log for the target date and updated count. Render Cron Jobs
require a paid plan, which is why the Blueprint uses `starter`.

## Operational decisions

- The Django admin remains available only to staff accounts.
- `/api/schema/` and `/api/docs/` are open locally but staff-only in production.
- Refresh tokens rotate and are blacklisted on refresh, logout, and password
  change. A password change also invalidates existing access tokens.
- Login, registration, refresh, logout, and password change use scoped throttles
  backed by the shared cache.
- Event-list congestion warnings are computed in one shared query per response
  page rather than one query per event. Timed events are clipped to the current
  planner day; all-day markers do not consume timed capacity. `rrule` values
  are not expanded into future occurrences yet, so those occurrences are not
  included in congestion analysis.
- The overdue-task batch has a PostgreSQL partial index for incomplete due dates
  and explicitly updates `updated_at` during its bulk update.
