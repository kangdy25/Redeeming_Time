# Backend Deployment

The repository contains a Docker image and a Render Blueprint. The Blueprint
provisions one Django web service and private Render Key Value
(Redis-compatible) storage for shared throttling state. PostgreSQL is hosted
on Neon to avoid Render Free Postgres's 30-day expiration.

## Required production configuration

Production starts only when all of the following are set:

| Variable                                                             | Production value                                                                                                                  |
| -------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| `DEBUG`                                                              | `False`                                                                                                                           |
| `SECRET_KEY`                                                         | A unique, randomly generated secret                                                                                               |
| `DATABASE_URL`                                                       | Neon **pooled** PostgreSQL connection URL for the running API                                                                     |
| `MIGRATION_DATABASE_URL`                                             | Neon **direct** PostgreSQL connection URL, used only for Django migrations                                                        |
| `CACHE_URL`                                                          | Shared Redis-compatible connection URL                                                                                            |
| `ALLOWED_HOSTS`                                                      | `.onrender.com,redeemingtime.xyz,www.redeemingtime.xyz,redeeming-time.vercel.app`                                                |
| `CORS_ALLOWED_ORIGINS`                                               | `https://redeemingtime.xyz,https://www.redeemingtime.xyz,https://redeeming-time.vercel.app`                                      |
| `CSRF_TRUSTED_ORIGINS`                                               | `https://redeemingtime.xyz,https://www.redeemingtime.xyz,https://redeeming-time.vercel.app`                                      |
| `FRONTEND_ORIGIN`                                                    | `https://redeemingtime.xyz`                                                                                                       |
| `SOCIAL_AUTH_GOOGLE_CLIENT_ID` / `SOCIAL_AUTH_GOOGLE_CLIENT_SECRET`  | Google OAuth web-application credentials, if Google sign-in is enabled                                                            |
| `SOCIAL_AUTH_KAKAO_CLIENT_ID` / `SOCIAL_AUTH_KAKAO_CLIENT_SECRET`    | Kakao REST API key and client secret, if Kakao sign-in is enabled                                                                 |
| `SOCIAL_AUTH_GOOGLE_REDIRECT_URI` / `SOCIAL_AUTH_KAKAO_REDIRECT_URI` | Exact HTTPS callback URI registered with each enabled provider. For the production custom domain, use `https://redeemingtime.xyz/api/auth/social/google/callback/` and `https://redeemingtime.xyz/api/auth/social/kakao/callback/`. |
| `PLANNER_TIME_ZONE`                                                  | `Asia/Seoul` for the current shared calendar-day policy                                                                           |

`CORS_ALLOW_ALL_ORIGINS` must remain `False`. The browser client uses Bearer
tokens, so CORS credentials are deliberately disabled.

### Social-login callback URLs

The OAuth start URL and callback URL must use the **same public host**. OAuth
state is stored in the browser's session cookie when the flow starts; returning
to a different Vercel hostname drops that cookie and makes the callback fail
with `INVALID_STATE`.

Set these exact values in both Render and each provider console:

```text
SOCIAL_AUTH_GOOGLE_REDIRECT_URI=https://redeemingtime.xyz/api/auth/social/google/callback/
SOCIAL_AUTH_KAKAO_REDIRECT_URI=https://redeemingtime.xyz/api/auth/social/kakao/callback/
```

In Vercel, set the build-time `VITE_API_BASE_URL` to `/api`. The frontend also
uses `/api` as its production fallback, which keeps browser API calls on the
same host and lets the Vercel rewrite forward them to Render.

## Neon PostgreSQL setup and migration

Create a Neon project in the region nearest the API, then open its **Connect**
dialog and copy both PostgreSQL URLs:

- **Pooled connection string** (the hostname contains `-pooler`) for
  `DATABASE_URL`.
- **Direct connection string** for `MIGRATION_DATABASE_URL`.

The API uses Neon PgBouncer pooling at runtime. Its Docker startup command uses
the direct URL only for `manage.py migrate`, then starts Gunicorn with the
pooled URL. Keep both values in Render's Environment settings and never commit
either URL.

To preserve data already stored in Render Postgres, migrate it before changing
the API environment variables. From a computer with PostgreSQL client tools
installed, copy the Render database's **External Database URL** and Neon's
direct URL into local shell variables, then run:

