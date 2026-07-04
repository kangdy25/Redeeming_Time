# Plan — E2E Testing Track Implementation

This document details the action plan for designing and implementing the E2E test infrastructure and 104+ test cases for Redeeming Time.

## 1. Feature Identification (N = 9)
We identify the following 9 key features based on requirements:
1. **Web Authentication & Redirection**: Protecting routes, login/register forms, token storage/clearing, redirects.
2. **Web Bento Grid Layout & Theme**: Bento grid layout, slate dark theme visual assets/styles, responsive panels.
3. **Web Calendar Grid & Event Stack**: Rendering events on the calendar grid, categories with neon color badges, week rail dates.
4. **Web Data Creation Forms**: Interactive forms for adding calendars, categories, events, and tasks.
5. **Web Task Continuity (Sidebar)**: Checklist layout, overdue tasks display, priorities color/symbols, status checkboxes.
6. **Web Rollover Shield Triggering**: Triggers the rollover shield (translucent glassmorphic overlay) when overdue tasks exist, making API calls to `/api/agent/skills/rollover/` or PATCH `/api/tasks/<id>/`, and updating local state.
7. **Mobile Dashboard Layout & Navigation**: NativeWind-based single-screen dark theme layout optimized for bottom-oriented single-handed thumb navigation.
8. **Mobile Schedule & Event Cards**: Event list display, custom styling for categories, and schedule congestion warning detection.
9. **Mobile Task Continuity (Checklist)**: Scrollable task row checklists, checkbox toggle interactions, and task rollover action triggering.

## 2. Test Cases Tier Structure (Total = 104 Cases)
- **Tier 1: Feature Coverage (45 tests)**: 5 tests per feature covering primary happy path flows.
- **Tier 2: Boundary & Corner Cases (45 tests)**: 5 tests per feature covering empty states, invalid inputs, edge timestamps, overflow limits, etc.
- **Tier 3: Cross-Feature Combinations (9 tests)**: Pairwise feature interactions (e.g. Auth status affecting calendar creation, task rollover triggering layout state changes, calendar category colors syncing to mobile cards, etc.).
- **Tier 4: Real-World Scenarios (5 tests)**: E2E user workflows (e.g., Register -> Create Calendar -> Create Category -> Add Congested Events -> Create Overdue Task -> Perform Task Rollover -> Check Mobile Dashboard Sync).

## 3. Implementation Steps
1. **Setup Test Runner**: Install Vitest, JSDOM, React Testing Library, and configure workspace tests under `apps/web/tests/` and `apps/app/tests/` or in a centralized test directory.
2. **Define Test Stubs/Mocks**: Mock API client (`apiClient`) and Zustand store state transitions to perform opaque-box behavior testing.
3. **Implement Feature Tests**:
   - Write Web test suite covering features 1-6.
   - Write Mobile test suite covering features 7-9.
4. **Verify Tests**: Run test suite and fix any failing checks.
5. **Publish Outputs**: Write `TEST_INFRA.md` and `TEST_READY.md` to project root.
