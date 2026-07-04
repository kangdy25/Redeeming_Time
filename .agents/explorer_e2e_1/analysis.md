# Redeeming Time Frontend E2E Testing Strategy

This document outlines a comprehensive end-to-end (E2E) and integration testing strategy for the Redeeming Time frontend repository. It provides a detailed analysis of the codebase, defines 9 core features, designs 104 specific test cases across 4 tiers, and proposes a Vitest + JSDOM simulated execution architecture that allows running both React Web and React Native component tests under a single unified test environment.

---

## 1. Codebase Structure & Flow Analysis

The Redeeming Time frontend codebase is organized as a monorepo workspace containing three packages:
1. `apps/web`: React 19 + Vite web planning dashboard.
2. `apps/app`: React Native + Expo + NativeWind mobile application.
3. `shared/`: Shared TypeScript types, state stores, and query custom hooks.

### 1.1 State and Data Synchronization Architecture
- **Global State (`Zustand`)**: Global states are split into `authStore.ts` (manages `accessToken`, `refreshToken`, and session clearance) and `plannerStore.ts` (manages active calendar ID and list cache of calendars, categories, events, and tasks).
- **Asynchronous Cache (`TanStack Query`)**: Web and mobile UI layers bind to `shared/src/queries/plannerHooks.ts`. The custom hook `usePlannerSnapshot` polls or fetches calendar, category, event, and task resources in a single combined fetch request `apiClient.plannerSnapshot()`, syncing the response into the Zustand `plannerStore` via `syncPlanner` in a `useEffect`.
- **API Communication (`fetch` client)**: A central `apiClient.ts` handles network requests using a standardized fetch wrapper `request<T>`. Dynamic environment configuration chooses `EXPO_PUBLIC_API_BASE_URL` or `VITE_API_BASE_URL`.

### 1.2 Web & Mobile Layout Patterns
- **Web Layout**: Built inside a CSS grid shell (`app-shell`). Splits into `setup-grid` (auth panels and creation controls) and `content-grid` (a left column containing `WeekRail` and `MonthGrid`, and a right `TaskSidebar`).
- **Mobile Layout**: Employs React Native's `SafeAreaView` and `ScrollView` for single-page scrolling. Combines scheduled events using custom cards (`EventCard`) and incomplete task lists using touchable rows (`TaskRow`). NativeWind styling is used to achieve matching styling source patterns with the web app.

---

## 2. N = 9 Core Features List

We have identified 9 core client-facing features that capture the primary user workflows and core domain values:

1. **User Authentication & Session Lifecycle (Auth)**: Custom register, login, sign out, and token storage operations.
2. **Multi-Calendar Workspace Selection & Creation (Calendar)**: Selecting and switching active calendars, updating space contexts.
3. **Custom Category & Color Picker Management (Category)**: Defining planning scopes with customizable Hex color codes.
4. **Calendar Event Creation & Scheduling (Event CRUD)**: Adding, editing, and checking scheduled calendar events.
5. **Month Grid Calendar Layout & Density Rendering (Month Grid)**: Standard 42-day calendar cells with event pills and overflow indicators.
6. **Week Rail Short-Term Glance View (Week Rail)**: Short-term 7-day glance view showing days, dates, and event highlights.
7. **Task Lifecycle Management & Priority Configuration (Task CRUD)**: Creating, sorting, and toggling tasks, with priority badges.
8. **Rollover Continuity & Overdue Task Indicator (Rollover Shield)**: Highlighting overdue tasks and preparing them for day-to-day carrying-over.
9. **Mobile Scrollable Layout & Responsive Adaptability (Mobile Layout)**: SafeAreaView, scroll navigation, event cards, and style synchronization.

---

## 3. Tiered Test Suite Matrix (104 Test Cases)

### Tier 1: Feature Coverage (45 Test Cases, 5 per feature)

#### Feature 1: User Authentication & Session Lifecycle
* **TC-T1-F1-01: Toggle Auth Modes**
  - *Description*: Verify users can toggle the AuthPanel between 'login' and 'register' mode.
  - *Inputs*: Click 'Register' segment button, then click 'Login' segment button.
  - *Expectation*: Input form updates fields (e.g., Nickname field appears only in 'Register' mode).
* **TC-T1-F1-02: Form State Local Update**
  - *Description*: Verify typing into the email, password, and nickname inputs updates the React state values.
  - *Inputs*: Type text into the email and password inputs.
  - *Expectation*: The input element values match the typed characters.
* **TC-T1-F1-03: Local Registration Workflow**
  - *Description*: Verify that registering with credentials calls `apiClient.register` and retrieves user object.
  - *Inputs*: Fill registration credentials and submit.
  - *Expectation*: API client executes POST request, returns 200 OK, transitions to token generation.
* **TC-T1-F1-04: Local Login Token Storage**
  - *Description*: Verify logging in sets access and refresh tokens in `authStore` and `localStorage`.
  - *Inputs*: Fill email/password, click "Connect".
  - *Expectation*: Zustand store updates `accessToken`, `localStorage` has token keys, page re-renders.
* **TC-T1-F1-05: User Sign Out Lifecycle**
  - *Description*: Verify signing out clears all authentication tokens.
  - *Inputs*: Click "Sign out" button in AuthPanel.
  - *Expectation*: Tokens are removed from store, `localStorage.removeItem` is called, state reverts to unauthenticated.

#### Feature 2: Multi-Calendar Workspace Selection & Creation
* **TC-T1-F2-01: Empty State Default**
  - *Description*: Verify dropdown displays "No calendar" and controls are disabled when calendar list is empty.
  - *Inputs*: Initialize store with empty calendars list.
  - *Expectation*: "No calendar" option selected, form inputs (Category, Event, Task) are disabled.
