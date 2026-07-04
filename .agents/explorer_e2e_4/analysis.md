# Detailed Plan for E2E/Integration Test Rewrites

This document provides the complete, actionable fix strategy for the 8 integration/E2E test cases flagged by the Forensic Auditor as self-certifying/dummy implementations. Each case is rewritten to interact directly with the React components, the Zustand stores (`useAuthStore`, `usePlannerStore`), and the mock API layer (MSW) in `/Users/kangdy25/Programming/Web/Redeeming_Time/redeeming-time-frontend/test.setup.ts`.

---

## 1. Executive Summary
The Forensic Auditor identified 8 test cases that mock and assert on local variables within the test block (self-certification), completely bypassing the application's React Native (mobile) and React (web) render loops, state managers, and network layers. 

Our strategy is to replace all 8 dummy tests with authentic, behavioral integration tests by:
1. **Leveraging React Testing Library** (`renderWithProviders`, `screen`, `waitFor`) to assert on real DOM elements.
2. **Utilizing Vitest Fake Timers** (`vi.useFakeTimers()`) to simulate midnight crossovers, leap years, and end-of-year wraps.
3. **Interacting with Zustand Stores** to test multi-calendar data isolation.
4. **Making Real API Requests** that hit the MSW (Mock Service Worker) network layer to verify payload constraints.

---

## 2. Test Case Rewrite Specifications

### 1. TC-T2-F7-01: Empty Title Task Rejection
* **File**: `apps/app/App.test.tsx` (Lines 98–108)
* **Problem**: Asserts on local object `emptyPayload.title === ''`, bypassing client-side validation and backend API response.
* **Proposed Rewrite Code**:
  ```typescript
  test('TC-T2-F7-01: Empty Title Task Rejection', async () => {
    // 1. Intercept task creation API to reject empty titles with 400 Bad Request
    server.use(
      http.post('http://localhost:8000/api/tasks/', async ({ request }) => {
        const body = (await request.json()) as any;
        if (!body.title || body.title.trim() === '') {
          return new HttpResponse(JSON.stringify({ detail: 'Title cannot be empty.' }), { status: 400 });
        }
        return new HttpResponse(JSON.stringify({ id: 999, ...body }), { status: 201 });
      })
    );

    // 2. Perform the API call using the client
    const emptyPayload = {
      calendar: 1,
      title: '',
      target_date: '2026-07-04',
      priority: 'MEDIUM' as const,
      order: 0
    };

    // 3. Expect real network response rejection
    await expect(apiClient.createTask(emptyPayload)).rejects.toThrow('Title cannot be empty.');
  });
  ```
* **Rationale**: This rewrites the test to verify that the API client correctly handles validation failures returned by the server (represented by the MSW handler).

---

### 2. TC-T2-F8-02: Midnight Boundary Transition
* **File**: `apps/app/App.test.tsx` (Lines 257–262)
* **Problem**: Compares local date strings instead of testing actual component rendering before and after midnight shift.
* **Proposed Rewrite Code**:
  ```typescript
  test('TC-T2-F8-02: Midnight Boundary Transition', async () => {
    vi.useFakeTimers();
    // 1. Set the initial system time to late July 4th, 2026
    vi.setSystemTime(new Date('2026-07-04T23:59:00Z'));

    // 2. Load a task due on July 4th
    mockDb.tasks = [
      { id: 200, calendar: 1, creator: 1, title: 'Midnight Bound Task', is_completed: false, target_date: '2026-07-04', priority: 'MEDIUM', order: 1 }
    ];

    // 3. Render the screen and verify the task is NOT marked as overdue
    const { rerender } = renderWithProviders(<PlannerScreen />);
    await waitFor(() => {
      expect(screen.queryByText('↷')).toBeNull();
      expect(screen.queryByText(/rollover ready/)).toBeNull();
    });

    // 4. Advance system time past midnight to July 5th
    vi.setSystemTime(new Date('2026-07-05T00:01:00Z'));

    // 5. Re-render the screen to pick up the updated system clock
    rerender(<PlannerScreen />);

    // 6. Verify that it now displays the overdue/rollover indicators
    await waitFor(() => {
      expect(screen.getByText('↷')).toBeInTheDocument();
      expect(screen.getByText(/rollover ready/)).toBeInTheDocument();
    });

    vi.useRealTimers();
  });
  ```
* **Rationale**: This tests that the layout dynamically updates its logic to display the "rollover ready" text cue and visual badge (`↷`) when the system date shifts past the task's `target_date`.

---

