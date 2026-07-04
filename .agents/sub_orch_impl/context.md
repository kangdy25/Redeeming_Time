# Technical Context & Analysis

## Codebase Structure
- **Root Directory**: Contains workspaces for backend (`redeeming-time-backend`) and frontend (`redeeming-time-frontend`).
- **Frontend Workspace**:
  - `apps/web`: React-based web app. Configured with Vite, Tailwind CSS, TypeScript.
  - `apps/app`: React Native Expo app. Configured with NativeWind, TypeScript.
  - `shared`: Shared library containing Zustand stores (`authStore`, `plannerStore`), API client (`client.ts`), React Query hooks (`plannerHooks.ts`, `queryClient.ts`), and TypeScript types (`types.ts`).

## Dependencies
- **apps/web**: Needs `react-router-dom` added. Currently uses Tailwind CSS v3.
- **apps/app**: Uses NativeWind v4 (configured in `apps/app/package.json` as `"nativewind": "^4.1.0"`).
- **shared**: Shared state and queries.

## API Endpoints (Django Backend)
- `/api/auth/token/` (POST) -> Get JWT tokens (access & refresh).
- `/api/users/` (POST) -> Register user.
- `/api/tasks/` (GET/POST) -> List and create tasks.
- `/api/tasks/<id>/` (PATCH) -> Update task (e.g. `is_completed`, `target_date`).
- `/api/agent/skills/rollover/` (POST) -> Rollover overdue tasks (requires Agent token).
- `/api/agent/skills/overdue-tasks/` (GET) -> Fetch overdue tasks (requires Agent token).

## Implementation Strategy
1. **Milestone 2 (Web Routing & Auth)**:
   - Install `react-router-dom` in `apps/web`.
   - Setup React Router with `/login` and `/dashboard` (protected).
   - Sync authentication token storage and state.
2. **Milestone 3 (Web Bento Grid Dashboard)**:
   - Implement deep slate dark dashboard: `#09090B` background, zinc-800 borders, `#18181B` cards.
   - Design bento grid dashboard elements: top header, calendar views (tabs for week/month), and task list.
   - Use neon badges for priority and categories.
   - Highlight congestion warning with soft ambient glow.
3. **Milestone 4 (Rollover Shield)**:
   - Implement translucent glassmorphic overlay for task list when overdue tasks exist.
   - Provide a button to rollover all overdue tasks.
   - The button triggers API updates (PATCH to `/api/tasks/<id>/` or rollover endpoint) and refreshes tasks.
4. **Milestone 5 (Mobile App Dark UI)**:
   - Implement NativeWind-based dark dashboard for `apps/app`.
   - Layout optimized for bottom-oriented single-handed navigation.
5. **Milestone 6 (E2E Test Pass & Hardening)**:
   - Run E2E tests, diagnose and fix failures.
   - Perform adversarial testing / coverage audits.
