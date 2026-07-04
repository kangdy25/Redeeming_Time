# Redeeming Time Frontend E2E Testing Strategy & Architecture Report

This report outlines the end-to-end (E2E) testing strategy and simulated component testing architecture for the **Redeeming Time** frontend repository. The architecture targets a unified monorepo containing a shared logic core (`@redeeming-time/shared`), a Vite web application (`@redeeming-time/web`), and an Expo React Native mobile application (`@redeeming-time/app`).

---

## 1. Frontend Repository & Architecture Review

Based on the direct inspection of the codebase, the frontend is organized as a monorepo workspace:

### Package Workspace Mapping
*   **Root Workspace**: Coordinates package scripts and builds.
*   **Shared Core (`shared/`)**:
    *   `src/types.ts`: Domain models for `User`, `Calendar`, `Category`, `Event`, `Task`, `CongestionWarning`, and payload schemas.
    *   `src/api/client.ts`: The HTTP client wrapping `fetch` with JWT authorization headers. It resolves `API_BASE_URL` dynamically from Environment Variables.
    *   `src/stores/authStore.ts`: A Zustand store managing JWT tokens (`accessToken`, `refreshToken`) persisted to local storage.
    *   `src/stores/plannerStore.ts`: A Zustand store managing planner entities (`calendars`, `categories`, `events`, `tasks`) and local mutations (active calendar selection, task completion toggles).
    *   `src/queries/plannerHooks.ts`: React Query wrappers that fetch snapshots (`usePlannerSnapshot`) and mutate state, synchronizing the result into the Zustand planner store.
*   **Web Client (`apps/web/`)**:
    *   `src/App.tsx`: The main dashboard page combining authentication (`AuthPanel`), inputs (`CalendarControls`), week list (`WeekRail`), monthly layout (`MonthGrid`), and tasks sidebar (`TaskSidebar`).
*   **Mobile Client (`apps/app/`)**:
    *   `App.tsx`: An Expo client showcasing "Today’s Planner", fetching calendar data using the same query client and stores, and displaying upcoming event cards (`EventCard`) with congestion warnings and task rows (`TaskRow`) with rollover indicator badges. It uses NativeWind v4 for styling.

---

## 2. Nine Core Features Selected for E2E Coverage

To ensure complete functional validation, we define **N = 9 features** targeting all core visual layouts and business logic:

1.  **User Authentication & Session Management**: Controls registration, login, JWT caching, session sign-out, and auto-injection of the bearer token into headers.
2.  **API Data Syncing & Query Cache State**: Handles `usePlannerSnapshot` API data loading, error states, and sync indicators ("Synced", "Syncing", "API needs attention", "Sign in required").
3.  **Multi-Calendar Workspace Management**: Enables creating, list-rendering, and switching between multiple planning workspaces via `activeCalendarId`.
4.  **Category Customization & Filtering**: Validates custom category creation (name, hex color), and color representation on UI elements.
5.  **Calendar Grid Rendering & Event Display (Month/Week)**: Validates month cells calculation, week rail headers, and overflow indicator logic for dates with 3+ events.
6.  **Task Lifecycle, Sorting, & Completion Toggling**: Tracks task creation, priority badge display, sorting order, and state synchronization via React Query mutations.
7.  **Task Rollover Shield Visuals & Logic**: Visualizes uncompleted overdue tasks (`target_date < Today` and `is_completed === false`) with "rollover ready" labels and `↷` icons.
8.  **Schedule Congestion Warnings (Time-Rescuer)**: Detects overlapping event warning banners on the mobile UI when `congestion_warning.is_congested` is active.
9.  **Cross-Platform Component & Screen Layout Adaptations**: Ensures proper layout elements exist on both platforms (web-specific dashboard split panels vs mobile safe scroll views and tap handlers).

---

## 3. Four-Tier E2E Testing Matrix (104 Test Cases)

Below is the design of **104 test cases** divided into 4 tiers to cover all requirements.

### Tier 1: Feature Coverage (45 Test Cases)
This tier validates the basic user flows and visual elements for each of the 9 features (5 tests per feature).