### 3. TC-T2-F8-05: Client Timezone Mid-flight Shift
* **File**: `apps/app/App.test.tsx` (Lines 288–293)
* **Problem**: Runs a dummy check that `toLocaleDateString()` is defined.
* **Proposed Rewrite Code**:
  ```typescript
  test('TC-T2-F8-05: Client Timezone Mid-flight Shift', async () => {
    // 1. Populate an event starting at UTC 23:30 on July 3rd
    mockDb.events = [
      {
        id: 100,
        calendar: 1,
        category: 10,
        category_detail: { id: 10, calendar: 1, name: 'Deep Work', color_code: '#E11D48', created_at: '' },
        creator: 1,
        title: 'TZ Shift Event',
        start_time: '2026-07-03T23:30:00Z',
        end_time: '2026-07-04T00:30:00Z',
        is_all_day: false,
        rrule: ''
      }
    ];

    // 2. Mock timezone to Asia/Tokyo (UTC+9) -> event should render on July 4th
    const originalDateTimeFormat = Intl.DateTimeFormat;
    const tokyoSpy = vi.spyOn(Intl, 'DateTimeFormat').mockImplementation((locale, options) => {
      return new originalDateTimeFormat(locale, { ...options, timeZone: 'Asia/Tokyo' });
    });

    const { rerender } = renderWithProviders(<PlannerScreen />);
    await waitFor(() => {
      expect(screen.getByText('Jul 4')).toBeInTheDocument();
    });

    tokyoSpy.mockRestore();

    // 3. Mock timezone to America/New_York (UTC-4) -> event should render on July 3rd
    const nySpy = vi.spyOn(Intl, 'DateTimeFormat').mockImplementation((locale, options) => {
      return new originalDateTimeFormat(locale, { ...options, timeZone: 'America/New_York' });
    });

    rerender(<PlannerScreen />);
    await waitFor(() => {
      expect(screen.getByText('Jul 3')).toBeInTheDocument();
    });

    nySpy.mockRestore();
  });
  ```
* **Rationale**: This mocks browser locale/timezone translation directly at the JS runtime level to verify that the event card header date displays correctly according to the local user's timezone mid-flight context.

---

### 4. TC-T3-02: Multi-Calendar + Category Isolation
* **File**: `apps/app/App.test.tsx` (Lines 461–470)
* **Problem**: Filters a local temporary category array instead of isolating categories within the Zustand store.
* **Proposed Rewrite Code**:
  ```typescript
  test('TC-T3-02: Multi-Calendar + Category Isolation', () => {
    // 1. Sync calendars and categories directly to the active Zustand store
    usePlannerStore.getState().syncPlanner({
      calendars: [
        { id: 1, title: 'Workspace A', description: '', theme_color: '' },
        { id: 2, title: 'Workspace B', description: '', theme_color: '' }
      ],
      categories: [
        { id: 10, calendar: 1, name: 'Cat A', color_code: '#E11D48', created_at: '' },
        { id: 11, calendar: 2, name: 'Cat B', color_code: '#3B82F6', created_at: '' }
      ]
    });

    // 2. Set active calendar to ID 2 (Workspace B)
    usePlannerStore.getState().setActiveCalendarId(2);

    // 3. Query the store and ensure we isolate categories matching only the active calendar
    const state = usePlannerStore.getState();
    const activeCalendarId = state.activeCalendarId;
    const filtered = state.categories.filter(c => c.calendar === activeCalendarId);

    expect(filtered.length).toBe(1);
    expect(filtered[0].name).toBe('Cat B');
  });
  ```
* **Rationale**: Replaces local arrays with state synchronization via `usePlannerStore`, simulating the active workspace category isolation layer.

---

### 5. TC-T3-04: Event Creation + Week Rail Synchronized Display
* **File**: `apps/app/App.test.tsx` (Lines 496–499)
* **Problem**: Asserts on local array containing one string, bypassing render/API sync.
* **Proposed Rewrite Code**:
  ```typescript
  test('TC-T3-04: Event Creation + Week Rail Synchronized Display', async () => {
    // 1. Render the screen (initial screen query starts empty)
    const { queryClient } = renderWithProviders(<PlannerScreen />);
    expect(screen.queryByText('Team Sync')).toBeNull();

    // 2. Trigger a real event creation on the API client
    await apiClient.createEvent({
      calendar: 1,
      category: null,
      title: 'Team Sync',
      description: 'Weekly team meeting',
      start_time: '2026-07-04T09:00:00Z',
      end_time: '2026-07-04T10:00:00Z',
      is_all_day: false,
      rrule: ''
    });

    // 3. Invalidate query to trigger refetch and update Zustand store
    await queryClient.invalidateQueries({ queryKey: ['planner-snapshot'] });

    // 4. Verify the newly created event is rendered in the UI
    await waitFor(() => {
      expect(screen.getByText('Team Sync')).toBeInTheDocument();
    });
  });
  ```