* **TC-T1-F2-02: Create Calendar Action**
  - *Description*: Verify typing a calendar name and clicking submit calls creation hook.
  - *Inputs*: Type "Work Calendar", click "Add Calendar".
  - *Expectation*: API receives POST request with title and color, `queryClient.invalidateQueries` triggers.
* **TC-T1-F2-03: Switch Active Calendar**
  - *Description*: Verify changing the dropdown selector updates the active calendar ID in Zustand.
  - *Inputs*: Select a calendar option with ID 42 from the dropdown.
  - *Expectation*: `usePlannerStore.getState().activeCalendarId` becomes 42.
* **TC-T1-F2-04: Dynamic Count in Header**
  - *Description*: Verify the top bar header displays the correct number of registered calendars.
  - *Inputs*: Load store with 3 calendar items.
  - *Expectation*: Header displays text "3 calendars".
* **TC-T1-F2-05: Selection State Persistence**
  - *Description*: Verify active calendar selection persists after rendering updates.
  - *Inputs*: Select calendar 2, trigger a dummy re-render.
  - *Expectation*: Selector element value remains 2.

#### Feature 3: Custom Category & Color Picker Management
* **TC-T1-F3-01: Category Form Disable Rules**
  - *Description*: Verify category creation form inputs are disabled if no calendar is selected.
  - *Inputs*: Set `activeCalendarId` to `null`.
  - *Expectation*: Category title input and color picker input have `disabled` attribute set to true.
* **TC-T1-F3-02: Color Selection Update**
  - *Description*: Verify choosing a color in the color input updates the color picker state.
  - *Inputs*: Change color input value to `#FF5733`.
  - *Expectation*: Color picker element reflects `#FF5733`.
* **TC-T1-F3-03: Create Category Action**
  - *Description*: Verify submitting the category form calls `createCategory` mutation.
  - *Inputs*: Type "Health", select color `#00FF00`, submit.
  - *Expectation*: POST sent to `/categories/` containing calendar ID, name, and color.
* **TC-T1-F3-04: Category Filtering by Calendar**
  - *Description*: Verify category controls only list categories belonging to the selected calendar.
  - *Inputs*: Configure mock categories with mixed calendar IDs.
  - *Expectation*: Only categories matching active calendar ID are available/selected.
* **TC-T1-F3-05: Category Listing Sync**
  - *Description*: Verify categories are successfully synchronized in the store after addition.
  - *Inputs*: Add a category via hook.
  - *Expectation*: `usePlannerStore.getState().categories` includes the new category entity.

#### Feature 4: Calendar Event Creation & Scheduling
* **TC-T1-F4-01: Event Creation Input Handlers**
  - *Description*: Verify filling the event title and times updates form state.
  - *Inputs*: Fill title "Standup", set start and end datetime-local.
  - *Expectation*: Form values match inputs.
* **TC-T1-F4-02: Create Event API Hook**
  - *Description*: Verify that submitting the event form triggers the event creation API endpoint.
  - *Inputs*: Click "Add Event" with form populated.
  - *Expectation*: POST request sent to `/events/` containing payload fields.
* **TC-T1-F4-03: Event Category Binding**
  - *Description*: Verify the created event includes the category ID selected in the workspace.
  - *Inputs*: Select category with ID 5, fill event fields, click submit.
  - *Expectation*: Event payload has `category: 5`.
* **TC-T1-F4-04: Event Count Display Update**
  - *Description*: Verify MonthGrid header shows updated number of scheduled events.
  - *Inputs*: Synchronize store with 4 events.
  - *Expectation*: Header displays "4 scheduled events".
* **TC-T1-F4-05: Form State Reset on Success**
  - *Description*: Verify event form resets to default input values after successful event creation.
  - *Inputs*: Successfully trigger `useCreateEvent` mutation resolution.
  - *Expectation*: Form title input returns to default "Focused planning block".

#### Feature 5: Month Grid Calendar Layout & Density Rendering
* **TC-T1-F5-01: Header Date Parsing**
  - *Description*: Verify MonthGrid displays month name and year of the anchor date.
  - *Inputs*: Set anchor date to `2026-07-04`.
  - *Expectation*: Grid heading reads "July 2026".
* **TC-T1-F5-02: 42-Cell Grid Generation**
  - *Description*: Verify month calendar renders exactly 42 cell blocks.
  - *Inputs*: Render MonthGrid component.
  - *Expectation*: Document contains exactly 42 elements with class name `date-cell`.
* **TC-T1-F5-03: Event Pill Rendering**
  - *Description*: Verify events on a specific date render as pills inside the correct day cell.
  - *Inputs*: Inject event starting on `2026-07-04T09:00:00Z`.
  - *Expectation*: Day cell for July 4th contains the event title pill.
* **TC-T1-F5-04: Maximum Pill Constraint**
  - *Description*: Verify day cell renders a maximum of 3 event pills to prevent layout breakage.
  - *Inputs*: Inject 5 events on a single date.
  - *Expectation*: Exactly 3 event pills are rendered.
* **TC-T1-F5-05: Density Overflow Indicator**
  - *Description*: Verify days with more than 3 events render the overflow text `+N`.
  - *Inputs*: Inject 5 events on a single date.
  - *Expectation*: Indicator text shows "+2".

#### Feature 6: Week Rail Short-Term Glance View
* **TC-T1-F6-01: 7-Day Rendering**
  - *Description*: Verify WeekRail displays exactly 7 days of the week.
  - *Inputs*: Render WeekRail component.
  - *Expectation*: Exactly 7 day-column elements (with class `week-day`) are visible.
