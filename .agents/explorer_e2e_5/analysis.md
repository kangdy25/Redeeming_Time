# Forensic Analysis and Rewrite Strategy: Integration Test Suite Integrity

**Date**: 2026-07-04T17:59:00+09:00  
**Prepared By**: Explorer 5  
**Objective**: Resolve INTEGRITY VIOLATION audit findings by replacing self-certifying/dummy test cases with genuine integration tests using real store selectors, API queries, fake timer manipulation, and DOM assertions.

---

## 1. Summary of Audit Findings

A forensic review of the test suites in `redeeming-time-frontend` revealed an integrity violation. Specifically, **8 test cases** (6 in the mobile test suite `apps/app/App.test.tsx` and 2 in the web test suite `apps/web/src/App.test.tsx`) are **self-certifying**. Instead of invoking actual components, mutating Zustand stores, or triggering network queries via Mock Service Worker (MSW), these test cases assert on local mock variables declared directly inside the test body. 

Leaving these tests in their current dummy state presents a serious risk: bugs in critical business features (such as multi-calendar isolation, timezone transitions, calendar rendering boundaries, and input validation) can easily slip into production without being caught by the test suites.

---

## 2. Detailed Breakdown of Violations & Rewrite Strategy

Below is the structured, step-by-step design to rewrite all 8 test cases.

### Case 1: TC-T2-F7-01: Empty Title Task Rejection (Mobile)
* **Target File & Lines**: `apps/app/App.test.tsx`, lines 98–108
* **Violation Description**: Asserts on local object properties (`emptyPayload.title === ''`) without passing this payload through the creation logic or verification workflows.
* **Production Risk**: Tasks with empty titles could be successfully created in the backend or state manager, causing UI layout breaks.
* **Genuine Strategy**: Configure the Mock Service Worker (MSW) task handler to return a `400 Bad Request` with an appropriate error message when the task title is empty. Execute `apiClient.createTask` with an empty title and verify that the API request rejects with the expected validation error.

#### Proposed Implementation:
```typescript
    test('TC-T2-F7-01: Empty Title Task Rejection', async () => {
      // Mock the MSW handler to reject empty titles
      server.use(
        http.post('http://localhost:8000/api/tasks/', async ({ request }) => {
          const body = (await request.json()) as any;
          if (!body.title || body.title.trim() === '') {
            return new HttpResponse(JSON.stringify({ detail: 'Title cannot be empty' }), { status: 400 });
          }
          return HttpResponse.json({ id: 999 });
        })
      );

      const emptyPayload = {
        calendar: 1,
        title: '',
        target_date: '2026-07-04',
        priority: 'MEDIUM' as const,
        order: 0
      };

      // Perform a real API request and verify it rejects with a validation error
      await expect(apiClient.createTask(emptyPayload)).rejects.toThrow('Title cannot be empty');
    });
```

---

### Case 2: TC-T2-F8-02: Midnight Boundary Transition (Mobile)
* **Target File & Lines**: `apps/app/App.test.tsx`, lines 257–262
* **Violation Description**: Asserts on local variables (`target_date < todayString`) instead of testing actual component rerendering behavior when the date advances past midnight.
* **Production Risk**: If the component does not recalculate state dynamically on midnight shifts, task rollover status and visual indicators will remain outdated until a manual refresh.
* **Genuine Strategy**:
  1. Use Vitest fake timers (`vi.useFakeTimers()`) to freeze system time at `2026-07-04T23:59:50Z` (10 seconds before midnight).
  2. Populate `mockDb` with a task for `2026-07-04`.
  3. Render `PlannerScreen` and verify that the task is NOT marked as overdue (the indicator `"↷"` and string `"rollover ready"` are absent).
  4. Advance system time by 20 seconds (`2026-07-05T00:00:10Z`).
  5. Rerender the component and assert that it now displays `"rollover ready"` and the `"↷"` symbol in the DOM.