#### Feature 1: User Authentication & Session Management
*   **T1.1.1 (Register Flow)**: Enter email, password, nickname in `AuthPanel`, click register -> triggers `apiClient.register` post request -> success message.
*   **T1.1.2 (Login Flow)**: Enter credentials in `AuthPanel`, click login -> triggers `apiClient.token` -> receives JWTs -> writes to Zustand and localStorage -> UI reveals dashboard controls.
*   **T1.1.3 (Sign Out Flow)**: Click sign out button -> triggers `clearTokens` store action -> removes tokens from localStorage -> resets UI to AuthPanel login form.
*   **T1.1.4 (Bearer Token Injection)**: Mock credentials set in Zustand -> trigger query request -> assertion confirms `Authorization: Bearer <mock-token>` exists in headers.
*   **T1.1.5 (Conditional Data Fetching)**: Unauthenticated session -> query hook `usePlannerSnapshot` is checked -> assertion verifies query remains disabled and does not fetch.

#### Feature 2: API Data Syncing & Query Cache State
*   **T1.2.1 (Synced Status Web)**: Hook returns query success -> Topbar status shows "Synced".
*   **T1.2.2 (Syncing State Indicator)**: Trigger a refetch event -> snapshot query `isFetching` becomes true -> Topbar status changes to "Syncing".
*   **T1.2.3 (API Error Status)**: API returns 500 server error -> query enters error state -> Topbar displays "API needs attention" (Web) or "API offline" (Mobile).
*   **T1.2.4 (Zustand Store Hydration)**: Hook loads data snapshot -> triggers `syncPlanner` -> store state updates with mock calendars, categories, events, and tasks.
*   **T1.2.5 (Mutation Query Invalidation)**: Execute event addition -> mutates via `useCreateEvent` -> success triggers query cache invalidation on key `['planner-snapshot']`.

#### Feature 3: Multi-Calendar Workspace Management
*   **T1.3.1 (Selector List Population)**: Render `CalendarControls` with 3 mock calendars -> dropdown options display all 3 titles.
*   **T1.3.2 (Active Calendar Change)**: Select Calendar ID `2` in dropdown -> store action `setActiveCalendarId(2)` executes -> dropdown shows selection.
*   **T1.3.3 (Add Calendar Workflow)**: Fill calendar form, click submit -> triggers `apiClient.createCalendar` -> updates store -> sets the newly created ID as active.
*   **T1.3.4 (Payload Linkage)**: Active calendar set to `2` -> submit new category -> payload contains `calendar: 2`.
*   **T1.3.5 (No Calendar State)**: Empty calendar array -> dropdown displays fallback "No calendar" -> control form inputs are disabled.

#### Feature 4: Category Customization & Filtering
*   **T1.4.1 (Category Creation)**: Fill name "Study", select color `#0000FF` -> submit -> triggers `apiClient.createCategory` -> category store syncs.
*   **T1.4.2 (Category Calendar Isolation)**: Active calendar set to ID `1` -> dropdown category selection only displays categories with `calendar_id === 1`.
*   **T1.4.3 (Color Input Integration)**: Select color swatch `#123456` in category form -> updates local color state.
*   **T1.4.4 (Category Pill Renders Color)**: Render `MonthGrid` with category-linked event -> pill border and background-opacity colors resolve based on category color code.
*   **T1.4.5 (Mobile Category Name Tag)**: Render mobile `EventCard` with category details -> displays name "Deep Work" under the title.

#### Feature 5: Calendar Grid Rendering & Event Display (Month/Week)
*   **T1.5.1 (Add Event Flow)**: Fill title, start/end dates -> submit event -> calls `apiClient.createEvent` -> query invalidates.
*   **T1.5.2 (Month Grid Sizing)**: Render Web `MonthGrid` -> cell array counts exactly 42 slots representing the calendar month grid view.
*   **T1.5.3 (Event Position Matching)**: Event start date is 2026-07-04 -> verify event pill is rendered inside the date cell matching July 4th.
*   **T1.5.4 (Event Pill Overflow)**: Date cell has 4 events scheduled -> displays 3 event pills and a `+1` overflow counter badge.
*   **T1.5.5 (Week Rail Headers)**: Render Web `WeekRail` -> shows 7 header items matching the target week's days and numbers.

#### Feature 6: Task Lifecycle, Sorting, & Completion Toggling
*   **T1.6.1 (Add Task Flow)**: Input title, select medium priority -> submit -> triggers `apiClient.createTask` -> updates task lists.
*   **T1.6.2 (Task Row Priority Label)**: Task has priority HIGH -> Task Row displays priority text "HIGH".
*   **T1.6.3 (Task Completed State)**: Task is completed (`is_completed === true`) -> renders checkbox dot as `✓` and applies line-through text style.
*   **T1.6.4 (Task List Sorting Order)**: Task list holds tasks of varied target dates and order indexes -> verifies rendering order is ascending by `target_date`, then by `order`.
*   **T1.6.5 (Toggling Action)**: Click task row -> triggers `useToggleTask` mutation -> toggles `is_completed` state.