* **TC-T1-F6-02: Weekday Label Order**
  - *Description*: Verify day columns are labeled Sun through Sat in chronological order.
  - *Inputs*: View WeekRail elements.
  - *Expectation*: Weekday headers render "Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat".
* **TC-T1-F6-03: Date Label Correctness**
  - *Description*: Verify dates shown match the dates of the current week container.
  - *Inputs*: Set anchor date to `2026-07-04` (Saturday).
  - *Expectation*: Week starts at Sun June 28th and ends at Sat July 4th.
* **TC-T1-F6-04: Event Matching**
  - *Description*: Verify events within the week range display on their respective days in WeekRail.
  - *Inputs*: Inject event on `2026-07-04`.
  - *Expectation*: Saturday column shows event text.
* **TC-T1-F6-05: Category-Colored Event Labels**
  - *Description*: Verify event titles in the WeekRail render with category hex color styles.
  - *Inputs*: Event category color is `#E53E3E`.
  - *Expectation*: Event small text element style attribute has color set to `#E53E3E`.

#### Feature 7: Task Lifecycle Management & Priority Configuration
* **TC-T1-F7-01: Empty Task State**
  - *Description*: Verify task sidebar displays placeholder copy when task list is empty.
  - *Inputs*: Load empty task array into Zustand.
  - *Expectation*: Renders "No tasks yet. Create one from Planner Setup."
* **TC-T1-F7-02: Create Task Action**
  - *Description*: Verify submitting the task form calls the task creation hook.
  - *Inputs*: Type task title, select "HIGH" priority, submit.
  - *Expectation*: POST call sent to `/tasks/` with target date, title, and priority.
* **TC-T1-F7-03: Priority Level Display**
  - *Description*: Verify rendered task contains the correct priority label.
  - *Inputs*: Inject task with `priority: "HIGH"`.
  - *Expectation*: Task element displays text starting with "HIGH".
* **TC-T1-F7-04: Sorting Constraints**
  - *Description*: Verify tasks are sorted chronologically by target date, then by sorting order.
  - *Inputs*: Load tasks with unsorted dates and order numbers.
  - *Expectation*: Rendered items appear in strict sorted order.
* **TC-T1-F7-05: Task Checkmark Toggle Action**
  - *Description*: Verify clicking a task row triggers the mutation to toggle its completed state.
  - *Inputs*: Click a task row button.
  - *Expectation*: Optimistic update fires `toggleTaskCompletion`, calls PATCH to update backend.

#### Feature 8: Rollover Continuity & Overdue Task Indicator
* **TC-T1-F8-01: Past Incomplete Task Flag**
  - *Description*: Verify incomplete task before today is flagged as overdue.
  - *Inputs*: Set task `is_completed: false`, `target_date: "2026-07-03"`, mock today as `2026-07-04`.
  - *Expectation*: Task row marks `overdue = true`.
* **TC-T1-F8-02: Rollover Visual Badge**
  - *Description*: Verify overdue task renders the rollover icon button `↷`.
  - *Inputs*: Inject overdue task.
  - *Expectation*: Rollover arrow indicator `↷` is visible.
* **TC-T1-F8-03: Rollover Text Cue**
  - *Description*: Verify overdue task displays the "rollover ready" text message.
  - *Inputs*: Inject overdue task.
  - *Expectation*: Task subtext contains "rollover ready".
* **TC-T1-F8-04: Past Completed Task Exclusion**
  - *Description*: Verify completed tasks in the past do not get flagged as overdue.
  - *Inputs*: Set task `is_completed: true`, `target_date: "2026-07-03"`.
  - *Expectation*: Task does not show `rollover ready` or `↷`.
* **TC-T1-F8-05: Completion Clears Rollover**
  - *Description*: Verify marking an overdue task as completed immediately clears rollover badges.
  - *Inputs*: Click an overdue task row to mark it complete.
  - *Expectation*: Task gets class `done`, and the `↷` symbol is removed.

#### Feature 9: Mobile Scrollable Layout & Responsive Adaptability
* **TC-T1-F9-01: Mobile Main Page Rendering**
  - *Description*: Verify the mobile planner screen renders without crashing inside simulated container.
  - *Inputs*: Mount the mobile `PlannerScreen` component.
  - *Expectation*: SafeAreaView and root layout elements are rendered.
* **TC-T1-F9-02: ScrollView Layout Nesting**
  - *Description*: Verify the mobile view nests all sections inside a scrollable container.
  - *Inputs*: Look up ScrollView component.
  - *Expectation*: ScrollView is present and wraps the main lists.
* **TC-T1-F9-03: EventCard Render Styling**
  - *Description*: Verify EventCard renders left border matching event category color.
  - *Inputs*: Pass event with category color `#805AD5`.
  - *Expectation*: EventCard style reflects border-left-color `#805AD5`.
* **TC-T1-F9-04: Mobile TaskRow Toggle**
  - *Description*: Verify pressing a mobile TaskRow triggers task completion mutation.
  - *Inputs*: Press TouchableOpacity task row.
  - *Expectation*: Toggle task mutation is executed.
* **TC-T1-F9-05: Mobile Status Banner Indicator**
  - *Description*: Verify mobile header updates sync state message based on queries.
  - *Inputs*: Mock `usePlannerSnapshot` with fetching state.
  - *Expectation*: Header displays "Syncing".

---

### Tier 2: Boundary & Corner Cases (45 Test Cases, 5 per feature)

