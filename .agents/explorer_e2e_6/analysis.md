# E2E Integration Test Audit Fix Plan: Rewrite Strategy for Self-Certifying Tests

**Explorer**: Explorer 6 (Archetype: `explorer`)  
**Target Folder**: `.agents/explorer_e2e_6`  
**Date**: 2026-07-04T17:58:30+09:00

---

## 1. Executive Summary

A detailed forensic analysis has been conducted on the 8 self-certifying/dummy test cases flagged in the `forensic_auditor` report. These tests currently bypass the application codebase, Zustand store state, and DOM rendering by asserting on local dummy variables inside their test blocks. 

This document provides a concrete rewrite strategy to turn these tests into authentic, high-fidelity integration tests that leverage:
- **Zustand stores** (`usePlannerStore`, `useAuthStore`) for real state manipulation.
- **MSW (Mock Service Worker)** for network mocks and request verification.
- **Vitest Fake Timers** (`vi.useFakeTimers`, `vi.setSystemTime`) for time boundary testing (midnight transitions, leap years, year-end wraps).
- **React Testing Library** (`renderWithProviders`, `screen`, `waitFor`) to assert on true DOM outputs.

---

## 2. Test-by-Test Rewrite Strategy

### 1. `TC-T2-F7-01: Empty Title Task Rejection`
* **Target File**: `redeeming-time-frontend/apps/app/App.test.tsx`
* **Current Defect**: Creates a local object `emptyPayload` and asserts `expect(emptyPayload.title).toBe('')`, completely bypassing validation logic.
* **Proposed Rewrite Solution**:
  Test the `apiClient.createTask` endpoint and verify the API error response parser is working. Use MSW to mock a `400 Bad Request` validation response from the server when an empty title is sent.
* **Proposed Code**:
  ```typescript
  test('TC-T2-F7-01: Empty Title Task Rejection', async () => {
    // Override MSW handler to return 400 for empty task titles
    server.use(
      http.post('http://localhost:8000/api/tasks/', async ({ request }) => {
        const body = (await request.json()) as any;
        if (!body.title) {
          return new HttpResponse(
            JSON.stringify({ detail: 'Title cannot be empty.' }),
            { status: 400 }
          );
        }
        return new HttpResponse(null, { status: 201 });
      })
    );

    const emptyPayload = {
      calendar: 1,
      title: '',
      target_date: '2026-07-04',
      priority: 'MEDIUM' as const,
      order: 0,
    };

    // Assert that the client API wrapper correctly throws the validation error
    await expect(apiClient.createTask(emptyPayload)).rejects.toThrow(
      'Title cannot be empty.'
    );
  });
  ```

### 2. `TC-T2-F8-02: Midnight Boundary Transition`
* **Target File**: `redeeming-time-frontend/apps/app/App.test.tsx`
* **Current Defect**: Performs a simple local comparison (`task.target_date < todayString`) with local variables.
* **Proposed Rewrite Solution**:
  Render the mobile `<PlannerScreen />` component using `renderWithProviders`. Control the system clock using Vitest's fake timers. Advance the clock past midnight, rerender the screen, and assert that the task dynamically gains the `"rollover ready"` class and the rollover visual cue (`↷`).
* **Proposed Code**:
  ```typescript
  test('TC-T2-F8-02: Midnight Boundary Transition', async () => {
    vi.useFakeTimers();
    // Set system time to just before midnight on July 4th
    vi.setSystemTime(new Date('2026-07-04T23:59:50Z'));

    mockDb.tasks = [
      {
        id: 200,
        calendar: 1,
        creator: 1,
        title: 'Midnight Task',
        is_completed: false,
        target_date: '2026-07-04',
        priority: 'MEDIUM',
        order: 0,
        created_at: '',
        updated_at: ''
      }
    ];

    const { rerender } = renderWithProviders(<PlannerScreen />);

    // Verify task is NOT overdue before midnight
    await waitFor(() => {
      expect(screen.queryByText(/rollover ready/i)).toBeNull();
    });

    // Advance clock past midnight into July 5th
    vi.setSystemTime(new Date('2026-07-05T00:00:10Z'));

    // Rerender screen to trigger date evaluation on the updated clock
    rerender(<PlannerScreen />);

    // Verify task is now recognized as overdue
    await waitFor(() => {
      expect(screen.getByText(/rollover ready/i)).toBeInTheDocument();
      expect(screen.getByText('↷')).toBeInTheDocument();
    });

    vi.useRealTimers();
  });
  ```

### 3. `TC-T2-F8-05: Client Timezone Mid-flight Shift`
* **Target File**: `redeeming-time-frontend/apps/app/App.test.tsx`
* **Current Defect**: Asserts only that `toLocaleDateString()` is defined on a local date, bypassing timezone display behavior.
* **Proposed Rewrite Solution**:
  Use `vi.spyOn` on `Date.prototype.toLocaleDateString` to simulate how local formatting behaves. Populate the mock database with an event, render `<PlannerScreen />`, mock the formatted string for two different timezone formats (e.g. UTC-10 vs UTC+9), and assert that the formatted label for the event card matches the simulated local time string and updates the DOM, testing the actual timezone-dependent formatting of `dateLabel` inside the component.