#### Feature 7: Task Rollover Shield Visuals & Logic
*   **T1.7.1 (Overdue Uncompleted Indicator)**: Task target date is yesterday and uncompleted -> displays "rollover ready" text on row.
*   **T1.7.2 (Overdue Uncompleted Icon)**: Task target date is yesterday and uncompleted -> displays the `↷` rollover icon.
*   **T1.7.3 (Completed Overdue Exemption)**: Task target date is yesterday and completed -> does not display "rollover ready" or the `↷` icon.
*   **T1.7.4 (Future Uncompleted Exemption)**: Task target date is tomorrow and uncompleted -> does not display "rollover ready" or the `↷` icon.
*   **T1.7.5 (Today Uncompleted Exemption)**: Task target date is today and uncompleted -> does not display "rollover ready" or the `↷` icon.

#### Feature 8: Schedule Congestion Warnings (Time-Rescuer)
*   **T1.8.1 (Congested Event Card Mobile)**: Mobile `EventCard` gets warning payload with `is_congested === true` -> renders "Schedule congestion detected" badge.
*   **T1.8.2 (Safe Event Card Mobile)**: Mobile `EventCard` gets warning payload with `is_congested === false` -> does not render warning badge.
*   **T1.8.3 (Warning Payload Integrity)**: Verify Zustand store contains the warning reasons and daily hours array data loaded from the API snapshot.
*   **T1.8.4 (API Warning Return Payload)**: Creating a overlapping event -> API returns warning fields -> verified in store updates.
*   **T1.8.5 (Mobile Color Warning Contrast)**: Ensure congestion warning badge uses the correct alert background colors (amber-100, text-amber-800).

#### Feature 9: Cross-Platform Component & Screen Layout Adaptations
*   **T1.9.1 (Web Layout structure)**: Render Web `App.tsx` -> main shell uses structural panels (`app-shell`, `topbar`, `setup-grid`, `content-grid`).
*   **T1.9.2 (Web Task Sidebar)**: Render Web `App.tsx` -> tasks sidebar resides inside an `<aside>` element with class `task-sidebar`.
*   **T1.9.3 (Mobile Scroll View)**: Render Mobile `App.tsx` -> uses native `SafeAreaView` wrapping a `ScrollView` element.
*   **T1.9.4 (Mobile Scroll Elements)**: Scroll layout contains a scroll view wrapper with padding-bottom content container styling.
*   **T1.9.5 (Mobile Tap Handling)**: Task items in Mobile are wrapped in `TouchableOpacity` buttons with action trigger handlers.

---

### Tier 2: Boundary & Corner Cases (45 Test Cases)
This tier validates edge cases, limits, and failure handling for each feature (5 tests per feature).

#### Feature 1: User Authentication & Session Management
*   **T2.1.1 (Invalid Email Registration)**: Input invalid email formats (e.g. `user@com`, `@test.com`) -> API returns validator failure -> form displays error message.
*   **T2.1.2 (Incorrect Password Login)**: Input invalid password -> API responds with 401 unauthorized -> store clears -> display error feedback.
*   **T2.1.3 (Malformed JWT Token Initialization)**: Populate local storage with corrupt token strings -> reload application -> auth is invalid -> returns to login state.
*   **T2.1.4 (Empty String Registration fields)**: Input empty string fields in form -> html forms block submit / API rejects empty strings with detail responses.
*   **T2.1.5 (Expired Token Operation)**: Access token expires mid-session -> next fetch fails with 401 -> client auto-clears session tokens and redirects.

#### Feature 2: API Data Syncing & Query Cache State
*   **T2.2.1 (Server Offline Fetch)**: Endpoint unreachable -> query client triggers immediate retry and transitions to error state showing offline alerts.
*   **T2.2.2 (Partial Snapshot Sync)**: Sync action payload lacks events array -> store retains existing event records instead of erasing them.
*   **T2.2.3 (Rapid Multiple Submissions)**: Rapid double click on create forms -> API resolves both -> store handles incoming updates without race condition errors.
*   **T2.2.4 (Huge Workspace Payload)**: Snapshot yields 1000+ items -> store hydration executes cleanly without memory leaks or frozen layouts.
*   **T2.2.5 (Empty Snapshot Response)**: API returns empty arrays for all items -> lists show "No tasks/events returned" placeholder copy.