#### Feature 1: User Authentication & Session Lifecycle
* **TC-T2-F1-01: Malformed Email Input Submission**
  - *Description*: Verify the auth form relies on HTML5 validation for malformed emails.
  - *Inputs*: Type "invalid-email-address" into the email field, submit form.
  - *Expectation*: HTML5 validation blocks submit, or client returns an appropriate error prompt.
* **TC-T2-F1-02: Short Password Attempt**
  - *Description*: Verify auth form behavior or client-side checks for passwords below minimum length.
  - *Inputs*: Enter email and a 2-character password, submit form.
  - *Expectation*: Server validation error is rendered in the UI form message.
* **TC-T2-F1-03: Server Authentication Rejection**
  - *Description*: Verify credentials matching no database records output the exact server-provided error detail.
  - *Inputs*: Submit invalid credentials; mock endpoint response with HTTP 401 and JSON `{ "detail": "No active account found" }`.
  - *Expectation*: Screen displays error message "No active account found".
* **TC-T2-F1-04: Network Request Timeout handling**
  - *Description*: Verify login failure gracefully catches timeout errors without crash.
  - *Inputs*: Attempt connection; mock fetch client to throw a timeout exception.
  - *Expectation*: Form message shows network error or failure status.
* **TC-T2-F1-05: Token Corruption Recovery**
  - *Description*: Verify malformed tokens in localStorage are cleared on component initialization.
  - *Inputs*: Write string `[invalid_jwt]` to localStorage, mount App.
  - *Expectation*: App falls back to login panel and clears the invalid storage value.

#### Feature 2: Multi-Calendar Workspace Selection & Creation
* **TC-T2-F2-01: Calendar Title Length Boundary**
  - *Description*: Verify UI handles extreme calendar titles cleanly.
  - *Inputs*: Type 100+ characters into calendar title, submit.
  - *Expectation*: API payload is transmitted, long title is rendered with ellipse overflow or wraps cleanly.
* **TC-T2-F2-02: Calendar Create API Error Handling**
  - *Description*: Verify calendar creation failures do not disrupt existing UI workspace.
  - *Inputs*: Trigger mutation; mock endpoint to return HTTP 400 Bad Request.
  - *Expectation*: Previous active calendar remains active, and error message logs.
* **TC-T2-F2-03: Dynamic Sync and Reload Empty calendars List**
  - *Description*: Verify switching accounts to a user with zero calendars updates the app cleanly.
  - *Inputs*: Fetch snapshot returning empty calendars list.
  - *Expectation*: Active calendar resets to null, dropdown updates to "No calendar".
* **TC-T2-F2-04: Select Inactive calendar ID**
  - *Description*: Verify selecting a calendar ID not in list handles fallback.
  - *Inputs*: Manually set `activeCalendarId` state to a non-existent ID `999`.
  - *Expectation*: Category and Event creation buttons remain disabled or safely bound to first available calendar.
* **TC-T2-F2-05: Calendar Title Special Characters**
  - *Description*: Verify calendar title containing emojis and symbols renders properly.
  - *Inputs*: Create calendar with title "🚀 Work & Plan 📅".
  - *Expectation*: Created successfully and selector option renders the emoji characters.

#### Feature 3: Custom Category & Color Picker Management
* **TC-T2-F3-01: Empty Category Name Creation**
  - *Description*: Verify submitting category with whitespace name is rejected or handled.
  - *Inputs*: Fill category name with "   " and submit.
  - *Expectation*: Submission fails or HTML5 input validation prevents submission.
* **TC-T2-F3-02: Invalid Color Code Parsing**
  - *Description*: Verify category creations handle unsupported color inputs.
  - *Inputs*: Send category payload with color `rgb(255, 0, 0)`.
  - *Expectation*: Server color rules block request or client defaults gracefully.
* **TC-T2-F3-03: Duplicate Category Names in Same calendar**
  - *Description*: Verify client handles duplicate category names safely.
  - *Inputs*: Add "Meetings" category twice in same calendar.
  - *Expectation*: Both categories are stored with separate IDs and visual color markers.
* **TC-T2-F3-04: Category Assigned to Event Deleted**
  - *Description*: Verify the UI behaves correctly when an event's category has been deleted.
  - *Inputs*: Mock an event where `category_detail` is null or category is deleted.
  - *Expectation*: Event pill falls back to default style `#1F9D8A` and text reads "Uncategorized" on mobile.
* **TC-T2-F3-05: Hex Color Lowercase/Uppercase Standardization**
  - *Description*: Verify different Hex casing formats render styling consistently.
  - *Inputs*: Category colors configured as `#abc` and `#ABCDEF`.
  - *Expectation*: Background overlay calculations and border styling apply both color strings correctly.

#### Feature 4: Calendar Event Creation & Scheduling
* **TC-T2-F4-01: End Time Before Start Time Validation**
  - *Description*: Verify scheduling end time prior to start time is handled or blocked.
  - *Inputs*: Set start time `10:00 AM`, end time `09:00 AM` on same day.
  - *Expectation*: Form submission throws warning or server validation returns error detail.
* **TC-T2-F4-02: Multi-Day Event Splitting**
  - *Description*: Verify an event spanning multiple days is handled cleanly in layout grids.
  - *Inputs*: Create event starting July 4th 22:00 and ending July 5th 08:00.
  - *Expectation*: Renders on respective days or complies with target cell mapping.
* **TC-T2-F4-03: Overlapping Event Milliseconds**
  - *Description*: Verify scheduling concurrent events does not break UI grids.
  - *Inputs*: Add two events with identical starts and ends.
  - *Expectation*: MonthGrid cells render both pills stacked; mobile list displays both EventCards.