* **Proposed Code**:
  ```typescript
  test('TC-T2-F8-05: Client Timezone Mid-flight Shift', async () => {
    const localDateSpy = vi.spyOn(Date.prototype, 'toLocaleDateString');
    
    mockDb.events = [
      {
        id: 100,
        calendar: 1,
        category: 10,
        category_detail: { id: 10, calendar: 1, name: 'Deep Work', color_code: '#E11D48', created_at: '' },
        title: 'Shift Event',
        description: '',
        start_time: '2026-07-04T02:00:00Z',
        end_time: '2026-07-04T03:00:00Z',
        is_all_day: false,
        rrule: '',
        created_at: '',
        updated_at: ''
      }
    ];

    // Simulating West Coast US / Alaska formatting (e.g. Jul 3)
    localDateSpy.mockReturnValue('Jul 3');
    const { rerender } = renderWithProviders(<PlannerScreen />);
    await waitFor(() => {
      expect(screen.getByText('Jul 3')).toBeInTheDocument();
    });

    // Simulating Tokyo/Seoul formatting (e.g. Jul 4)
    localDateSpy.mockReturnValue('Jul 4');
    rerender(<PlannerScreen />);
    await waitFor(() => {
      expect(screen.getByText('Jul 4')).toBeInTheDocument();
    });

    localDateSpy.mockRestore();
  });
  ```

### 4. `TC-T3-02: Multi-Calendar + Category Isolation`
* **Target File**: `redeeming-time-frontend/apps/app/App.test.tsx`
* **Current Defect**: Declares a local array and filters it manually, bypassing the store configuration.
* **Proposed Rewrite Solution**:
  Populate the `usePlannerStore` with mock data for multiple calendars and categories using the store's `syncPlanner` action. Set the `activeCalendarId` in the store state, and assert that querying the store categories filtered by the active calendar ID isolates the correct elements.
* **Proposed Code**:
  ```typescript
  test('TC-T3-02: Multi-Calendar + Category Isolation', () => {
    // Populate store with categories for multiple calendars
    usePlannerStore.getState().syncPlanner({
      calendars: [
        { id: 1, title: 'Cal 1', description: '', theme_color: '', created_at: '' },
        { id: 2, title: 'Cal 2', description: '', theme_color: '', created_at: '' }
      ],
      categories: [
        { id: 10, calendar: 1, name: 'Cat A', color_code: '#FFF', created_at: '' },
        { id: 11, calendar: 2, name: 'Cat B', color_code: '#000', created_at: '' }
      ]
    });

    // Isolate active calendar to Calendar 2
    usePlannerStore.getState().setActiveCalendarId(2);

    // Retrieve active selection and filter categories
    const state = usePlannerStore.getState();
    const filtered = state.categories.filter(c => c.calendar === state.activeCalendarId);

    expect(filtered.length).toBe(1);
    expect(filtered[0].name).toBe('Cat B');
  });
  ```

### 5. `TC-T3-04: Event Creation + Week Rail Synchronized Display`
* **Target File**: `redeeming-time-frontend/apps/app/App.test.tsx`
* **Current Defect**: Asserts on local mock event list `events[0].title` directly.
* **Proposed Rewrite Solution**:
  Render the mobile `<PlannerScreen />`. Verify that it starts with an empty events list ("No events returned..."). Then, add an event to the mock database and run `usePlannerStore.getState().syncPlanner` to verify the UI re-renders and displays the newly synchronized event card.
* **Proposed Code**:
  ```typescript
  test('TC-T3-04: Event Creation + Week Rail Synchronized Display', async () => {
    mockDb.events = [];
    renderWithProviders(<PlannerScreen />);

    // Initial check for empty state
    await waitFor(() => {
      expect(screen.getByText('No events returned from the planner API.')).toBeInTheDocument();
    });

    // Populate mockDb and trigger store sync
    const newEvent = {
      id: 105,
      calendar: 1,
      category: null,
      creator: 1,
      title: 'Team Sync',
      description: 'Synchronized weekly meeting',
      start_time: '2026-07-04T09:00:00Z',
      end_time: '2026-07-04T10:00:00Z',
      is_all_day: false,
      rrule: '',
      created_at: '',
      updated_at: ''
    };
    mockDb.events.push(newEvent);
    usePlannerStore.getState().syncPlanner({ events: mockDb.events });

    // Verify UI reflects the synchronization in real-time
    await waitFor(() => {
      expect(screen.getByText('Team Sync')).toBeInTheDocument();
    });
  });
  ```