#### Feature 3: Multi-Calendar Workspace Management
*   **T2.3.1 (Non-existent Calendar Active ID)**: Set active calendar state to ID `999` (absent) -> app degrades gracefully, showing blank cells instead of crashing.
*   **T2.3.2 (HTML Tags in Calendar Title)**: Input Title `<script>alert('xss')</script>` -> renders as safe string text in selects, preventing script executions.
*   **T2.3.3 (Max Characters Calendar Title)**: Title input exceeds 255 character limit -> form validation error displays or truncates characters.
*   **T2.3.4 (Emoji Support Calendar Title)**: Create calendar with emojis "📅 Team Time" -> renders correctly across web dropdowns and mobile logs.
*   **T2.3.5 (No Calendar Selection Blocking)**: Calendar list empty -> creation forms block scheduling events/categories/tasks and disable controls.

#### Feature 4: Category Customization & Filtering
*   **T2.4.1 (Corrupt Hex Color Input)**: Input hex string as `invalid-color` -> category fallback default color `#1F9D8A` applies.
*   **T2.4.2 (Short Hex Color Input)**: Input short hex code `#FFF` -> compiles correctly to RGB color styles in grid render.
*   **T2.4.3 (Special characters Category Name)**: Create category named "Research & Development / Project-X" -> displays without breaking container box boundaries.
*   **T2.4.4 (Duplicate Category Name Calendar)**: Add category with same name under same calendar ID -> server validation fails -> displays error indicator in form.
*   **T2.4.5 (Extreme Length Category Name)**: Long category name "Continuous Deep Focus Learning Blocks - Technical" -> container applies text-overflow ellipses.

#### Feature 5: Calendar Grid Rendering & Event Display (Month/Week)
*   **T2.5.1 (End Date Before Start Date)**: Schedule event ending before start time -> API validation rejects -> form shows warning -> UI grid does not render negative sizes.
*   **T2.5.2 (Midnight Boundary Spanning)**: Schedule event from 23:00 to 02:00 next day -> renders on start day and spanning visual layout blocks.
*   **T2.5.3 (Uncategorized Event Display)**: Event category is null -> event pill is displayed using the fallback theme color `#1F9D8A`.
*   **T2.5.4 (Leap Year Rendering)**: Render month grid for February 2028 (Leap Year) -> verifies cell array shows 29 days correctly.
*   **T2.5.5 (Timezone Switch Shifts)**: Event starts at 2026-07-04T01:00:00Z -> Local timezone UTC+9 renders the event cell on July 4th at 10:00 AM.

#### Feature 6: Task Lifecycle, Sorting, & Completion Toggling
*   **T2.6.1 (Drag Order tie-breakers)**: Multiple tasks contain duplicate target date and order number -> system falls back to sorting by `id` ASC.
*   **T2.6.2 (Past Target Date Limit)**: Task target date is set to "1999-12-31" -> renders correctly in chronological sequence at the top of lists.
*   **T2.6.3 (Future Target Date Limit)**: Task target date is set to "2099-12-31" -> renders in sequence at the bottom of lists.
*   **T2.6.4 (Toggle Mutate Fail Rollback)**: Click toggle task -> local state flips -> API returns 500 error -> store rolls back task state to original value.
*   **T2.6.5 (Task Title Length Overflow)**: Task title holds 1000 characters -> UI wraps text properly within row borders without horizontal clipping.

#### Feature 7: Task Rollover Shield Visuals & Logic
*   **T2.7.1 (Boundary Date Yesterday)**: Task is exactly 1 day overdue (e.g. yesterday relative to current date) -> shows rollover icon and label.
*   **T2.7.2 (Boundary Date Today)**: Task target date is exactly today -> does not show rollover icon.
*   **T2.7.3 (Boundary Date Tomorrow)**: Task target date is exactly tomorrow -> does not show rollover icon.
*   **T2.7.4 (Leap Year Rollover Transition)**: Date moves from Feb 28 to Feb 29 on leap year -> tasks on Feb 28 show rollover ready at midnight.
*   **T2.7.5 (Timezone Boundary Rollover)**: Time zones shift -> rollover states update matching the user's localized midnight transitions.