```bash
export RENDER_DATABASE_URL='postgresql://…'
export NEON_DIRECT_DATABASE_URL='postgresql://…'

pg_dump --format=custom --no-owner --no-privileges "$RENDER_DATABASE_URL" > redeeming-time.dump
pg_restore --clean --if-exists --no-owner --no-privileges \
  --dbname="$NEON_DIRECT_DATABASE_URL" redeeming-time.dump
```

Treat both URLs and the dump file as secrets: do not commit, upload, or share
them. The dump includes user email addresses and password hashes. Keep the
existing Render database until the Neon-backed API passes the verification
steps below.

## Google and Kakao social sign-in

Social sign-in uses a server-side authorization-code flow. The browser starts
at `GET /api/auth/social/google/start/` or
`GET /api/auth/social/kakao/start/`; the backend stores a random, single-use
state value in the Django session for 10 minutes and redirects the browser to
the provider. Register these exact backend callback URLs in the provider
consoles:

```text
https://<api-host>/api/auth/social/google/callback/
https://<api-host>/api/auth/social/kakao/callback/
```

Set the matching `SOCIAL_AUTH_*_REDIRECT_URI` variables to those URLs in
production. They are required in production and must match the provider-console
value exactly. In local `DEBUG=True` development only, a blank value derives
the callback from the incoming API request host.

### Vercel same-origin proxy (recommended)

The production `vercel.json` proxies `https://redeemingtime.xyz/api/*`
to the Render service. It keeps browser API and OAuth traffic on the Vercel
hostname, which avoids relying on the reputation of a shared Render subdomain.
Set Vercel's production `VITE_API_BASE_URL` to `/api`, then register and
configure these exact callback URLs instead:

```text
https://redeemingtime.xyz/api/auth/social/google/callback/
https://redeemingtime.xyz/api/auth/social/kakao/callback/
```

`ALLOWED_HOSTS` must include `redeemingtime.xyz` because Vercel forwards
that public host to Django. Do not enable CDN caching for `/api/*`; OAuth and
authenticated API responses must remain uncached.

Google requests `openid email profile` and validates the returned ID token on
the server with `google-auth`, including signature, audience, issuer, and
expiry. Kakao exchanges the authorization code with the configured client
secret and then validates `is_email_valid`, `is_email_verified`, and the email
from `/v2/user/me`. Both providers require a verified email address.

After a successful callback, the backend redirects only to:

```text
https://redeemingtime.xyz/auth/callback?code=<opaque-one-time-code>
```

The opaque code expires after 60 seconds and is consumed through
`POST /api/auth/social/exchange/` with `{ "code": "...", "verifier": "..." }`;
that response is the only place access and refresh JWTs are returned. The web
app creates the high-entropy verifier in its own tab session before it starts
OAuth, and the backend stores only its hash. A copied callback URL therefore
cannot establish a session in another browser. Never put provider secrets,
JWTs, a verifier, or a caller-controlled return URL in the browser callback
redirect.
OAuth cancellation and validation failures also redirect only to this fixed
route with a safe `error` value such as `ACCESS_DENIED`, `INVALID_STATE`,
`ACCOUNT_CONFLICT`, or `OAUTH_FAILED`; provider error descriptions are never
reflected to the browser.
An email already owned by a local account or another social identity is
rejected rather than linked automatically. Inactive accounts are also
rejected.

## Password reset email

The public password-reset endpoints are `POST /api/auth/password/reset/` and
`POST /api/auth/password/reset/confirm/`. Reset links point only to the fixed
`FRONTEND_ORIGIN`, expire after one hour by default, can be used once, and
blacklist the account's existing JWT refresh tokens when the password changes.
The request endpoint always returns the same successful response for an
unknown email, a social-only account, or a local account.

Password reset email is deliberately disabled in production until Resend's
HTTPS API is configured. This avoids Render Free's outbound SMTP port block.
In Render, enter these values manually and then deploy:

| Variable                       | Example / purpose                              |
| ------------------------------ | ---------------------------------------------- |
| `EMAIL_DELIVERY_PROVIDER`      | `resend`                                       |
| `RESEND_API_KEY`               | Resend Sending access API key (`re_…`)          |
| `RESEND_API_BASE_URL`          | `https://api.resend.com` (optional; default)   |
| `RESEND_API_TIMEOUT`           | `10` seconds                                    |
| `PASSWORD_RESET_EMAIL_ENABLED` | `True`                                         |
| `DEFAULT_FROM_EMAIL`           | `Redeeming Time <no-reply@redeemingtime.xyz>` |

