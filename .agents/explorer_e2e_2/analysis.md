# E2E Testing Strategy Analysis for Redeeming Time

## Executive Summary
This document provides a comprehensive end-to-end (E2E) testing strategy for the **Redeeming Time** frontend repository. The frontend is organized as a monorepo consisting of:
- `apps/web`: A client-side React SPA with Vite, client-side routing, and a multi-column Bento Grid layout.
- `apps/app`: A React Native mobile app using Expo and NativeWind for layout styling.
- `shared`: A core package containing Zustand state stores (`authStore`, `plannerStore`), React Query custom hooks (`plannerHooks`), the REST API Client (`apiClient`), and shared TypeScript interfaces.

To ensure functional reliability, edge-case resilience, cross-feature compatibility, and realistic operational flow, we propose a **4-Tier Testing Strategy** comprising **104 test cases** spanning **N = 9 core features**. We also provide a **Vitest + JSDOM** testing architecture that integrates both Web and Mobile component tests in a simulated browser DOM, with Zustand store state isolation and React Query environment controls.

---

## 1. Frontend Repository Analysis & Testing Boundaries

### Web Dashboard (`apps/web`)
The web dashboard is the primary administrative client. It features a topbar displaying status and sync state, a setup grid containing the `AuthPanel` (managing registration, login, and token session states) and `CalendarControls` (creating calendars, categories, events, and tasks), and a main display grid consisting of the `WeekRail` (weekly snapshot), `MonthGrid` (monthly calendar grid showing up to 3 events per day with an overflow counter), and the `TaskSidebar` checklist.
- **Testing focus:** Interactive element flows, router-driven route changes, authentication redirection, responsive grid breakpoints, styling shifts, and forms validation.

### Mobile App (`apps/app`)
The mobile application is designed as a daily view interface. It includes a single-scroll view `PlannerScreen` showing a header with sync state, a chronological scrollable list of up to 8 events in an `EventCard` view, and a `TaskContinuity` checklist composed of interactive `TaskRow` components. It utilizes NativeWind (Tailwind CSS utility wrapper for React Native components).
- **Testing focus:** Gesture simulation (taps), viewport scrolling, NativeWind color-code rendering, and layout scaling on mobile displays.

### Shared State & Client Services (`shared/`)
Shared acts as the single source of truth:
- `authStore`: Zustand store managing accessToken, refreshToken, login, logout, and headers injection (`Bearer <token>` for normal users, `Agent <token>` for AI sub-agents).
- `plannerStore`: Zustand store managing the active calendar, calendars list, categories list, events list, and tasks checklist.
- `apiClient`: Fetch wrapper communicating with the Django REST Framework (DRF) backend.
- `plannerHooks`: React Query custom hooks for data fetching, cache synchronization, and mutations with optimistic updates (e.g., `useToggleTask`).
- **Testing focus:** Mocking HTTP fetch calls at the network boundary, ensuring state mutations propagate correctly, and ensuring queries are properly invalidated and re-synchronized.

---

## 2. N = 9 Core Features to Cover

1. **User Authentication & Session Handling**: Email/password registration, login, token synchronization/persistence in storage, session logout, and authorization header management.
2. **Client-side Protected Routing & Redirects**: Protecting `/dashboard` and other paths under `/`, redirecting unauthenticated traffic to `/login`, preserving query path history, and handling authorization expiry redirects.
3. **Calendar Operations & Active Switching**: Creating new calendars, active calendar selection/switching, listing user-owned/shared calendars, and dynamically rendering components based on the active calendar ID.
4. **Category & Theme Customization**: Creating category badges, assigning Hex colors, scoping categories per calendar, and dynamically coloring scheduled events.
5. **Event Scheduling & RRULE Support**: Creating single events, categories association, rendering events on the MonthGrid (first 3 events + indicator) and WeekRail, and expanding recurring events via RRULE strings.
6. **Time-Rescuer Congestion Alerts**: Triggering the schedule congestion warning (`on_schedule_congested`) when daily schedule duration exceeds 8 hours or 3+ events overlap, showing glow warnings, and clearing states when congestion is resolved.
7. **Task Checklist & Status Toggle**: Creating tasks with target dates, priority levels (HIGH/MEDIUM/LOW/NONE), sorting tasks by date and order, and toggling completion via PATCH requests.
8. **Rollover Shield & Continuity**: Identifying overdue, uncompleted tasks (`target_date < today`), rendering a glassmorphic Rollover Shield overlay, and executing bulk rollover mutations to push target dates to today.
9. **Responsive Layout & Mobile Adaptation**: Rendering the Bento Grid layout on web viewports, scaling controls, rendering Expo Mobile widgets using NativeWind styling, and handling touch triggers.