#### Feature 8: Schedule Congestion Warnings (Time-Rescuer)
*   **T2.8.1 (Exact Threshold Hours Congestion)**: Schedule total events to exactly 8.0 hours -> checks warning activation (boundary threshold test).
*   **T2.8.2 (Below Threshold Hours Safe)**: Schedule total events to 7.9 hours -> warning is inactive.
*   **T2.8.3 (Exact Threshold Overlaps Congestion)**: Schedule exactly 3 overlapping events concurrently -> checks warning activation (boundary threshold test).
*   **T2.8.4 (Below Threshold Overlaps Safe)**: Schedule exactly 2 overlapping events concurrently -> warning remains inactive.
*   **T2.8.5 (Multiple Warning Reasons Render)**: Warning detail reasons has 3+ entries -> warning text is formatted with clean margins in mobile list cards.

#### Feature 9: Cross-Platform Component & Screen Layout Adaptations
*   **T2.9.1 (Web Month Grid Narrow View)**: Resize browser to 400px wide -> Month cell content shrinks -> event titles hidden -> overflow badge updates cleanly.
*   **T2.9.2 (Mobile Layout Scaled Fonts)**: System default font size set to maximum -> text does not overlap header or crop task row check circles.
*   **T2.9.3 (Web Control Grid Layout Collapse)**: Narrow viewport shifts form layouts from inline inputs to singular stack displays.
*   **T2.9.4 (Web Sidebar Layout Shift)**: Resize viewport width below 768px -> Task Sidebar moves beneath the calendar grid.
*   **T2.9.5 (Keyboard Overlap inputs Mobile)**: Virtual keyboard pops up on mobile input focus -> Scroll view adjustments keep inputs in viewable region.

---

### Tier 3: Cross-Feature Combinations (9 Test Cases)
This tier tests integration scenarios where multiple modules interact.

*   **T3.1 (Session Eviction During Mutation)**: User is adding an event -> access token expires -> API responds 401 -> `apiClient` triggers catch -> store resets state -> UI switches screen showing `AuthPanel` form with session alert.
*   **T3.2 (Active Category Color Update propagation)**: Edit category hex color code -> category store updates -> Month Grid event pills and Mobile EventCard left borders instantly refresh matching the new color.
*   **T3.3 (Task Toggle Offline Recovery)**: Toggle task completion status offline -> state updates optimistically -> API fails -> store handles rollback -> indicator displays sync issue.
*   **T3.4 (Workspace Swapping Sidebar Filter)**: Switch active calendar from A to B -> triggers query filter -> task sidebar instantly shifts from A's task list to B's list, updating rollover badges.
*   **T3.5 (Schedule Mutation Triggers Congestion Alert)**: Create event that triggers density limits -> API responds with warning -> dashboard calendar query refreshes -> Web/Mobile views show warnings.
*   **T3.6 (Overdue Task Repeated Rollover Alert)**: Task target date rolls over 3+ times -> server updates priority metadata to HIGH and sets flag -> dashboard syncs -> sidebar highlights task in red priority badge.
*   **T3.7 (Category Deletion & Event Fallback)**: Delete category -> events linked to it are updated to `category: null` -> monthly grid updates -> event pills render using fallback gray color `#1F9D8A` and label "Uncategorized".
*   **T3.8 (Immediate Authenticated Hydration)**: Click login in `AuthPanel` -> tokens written -> hook changes from disabled to enabled -> queries fetch data -> calendar grid populate with user items.
*   **T3.9 (Concurrent Tasks & Events mutations)**: Create a task and toggle a separate task simultaneously -> both mutations execute in parallel -> snapshot updates -> UI resolves changes.

---

### Tier 4: Real-World Application Scenarios (5 Test Cases)
This tier executes comprehensive workflows that simulate real-world user behaviors on the application.

*   **T4.1 (New User Onboarding Workflow)**:
    1.  User enters credentials to register, then logs in.
    2.  Workspace reveals empty state with status "Synced".
    3.  User creates calendar "Personal Life".
    4.  User creates category "Rest" (hex `#22C55E`).
    5.  User schedules a 1-hour walk event categorized under "Rest".
    6.  Topbar status shows "Synced", Walk event displays on Month cell and Week rail using walk category color.
*   **T4.2 (Overloaded Day Density Warning Workflow)**:
    1.  Authenticated user schedules "Development Block" (09:00 - 14:00, 5 hours).
    2.  User schedules "Meeting Sprint" (14:00 - 18:00, 4 hours).
    3.  Total hours planned is 9 hours (>8 hours threshold).
    4.  User opens Mobile App layout -> Views Today's Planner.
    5.  Asserts that "Schedule congestion detected" warning banner appears under the event entries.