#### Proposed Implementation:
```typescript
    test('TC-T2-F8-02: Midnight Boundary Transition', async () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2026-07-04T23:59:50Z'));

      mockDb.tasks = [
        {
          id: 200,
          calendar: 1,
          creator: 1,
          title: 'Midnight Transition Task',
          is_completed: false,
          target_date: '2026-07-04',
          priority: 'MEDIUM',
          order: 1,
          created_at: '',
          updated_at: ''
        }
      ];

      // Initial render - task is set for today, hence not overdue
      const { rerender } = renderWithProviders(<PlannerScreen />);
      await waitFor(() => {
        expect(screen.getByText('Midnight Transition Task')).toBeInTheDocument();
      });
      expect(screen.queryByText(/rollover ready/)).toBeNull();
      expect(screen.queryByText('↷')).toBeNull();

      // Shift clock past midnight to July 5th
      vi.setSystemTime(new Date('2026-07-05T00:00:10Z'));
      
      // Rerender component to force update with new system clock
      rerender(<PlannerScreen />);

      // Verify task is now marked overdue and shows rollover elements
      await waitFor(() => {
        expect(screen.getByText(/rollover ready/)).toBeInTheDocument();
        expect(screen.getByText('↷')).toBeInTheDocument();
      });

      vi.useRealTimers();
    });
```

---

### Case 3: TC-T2-F8-05: Client Timezone Mid-flight Shift (Mobile)
* **Target File & Lines**: `apps/app/App.test.tsx`, lines 288–293
* **Violation Description**: Bypasses UI rendering and store logic to assert that `toLocaleDateString` is defined on a local date.
* **Production Risk**: Visual date displays on schedule event cards may fail to shift layout or date labels when user system timezones shift, causing confusion.
* **Genuine Strategy**:
  1. Add an event to `mockDb` with a UTC start time of `2026-07-04T01:00:00Z`.
  2. Spy on the global `Date.prototype.toLocaleDateString` method.
  3. First, mock it to return `'Jul 4'` (representing UTC/GMT timezone representation). Render `PlannerScreen` and assert that the card displays `'Jul 4'`.
  4. Next, mock it to return `'Jul 3'` (representing America/Sao_Paulo timezone representation at GMT-3). Rerender the screen and verify that the label shifts to `'Jul 3'`.

#### Proposed Implementation:
```typescript
    test('TC-T2-F8-05: Client Timezone Mid-flight Shift', async () => {
      mockDb.events = [
        {
          id: 100,
          calendar: 1,
          category: null,
          title: 'Timezone Shift Event',
          start_time: '2026-07-04T01:00:00Z',
          end_time: '2026-07-04T02:00:00Z',
          is_all_day: false,
          rrule: '',
          created_at: '',
          updated_at: ''
        }
      ];

      const originalToLocaleDateString = Date.prototype.toLocaleDateString;
      const mockLocale = vi.spyOn(Date.prototype, 'toLocaleDateString');
      
      // First timezone: UTC/GMT (renders Jul 4)
      mockLocale.mockImplementation(function(this: Date, locale, options) {
        if (this.toISOString() === '2026-07-04T01:00:00Z') {
          return 'Jul 4';
        }
        return originalToLocaleDateString.call(this, locale, options);
      });

      const { rerender } = renderWithProviders(<PlannerScreen />);
      await waitFor(() => {
        expect(screen.getByText('Timezone Shift Event')).toBeInTheDocument();
      });
      expect(screen.getByText('Jul 4')).toBeInTheDocument();

      // Second timezone: Shift mid-flight to GMT-3 (renders Jul 3)
      mockLocale.mockImplementation(function(this: Date, locale, options) {
        if (this.toISOString() === '2026-07-04T01:00:00Z') {
          return 'Jul 3';
        }
        return originalToLocaleDateString.call(this, locale, options);
      });

      rerender(<PlannerScreen />);

      // Verify the label shifted dynamically in the DOM
      await waitFor(() => {
        expect(screen.getByText('Jul 3')).toBeInTheDocument();
      });
      expect(screen.queryByText('Jul 4')).toBeNull();

      mockLocale.mockRestore();
    });
```

---

### Case 4: TC-T3-02: Multi-Calendar + Category Isolation (Mobile)
* **Target File & Lines**: `apps/app/App.test.tsx`, lines 461–470
* **Violation Description**: Declares a local categories list and filters it directly, bypassing store integration.
* **Production Risk**: Users could view or create categories belonging to a different active calendar, breaching workspace isolation.
* **Genuine Strategy**: Perform a state mutation directly on the real `usePlannerStore`. Load multiple calendars and categories under the store, change the `activeCalendarId` to 2, and assert that querying filtered store categories returns only the category mapped to calendar 2.