### 6. `TC-T3-05: Multi-Calendar + Task Selection Isolation`
* **Target File**: `redeeming-time-frontend/apps/app/App.test.tsx`
* **Current Defect**: Filters a local tasks list instead of leveraging store states.
* **Proposed Rewrite Solution**:
  Populate the `usePlannerStore` with mock tasks for calendars 1 and 2. Set the `activeCalendarId` to `2`. Retrieve the store state, filter the synced tasks using `state.activeCalendarId`, and assert that the returned subset contains only the tasks belonging to calendar `2`.
* **Proposed Code**:
  ```typescript
  test('TC-T3-05: Multi-Calendar + Task Selection Isolation', () => {
    // Populate store with tasks across multiple calendars
    usePlannerStore.getState().syncPlanner({
      calendars: [
        { id: 1, title: 'Cal 1', description: '', theme_color: '', created_at: '' },
        { id: 2, title: 'Cal 2', description: '', theme_color: '', created_at: '' }
      ],
      tasks: [
        { id: 201, calendar: 1, creator: 1, title: 'Task A', is_completed: false, target_date: '2026-07-04', priority: 'MEDIUM', order: 0 },
        { id: 202, calendar: 2, creator: 1, title: 'Task B', is_completed: false, target_date: '2026-07-04', priority: 'MEDIUM', order: 0 }
      ]
    });

    // Select active calendar to Calendar 2
    usePlannerStore.getState().setActiveCalendarId(2);

    const state = usePlannerStore.getState();
    const filtered = state.tasks.filter(t => t.calendar === state.activeCalendarId);

    expect(filtered.length).toBe(1);
    expect(filtered[0].title).toBe('Task B');
  });
  ```

### 7. `TC-T2-F5-02: Leap Year Grid Generation`
* **Target File**: `redeeming-time-frontend/apps/web/src/App.test.tsx`
* **Current Defect**: Bypasses components entirely by doing standalone date array iteration in the test code.
* **Proposed Rewrite Solution**:
  Mock the system date to a leap year date (e.g., `2028-02-15`) using Vitest fake timers. Authenticate the user by setting store tokens, then render the main `<App />` component. Check that the month header renders `"February 2028"` and the calendar contains the date number `"29"`.
* **Proposed Code**:
  ```typescript
  test('TC-T2-F5-02: Leap Year Grid Generation', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2028-02-15T12:00:00Z'));

    // Authenticate user to enter DashboardPage
    useAuthStore.getState().setTokens({ access: 'valid-acc', refresh: 'valid-ref' });
    renderWithProviders(<App />);

    // Verify Month heading displays the Leap Year month
    await waitFor(() => {
      expect(screen.getByText('February 2028')).toBeInTheDocument();
    });

    // Verify the grid displays the leap day (Feb 29th)
    const cellNumbers = screen.getAllByText('29');
    expect(cellNumbers.length).toBeGreaterThan(0);

    vi.useRealTimers();
  });
  ```

### 8. `TC-T2-F6-01: End-of-Year Week Wrap`
* **Target File**: `redeeming-time-frontend/apps/web/src/App.test.tsx`
* **Current Defect**: Locally generates a date range array and asserts against it, bypassing `WeekRail` rendering.
* **Proposed Rewrite Solution**:
  Mock the system time to `2026-12-31` (a Thursday). Authenticate the user and render `<App />`. Retrieve the rendered week-day date cells in the `<WeekRail />` section and assert that the date numbers match `['27', '28', '29', '30', '31', '1', '2']`, verifying correct wrapping across the year boundary.
* **Proposed Code**:
  ```typescript
  test('TC-T2-F6-01: End-of-Year Week Wrap', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-12-31T12:00:00Z'));

    // Authenticate user to enter DashboardPage
    useAuthStore.getState().setTokens({ access: 'valid-acc', refresh: 'valid-ref' });
    renderWithProviders(<App />);

    await waitFor(() => {
      expect(screen.getByText('Synced')).toBeInTheDocument();
    });

    // Query elements inside WeekRail component representing dates of the week
    const weekDays = document.querySelectorAll('.week-rail .week-day strong');
    const renderedDates = Array.from(weekDays).map(el => el.textContent);

    // Starts Sunday Dec 27, ends Saturday Jan 2
    expect(renderedDates).toEqual(['27', '28', '29', '30', '31', '1', '2']);

    vi.useRealTimers();
  });
  ```

---

## 3. Implementation Guidelines and Verification Method

To implement these recommendations without introducing syntax or compiler errors:
1. Ensure `vi` is used correctly from `vitest` for fake timers and spied prototypes.
2. In cases where components are rendered, make sure `useAuthStore.getState().setTokens` is called *before* `renderWithProviders` so the routing correctly displays dashboard elements.
3. To run and verify the updated test suite, execute the following commands in the workspace root:
   ```bash
   cd redeeming-time-frontend
   npm run test
   ```
4. Verify that the total test counts are unchanged (still fully satisfying the 104 test case count requirement) but that all 8 test cases now execute the proposed codebase logic.
