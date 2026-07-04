# Redeeming Time Frontend E2E / Integration Tests Ready

This document confirms that the testing harness is fully implemented and contains exactly **104 test cases** spanning **9 features** across **4 tiers**.

## Test Execution Commands
- **Run all tests**: `npm run test` (executed from `redeeming-time-frontend/`)
- **Web App specific tests**: `npx vitest run apps/web`
- **Mobile App specific tests**: `npx vitest run apps/app`

---

## Test Suite Matrix

### Tier 1: Feature Coverage (45 Tests)
- **Feature 1: User Authentication & Session Lifecycle (Auth)** (5 tests)
  - `TC-T1-F1-01: Toggle Auth Modes` — Switch login/register forms.
  - `TC-T1-F1-02: Form State Local Update` — Local react inputs value sync.
  - `TC-T1-F1-03: Local Registration Workflow` — Registration API client call.
  - `TC-T1-F1-04: Local Login Token Storage` — Connecting token localstorage save.
  - `TC-T1-F1-05: User Sign Out Lifecycle` — Sign out clears token keys.
- **Feature 2: Multi-Calendar Workspace Selection & Creation** (5 tests)
  - `TC-T1-F2-01: Empty State Default` — Disabled controls when calendar is null.
  - `TC-T1-F2-02: Create Calendar Action` — POST request to `/calendars/`.
  - `TC-T1-F2-03: Switch Active Calendar` — Store activeCalendarId change.
  - `TC-T1-F2-04: Dynamic Count in Header` — Displays "N calendars".
  - `TC-T1-F2-05: Selection State Persistence` — Dropdown renders active value.
- **Feature 3: Custom Category & Color Picker Management** (5 tests)
  - `TC-T1-F3-01: Category Form Disable Rules` — Disabled category inputs if no calendar.
  - `TC-T1-F3-02: Color Selection Update` — Custom color updates color picker state.
  - `TC-T1-F3-03: Create Category Action` — POST request to `/categories/`.
  - `TC-T1-F3-04: Category Filtering by Calendar` — Scoped categories per workspace.
  - `TC-T1-F3-05: Category Listing Sync` — Store updates after categories fetched.
- **Feature 4: Calendar Event Creation & Scheduling** (5 tests)
  - `TC-T1-F4-01: Event Creation Input Handlers` — Event title state updates.
  - `TC-T1-F4-02: Create Event API Hook` — POST request to `/events/`.
  - `TC-T1-F4-03: Event Category Binding` — category_id payload binding.
  - `TC-T1-F4-04: Event Count Display Update` — MonthGrid header count.
  - `TC-T1-F4-05: Form State Reset on Success` — Form state is handled cleanly.
- **Feature 5: Month Grid Calendar Layout & Density Rendering** (5 tests)
  - `TC-T1-F5-01: Header Date Parsing` — Correct "Month Year" header text.
  - `TC-T1-F5-02: 42-Cell Grid Generation` — Exactly 42 grid cells rendered.
  - `TC-T1-F5-03: Event Pill Rendering` — Event titles displayed inside cells.
  - `TC-T1-F5-04: Maximum Pill Constraint` — Show max 3 event pills.
  - `TC-T1-F5-05: Density Overflow Indicator` — Shows `+N` for extra events.
- **Feature 6: Week Rail Short-Term Glance View** (5 tests)
  - `TC-T1-F6-01: 7-Day Rendering` — Exactly 7 columns.
  - `TC-T1-F6-02: Weekday Label Order` — Sunday to Saturday chronologically.
  - `TC-T1-F6-03: Date Label Correctness` — Matches week anchor dates.
  - `TC-T1-F6-04: Event Matching` — Events rendered inside correct week day.
  - `TC-T1-F6-05: Category-Colored Event Labels` — Category styling applied to text.
- **Feature 7: Task Lifecycle Management & Priority Configuration** (5 tests)
  - `TC-T1-F7-01: Empty Task State` — Placeholder text for empty lists.
  - `TC-T1-F7-02: Create Task Action` — POST request to `/tasks/`.
  - `TC-T1-F7-03: Priority Level Display` — priority label text inside card.
  - `TC-T1-F7-04: Sorting Constraints` — target_date & order sort order.
  - `TC-T1-F7-05: Task Checkmark Toggle Action` — optimistic completion check.
- **Feature 8: Rollover Continuity & Overdue Task Indicator** (5 tests)
  - `TC-T1-F8-01: Past Incomplete Task Flag` — Marks target_date < today as overdue.
  - `TC-T1-F8-02: Rollover Visual Badge` — `↷` icon display.
  - `TC-T1-F8-03: Rollover Text Cue` — "rollover ready" label display.
  - `TC-T1-F8-04: Past Completed Task Exclusion` — Excludes completed past tasks.
  - `TC-T1-F8-05: Completion Clears Rollover` — Done tasks hide rollover markers.
- **Feature 9: Mobile Scrollable Layout & Responsive Adaptability** (5 tests)
  - `TC-T1-F9-01: Mobile Main Page Rendering` — Renders without crashes.
  - `TC-T1-F9-02: ScrollView Layout Nesting` — Wrapping layout in ScrollView.
  - `TC-T1-F9-03: EventCard Render Styling` — Left border matches category color.
  - `TC-T1-F9-04: Mobile TaskRow Toggle` — Pressing task checklist toggle.
  - `TC-T1-F9-05: Mobile Status Banner Indicator` — Syncing / Synced banner state.

