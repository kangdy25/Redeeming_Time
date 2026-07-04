# Project: Redeeming Time UI/UX & Routing

## Architecture
- **Web Frontend (`web`)**: Client-side routing with `react-router-dom`, Bento Grid dashboard layout, Slate dark theme, glassmorphic Rollover Shield.
- **Mobile Frontend (`app`)**: Expo React Native app, NativeWind-based dark dashboard layout, optimized bottom-oriented navigation.
- **Shared Package (`shared`)**: Code reuse for Zustand stores, API Client (`apiClient`), query hooks (`useToggleTask`, etc.), and types.
- **Backend (`backend`)**: Django REST Framework REST API, supporting simplejwt authentication and Agent skills endpoint.

## Code Layout
- `frontend/web/`: React web application.
- `frontend/app/`: Expo mobile application.
- `frontend/shared/`: Shared state and API services.

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| 1 | E2E Testing Track | Write comprehensive E2E test suite in `web` and `app` | None | IN_PROGRESS (Conv: b9b35cd2-4229-47c8-8b52-171daebb9e28) |
| 2 | Web Routing & Auth | Implement client routing, protect `/dashboard` under `/`, handle jwt and redirection | None | IN_PROGRESS (Conv: 3b214209-9dab-4f1f-a489-828315377911) |
| 3 | Web Bento Dashboard | Multi-column bento grid, slate dark colors, neon category badges, week/month toggles, ambient glow warnings | M2 | IN_PROGRESS (Conv: 3b214209-9dab-4f1f-a489-828315377911) |
| 4 | Rollover Shield | Translucent glassmorphic overlay for task list, triggers overdue tasks rollover to today | M3 | IN_PROGRESS (Conv: 3b214209-9dab-4f1f-a489-828315377911) |
| 5 | Mobile App Dark UI | Dark theme Expo app, controls in bottom half, NativeWind, floating buttons | None | IN_PROGRESS (Conv: 3b214209-9dab-4f1f-a489-828315377911) |
| 6 | Integration & Verification | E2E test verification, adversarial edge-case testing, forensic audit validation | M1, M4, M5 | PLANNED |

## Interface Contracts
### Auth Store (`useAuthStore`)
- Extends standard Zustand stores to support auth token persistence and `isAuthenticated()` check.
- Custom headers for standard user (`Bearer <token>`) or agent scoped (`Agent <token>`).

### Task Rollover
- Triggers `/api/agent/skills/rollover/` (requires Agent token) OR individual `/api/tasks/<id>/` PATCH updates (standard Bearer token) to push task `target_date` to today.
- Standard client updates the state upon successful mutation to refresh checklist.