* **TC-T2-F4-04: Giant Title / Description Payloads**
  - *Description*: Verify rendering extremely long event descriptions does not deform layout.
  - *Inputs*: Create event with 1000-character description text.
  - *Expectation*: MonthGrid pill truncates; details render inside safety bounds.
* **TC-T2-F4-05: Missing Description Field**
  - *Description*: Verify event creation behaves correctly when description is blank.
  - *Inputs*: Submit event form with blank description field.
  - *Expectation*: Event is scheduled successfully with empty description string.

#### Feature 5: Month Grid Calendar Layout & Density Rendering
* **TC-T2-F5-01: December-to-January Year Transition Grid**
  - *Description*: Verify calendar rendering when anchor date is December 31st.
  - *Inputs*: Set anchor date to `2026-12-31`.
  - *Expectation*: Month cells correctly span from late November 2026 through early January 2027.
* **TC-T2-F5-02: Leap Year Grid Generation**
  - *Description*: Verify February leap year rendering contains February 29th.
  - *Inputs*: Set anchor date to February 2028.
  - *Expectation*: Date cell grid displays exactly 29 cell indexes for February.
* **TC-T2-F5-03: 100+ Events Month Rendering Performance**
  - *Description*: Verify month view displays high volume of events without performance lag.
  - *Inputs*: Populate store with 150 events in a single month range.
  - *Expectation*: Layout mounts cleanly and display constraints limit rendered DOM nodes.
* **TC-T2-F5-04: Missing Category Detail Rendering**
  - *Description*: Verify event with missing category object defaults theme color.
  - *Inputs*: Event category relation set to `null`.
  - *Expectation*: Month cell pill uses fallback border color `#1F9D8A`.
* **TC-T2-F5-05: Timezone Midnight Grid Boundaries**
  - *Description*: Verify event starting close to midnight in local timezone maps to correct day.
  - *Inputs*: Create event with UTC start time mapping to 23:30 local time.
  - *Expectation*: Renders in cell corresponding to correct local calendar date.

#### Feature 6: Week Rail Short-Term Glance View
* **TC-T2-F6-01: End-of-Year Week Wrap**
  - *Description*: Verify week rail behavior when week crosses year boundaries.
  - *Inputs*: Set anchor date to `2026-12-31`.
  - *Expectation*: Week days display correct days for December 2026 and January 2027 in sequence.
* **TC-T2-F6-02: Long Spanning Event Detection**
  - *Description*: Verify event starting before week rail but ending during it is detected.
  - *Inputs*: Event spans from June 20 to July 1. Set week rail to starting June 28.
  - *Expectation*: Week days within active event range show event text markers.
* **TC-T2-F6-03: Midnight Start Alignment**
  - *Description*: Verify event scheduled at exactly midnight (00:00) renders on correct day.
  - *Inputs*: Create event starting `2026-07-04T00:00:00Z`.
  - *Expectation*: Renders on Saturday July 4th column.
* **TC-T2-F6-04: Dynamic Browser Timezone Adjustments**
  - *Description*: Verify WeekRail handles changes to simulated browser timezone location.
  - *Inputs*: Change mock date context timezone.
  - *Expectation*: Week dates and hours adjust to align with local midnight.
* **TC-T2-F6-05: Concurrent Events Sort Order in Week Rail**
  - *Description*: Verify multiple events on same day display in order of start time.
  - *Inputs*: Create events on same day at 14:00 and 08:00.
  - *Expectation*: 08:00 event is rendered above 14:00 event in the day cell.

#### Feature 7: Task Lifecycle Management & Priority Configuration
* **TC-T2-F7-01: Empty Title Task Rejection**
  - *Description*: Verify submitting a task with a blank title is prevented.
  - *Inputs*: Submit task form with title empty.
  - *Expectation*: Submit button remains disabled or HTML5 validator catches error.
* **TC-T2-F7-02: Order Key Duplicate Resolutions**
  - *Description*: Verify tasks with duplicate order keys display without crashing.
  - *Inputs*: Mock tasks list with two elements having `order: 0`.
  - *Expectation*: Grid displays both rows, sorted by primary key or date as secondary sort.
* **TC-T2-F7-03: Task Toggle Server Down Offline behavior**
  - *Description*: Verify task status rollback when mutation fails.
  - *Inputs*: Trigger task checkmark; mock API endpoint to return HTTP 500.
  - *Expectation*: Zustand optimistic update immediately updates state, but reverts to original state upon mutation failure.
* **TC-T2-F7-04: Rapid Double-Click Debounce**
  - *Description*: Verify clicking task checkbox repeatedly sends correct updates.
  - *Inputs*: Click task row twice within 100ms.
  - *Expectation*: Optimistic updates balance correctly; API receives sequential requests.
* **TC-T2-F7-05: Title Script Injection Safety (XSS)**
  - *Description*: Verify task title handles special HTML tags safely.
  - *Inputs*: Create task titled `<script>alert('xss')</script>`.
  - *Expectation*: Renders as text literal; no script execution occurs.

#### Feature 8: Rollover Continuity & Overdue Task Indicator
* **TC-T2-F8-01: Today Task Target Boundary**
  - *Description*: Verify tasks scheduled for the current day do not show rollover indicators.
  - *Inputs*: Task `target_date` is set to today's date.
  - *Expectation*: Task does not show "rollover ready" or `↷`.
* **TC-T2-F8-02: Midnight Boundary Transition**
  - *Description*: Verify crossing midnight immediately marks tasks as rollover ready.
  - *Inputs*: Set task target date to July 4th. Advance system time mock to July 5th 00:01.
  - *Expectation*: Task row state transitions to overdue and shows `↷`.