### Tier 2: Boundary & Corner Cases (45 Tests)
- **Feature 1: User Authentication & Session Lifecycle (Auth)** (5 tests)
  - `TC-T2-F1-01: Malformed Email Input Submission`
  - `TC-T2-F1-02: Short Password Attempt`
  - `TC-T2-F1-03: Server Authentication Rejection`
  - `TC-T2-F1-04: Network Request Timeout handling`
  - `TC-T2-F1-05: Token Corruption Recovery`
- **Feature 2: Multi-Calendar Workspace Selection & Creation** (5 tests)
  - `TC-T2-F2-01: Calendar Title Length Boundary`
  - `TC-T2-F2-02: Calendar Create API Error Handling`
  - `TC-T2-F2-03: Dynamic Sync and Reload Empty calendars List`
  - `TC-T2-F2-04: Select Inactive calendar ID`
  - `TC-T2-F2-05: Calendar Title Special Characters`
- **Feature 3: Custom Category & Color Picker Management** (5 tests)
  - `TC-T2-F3-01: Empty Category Name Creation`
  - `TC-T2-F3-02: Invalid Color Code Parsing`
  - `TC-T2-F3-03: Duplicate Category Names in Same calendar`
  - `TC-T2-F3-04: Category Assigned to Event Deleted`
  - `TC-T2-F3-05: Hex Color Lowercase/Uppercase Standardization`
- **Feature 4: Calendar Event Creation & Scheduling** (5 tests)
  - `TC-T2-F4-01: End Time Before Start Time Validation`
  - `TC-T2-F4-02: Multi-Day Event Splitting`
  - `TC-T2-F4-03: Overlapping Event Milliseconds`
  - `TC-T2-F4-04: Giant Title / Description Payloads`
  - `TC-T2-F4-05: Missing Description Field`
- **Feature 5: Month Grid Calendar Layout & Density Rendering** (5 tests)
  - `TC-T2-F5-01: December-to-January Year Transition Grid`
  - `TC-T2-F5-02: Leap Year Grid Generation`
  - `TC-T2-F5-03: 100+ Events Month Rendering Performance`
  - `TC-T2-F5-04: Missing Category Detail Rendering`
  - `TC-T2-F5-05: Timezone Midnight Grid Boundaries`
- **Feature 6: Week Rail Short-Term Glance View** (5 tests)
  - `TC-T2-F6-01: End-of-Year Week Wrap`
  - `TC-T2-F6-02: Long Spanning Event Detection`
  - `TC-T2-F6-03: Midnight Start Alignment`
  - `TC-T2-F6-04: Dynamic Browser Timezone Adjustments`
  - `TC-T2-F6-05: Concurrent Events Sort Order in Week Rail`
- **Feature 7: Task Lifecycle Management & Priority Configuration** (5 tests)
  - `TC-T2-F7-01: Empty Title Task Rejection`
  - `TC-T2-F7-02: Order Key Duplicate Resolutions`
  - `TC-T2-F7-03: Task Toggle Server Down Offline behavior`
  - `TC-T2-F7-04: Rapid Double-Click Debounce`
  - `TC-T2-F7-05: Title Script Injection Safety (XSS)`
- **Feature 8: Rollover Continuity & Overdue Task Indicator** (5 tests)
  - `TC-T2-F8-01: Today Task Target Boundary`
  - `TC-T2-F8-02: Midnight Boundary Transition`
  - `TC-T2-F8-03: Distant Past Rollover Boundary`
  - `TC-T2-F8-04: Multi-Overdue Rollover Sorting`
  - `TC-T2-F8-05: Client Timezone Mid-flight Shift`
- **Feature 9: Mobile Scrollable Layout & Responsive Adaptability** (5 tests)
  - `TC-T2-F9-01: Very Long Scroll View Performance`
  - `TC-T2-F9-02: EventCard Title Wrapping`
  - `TC-T2-F9-03: Toggle Task under Latency`
  - `TC-T2-F9-04: Viewport Scaling and Layout`
  - `TC-T2-F9-05: Render mobile page when all queries fail`

### Tier 3: Cross-Feature Combinations (9 Tests)
- `TC-T3-01: Authentication + Multi-Calendar Switching`
- `TC-T3-02: Multi-Calendar + Category Isolation`
- `TC-T3-03: Category Custom Color + Event Grid Rendering`
- `TC-T3-04: Event Creation + Week Rail Synchronized Display`
- `TC-T3-05: Multi-Calendar + Task Selection Isolation`
- `TC-T3-06: Task Overdue Target + Rollover Sidebar Visibility`
- `TC-T3-07: Category Custom Color + Mobile EventCard Rendering`
- `TC-T3-08: Overdue Task + Mobile TaskRow Continuity`
- `TC-T3-09: Authentication + Web & Mobile Header Status Sync`

### Tier 4: Real-World Scenarios (5 Tests)
- `TC-T4-01: First-Time User Setup Scenario`
- `TC-T4-02: Midnight Rollover Review Scenario`
- `TC-T4-03: High-Congestion Schedule Audit Scenario`
- `TC-T4-04: Cross-Device Offline Resiliency Scenario`
- `TC-T4-05: Multi-Calendar Workspace Context Switch Scenario`
