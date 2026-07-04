# Context — E2E Testing Track

This document details the recovered context and technical constraints for the Redeeming Time E2E Testing Track.

## Workspace & Codebase
- **Root Directory**: `/Users/kangdy25/Programming/Web/Redeeming_Time`
- **Web App Directory**: `redeeming-time-frontend/apps/web`
- **Mobile App Directory**: `redeeming-time-frontend/apps/app`
- **Shared Code Directory**: `redeeming-time-frontend/shared`

## Key Packages & Stores
- **Zustand Auth Store**: `useAuthStore` in `@redeeming-time/shared` controls authentication status and token handling.
- **Zustand Planner Store**: `usePlannerStore` contains calendars, categories, events, and tasks.
- **API Client**: `apiClient` manages HTTP requests to the DRF backend.
- **Task Rollover**: Mutates target date to today and updates client check-state.

## Test Harness Strategy
- We will install `vitest`, `jsdom`, `@testing-library/react`, `@testing-library/react-native`, and other required packages in `package.json` at the root and workspace level.
- Or we will implement the tests inside `apps/web/src` and `apps/app/src` or a dedicated test folder and use a mock environment for React / React Native.
- The test cases will be compiled, executed, and validated by running the test commands.