* **Rationale**: Verifies that event creation on the API layer correctly triggers cache invalidation, store state synchronization, and DOM updates.

---

### 6. TC-T3-05: Multi-Calendar + Task Selection Isolation
* **File**: `apps/app/App.test.tsx` (Lines 501–510)
* **Problem**: Bypasses the active store state to filter a local test array.
* **Proposed Rewrite Code**:
  ```typescript
  test('TC-T3-05: Multi-Calendar + Task Selection Isolation', () => {
    // 1. Sync workspace data to Zustand store
    usePlannerStore.getState().syncPlanner({
      calendars: [
        { id: 1, title: 'Space A', description: '', theme_color: '' },
        { id: 2, title: 'Space B', description: '', theme_color: '' }
      ],
      tasks: [
        { id: 201, calendar: 1, creator: 1, title: 'Task A', is_completed: false, target_date: '2026-07-04', priority: 'MEDIUM', order: 0 },
        { id: 202, calendar: 2, creator: 1, title: 'Task B', is_completed: false, target_date: '2026-07-04', priority: 'MEDIUM', order: 0 }
      ]
    });

    // 2. Switch workspace context
    usePlannerStore.getState().setActiveCalendarId(2);

    // 3. Verify task selector filters tasks by active workspace ID
    const state = usePlannerStore.getState();
    const activeCalendarId = state.activeCalendarId;
    const filtered = state.tasks.filter(t => t.calendar === activeCalendarId);

    expect(filtered.length).toBe(1);
    expect(filtered[0].title).toBe('Task B');
  });
  ```
* **Rationale**: Replaces self-certifying arrays with full store query logic validating workspace tasks selection isolation.

---

### 7. TC-T2-F5-02: Leap Year Grid Generation
* **File**: `apps/web/src/App.test.tsx` (Lines 678–691)
* **Problem**: Bypasses components to run date arithmetic inside the test loop.
* **Proposed Rewrite Code**:
  ```typescript
  test('TC-T2-F5-02: Leap Year Grid Generation', async () => {
    vi.useFakeTimers();
    // 1. Set system clock to a Leap Year February (e.g., Feb 15, 2028)
    vi.setSystemTime(new Date('2028-02-15T12:00:00Z'));

    // 2. Authenticate session to access DashboardPage month grid
    useAuthStore.getState().setTokens({ access: 'valid-acc', refresh: 'valid-ref' });

    // 3. Render Web App
    renderWithProviders(<App />);

    // 4. Verify month cells include February 29th, 2028
    await waitFor(() => {
      const cells = document.querySelectorAll('.date-cell');
      expect(cells.length).toBe(42);

      // Verify that one of the non-muted calendar cells displays "29"
      const activeCells = Array.from(cells).filter(cell => !cell.classList.contains('muted-cell'));
      const hasLeapDay = activeCells.some(cell => {
        const numEl = cell.querySelector('.date-number');
        return numEl && numEl.textContent === '29';
      });
      expect(hasLeapDay).toBe(true);
    });

    vi.useRealTimers();
  });
  ```
* **Rationale**: Verifies that the `MonthGrid` component, using the layout helper `monthCells(anchor)`, generates a grid that includes February 29th for a leap year.

---

### 8. TC-T2-F6-01: End-of-Year Week Wrap
* **File**: `apps/web/src/App.test.tsx` (Lines 824–836)
* **Problem**: Computes date range strings locally instead of rendering `WeekRail`.
* **Proposed Rewrite Code**:
  ```typescript
  test('TC-T2-F6-01: End-of-Year Week Wrap', async () => {
    vi.useFakeTimers();
    // 1. Set system date to Dec 31, 2026 (Thursday)
    vi.setSystemTime(new Date('2026-12-31T12:00:00Z'));

    // 2. Authenticate session to access dashboard WeekRail
    useAuthStore.getState().setTokens({ access: 'valid-acc', refresh: 'valid-ref' });

    // 3. Render Web App
    renderWithProviders(<App />);

    // 4. Verify the dates generated in the WeekRail wrapping from 2026 into 2027
    await waitFor(() => {
      const weekDayStrongEls = document.querySelectorAll('.week-day strong');
      expect(weekDayStrongEls.length).toBe(7);

      const renderedDates = Array.from(weekDayStrongEls).map(el => el.textContent);
      // Expected week layout: Sunday Dec 27 to Saturday Jan 2
      expect(renderedDates).toEqual(['27', '28', '29', '30', '31', '1', '2']);
    });

    vi.useRealTimers();
  });
  ```
* **Rationale**: Exercises the real `WeekRail` layout logic rendering calculations across end-of-year wrapping (December 2026 to January 2027).
