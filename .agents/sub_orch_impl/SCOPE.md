# Scope: Premium Dark UI/UX & Routing Implementation

## Architecture
- **Routing & Auth Protection**: Uses `react-router-dom` in `apps/web`. The `/dashboard` route is protected, and unauthenticated users are redirected to `/login`.
- **Bento Grid Dashboard**: Slate dark themed (`#09090B` background, `#18181B` cards, `#27272A` / zinc-800 borders). Includes neon priority badges, calendar tab views, and an ambient outer glow indicating schedule congestion.
- **Glassmorphic Rollover Shield**: Displays a translucent overlay list of incomplete tasks from yesterday or earlier, providing a single-click action to roll them over to today via API.
- **Mobile Single-Screen Dark UI**: Bottom-oriented, thumb-optimized layout in `apps/app` styled with NativeWind, including floating quick actions.

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| 2 | Web Routing & Auth | Add react-router-dom, set up Router, protect /dashboard under /, redirect unauthenticated users to /login, store JWT on auth | None | DONE (Convs: explorer: 9847de66, worker: 985c51a2, review: c4a0c573/7166de57, audit: 96eeaa7a) |
| 3 | Web Bento Dashboard | Implement slate dark dashboard, bento grid cards, neon category/priority badges, calendar tabs, soft ambient glow warnings | M2 | IN_PROGRESS (Conv: a65bce70-6c70-4986-bf2e-862e3f7c6f49, 5146d11e-775d-4aae-93e0-f4224074669a) |
| 4 | Rollover Shield | Translucent glassmorphic overlay for overdue task lists, API trigger/mutations to update target_date to today | M3 | PLANNED |
| 5 | Mobile App Dark UI | Design NativeWind-based dark dashboard for single-screen Expo app, thumb-friendly navigation | None | PLANNED |
| 6 | E2E & Hardening | Run E2E tests, fix failures (Tiers 1-4), adversarial test-coverage hardening (Tier 5) | M1, M4, M5 | PLANNED |

## Interface Contracts
### Client Routing
- `/login` handles Login / Registration form.
- `/dashboard` displays primary planner dashboard (only accessible when `isAuthenticated()` is true).
- Accessing root `/` redirects to `/dashboard` if authenticated, else to `/login`.

### Rollover Shield Action
- Fetch/filter overdue tasks (`target_date < today` and `!is_completed`).
- Standard Rollover Shield shows overlay if there are overdue tasks.
- Single-click action calls API update on each overdue task (PATCH `/api/tasks/<id>/` updating `target_date` to today) or `/api/agent/skills/rollover/` and invalidates query state.
