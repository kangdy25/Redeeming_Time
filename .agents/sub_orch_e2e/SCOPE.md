# Scope: E2E Testing Track

## Architecture
- **E2E Testing Infrastructure**: Configured under `redeeming-time-frontend` using Vitest and JSDOM. Tests are organized into Web App tests (`apps/web/tests`) and Mobile App tests (`apps/app/tests`).
- **Data Flow**: Tests exercise user interaction flows in components (auth inputs, form clicks, checkbox selections) and intercept/mock store and API actions to assert state changes and correct request formats.
- **Shared Interfaces**: The test suite validates compatibility with `@redeeming-time/shared` models (Zustand store updates, API client responses).

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| 1 | Infrastructure Setup | Install Vitest, JSDOM, React Testing Library, and configure testing environment | None | PLANNED |
| 2 | Web E2E Test Cases | Implement 69+ test cases covering Web dashboard, routing, authentication, calendar, task list, and Rollover Shield | M1 | PLANNED |
| 3 | Mobile E2E Test Cases | Implement 35+ test cases covering Mobile NativeWind single-screen layout, schedule cards, and thumb navigation | M1 | PLANNED |
| 4 | Verification & Reporting | Run the full test suite (104+ tests), verify correctness, publish project-root documents `TEST_INFRA.md` and `TEST_READY.md` | M2, M3 | PLANNED |

## Interface Contracts
### E2E Test Suite ↔ Frontend Codebase
- Test runner targets `.tsx` and `.ts` files under `apps/web/src` and `apps/app/` (or `apps/app/src` if restructured).
- Mocking is isolated to network requests (`apiClient`) and React Native primitives (like Safe Area and gesture handlers), keeping application code logic opaque.