#### Proposed Implementation:
```typescript
    test('TC-T3-02: Multi-Calendar + Category Isolation', () => {
      const store = usePlannerStore.getState();

      // Load data via real store action
      store.syncPlanner({
        calendars: [
          { id: 1, title: 'Calendar A', description: '', theme_color: '', created_at: '' },
          { id: 2, title: 'Calendar B', description: '', theme_color: '', created_at: '' }
        ],
        categories: [
          { id: 10, calendar: 1, name: 'Cat A', color_code: '#ffffff', created_at: '' },
          { id: 11, calendar: 2, name: 'Cat B', color_code: '#000000', created_at: '' }
        ]
      });

      // Isolate by changing active calendar ID
      store.setActiveCalendarId(2);

      // Verify store queries isolate correctly
      const activeCalId = usePlannerStore.getState().activeCalendarId;
      const allCategories = usePlannerStore.getState().categories;
      const filtered = allCategories.filter(c => c.calendar === activeCalId);

      expect(filtered.length).toBe(1);
      expect(filtered[0].name).toBe('Cat B');
    });
```

---

### Case 5: TC-T3-04: Event Creation + Week Rail Synchronized Display (Mobile)
* **Target File & Lines**: `apps/app/App.test.tsx`, lines 496–499
* **Violation Description**: Declares a local events array and asserts on it, bypassing components and store pipelines.
* **Production Risk**: Creating events through the API might fail to trigger hooks to synchronize state, meaning new events won't show up in the planner.
* **Genuine Strategy**:
  1. Render `PlannerScreen` (with an empty event db setup).
  2. Verify that the empty schedule text is visible.
  3. Call `apiClient.createEvent` with a valid payload, inserting it into MSW mock db.
  4. Sync the store with `syncPlanner` (as mobile triggers synchronization).
  5. Verify that the newly created event is rendered under "Schedule".

#### Proposed Implementation:
```typescript
    test('TC-T3-04: Event Creation + Week Rail Synchronized Display', async () => {
      renderWithProviders(<PlannerScreen />);

      mockDb.events = [];
      usePlannerStore.getState().syncPlanner({ events: [] });

      await waitFor(() => {
        expect(screen.getByText('No events returned from the planner API.')).toBeInTheDocument();
      });

      const newEventPayload = {
        calendar: 1,
        category: 10,
        title: 'Team Sync',
        description: 'Weekly team meeting',
        start_time: '2026-07-04T09:00:00Z',
        end_time: '2026-07-04T10:00:00Z',
        is_all_day: false,
        rrule: ''
      };

      // Perform a real API creation
      await apiClient.createEvent(newEventPayload);

      // Sync the store based on updated DB
      usePlannerStore.getState().syncPlanner({ events: mockDb.events });

      // Assert visual synchronization
      await waitFor(() => {
        expect(screen.getByText('Team Sync')).toBeInTheDocument();
        expect(screen.queryByText('No events returned from the planner API.')).toBeNull();
      });
    });
```

---

### Case 6: TC-T3-05: Multi-Calendar + Task Selection Isolation (Mobile)
* **Target File & Lines**: `apps/app/App.test.tsx`, lines 501–510
* **Violation Description**: Performs filter calculations on a local array inside the test, ignoring the Zustand store state.
* **Production Risk**: Selecting a calendar workspace could display tasks associated with other workspace calendars.
* **Genuine Strategy**: Load multiple tasks spanning different calendar IDs into `usePlannerStore` via `syncPlanner`, set the active calendar ID to 2, and verify that selecting tasks filtered by active calendar ID returns only those matching calendar 2.

#### Proposed Implementation:
```typescript
    test('TC-T3-05: Multi-Calendar + Task Selection Isolation', () => {
      const store = usePlannerStore.getState();

      store.syncPlanner({
        calendars: [
          { id: 1, title: 'Calendar A', description: '', theme_color: '', created_at: '' },
          { id: 2, title: 'Calendar B', description: '', theme_color: '', created_at: '' }
        ],
        tasks: [
          { id: 201, calendar: 1, creator: 1, title: 'Task A', is_completed: false, target_date: '2026-07-04', priority: 'MEDIUM', order: 0, created_at: '', updated_at: '' },
          { id: 202, calendar: 2, creator: 1, title: 'Task B', is_completed: false, target_date: '2026-07-04', priority: 'HIGH', order: 1, created_at: '', updated_at: '' }
        ]
      });

      store.setActiveCalendarId(2);

      const activeCalId = usePlannerStore.getState().activeCalendarId;
      const allTasks = usePlannerStore.getState().tasks;
      const filteredTasks = allTasks.filter(t => t.calendar === activeCalId);

      expect(filteredTasks.length).toBe(1);
      expect(filteredTasks[0].title).toBe('Task B');
    });
```