---

## 3. The 4-Tier Test Suite (104 Test Cases)

### Tier 1: Feature Coverage (45 Test Cases)
*Happy-path functional verification of each feature in isolation.*

#### F1: User Authentication & Session Handling
- **TC-F1-01**: Submit valid login credentials -> verifies auth token is saved in `localStorage`, `accessToken` is set in Zustand, and UI transitions to authenticated view.
- **TC-F1-02**: Submit registration form with unique email and nickname -> verifies API registration is called, followed by immediate token request and authentication setup.
- **TC-F1-03**: Click "Sign out" button -> verifies tokens are removed from `localStorage` and Zustand, returning the UI to the login screen.
- **TC-F1-04**: Execute a query mutation (e.g., creating calendar) -> inspects request headers and verifies `Authorization: Bearer <token>` is present.
- **TC-F1-05**: Execute query as an AI sub-agent with agent token -> inspects request headers and verifies `Authorization: Agent <token>` is present.

#### F2: Client-side Protected Routing & Redirects
- **TC-F2-01**: Navigate directly to `/dashboard` as an unauthenticated user -> verifies routing redirects user immediately to `/login`.
- **TC-F2-02**: Navigate directly to `/login` as an authenticated user -> verifies routing redirects user immediately to `/dashboard`.
- **TC-F2-03**: Navigate directly to `/dashboard/settings` as an unauthenticated user -> verifies routing redirects to `/login?redirect=%2Fdashboard%2Fsettings`.
- **TC-F2-04**: Complete login flow after route redirection -> verifies routing redirects user to the originally requested destination `/dashboard/settings`.
- **TC-F2-05**: Trigger an API 401 response from any endpoint -> verifies client handles token expiry, clears authentication state, and redirects to `/login`.

#### F3: Calendar Operations & Active Switching
- **TC-F3-01**: Input title "Work Calendar" and submit setup form -> verifies calendar creation API is called and a new option is added to the active calendar dropdown.
- **TC-F3-02**: Select a calendar from the dropdown list -> verifies `activeCalendarId` in `usePlannerStore` changes to the selected ID.
- **TC-F3-03**: Render Setup component -> verifies dropdown lists only calendars returned in the current snapshot payload.
- **TC-F3-04**: Initialize user with no calendars -> verifies active calendar selector displays "No calendar" and controls for adding events/tasks are disabled.
- **TC-F3-05**: Switch calendar selection from Calendar A to Calendar B -> verifies the MonthGrid and WeekRail instantly update to show only Calendar B's events.

#### F4: Category & Theme Customization
- **TC-F4-01**: Create category "Deep Work" with color `#1F9D8A` -> verifies category creation API request, refreshing list.
- **TC-F4-02**: Render an event with "Deep Work" category -> verifies the event badge border and background display `#1F9D8A` and `#1F9D8A18` respectively.
- **TC-F4-03**: Switch active calendars -> verifies the category selection dropdown updates to show only the categories associated with the active calendar.
- **TC-F4-04**: Schedule an event without specifying a category -> verifies the UI applies default system layout colors.
- **TC-F4-05**: Modify a category color in category settings -> verifies all event badges of that category immediately update their theme colors on the calendar.

#### F5: Event Scheduling & RRULE Support
- **TC-F5-01**: Create event with title "Meeting" and valid start/end times -> verifies event is created via API and displays on MonthGrid.
- **TC-F5-02**: Render MonthGrid for current month -> verifies event displays on the cell matching its `start_time` date.
- **TC-F5-03**: Render WeekRail for current week -> verifies event title and category-colored tag display on the corresponding day column.
- **TC-F5-04**: Schedule 4 events on the same calendar day -> verifies the day cell in MonthGrid renders exactly the first 3 events, plus a "+1 more" counter.
- **TC-F5-05**: Create an event with RRULE "FREQ=WEEKLY;BYDAY=MO" starting on a Monday -> verifies the event renders on every Monday of the visible calendar month.