* **TC-T2-F8-03: Distant Past Rollover Boundary**
  - *Description*: Verify tasks with target dates years in the past display correct overdue badges.
  - *Inputs*: Set task `target_date: "1999-01-01"`.
  - *Expectation*: Rollover indicator renders without causing calendar crashes.
* **TC-T2-F8-04: Multi-Overdue Rollover Sorting**
  - *Description*: Verify sorting layout when multiple overdue tasks exist.
  - *Inputs*: Inject 3 overdue tasks with different dates.
  - *Expectation*: Oldest overdue tasks appear first in the sidebar, chronological order preserved.
* **TC-T2-F8-05: Client Timezone Mid-flight Shift**
  - *Description*: Verify rollover state updates correctly when client time changes.
  - *Inputs*: Switch timezone during active session.
  - *Expectation*: Overdue conditions re-evaluate and display status accordingly.

#### Feature 9: Mobile Scrollable Layout & Responsive Adaptability
* **TC-T2-F9-01: Very Long Scroll View Performance**
  - *Description*: Verify ScrollView handles high volume of events/tasks smoothly in mobile.
  - *Inputs*: Load 200 tasks in Mobile list.
  - *Expectation*: View scrolls smoothly without freeze.
* **TC-T2-F9-02: EventCard Title Wrapping**
  - *Description*: Verify mobile card layout adjusts when title contains continuous long word.
  - *Inputs*: Event title set to "A" repeated 50 times.
  - *Expectation*: NativeWind layout wraps text; cards do not expand horizontally beyond viewport.
* **TC-T2-F9-03: Toggle Task under Latency**
  - *Description*: Verify mobile layout visual integrity during high mutation latency.
  - *Inputs*: Click mobile TaskRow checkbox; mock response latency of 2000ms.
  - *Expectation*: Toggle state updates instantly on screen (optimistic UI feedback).
* **TC-T2-F9-04: Viewport Scaling and Layout**
  - *Description*: Verify mobile view structure on narrow mock screens (e.g. width 320px).
  - *Inputs*: Configure render window width to 320px.
  - *Expectation*: Task checkbox dot, title, and rollover icon remain aligned inside screen bounds.
* **TC-T2-F9-05: Render mobile page when all queries fail**
  - *Description*: Verify mobile screen behaves gracefully when API fails.
  - *Inputs*: Mock `usePlannerSnapshot` to return an API error status.
  - *Expectation*: Mobile header displays "API offline" and placeholder lists show fallback messaging.

---

### Tier 3: Cross-Feature Combinations (9 Test Cases)

* **TC-T3-01: Authentication + Multi-Calendar Switching**
  - *Description*: Changing logged-in account updates workspace calendars and active selection.
  - *Setup*: Active session for User A with 3 calendars. Sign out and sign in as User B with 1 calendar.
  - *Actions*: Perform login flow.
  - *Expectation*: Header updates calendars count to "1 calendars" and dropdown options reflect User B's calendars.
* **TC-T3-02: Multi-Calendar + Category Isolation**
  - *Description*: Verify categories are isolated to specific calendar scopes.
  - *Setup*: Calendar A has category "Deep Work". Calendar B has category "Meeting".
  - *Actions*: Change calendar selection from Calendar A to Calendar B.
  - *Expectation*: Category dropdown resets, and "Deep Work" is no longer available; only "Meeting" is selectable.
* **TC-T3-03: Category Custom Color + Event Grid Rendering**
  - *Description*: Category customization updates the rendering style of calendar events.
  - *Setup*: Create custom category named "Personal Study" with custom color `#8A5CF6`. Create event "Read Book" bound to this category.
  - *Actions*: Load MonthGrid.
  - *Expectation*: MonthGrid event pill for "Read Book" renders border-color `#8A5CF6` and background `#8A5CF618`.
* **TC-T3-04: Event Creation + Week Rail Synchronized Display**
  - *Description*: Creating an event immediately renders in Week Rail.
  - *Setup*: Set active calendar and open controls.
  - *Actions*: Fill event title "Team Sync" on today's date, click "Add Event".
  - *Expectation*: Week Rail day cell for today displays event title "Team Sync" with default color styling.
* **TC-T3-05: Multi-Calendar + Task Selection Isolation**
  - *Description*: Verify tasks list updates based on the active calendar selection.
  - *Setup*: Calendar A contains task "Task A". Calendar B contains task "Task B".
  - *Actions*: Change active calendar dropdown from Calendar A to Calendar B.
  - *Expectation*: Sidebar tasks list updates, hiding "Task A" and rendering "Task B".
* **TC-T3-06: Task Overdue Target + Rollover Sidebar Visibility**
  - *Description*: Creating a past-due task immediately displays it with rollover status in the sidebar.
  - *Setup*: Set active calendar.
  - *Actions*: Submit task creation form with title "Unfinished business" and target date set to yesterday.
  - *Expectation*: Task sidebar updates, rendering the task with the rollover icon `↷` and status subtext.
* **TC-T3-07: Category Custom Color + Mobile EventCard Rendering**
  - *Description*: Verify mobile EventCard theme styles are correctly updated by category color configuration.
  - *Setup*: Configure event categorized under custom color `#EC4899`.
  - *Actions*: Render mobile `PlannerScreen`.
  - *Expectation*: EventCard style reflects border-left-color `#EC4899`.
* **TC-T3-08: Overdue Task + Mobile TaskRow Continuity**
  - *Description*: Verify past-due tasks display with correct indicators in mobile layout.
  - *Setup*: Configure task target date to yesterday.
  - *Actions*: Render mobile `PlannerScreen`.
  - *Expectation*: TaskRow renders the rollover icon `↷` and text `rollover ready` in the list.