Optionally set `PASSWORD_RESET_TIMEOUT` in seconds; the default is `3600`.
Never put the Resend API key in Git or the frontend.

## Email verification

New email-and-password accounts receive a verification link at registration
and cannot obtain JWTs until the link is opened. Google and Kakao identities
remain eligible because their providers already return a verified email. The
existing user migration marks accounts created before this feature as verified,
so deploying it does not lock out current users.

Set `EMAIL_VERIFICATION_ENABLED=True` alongside the Resend configuration above.
The user can request a new link at `POST /api/auth/email-verification/`; links
open `/verify-email?token=...`, expire after 24 hours by default, and become
invalid as soon as they are used. Set `EMAIL_VERIFICATION_TIMEOUT` in seconds
only when a different expiry period is required.

### `redeemingtime.xyz` 발신 도메인 설정

Vercel 프로젝트에 `redeemingtime.xyz`를 기본 도메인으로 연결하고, `www.redeemingtime.xyz`
는 해당 도메인으로 리디렉션합니다. Render 환경 변수는 다음 값으로 배포합니다.

```text
FRONTEND_ORIGIN=https://redeemingtime.xyz
EMAIL_DELIVERY_PROVIDER=resend
RESEND_API_KEY=re_... # Render Environment에만 입력
DEFAULT_FROM_EMAIL=Redeeming Time <no-reply@redeemingtime.xyz>
PASSWORD_RESET_EMAIL_ENABLED=True
EMAIL_VERIFICATION_ENABLED=True
```

Resend 대시보드에서 `redeemingtime.xyz`의 SPF와 DKIM 레코드를 검증한 뒤에만 위의 두
기능 플래그를 `True`로 켭니다. 이메일 인증과 비밀번호 재설정 링크는 `FRONTEND_ORIGIN`을 사용하므로 둘 다
`https://redeemingtime.xyz`로 열립니다.

### Resend HTTPS API 설정

Resend 대시보드에서 `redeemingtime.xyz`를 추가한 뒤, 표시되는 SPF·DKIM·MX 레코드를
도메인 DNS에 **값 그대로** 추가합니다. Resend의 도메인 상태가 `Verified`가 된 다음
Sending access 권한의 API 키를 만들고, 키는 채팅이나 Git에 공유하지 말고 Render
Environment에만 입력합니다.

| Render 변수 | Resend 값 |
| --- | --- |
| `EMAIL_DELIVERY_PROVIDER` | `resend` |
| `RESEND_API_KEY` | Resend Sending access API 키 (`re_…`) |
| `RESEND_API_BASE_URL` | `https://api.resend.com` (기본값) |
| `RESEND_API_TIMEOUT` | `10` (기본값) |
| `DEFAULT_FROM_EMAIL` | `Redeeming Time <no-reply@redeemingtime.xyz>` |
| `PASSWORD_RESET_EMAIL_ENABLED` | `True` |
| `EMAIL_VERIFICATION_ENABLED` | `True` |

서버는 `https://api.resend.com/emails`로 요청하므로 SMTP 포트 `25`, `465`, `587`을
사용하지 않습니다. Resend는 SPF·DKIM 검증 후 DMARC 레코드 추가도 권장합니다. DNS
공급자가 레코드 값을 자동으로 도메인 뒤에 붙이는 경우, Resend가 제시한 MX 대상 값
끝에 마침표를 붙여야 할 수 있습니다.

The state, callback, and exchange endpoints use dedicated throttles. Their
short-lived handoff code requires the production shared Redis-compatible cache
already listed above; do not replace it with per-process local memory.

The Render Blueprint declares placeholders for the provider credentials and
redirect URIs. During a new Blueprint setup, enter them when Render prompts
for values. For an existing service, add the same variables in Render's
Environment settings before redeploying; placeholder variables are intentionally
not overwritten by Blueprint syncs.

## Deploy with Render

1. Deploy the matching frontend build before the paginated backend. Its shared
   API client understands both the old array response and the new paginated
   response, so it is safe against the current API while this deployment is in
   progress.
2. In Render, create or update a Blueprint from the root
   [render.yaml](../render.yaml). It deploys in Singapore, uses the Dockerfile
   in `backend/`, and applies database migrations before Gunicorn starts.