#### F6: Time-Rescuer Congestion Alerts
- **TC-F6-01**: Schedule events totaling 9 hours on a single day -> verifies `on_schedule_congested` warning triggers and shows "Schedule congestion detected" alert.
- **TC-F6-02**: Schedule 3 overlapping events on a single afternoon -> verifies congestion warnings list the overlap details.
- **TC-F6-03**: Render a day with congestion warnings -> verifies the cell has an ambient neon glow warning element.
- **TC-F6-04**: Shorten or delete overlapping events -> verifies that once daily hours fall <=8 and overlaps <3, the glow and warning alerts disappear.
- **TC-F6-05**: Create overlapping events in Calendar A -> verifies that switching to Calendar B (with no overlaps) hides the warning alert.

#### F7: Task Checklist & Status Toggle
- **TC-F7-01**: Create task "Write Report" with MEDIUM priority -> verifies task is created via API and appears in the `TaskSidebar` list.
- **TC-F7-02**: Click the checkbox for "Write Report" -> verifies `useToggleTask` is triggered, immediately updating the checkmark in the UI.
- **TC-F7-03**: Render Task list with mixed tasks -> verifies list displays tasks in ascending order of `target_date`, and by `order` secondary sorting.
- **TC-F7-04**: Create a task with HIGH priority -> verifies the task card shows a red priority badge indicator.
- **TC-F7-05**: Toggle task to completed -> verifies the task text gets strikethrough styling applied.

#### F8: Rollover Shield & Continuity
- **TC-F8-01**: Render task list with an uncompleted task whose `target_date` is in the past -> verifies task is flagged as rollover candidate.
- **TC-F8-02**: Render an overdue task -> verifies it displays a `↷` icon and a "rollover ready" helper tag.
- **TC-F8-03**: Initialize dashboard with overdue tasks -> verifies a translucent glassmorphic Rollover Shield overlay covers the task panel.
- **TC-F8-04**: Click "Rollover All" inside the Rollover Shield -> verifies it triggers bulk rollover API request with overdue task IDs and today's date.
- **TC-F8-05**: Complete rollover successfully -> verifies the Rollover Shield disappears, task target dates update to today, and task items display under today's list.

#### F9: Responsive & Mobile Layout (NativeWind)
- **TC-F9-01**: Render dashboard in wide viewport (>=1024px) -> verifies the page renders in a multi-column Bento Grid structure.
- **TC-F9-02**: Render dashboard in mobile viewport (<=480px) -> verifies grid collapses to a single-column block layout.
- **TC-F9-03**: Load Mobile App `PlannerScreen` with 10 events -> verifies the event list scroll view renders exactly the first 8 events chronologically.
- **TC-F9-04**: Click task checkbox in mobile layout -> verifies task completion mutation is fired and state changes.
- **TC-F9-05**: Render Mobile App with no events or tasks -> verifies placeholders "No events returned" and "No tasks returned" are displayed.

---

### Tier 2: Boundary & Corner Cases (45 Test Cases)
*Error validation, invalid inputs, edge dates, boundary values, empty states, and offline behavior.*

#### F1: User Authentication & Session Handling
- **TC-F2-06**: Input invalid email format "user@com" during login/signup -> verifies HTML5 email validation blocks form submission.
- **TC-F2-07**: Submit login with wrong password -> verifies API returns 400/401 and page displays "Authentication failed." message.
- **TC-F2-08**: Inject corrupt/malformed JSON string into `localStorage` token key -> verifies `useAuthStore` parses safely, clears store, and sets tokens to null.
- **TC-F2-09**: Double-click "Connect" button in AuthPanel -> verifies only one API call is made and button is temporarily disabled.
- **TC-F2-10**: Expose token storage to expired refresh token API call -> verifies client intercepts the failed refresh, performs logout, and shows "Session expired" message.

