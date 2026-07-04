# Handoff Report — Frontend E2E Testing Strategy

This handoff report summarizes the findings, architectural decisions, and testing design for implementing the end-to-end (E2E) testing strategy for the **Redeeming Time** frontend workspace.

---

## 1. Observation

Direct observations made on the workspace files (located at `/Users/kangdy25/Programming/Web/Redeeming_Time`):

1.  **Monorepo Workspace Structure (`redeeming-time-frontend/package.json`)**:
    ```json
    "workspaces": [
      "apps/*",
      "shared"
    ]
    ```
2.  **Shared API Client and Store Caching**:
    *   `shared/src/stores/authStore.ts` (lines 22-25) maintains token persistence:
        ```typescript
        export const useAuthStore = create<AuthState>((set, get) => ({
          accessToken: storage?.getItem(accessKey) ?? null,
          refreshToken: storage?.getItem(refreshKey) ?? null,
          isAuthenticated: () => Boolean(get().accessToken),
        ```
    *   `shared/src/stores/plannerStore.ts` (lines 16-21) holds sync planner structures:
        ```typescript
        export const usePlannerStore = create<PlannerState>((set) => ({
          activeCalendarId: null,
          calendars: [],
          categories: [],
          events: [],
          tasks: [],
        ```
3.  **Task Rollover Shield Logic**:
    *   `apps/web/src/App.tsx` (lines 295-306) identifies and displays overdue tasks:
        ```typescript
        const overdue = !task.is_completed && task.target_date < today;
        return (
          <button className={`task-row ${task.is_completed ? 'done' : ''}`} onClick={() => toggleTask.mutate(task)} key={task.id}>
            <span className="check-dot">{task.is_completed ? '✓' : ''}</span>
            <span>
              <strong>{task.title}</strong>
              <small>{task.priority} · {task.target_date}{overdue ? ' · rollover ready' : ''}</small>
            </span>
            {overdue && <b>↷</b>}
          </button>
        ```
4.  **Schedule Congestion Alert Display (Mobile Layout)**:
    *   `apps/app/App.tsx` (lines 23-28) renders warning messages:
        ```typescript
        {event.congestion_warning?.is_congested && (
          <Text className="mt-2 rounded-md bg-amber-100 px-2 py-1 text-xs font-bold text-amber-800">
            Schedule congestion detected
          </Text>
        )}
        ```

---

## 2. Logic Chain

1.  **Monorepo Shared Integrity**: Because both the Vite web dashboard and the Expo React Native app share data logic from the `@redeeming-time/shared` workspace, any E2E testing framework must mock the underlying `@redeeming-time/shared` components (`apiClient`, React Query hooks, and Zustand store states) uniformly to guarantee behavior consistency on both platforms.
2.  **Vitest + JSDOM for Cross-Platform Simulation**: Running real React Native UI tests typically requires native emulator environments (e.g., Detox/Appium), which increases runtime overhead. However, since the Expo app uses NativeWind (Tailwind utility classes) and standard React Native elements, mapping `react-native` to `react-native-web` using Vitest's `alias` config enables compiled outputs (like `View` and `Text` mapping to `div` and `span`) to run on standard JSDOM. This allows testing both applications within a lightweight, single runner environment.
3.  **Harness Synchronization Verification**:
    *   By intercepting all requests with MSW and feeding query hooks with structured mock data containing `congestion_warning` values, we can verify that the mobile `EventCard` correctly displays the amber alerts under heavy schedule loads.
    *   By providing custom timestamp feeds via standard mock variables, we can verify that the rollover shield correctly styles tasks with `↷` when `target_date < Today` is satisfied.

---

## 3. Caveats

1.  **Native Layout and Interaction Limitations**: Simulating Native layouts through JSDOM + `react-native-web` does not test actual layout boundaries, touch gestures (like dragging tasks to rearrange order), or device-specific rendering issues.
2.  **State Pollution Prevention**: Zustand stores are singleton objects. If stores are not explicitly reset between tests using custom helper scripts, mutations from previous tests will leak into subsequent ones, creating false positives or negatives.
3.  **MSW Network Isolation**: The testing strategy assumes mock data intercepts everything. Changes in backend schemas that do not match MSW handlers will not be caught unless integrated with contract tests or live integration environments.

---

## 4. Conclusion

We have designed a highly detailed **104-case testing suite** covering all core features (Authentication, Data Sync, Calendar, Category, Month/Week Grids, Task Lifecycle, Rollover Shield, Congestion Alerts, and Cross-Platform Layouts). The proposed **Vitest + JSDOM + react-native-web** architecture is sufficient, fast, and robust for running both web and mobile component test scenarios without the overhead of emulators or browsers.

---

## 5. Verification Method

To verify the proposed test suites and architecture:

1.  Inspect `/Users/kangdy25/Programming/Web/Redeeming_Time/.agents/explorer_e2e_3/analysis.md` to confirm the presence of all 104 tests (divided into Tier 1, Tier 2, Tier 3, and Tier 4) and configuration file listings.
2.  Execute the following commands in the terminal to inspect the files:
    ```bash
    cat /Users/kangdy25/Programming/Web/Redeeming_Time/.agents/explorer_e2e_3/analysis.md
    ```
3.  Verification invalidation condition: If the files are missing or do not cover the required 104+ test cases divided into the 4 defined tiers, the task is incomplete.