* **TC-T3-09: Authentication + Web & Mobile Header Status Sync**
  - *Description*: Verify signing out immediately updates the status banner on both layouts.
  - *Setup*: Authenticated session active.
  - *Actions*: Trigger sign out action.
  - *Expectation*: Web header status shows "Sign in required" and Mobile screen shows "API offline".

---

### Tier 4: Real-World Application Scenarios (5 Test Cases)

* **TC-T4-01: First-Time User Setup Scenario**
  - *Description*: A new user registers, creates a workspace calendar, defines custom categories, schedules events, and adds initial tasks.
  - *Actions*: 
    1. Toggle to register mode, input credentials, and click "Create & Connect".
    2. Add Calendar named "My First Space".
    3. Add Category named "Dev Focus" with color `#3B82F6`.
    4. Add Event named "E2E Architecture Session" from 09:00 to 11:00.
    5. Add Task named "Define E2E features" with HIGH priority.
  - *Expectation*: 
    - Auth completes and user session shows "Connected".
    - Active calendar list contains "My First Space".
    - Event pill "E2E Architecture Session" renders in MonthGrid.
    - Task sidebar renders task with HIGH priority label.
* **TC-T4-02: Midnight Rollover Review Scenario**
  - *Description*: A user views their tasks at the end of the day, the day transitions past midnight, and incomplete tasks are automatically flagged as overdue rollover targets.
  - *Actions*: 
    1. Set task "Finish Report" target date to "2026-07-04".
    2. Set current system clock to 23:59:00 on "2026-07-04".
    3. Verify task appears normal without rollover badges.
    4. Advance clock by 2 minutes to 00:01:00 on "2026-07-05".
  - *Expectation*: 
    - The task target date is now in the past.
    - Task list re-evaluates, adding the "rollover ready" subtext and displaying the rollover icon `↷`.
* **TC-T4-03: High-Congestion Schedule Audit Scenario**
  - *Description*: A user schedules multiple overlapping events, triggering schedule congestion warnings in the mobile dashboard view.
  - *Actions*: 
    1. Create Event 1: July 4th 10:00 to 12:00.
    2. Create Event 2: July 4th 11:00 to 13:00 (overlaps Event 1).
    3. Create Event 3: July 4th 11:30 to 12:30 (overlaps Event 1 & 2).
    4. Load Mobile Screen.
  - *Expectation*: 
    - The congestion warnings are computed by the planner API.
    - Mobile EventCard components render "Schedule congestion detected" warnings for the affected events.
* **TC-T4-04: Cross-Device Offline Resiliency Scenario**
  - *Description*: A mobile user completes tasks while offline, verify optimistic updates, then mock network recovery and verify automatic server synchronization.
  - *Actions*: 
    1. Mock network connection status as offline (intercept and fail network requests).
    2. Press Mobile TaskRow to complete "Sync data structures" task.
    3. Verify task checkbox visually updates to checked immediately (optimistic update).
    4. Restore network connection (enable MSW mock responses).
    5. Trigger TanStack Query query refetch.
  - *Expectation*: 
    - Task remains checked after query resolves successfully.
    - Outgoing PATCH request is successfully processed by MSW mock.
* **TC-T4-05: Multi-Calendar Workspace Context Switch Scenario**
  - *Description*: A user transitions from a highly populated calendar to a new workspace calendar, verifying that all views clean up and display the correct scoped dataset.
  - *Actions*: 
    1. Select Calendar 1 ("Busy Space" with 20 events and 5 tasks).
    2. Select Calendar 2 ("New Space" with 0 events and 0 tasks).
  - *Expectation*: 
    - Week Rail and MonthGrid clean up Calendar 1's event pills.
    - Task Sidebar displays empty state message.
    - Dropdowns show only categories defined for Calendar 2.

---

## 4. Proposed Vitest + JSDOM Testing Architecture

To run both web and mobile component tests within a single, unified test environment, we propose a Vitest + JSDOM simulated testing architecture. This avoids the overhead of booting simulators or headless browsers for unit/integration/E2E test layers.

```text
+---------------------------------------------------------------------------------+
|                                  Vitest Runner                                  |
+---------------------------------------------------------------------------------+
                                         |
                                         v
+---------------------------------------------------------------------------------+
|                            JSDOM Browser Environment                            |
+---------------------------------------------------------------------------------+
          |                                                       |
          v                                                       v
+-------------------+                                   +-------------------+
|      Web App      |                                   |  React Native App |
|   Component DOM   |                                   |   Mocked RN DOM   |
+-------------------+                                   +-------------------+
          |                                                       |
          +---------------------------+---------------------------+
                                      |
                                      v
+---------------------------------------------------------------------------------+
|                                 Custom Wrapper                                  |
|   - Fresh QueryClient per test                         - Zustand reset utility  |
|   - MSW Interception handlers                          - System Clock mocks     |
+---------------------------------------------------------------------------------+
```

### 4.1 Core Strategy & Mocks

1. **JSDOM for React Native**:
   React Native components compile to platforms-specific tags. Under JSDOM, we mock React Native components to render standard HTML elements (`View` -> `div`, `Text` -> `span`, `TouchableOpacity` -> `button`). This allows testing React Native components without a device wrapper.
2. **Global Zustand Store Cleanups**:
   Global stores keep memory state between test files. We export reset routines or run `beforeEach` handlers to reset `useAuthStore` and `usePlannerStore` to their default states.
3. **TanStack Query Isolation**:
   To avoid caching side effects, we wrap tests in a helper `renderWithProviders` that initializes a fresh `QueryClient` with disabled query retries and set garbage collection times to zero.