#### F2: Client-side Protected Routing & Redirects
- **TC-F2-11**: Navigate to an undefined route (e.g., `/non-existent`) -> verifies routing handles the fallback and renders custom 404 page.
- **TC-F2-12**: Attempt login while offline -> verifies client displays "Network error" instead of looping redirects.
- **TC-F2-13**: Paste token session directly into route containing non-existent path -> verifies route handler sanitizes active state.
- **TC-F2-14**: Pass an external URL into redirect param `?redirect=https://malicious.site` -> verifies post-login redirect falls back to `/dashboard` to prevent open-redirect vulnerabilities.
- **TC-F2-15**: Rapid navigation to `/dashboard` before token check completes -> verifies page displays loading spinner state before rendering dashboard.

#### F3: Calendar Operations & Active Switching
- **TC-F3-06**: Attempt calendar creation with an empty title -> verifies HTML5 input validation prevents form submission.
- **TC-F3-07**: Add calendar when maximum count (e.g., 10) is reached -> verifies API returns limit validation and UI displays a friendly limit error message.
- **TC-F3-08**: Delete a calendar from user session and select it via URL -> verifies page defaults selection to the first available calendar.
- **TC-F3-09**: Enter title containing HTML `<script>alert('x')</script>` or complex emoji strings -> verifies calendar title displays safely as plain text or formatted emojis without script execution.
- **TC-F3-10**: Rapidly click between different calendars in the list -> verifies React Query cancels previous calendar data requests to prevent race conditions.

#### F4: Category & Theme Customization
- **TC-F4-06**: Create a category with a duplicate name in the same calendar -> verifies API validation error is caught and shown as a duplicate name alert.
- **TC-F4-07**: Input invalid color Hex values (e.g. `#1F9D8`, `#xyz`) -> verifies frontend input validation or picker defaults values to standard theme color.
- **TC-F4-08**: Create a category when maximum category count (e.g., 20) is reached -> verifies alert notification blocks adding categories.
- **TC-F4-09**: Delete a category that is currently assigned to 5 events -> verifies API updates all 5 events to category `null` and UI displays them with default theme styling without error.
- **TC-F4-10**: Create a category color using light Hex colors (e.g., `#FFFFFF`) -> verifies text on badge is still readable (contrast ratio check or dark font style override).

#### F5: Event Scheduling & RRULE Support
- **TC-F5-06**: Create event where `end_time` is before `start_time` -> verifies validation error is displayed and form submission is blocked.
- **TC-F5-07**: Create event spanning 3 days (e.g., Monday 09:00 to Wednesday 17:00) -> verifies event displays on all 3 day cells in MonthGrid.
- **TC-F5-08**: Create recurring event on a leap day (Feb 29) -> verifies recurrence runs correctly on leap years and rolls over to March 1/Feb 28 safely in non-leap years.
- **TC-F5-09**: Load calendar with corrupt RRULE string (e.g. `FREQ=INVALID;`) -> verifies parser catches exception, logging error, and rendering the event as a single non-recurring block.
- **TC-F5-10**: Enter description exceeding 1000 characters -> verifies description is truncated with an ellipsis on event detail preview without breaking grid layout.

#### F6: Time-Rescuer Congestion Alerts
- **TC-F6-06**: Schedule events totaling exactly 8.0 hours in a single day -> verifies congestion warning does NOT trigger (must be > 8 hours).
- **TC-F6-07**: Schedule overlapping events on Calendar A and Calendar B -> verifies no congestion warning is triggered, as events are scoped separately.
- **TC-F6-08**: Schedule events that overlap due to timezone changes (e.g. crossing DST boundary or switching timezones) -> verifies client re-evaluates schedules using local coordinates and displays warnings if overlap exists.
- **TC-F6-09**: Schedule two overlapping all-day events -> verifies all-day events do not trigger hourly congestion alerts, but increment overlaps index if categorized.
- **TC-F6-10**: Add 50 overlapping events to a single day -> verifies page lists overlaps count and reasons without memory lag.