*   **T4.3 (Midnight Task Rollover Workflow)**:
    1.  User creates three tasks on July 3rd: Task A (uncompleted), Task B (uncompleted), Task C (completed).
    2.  System clock advances past midnight to July 4th.
    3.  User checks task sidebar list.
    4.  Asserts Task A and Task B display "rollover ready" labels and `↷` icons; Task C shows completed styling and no rollover icon.
    5.  User clicks checkbox on Task A -> status flips, and the `↷` icon disappears immediately.
    6.  User clicks bulk rollover (or API triggers auto rollover) for Task B -> target date moves to July 4th -> rollover badge clears.
*   **T4.4 (Shared Calendar Real-time Update)**:
    1.  User 1 (Web) and User 2 (Mobile) are logged in with credentials belonging to the same calendar workspace.
    2.  User 2 (Mobile) adds task "Prepare agenda".
    3.  User 1 (Web) list refetches -> agenda task appears in the Web task sidebar.
    4.  User 1 (Web) clicks check dot -> task is crossed out.
    5.  User 2 (Mobile) receives updated snapshot -> Mobile task row updates to completed styling in real-time.
*   **T4.5 (Token Eviction & Recovery Workflow)**:
    1.  Authenticated user is viewing the Web dashboard.
    2.  Simulate session termination by executing token eviction.
    3.  User attempts to add a new task.
    4.  API client catches 401 unauthorized -> clears tokens in Zustand store -> topbar shifts to "Sign in required".
    5.  UI hides calendar controls and displays the `AuthPanel` login form.
    6.  User inputs valid credentials -> logs back in -> dashboard controls reappear -> lists sync.

---

## 4. Proposed Vitest + JSDOM Testing Architecture

To run both web and mobile component E2E tests under a single environment without executing heavy visual browsers (like Playwright/Detox), we propose a **Vitest + JSDOM + react-native-web** simulated environment.

### Architectural Blueprint
```
                   +----------------------------------+
                   |          Vitest Runner           |
                   +-----------------+----------------+
                                     |
                                     v
                   +-----------------+----------------+
                   |          JSDOM Environment       |
                   +-----------------+----------------+
                                     |
              +----------------------+----------------------+
              |                                             |
              v                                             v
     [ @redeeming-time/web ]                       [ @redeeming-time/app ]
     Render via @testing-library/react             Render via @testing-library/react
     - Inspects HTML DOM Elements                  - Alias react-native -> react-native-web
                                                   - Compiles Views/Texts to standard DOM tags
              |                                             |
              +----------------------+----------------------+
                                     |
                                     v
                   +-----------------+----------------+
                   |      Zustand Store Mock resets   |
                   +-----------------+----------------+
                                     |
                                     v
                   +-----------------+----------------+
                   |     Mock Service Worker (MSW)    |
                   +-----------------+----------------+
                                     |
                                     v
                   +-----------------+----------------+
                   |        Mocked Backend API        |
                   +----------------------------------+
```

### Key Technical Strategies

1.  **React Native Web Compilation Aliasing**:
    We configure Vitest to resolve `react-native` imports to `react-native-web`. React Native components (like `View`, `Text`, `TouchableOpacity`) compile directly into HTML tags (`div`, `span`, `button`), allowing JSDOM to inspect, query, and fire click events using standard testing libraries.
2.  **Zustand Store Isolation & Resets**:
    Zustand stores maintain global state in-memory. To avoid leakage between test cases, we store initial states during startup and reset the store state during setup/teardown phases.
3.  **React Query Sandbox Harness**:
    A custom provider wraps components, issuing a fresh `QueryClient` per test with caching and retries disabled. This isolates mutations and data fetching.
4.  **Network Interception via MSW**:
    Mock Service Worker (MSW) intercepts all outgoing requests to `http://localhost:8000/api`, returning stubbed responses for auth tokens, snapshot queries, and data additions.

---

## 5. Architectural Configuration Files & Test Examples

Below are the configurations and implementation examples.

### 5.1. Vitest Configuration (`vitest.config.ts`)
Place this configuration in the frontend monorepo root to configure JSDOM, aliases, and global setup files.

```typescript
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: [path.resolve(__dirname, './test.setup.ts')],
    alias: {
      // Alias the react-native package to react-native-web for JSDOM DOM compiling
      'react-native': 'react-native-web',
      // Resolve workspace aliases
      '@redeeming-time/shared': path.resolve(__dirname, './shared/src'),
    },
  },
});
```