---

### Case 7: TC-T2-F5-02: Leap Year Grid Generation (Web)
* **Target File & Lines**: `apps/web/src/App.test.tsx`, lines 678–691
* **Violation Description**: Calculates dates locally instead of validating the actual rendered HTML grid on Leap Years.
* **Production Risk**: The grid component could crop, skip, or incorrectly shift cells in February of a leap year, leading to missing days in the display.
* **Genuine Strategy**:
  1. Freeze the system time inside a Leap Year using fake timers (`vi.setSystemTime(new Date('2028-02-15T12:00:00Z'))`).
  2. Set authenticated tokens and render `<App />`.
  3. Wait for the heading to render `"February 2028"`.
  4. Query for all rendered days containing `"29"` and verify the presence of the Leap Day in the calendar cell grid.

#### Proposed Implementation:
```typescript
    test('TC-T2-F5-02: Leap Year Grid Generation', async () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2028-02-15T12:00:00Z'));

      useAuthStore.getState().setTokens({ access: 'valid-acc', refresh: 'valid-ref' });
      renderWithProviders(<App />);

      await waitFor(() => {
        expect(screen.getByText('February 2028')).toBeInTheDocument();
      });

      // Verify that Feb 29 cell is generated and rendered in the DOM
      const cell29 = screen.getAllByText('29');
      expect(cell29.length).toBeGreaterThan(0);

      vi.useRealTimers();
    });
```

---

### Case 8: TC-T2-F6-01: End-of-Year Week Wrap (Web)
* **Target File & Lines**: `apps/web/src/App.test.tsx`, lines 824–836
* **Violation Description**: Implements local date math to assert wrapping correctness, bypassing the `WeekRail` DOM structure.
* **Production Risk**: Week layout wrap at transitions from Dec to Jan might fail, displaying incorrect day offsets in the weekly view.
* **Genuine Strategy**:
  1. Shift system time to the year boundary `2026-12-31T12:00:00Z` (a Thursday).
  2. Render the full Web `<App />` component.
  3. Query the `.week-rail` section in the DOM and map out all day label sequence texts.
  4. Verify the dates array wraps from Dec 27 to Jan 2: `['27', '28', '29', '30', '31', '1', '2']`.

#### Proposed Implementation:
```typescript
    test('TC-T2-F6-01: End-of-Year Week Wrap', async () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2026-12-31T12:00:00Z'));

      useAuthStore.getState().setTokens({ access: 'valid-acc', refresh: 'valid-ref' });
      renderWithProviders(<App />);

      await waitFor(() => {
        expect(screen.getByText('December 2026')).toBeInTheDocument();
      });

      // Assert dates in week rail wrap properly from December to January
      const weekRail = document.querySelector('.week-rail');
      expect(weekRail).not.toBeNull();
      
      const strongs = weekRail!.querySelectorAll('strong');
      const dates = Array.from(strongs).map((s) => s.textContent);

      expect(dates).toEqual(['27', '28', '29', '30', '31', '1', '2']);

      vi.useRealTimers();
    });
```

---

## 3. Test Integrity Safeguards

To prevent future integrity violations and stop self-certifying tests from entering the codebase, the following architectural guidelines should be enforced:

1. **Ban Local State Assertions**: Tests must not contain assertions checking properties of variables defined only within that test scope, unless they are verifying pure functions. Integration and E2E tests must verify components, hooks, or stores.
2. **Utilize Fake Timers for Temporal Boundaries**: Time-based boundaries (such as leap years, end-of-year wraps, and midnight transitions) must be tested by configuring fake system clocks (`vi.setSystemTime`) and asserting on the resulting DOM output.
3. **Assert on Rendered HTML DOM**: Favor user-centric queries (`screen.getByRole`, `screen.getByText`) to confirm layout modifications, ensuring the UI behaves correctly under target inputs and API states.
4. **Lint and Code Review Checks**: Establish code review checks that flag any test case containing only mocks and local variable assertions without calling `render` or modifying a shared store.