#### F7: Task Checklist & Status Toggle
- **TC-F7-06**: Create a task with an empty title -> verifies form validation prevents task creation.
- **TC-F7-07**: Drag a task past its boundary (order index out of range) -> verifies order swaps fail-safe to maximum index + 1.
- **TC-F7-08**: Click task checkbox while internet is disconnected -> verifies the checklist optimistic toggle rolls back, returning checkbox to unchecked state and showing a connection warning.
- **TC-F7-09**: Input a task title with 500 characters -> verifies task title wraps inside its container instead of breaking sidebar layout.
- **TC-F7-10**: Complete a task that has a past `target_date` -> verifies the task checklist hides it from overdue lists, removing rollover status.

#### F8: Rollover Shield & Continuity
- **TC-F8-06**: A task is due today -> verifies task is NOT flagged as overdue and does not appear on the rollover list.
- **TC-F8-07**: Click rollover submit button and API returns 500 server error -> verifies tasks rollback to overdue, Rollover Shield remains open, and an alert is shown.
- **TC-F8-08**: Load 50 overdue tasks -> verifies Rollover Shield renders tasks in a scrollable list.
- **TC-F8-09**: View rollover list -> verifies tasks show their sequential rollover count and priority tags.
- **TC-F8-10**: Complete an overdue task on another device -> verifies query cache update removes the task from the Rollover Shield list.

#### F9: Responsive & Mobile Layout (NativeWind)
- **TC-F9-06**: Rotate mobile device from portrait to landscape -> verifies event list adapts spacing and typography handles wider layout.
- **TC-F9-07**: Render Mobile App screens with empty event/task lists -> verifies user sees friendly empty state instructions instead of a blank white screen.
- **TC-F9-08**: Rapidly scroll list of 200 tasks in mobile ScrollView -> verifies list rendering remains smooth without lag.
- **TC-F9-09**: Measure clickable area for checkboxes in mobile lists -> verifies touch target dimensions are at least 44x44px.
- **TC-F9-10**: Toggle dark mode state -> verifies NativeWind styles map dynamically and colors shift cleanly.

---

### Tier 3: Cross-Feature Combinations (9 Test Cases)
*Interactions across different features.*

- **TC-C3-01: Calendar Switch & Category Filtering**: Create Category A in Calendar 1. Switch active calendar to Calendar 2. Verify Category A is hidden. Switch back to Calendar 1, add an event, and verify Category A is successfully linked and rendered.
- **TC-C3-02: Task Priority & Rollover Shield Escalation**: A high priority task goes overdue. The Rollover Shield triggers. Upon rollover, the priority is adjusted (e.g. warning tag injected or escalated) based on consecutive rollovers.
- **TC-C3-03: Event Scheduling, Category Color, and Layout Sync**: Modify Category A color code. Verify that event badges on MonthGrid and WeekRail instantly update their colors to match.
- **TC-C3-04: Schedule Congestion Detection & Time Zone Change**: A user with overlapping events changes their client timezone in settings. The events shift timezone, which resolves the hourly overlap. Verify that the congestion warning badge and glow effect disappear.
- **TC-C3-05: Authentication Timeout & Mutation Rollback**: Expire the session token during task creation. Submit the task. Verify the request fails (401), the UI rolls back to previous state, and user is redirected to `/login`.
- **TC-C3-06: Event Recurrence Expansion & Congestion**: Create a recurring event that expands weekly. Verify that on days where it overlaps with other events, congestion warnings trigger, while non-overlapping days remain clear.
- **TC-C3-07: Mobile Task Toggle & Web State Synchronization**: Toggle a task completion checkbox inside the Mobile App container. Verify that the change propagates to the shared cache and updates the Web Dashboard checkbox dynamically.
- **TC-C3-08: Category Deletion and Event Layout Cleanup**: Delete a category that is currently linked to scheduled events. Verify the category is deleted, and its events' theme colors fall back to the default calendar theme color.
- **TC-C3-09: Calendar Sharing Role Permissions**: Log in as a user with VIEWER access to a shared calendar. Verify that calendar controls (add event, task, category) are disabled, and trying to post mutations directly via developer console yields a client error (403).

---

### Tier 4: Real-World Application Scenarios (5 Test Cases)
*End-to-end integration flows mapping actual user pathways.*

