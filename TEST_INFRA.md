# Redeeming Time Frontend Testing Infrastructure

This document details the E2E/integration testing infrastructure configured for the Redeeming Time frontend workspace.

## 1. Unified Test Runner (`vitest`)
Vitest is configured at the workspace root to orchestrate testing across all sub-packages (`apps/web`, `apps/app`, `shared`).
- **Configuration File**: `redeeming-time-frontend/vitest.config.ts`
- **Environment**: JSDOM (simulated browser DOM environment).
- **Aliases**: `react-native` is aliased to `react-native-web` to resolve components cleanly under JSDOM.

## 2. Fast Component Rendering via JSDOM Overrides
React Native primitives normally require a mobile native environment. In `test.setup.ts`, we mock `react-native` components to compile down to standard HTML elements:
- `View` -> `div`
- `Text` -> `span`
- `TouchableOpacity` -> `button`
- `ScrollView` -> `div` (with `overflowY: 'auto'`)
- `SafeAreaView` -> `div`

This allows us to test React Native component layouts and touch interactions inside JSDOM at the speed of a standard web test.

## 3. State Management Isolation (Zustand)
Zustand stores preserve in-memory states between runs. In `test.setup.ts`, we register a `beforeEach` hook to reset `useAuthStore` and `usePlannerStore` back to their initial states, ensuring complete test isolation:
```typescript
export const resetStores = () => {
  useAuthStore.setState(initialAuthState, true);
  usePlannerStore.setState(initialPlannerState, true);
  localStorageMock.clear();
};
```

## 4. Query Client Provider Wrappers
To isolate the async cache, the test helper `renderWithProviders` in `test.utils.tsx` initializes a fresh `QueryClient` per test with:
- `retry` set to `false`
- `gcTime` and `staleTime` set to `0`

This prevents caching leaks and mock side-effects across tests.

## 5. Network Mocking (MSW)
Mock Service Worker (MSW) intercepts all API requests at the network boundary, returning stubbed REST responses. The mocked endpoints include:
- `/users/` (POST) — User registration.
- `/auth/token/` (POST) — User token connection.
- `/calendars/` (GET/POST) — Calendar listing and creation.
- `/categories/` (GET/POST) — Category management.
- `/events/` (GET/POST) — Calendar event management.
- `/tasks/` (GET/POST) — Task checklist management.
- `/tasks/:id/` (PATCH) — Task status updates.
- `/api/agent/skills/rollover/` (POST) — AI agent bulk task rollover.
