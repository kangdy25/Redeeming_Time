# Redeeming Time

> **"Making the best use of the time, because the days are evil." (Ephesians 5:16, ESV)**
>
> A value-driven, production-ready cross-platform calendar and planner service designed to help users actively rescue and reclaim meaning from thoughtlessly drifting time.

---

## 🚀 Project Overview

Redeeming Time is a robust, visually intuitive **'Daily Schedule Planner'** built to be the first thing a user opens in the morning and the companion they rely on all day.

While focusing on the foundational values of schedule management and to-do execution, it preserves life's momentum by automatically rolling over uncompleted tasks to the next day. It also delivers data visualizations to audit whether time was spent meaningfully.

### 🎯 Core Planner Values

1. **Visual Intuitiveness:** A layout optimized for absolute glanceability, allowing users to immediately map out tasks and the nature of their commitments through fully tailored custom category colors.
2. **Day-to-Day Continuity:** A seamless integration where schedules and to-dos live organically within a unified calendar view, making the rollover experience of overdue tasks feel natural and non-punitive.
3. **Exceptional Tactile Feedback:** Delivering rapid and snappy interactions across cross-platform environments—supporting smooth drag-and-drop actions and comfortable single-handed mobile navigation.

---

## 🛠 Tech Stack

### Front-end (Cross-Platform Two-Track Workspace)

- **Web:** React 19 (Vite) + Tailwind CSS (A lightweight, blazing-fast desktop planning dashboard)
- **App:** React Native (Expo) + NativeWind (100% sharing styling source patterns with web)
- **State & Fetch:** Zustand + TanStack Query v5 (Shared global caching engine and unified custom Hooks)

### Back-end & Database

- **Framework:** Python / Django REST Framework (DRF)
- **Database:** SQLite for local quickstart, PostgreSQL for production-style development and deployment
- **Authentication:** JWT (JSON Web Token), Social Identity Providers (Google, Kakao OAuth 2.0)

### Infrastructure

- **Web Hosting:** Vercel (React Web)
- **API Server & Storage:** AWS (EC2 / RDS PostgreSQL / S3 for asset management)

---

## ✨ Feature Roadmap

### Stage 1: Core Planner MVP (Minimum Viable Product)

- [ ] **Authentication (Auth):** Custom registration/login with JWT alongside OAuth 2.0 (Google, Kakao).
- [ ] **Multi-Calendar:** Creating and switching between isolated planner spaces tailored for distinct scopes (Personal, Team, Routine).
- [ ] **Event & Task CRUD:** Complete create, read, update, delete workflows for calendar events and to-dos, including deep note nesting.
- [ ] **Custom Category (`CATEGORY`):** A flexible, separated category entity mapping custom titles and hex color codes.

### Stage 2: Collaboration & Access Control

- [ ] **Calendar Sharing:** Generation of private invite links and shared workspace enrollment.
- [ ] **Fine-Grained Permissions:** Hard separation of `OWNER`, `EDITOR`, and `VIEWER` access matrix backed by rigid DRF Permission classes.
- [ ] **Event Feeds:** Real-time conversational comments and activity logs bound to specific calendar events.

### Stage 3: Productivity & Automation

- [ ] **Recurrence Engine:** Server-side handling of complex recurring rules mapped to the RFC 5545 (RRule) specification.
- [ ] **Automated Task Rollover:** A batch workflow that automatically forwards uncompleted tasks past midnight.
- [ ] **Unified Deep Search:** High-speed tokenized searching across titles, tags, and attendees.

### Stage 4: Proactive Time Analytics (Dashboard)

- [ ] **Time Consumption Analysis:** Ultra-fast calculation of total durations and category percentages using DRF `annotate` and `aggregate` pipelines.
- [ ] **Milestone Reports:** Aggregating weekly/monthly achievement trends into planner reports.

---

## 📁 Directory Structure

```text
├── backend/                   # Django DRF API Service
└── frontend/                  # Frontend Monorepo Workspace
    ├── web/                  # React + Vite + Tailwind CSS (Desktop Web Planner)
    ├── app/                  # React Native + NativeWind (Mobile App Planner)
    └── shared/               # Shared Zustand Stores & TanStack Query Custom Hooks
```

## Local Development

### Backend API

```bash
cd backend
uv run manage.py migrate
uv run manage.py runserver
```

The backend defaults to local SQLite via `backend/.env`, so the API can boot without Docker. Once running, open:

- API root: `http://127.0.0.1:8000/api/`
- Swagger UI: `http://127.0.0.1:8000/api/docs/`
- OpenAPI schema: `http://127.0.0.1:8000/api/schema/`

If port `8000` is already in use, run the server on another port:

```bash
uv run manage.py runserver 127.0.0.1:8001
```

For PostgreSQL-backed development, start the container and set `DATABASE_URL` in `backend/.env` to the Postgres URL from `backend/.env.example` or `compose.yaml`.

```bash
docker compose up -d postgres
```

### Frontend Workspaces

```bash
cd frontend
npm --workspace @redeeming-time/web run dev
```

The Vite web app starts on the URL printed by Vite, usually `http://localhost:5173/`.

### Vercel Web Deployment

Create a Vercel project from this repository with these settings:

- Root Directory: `frontend`
- Framework: Vite
- Build Command: `npm run build:web`
- Output Directory: `web/dist`
- Environment Variable: `VITE_API_BASE_URL=https://your-api.example.com/api`

`frontend/vercel.json` contains the monorepo install command, SPA fallback rewrite for direct
access to `/login` and `/dashboard`, and baseline security headers. Deploy once without the API
variable only to verify the static preview; set the Render API URL and redeploy before enabling
login for users.

### Backend Deployment

The production API is Dockerized and has a Render Blueprint at `render.yaml`.
It provisions PostgreSQL, a private Redis-compatible cache for authentication
throttling, a health check, a pre-deploy migration job, and an Asia/Seoul task
rollover Cron Job. Follow
[the backend deployment guide](docs/backend-deployment.md) before setting
`VITE_API_BASE_URL` to the deployed API URL.

For the Expo app:

```bash
cd frontend
npm --workspace @redeeming-time/app run start
```

### Verification

```bash
cd backend
uv run coverage run manage.py test
uv run coverage report
```

```bash
cd frontend
npm run test:coverage
npm run test:e2e
npm run lint
npm run format:check
npm run build:web
npm run typecheck:app
npm run typecheck:shared
```

GitHub Actions runs backend, frontend, and browser E2E jobs for every pull request and every
push to `main`. Coverage is enforced at the current baselines (backend 70%; web/shared 50% for
statements, functions, and lines, and 45% for branches) so coverage cannot silently regress.