- **TC-S4-01: Comprehensive User Onboarding Flow**:
  1. User registers a new account and logs in.
  2. Creates two calendars: "Work Tasks" and "Personal Habits".
  3. Creates category "Deep Focus" under "Work Tasks" and "Fitness" under "Personal Habits".
  4. Schedules a "Development Block" event under "Work Tasks".
  5. Adds 2 work tasks: "Setup API routing" (HIGH priority) and "Write test suite" (MEDIUM priority).
  6. Verify all items render on the Web Dashboard and mobile display, then sign out.
- **TC-S4-02: Rescheduling a Congested Day**:
  1. User has 4 meetings scheduled on Monday, totaling 9.5 hours (congested state, glow warning is visible).
  2. User opens the event editor, updates the end time of Meeting 1 to shorten it, and reschedules Meeting 4 to Tuesday.
  3. Verify the congestion warning badge and glow effect vanish from Monday and Tuesday remains clear of warnings.
- **TC-S4-03: Overdue Task Continuity & Morning Review**:
  1. User opens the application in the morning.
  2. System detects 3 incomplete tasks from yesterday, displaying the glassmorphic Rollover Shield overlay.
  3. User selects 2 tasks to roll over, deletes the 3rd task, and clicks "Rollover".
  4. Verify the shield disappears, the 2 selected tasks update their target date to today and display on today's list, and the 3rd task is deleted.
- **TC-S4-04: Habit Routine Tracking & Failure Recovery**:
  1. Time-Rescuer is configured with a recurring "Morning Meditation" habit routine event.
  2. User deletes today's instance of "Morning Meditation", which triggers the `on_routine_broken` event.
  3. System renders a notification banner advising the user of the broken streak and offering a "Reschedule for evening" action.
  4. User clicks "Reschedule". Verify a new event is scheduled for the evening slot.
- **TC-S4-05: Offline Mode and Re-sync Flow**:
  1. User opens the mobile application. Network connection drops (offline status).
  2. App displays an "Offline - changes will sync later" header.
  3. User checks off 2 tasks and creates a new task "Review docs".
  4. Verify changes are updated in the local Zustand cache.
  5. Network connection is restored.
  6. Verify app transitions back to "Synced" state, automatically pushes the cached changes to the DRF API, and updates the shared backend data store.

---

## 4. Vitest + JSDOM Testing Architecture Proposal

We propose a unified testing architecture leveraging **Vitest** (test runner) and **JSDOM** (browser DOM simulator) to run unit and integration tests across both the Web SPA and the Expo React Native app.

### 4.1 React Native & NativeWind Simulation in JSDOM
React Native applications typically require mobile-specific test environments. However, by leveraging **React Native for Web**, we can alias mobile elements to standard HTML elements inside JSDOM. NativeWind classes translate directly to Tailwind CSS class strings on these elements, enabling direct DOM testing.

We configure the Vitest setup to resolve alias paths for `react-native` to `react-native-web`. Thus:
- `<View>` renders as `<div>`
- `<Text>` renders as `<span>`
- `<TouchableOpacity>` renders as `<button>`

### 4.2 State Management Isolation (Zustand)
Zustand stores are singletons and can persist dirty state across tests. We isolate tests by capturing the stores' initial state at import time and resetting them during `beforeEach`:

```typescript
// shared/src/test/utils.tsx
import { act } from '@testing-library/react';
import { useAuthStore } from '../stores/authStore';
import { usePlannerStore } from '../stores/plannerStore';

const initialAuthState = useAuthStore.getState();
const initialPlannerState = usePlannerStore.getState();

export function resetStores() {
  act(() => {
    useAuthStore.setState(initialAuthState, true);
    usePlannerStore.setState(initialPlannerState, true);
  });
}
```

### 4.3 QueryClient & Cache Isolation
To prevent React Query caches from leaking between tests, we instantiate a fresh `QueryClient` for every test run and wrap the components under test in a custom provider:

```typescript
// shared/src/test/utils.tsx
import React from 'react';
import { render as rtlRender } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

export function renderWithProviders(ui: React.ReactElement) {
  const testQueryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        staleTime: 0,
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

### 4.4 Network Mocking with Mock Service Worker (MSW)
Instead of mocking the `apiClient` functions directly, we intercept all fetch requests at the network boundary using **MSW**. This tests the actual query integration, URL formatting, and headers injection (like `Authorization`).

```typescript
// shared/src/test/mswHandlers.ts
import { http, HttpResponse } from 'msw';
import { API_BASE_URL } from '../api/client';