### 5.2. Global Setup File (`test.setup.ts`)
This file configures MSW server listeners, mocks local storage, and resets Zustand stores after each test.

```typescript
import { beforeAll, afterEach, afterAll, vi } from 'vitest';
import { setupServer } from 'msw/node';
import { http, HttpResponse } from 'msw';
import { useAuthStore } from './shared/src/stores/authStore';
import { usePlannerStore } from './shared/src/stores/plannerStore';

// Mock LocalStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => { store[key] = value.toString(); },
    removeItem: (key: string) => { delete store[key]; },
    clear: () => { store = {}; }
  };
})();
Object.defineProperty(globalThis, 'localStorage', { value: localStorageMock });

// Save initial Zustand states
const initialAuthState = useAuthStore.getState();
const initialPlannerState = usePlannerStore.getState();

export const resetStores = () => {
  useAuthStore.setState(initialAuthState, true);
  usePlannerStore.setState(initialPlannerState, true);
  localStorageMock.clear();
};

// Define MSW request handlers
export const restHandlers = [
  // Authentication Mock
  http.post('http://localhost:8000/api/auth/token/', async () => {
    return HttpResponse.json({
      access: 'mock-access-token',
      refresh: 'mock-refresh-token'
    });
  }),
  
  // Snapshots Mock
  http.get('http://localhost:8000/api/calendars/', () => {
    return HttpResponse.json([
      { id: 1, title: 'Personal Space', description: 'Primary', theme_color: '#1F9D8A', created_at: '2026-07-04T00:00:00Z' }
    ]);
  }),
  http.get('http://localhost:8000/api/categories/', () => {
    return HttpResponse.json([
      { id: 10, calendar: 1, name: 'Deep Work', color_code: '#E11D48', created_at: '2026-07-04T00:00:00Z' }
    ]);
  }),
  http.get('http://localhost:8000/api/events/', () => {
    return HttpResponse.json([
      {
        id: 100,
        calendar: 1,
        category: 10,
        category_detail: { id: 10, calendar: 1, name: 'Deep Work', color_code: '#E11D48', created_at: '2026-07-04T00:00:00Z' },
        title: 'Overloaded Focus block',
        description: 'Testing event',
        start_time: '2026-07-04T09:00:00Z',
        end_time: '2026-07-04T18:00:00Z',
        is_all_day: false,
        rrule: '',
        congestion_warning: {
          is_congested: true,
          daily_hours: 9.0,
          overlap_count: 3,
          reasons: ['Daily total duration exceeds 8 hours.']
        },
        created_at: '2026-07-04T00:00:00Z',
        updated_at: '2026-07-04T00:00:00Z'
      }
    ]);
  }),
  http.get('http://localhost:8000/api/tasks/', () => {
    return HttpResponse.json([
      {
        id: 200,
        calendar: 1,
        creator: 1,
        title: 'Review overdue item',
        is_completed: false,
        target_date: '2026-07-03', // Yesterday relative to July 4th
        priority: 'HIGH',
        order: 0,
        created_at: '2026-07-03T00:00:00Z',
        updated_at: '2026-07-03T00:00:00Z'
      }
    ]);
  }),
  
  // Task Mutation Mock
  http.patch('http://localhost:8000/api/tasks/200/', async () => {
    return HttpResponse.json({
      id: 200,
      calendar: 1,
      creator: 1,
      title: 'Review overdue item',
      is_completed: true,
      target_date: '2026-07-03',
      priority: 'HIGH',
      order: 0,
      created_at: '2026-07-03T00:00:00Z',
      updated_at: '2026-07-04T00:00:00Z'
    });
  })
];

const server = setupServer(...restHandlers);

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => {
  server.resetHandlers();
  resetStores();
});
afterAll(() => server.close());
```

### 5.3. Query Client Wrapper Helper (`test.utils.tsx`)
Helper to inject a new `QueryClient` container instance to isolate cache values during tests.

```typescript
import React from 'react';
import { render as rtlRender } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

export function renderWithProviders(ui: React.ReactElement) {
  const testQueryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
        staleTime: 0,
      },
      mutations: {
        retry: false,
      },
    },
  });

  return {
    ...rtlRender(
      <QueryClientProvider client={testQueryClient}>
        {ui}
      </QueryClientProvider>
    ),
    queryClient: testQueryClient,
  };
}
```

### 5.4. Web Dashboard Test Code Example (`apps/web/src/App.test.tsx`)
Tests Web user log-in authentication, snapshot synchronization into Zustand, and database elements rendering.