3. In the existing `redeeming-time-api` service, set `DATABASE_URL` to the
   Neon pooled URL and `MIGRATION_DATABASE_URL` to the Neon direct URL. These
   `sync: false` values must be changed manually because Blueprint syncs do not
   overwrite existing secrets.
4. Deploy, then wait for the Render liveness health check at `/healthz/` to
   return `200`. It deliberately does not query PostgreSQL, allowing Neon Free
   to scale down while idle. Use `/readyz/` for an explicit database and cache
   readiness check.
5. Set Vercel's `VITE_API_BASE_URL` to `/api`, then redeploy the web app. The
   included rewrite proxies that route to Render without exposing its hostname
   to the browser.
6. Keep both the Render hostname and the Vercel hostname in `ALLOWED_HOSTS`.
   The Vercel hostname also remains in `CORS_ALLOWED_ORIGINS` for any clients
   that still access the API cross-origin.

The Blueprint generates `SECRET_KEY`, keeps Redis private, and uses only Free
instance types, so migrations run as part of the single web-service startup
instead of a paid pre-deploy job. Do not scale this configuration beyond one
instance. If you upgrade to a paid web service, move migrations to a single
pre-deploy job.

## Verify a release

Run these checks before connecting the frontend:

```bash
cd backend
DEBUG=False \
SECRET_KEY='replace-with-a-long-random-production-secret' \
ALLOWED_HOSTS=api.example.com \
DATABASE_URL=postgresql://user:password@host:5432/redeeming_time \
CACHE_URL=redis://host:6379/0 \
CORS_ALLOWED_ORIGINS=https://redeemingtime.xyz,https://www.redeemingtime.xyz,https://redeeming-time.vercel.app \
uv run manage.py check --deploy

uv run manage.py test
docker build -f Dockerfile .
```

Then check `GET https://<your-api-host>/healthz/` and
`GET https://<your-api-host>/readyz/`, register a test account, log in, and
confirm that an `OPTIONS` request from `https://redeemingtime.xyz`
receives the matching CORS origin header. Confirm existing migrated users,
calendars, events, and tasks are still present before deleting the old Render
database manually.

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
The deployed Vue web client follows the page links and keeps its existing array
contract, so screens do not lose data during the rollout. New range-aware
screens should use the filters instead of loading full history. Authenticated
profile code should use `GET /api/users/me/`; the client temporarily falls back
to the legacy `/api/users/` list while the P1 frontend-first rollout is in
progress.

| Endpoint                 | Filters                                                          | Boundary rule                                                                              |
| ------------------------ | ---------------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| `/api/categories/`       | `calendar`                                                       | Accessible calendar only                                                                   |
| `/api/events/`           | `calendar`, `starts_at`, `ends_at`                               | Datetimes are paired, timezone-aware, and overlap `[starts_at, ends_at)`; max span 93 days |
| `/api/tasks/`            | `calendar`, `target_date_from`, `target_date_to`, `is_completed` | Dates use `[target_date_from, target_date_to)` and booleans are `true` or `false`          |
| `/api/calendar-members/` | `calendar`                                                       | Owner-visible memberships only                                                             |
| `/api/event-attendees/`  | `event`                                                          | Accessible event only                                                                      |

An inaccessible calendar or event ID returns an empty result rather than
revealing whether it exists. Invalid filter formats return `400`.

## Rollover operations

The Free Render Blueprint does not include a Cron Job because Render Cron Jobs
have a minimum monthly charge. Overdue tasks will remain visible until users
update them manually. If automatic rollover is needed, upgrade and add a Docker
Cron Job that runs once daily at `15:05 UTC` (`00:05 Asia/Seoul`). Render Cron
schedules are UTC; the Singapore region does not change that. The job should
use the same `PLANNER_TIME_ZONE` and perform one idempotent database update for
incomplete tasks due before today.

Run it manually when recovering from an outage or checking a release:

```bash
cd backend
uv run manage.py rollover_overdue_tasks --dry-run
uv run manage.py rollover_overdue_tasks --date 2026-07-13
uv run manage.py rollover_overdue_tasks --date 2026-07-13 --calendar-id 42
```

Only the web service runs migrations before deployment. If a paid Cron Job is
later added, it must not run migrations. After enabling it, manually trigger it
once and check its log for the target date and updated count.

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