export const handlers = [
  http.post(`${API_BASE_URL}/auth/token/`, async ({ request }) => {
    const { email } = (await request.json()) as { email: string };
    if (email === 'demo@example.com') {
      return HttpResponse.json({ access: 'mock-access-token', refresh: 'mock-refresh-token' });
    }
    return new HttpResponse(JSON.stringify({ detail: 'No active account found with the given credentials' }), { status: 401 });
  }),

  http.get(`${API_BASE_URL}/calendars/`, () => {
    return HttpResponse.json([
      { id: 1, title: 'Personal Planner', description: 'Primary planning space', theme_color: '#1F9D8A', created_at: '2026-07-04T12:00:00Z' }
    ]);
  }),

  http.get(`${API_BASE_URL}/categories/`, () => {
    return HttpResponse.json([
      { id: 1, calendar: 1, name: 'Deep Work', color_code: '#1F9D8A', created_at: '2026-07-04T12:00:00Z' }
    ]);
  }),

  http.get(`${API_BASE_URL}/events/`, () => {
    return HttpResponse.json([]);
  }),

  http.get(`${API_BASE_URL}/tasks/`, () => {
    return HttpResponse.json([]);
  }),
];
```

---

## 5. Implementation Files and Configs Blueprint

### 5.1 Web Vite Config (`apps/web/vite.config.ts` Update)
This adds test environment setup and aliasing for React Native, allowing the web test suite to double as the mobile test suite runtime.

```typescript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
  },
  resolve: {
    alias: {
      'react-native': 'react-native-web',
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: '../../shared/src/test/setup.ts',
  },
});
```

### 5.2 Global Setup File (`shared/src/test/setup.ts`)
This setup file configures MSW, mocks global browser APIs (like `localStorage`), and mocks mobile components using JSDOM overrides.

```typescript
import '@testing-library/jest-dom';
import { beforeAll, beforeEach, afterEach, afterAll, vi } from 'vitest';
import { setupServer } from 'msw/node';
import { handlers } from './mswHandlers';
import { resetStores } from './utils';

// Setup MSW Server
const server = setupServer(...handlers);
beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

// Reset Zustand Stores
beforeEach(() => {
  resetStores();
});

// Mock LocalStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => { store[key] = String(value); },
    removeItem: (key: string) => { delete store[key]; },
    clear: () => { store = {}; }
  };
})();
Object.defineProperty(globalThis, 'localStorage', { value: localStorageMock });

// React Native mock components mapping to HTML
vi.mock('react-native', () => {
  const React = require('react');
  
  const View = ({ children, style, ...props }: any) => 
    React.createElement('div', { ...props, style }, children);
    
  const Text = ({ children, style, ...props }: any) => 
    React.createElement('span', { ...props, style }, children);
    
  const TouchableOpacity = ({ children, onPress, style, ...props }: any) => 
    React.createElement('button', { ...props, onClick: onPress, style }, children);
    
  const ScrollView = ({ children, style, ...props }: any) => 
    React.createElement('div', { ...props, style: { overflowY: 'auto', ...style } }, children);
    
  const SafeAreaView = ({ children, style, ...props }: any) => 
    React.createElement('div', { ...props, style }, children);

  return {
    View,
    Text,
    TouchableOpacity,
    ScrollView,
    SafeAreaView,
  };
});
```

---

## 6. Verification & Run Protocols

### Running the Test Suite
Tests can be executed via terminal commands targeting individual workspaces:
- Web component & Web E2E tests:
  ```bash
  npm --workspace @redeeming-time/web run test
  ```
- Mobile component & Mobile E2E tests (aliased in JSDOM):
  ```bash
  npm --workspace @redeeming-time/app run test
  ```

This test configuration allows the development team to test the entire client codebase (both web and mobile applications) rapidly inside JSDOM, guaranteeing high coverage with minimal infrastructure overhead.