```typescript
import { describe, test, expect } from 'vitest';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import App from './App';
import { renderWithProviders } from '../../../test.utils';
import { useAuthStore } from '@redeeming-time/shared';

describe('Web Application Dashboard Tests', () => {
  test('T1.1.2 - Successful authentication credentials syncs workspace and loads elements', async () => {
    renderWithProviders(<App />);

    // Assert initial state before logging in
    expect(screen.getByText('Sign in required')).toBeInTheDocument();
    expect(screen.queryByText('Create Real Data')).not.toBeInTheDocument();

    // Fill Auth Credentials in AuthPanel
    const emailInput = screen.getByPlaceholderText('Email');
    const passwordInput = screen.getByPlaceholderText('Password');
    const submitBtn = screen.getByRole('button', { name: 'Connect' });

    fireEvent.change(emailInput, { target: { value: 'demo@example.com' } });
    fireEvent.change(passwordInput, { target: { value: 'redeeming-demo-pass' } });
    fireEvent.click(submitBtn);

    // Wait for the query loading actions to resolve
    await waitFor(() => {
      expect(useAuthStore.getState().isAuthenticated()).toBe(true);
    });

    // Check UI panel transition and syncing indicators
    await waitFor(() => {
      expect(screen.getByText('Synced')).toBeInTheDocument();
      expect(screen.getByText('Create Real Data')).toBeInTheDocument();
    });

    // Verify fetched elements render correctly on the Web dashboard
    expect(screen.getByText('Personal Space')).toBeInTheDocument();
    expect(screen.getByText('Review overdue item')).toBeInTheDocument();
  });
});
```

### 5.5. Mobile Dashboard Test Code Example (`apps/app/App.test.tsx`)
Tests React Native components compiled to standard HTML elements inside JSDOM. Tests task completion, rollover indicator icon displays, and schedule congestion warning banners.

```typescript
import { describe, test, expect } from 'vitest';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import App from './App';
import { renderWithProviders } from '../../../test.utils';
import { useAuthStore } from '@redeeming-time/shared';

describe('Mobile App simulated DOM Tests', () => {
  test('T1.8.1 & T1.7.2 - Mobile renders congestion warning badge and overdue task rollover icon', async () => {
    // Authenticate the session in the store before rendering
    useAuthStore.getState().setTokens({
      access: 'mock-access-token',
      refresh: 'mock-refresh-token'
    });

    renderWithProviders(<App />);

    // Wait for API snapshot loading and render
    await waitFor(() => {
      expect(screen.getByText('Today’s Planner')).toBeInTheDocument();
    });

    // Assert Event Card loaded with Time-Rescuer Schedule Congestion Warning banner
    expect(screen.getByText('Overloaded Focus block')).toBeInTheDocument();
    expect(screen.getByText('Schedule congestion detected')).toBeInTheDocument();

    // Assert Task Row loaded with Rollover Shield indicator details
    const overdueTaskTitle = screen.getByText('Review overdue item');
    expect(overdueTaskTitle).toBeInTheDocument();

    // Verify task row displays rollover ready indicator details and rollover icon (↷)
    expect(screen.getByText(/HIGH · 2026-07-03 · rollover ready/i)).toBeInTheDocument();
    expect(screen.getByText('↷')).toBeInTheDocument();

    // Click on the Task row Touch button to toggle task completion (Simulated Event)
    const taskButton = overdueTaskTitle.closest('div[role="button"]') || overdueTaskTitle.closest('button') || overdueTaskTitle;
    fireEvent.click(taskButton!);

    // Expect task completion styling changes and rollover removal in real time
    await waitFor(() => {
      // Completed checkbox indicator is updated to ✓
      expect(screen.getByText('✓')).toBeInTheDocument();
      // Rollover badge and icon is cleared
      expect(screen.queryByText('↷')).not.toBeInTheDocument();
    });
  });
});
```

---

## 6. Development Verification Instructions

To verify that the testing setup runs successfully on the codebase, execute the following commands in the directory `redeeming-time-frontend/`:

1.  **Install dependencies**:
    Ensure Vitest, JSDOM, MSW, and React Native Web are installed:
    ```bash
    npm install -D vitest jsdom msw @testing-library/react @testing-library/jest-dom react-native-web
    ```
2.  **Run tests**:
    ```bash
    npx vitest run
    ```
3.  **Run tests in watch mode**:
    ```bash
    npx vitest
    ```