4. **Network Interception via MSW**:
   We use MSW (Mock Service Worker) to intercept fetch requests, returning simulated REST responses.

### 4.2 Configuration Code Examples

#### `vitest.config.ts`
```typescript
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./test/setup.ts'],
    alias: {
      'react-native': path.resolve(__dirname, './test/mocks/react-native.ts'),
      '@redeeming-time/shared': path.resolve(__dirname, './shared/src/index.ts'),
    },
  },
});
```

#### `test/mocks/react-native.ts`
```typescript
import React from 'react';

export const View = ({ children, className, style, ...props }: any) => {
  return React.createElement('div', { className, style, ...props }, children);
};

export const Text = ({ children, className, style, ...props }: any) => {
  return React.createElement('span', { className, style, ...props }, children);
};

export const TouchableOpacity = ({ children, className, onPress, ...props }: any) => {
  return React.createElement('button', { className, onClick: onPress, ...props }, children);
};

export const ScrollView = ({ children, className, ...props }: any) => {
  return React.createElement('div', { className, style: { overflowY: 'auto' }, ...props }, children);
};

export const SafeAreaView = ({ children, className, ...props }: any) => {
  return React.createElement('div', { className, ...props }, children);
};
```

#### `test/setup.ts`
```typescript
import { beforeAll, afterEach, afterAll, beforeEach } from 'vitest';
import { useAuthStore } from '../shared/src/stores/authStore';
import { usePlannerStore } from '../shared/src/stores/plannerStore';
import { setupServer } from 'msw/node';
import { handlers } from './mocks/handlers';

// Setup Mock Service Worker for API interception
export const server = setupServer(...handlers);

beforeAll(() => server.listen());
afterEach(() => {
  server.resetHandlers();
});
afterAll(() => server.close());

// Reset Zustand Stores to default state before each test
const initialAuthState = {
  accessToken: null,
  refreshToken: null,
};

const initialPlannerState = {
  activeCalendarId: null,
  calendars: [],
  categories: [],
  events: [],
  tasks: [],
};

beforeEach(() => {
  useAuthStore.setState(initialAuthState);
  usePlannerStore.setState(initialPlannerState);
  localStorage.clear();
});
```

#### `test/test-utils.tsx`
```typescript
import React from 'react';
import { render } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

export function renderWithProviders(ui: React.ReactElement) {
  const testQueryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
      },
    },
  });

  return render(
    <QueryClientProvider client={testQueryClient}>
      {ui}
    </QueryClientProvider>
  );
}
```

#### Example Web Component Test: `test/web-auth.test.tsx`
```typescript
import { screen, fireEvent, waitFor } from '@testing-library/react';
import App from '../apps/web/src/App';
import { renderWithProviders } from './test-utils';
import { useAuthStore } from '../shared/src/stores/authStore';
import { server } from './setup';
import { http, HttpResponse } from 'msw';
import { API_BASE_URL } from '../shared/src/api/client';

describe('AuthPanel Integration', () => {
  it('should authenticate user and store tokens on login submit', async () => {
    server.use(
      http.post(`${API_BASE_URL}/auth/token/`, () => {
        return HttpResponse.json({ access: 'fake-access-token', refresh: 'fake-refresh-token' });
      })
    );

    renderWithProviders(<App />);

    // Check default mode is Login
    expect(screen.getByText('Login')).toBeInTheDocument();

    const emailInput = screen.getByPlaceholderText('Email');
    const passwordInput = screen.getByPlaceholderText('Password');
    const connectButton = screen.getByText('Connect');

    fireEvent.change(emailInput, { target: { value: 'demo@example.com' } });
    fireEvent.change(passwordInput, { target: { value: 'password123' } });
    fireEvent.click(connectButton);

    await waitFor(() => {
      expect(useAuthStore.getState().accessToken).toBe('fake-access-token');
      expect(screen.getByText('Connected Session')).toBeInTheDocument();
    });
  });
});
```

#### Example Mobile Component Test: `test/mobile-planner.test.tsx`
```typescript
import { screen, fireEvent, waitFor } from '@testing-library/react';
import PlannerScreen from '../apps/app/App';
import { renderWithProviders } from './test-utils';
import { usePlannerStore } from '../shared/src/stores/plannerStore';
import { Task } from '../shared/src/types';

describe('Mobile PlannerScreen Integration', () => {
  it('should render event cards and handle task completion tap', async () => {
    const mockTask: Task = {
      id: 1,
      calendar: 1,
      creator: 1,
      title: 'Study React Native Testing',
      is_completed: false,
      target_date: '2026-07-04',
      priority: 'HIGH',
      order: 1,
      created_at: '',
      updated_at: '',
    };

    usePlannerStore.setState({
      tasks: [mockTask],
      calendars: [{ id: 1, title: 'Personal', description: '', theme_color: '#1F9D8A', created_at: '' }],
    });

    renderWithProviders(<PlannerScreen />);

    // Verify task element is rendered
    expect(screen.getByText('Study React Native Testing')).toBeInTheDocument();
    expect(screen.getByText(/HIGH · 2026-07-04/)).toBeInTheDocument();

    // Verify tick circle is empty
    const checkCircle = screen.queryByText('✓');
    expect(checkCircle).toBeNull();

    // Tap task row to complete
    const taskRowButton = screen.getByText('Study React Native Testing').closest('button');
    expect(taskRowButton).not.toBeNull();
    fireEvent.click(taskRowButton!);

    // Expect Zustand store and DOM update immediately
    await waitFor(() => {
      expect(usePlannerStore.getState().tasks[0].is_completed).toBe(true);
    });
  });
});
```
