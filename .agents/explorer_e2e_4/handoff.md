# Handoff Report: E2E and Integration Test Fix Plan

## 1. Observation
I directly observed the following self-certifying dummy test cases within the test suites:

1. **TC-T2-F7-01: Empty Title Task Rejection**
   - **Path**: `redeeming-time-frontend/apps/app/App.test.tsx:98-108`
   - **Verbatim Code**:
     ```typescript
     test('TC-T2-F7-01: Empty Title Task Rejection', () => {
       const emptyPayload = {
         calendar: 1,
         title: '',
         target_date: '2026-07-04',
         priority: 'MEDIUM' as const,
         order: 0
       };
       // Verifies client model validation throws or defaults
       expect(emptyPayload.title).toBe('');
     });
     ```

2. **TC-T2-F8-02: Midnight Boundary Transition**
   - **Path**: `redeeming-time-frontend/apps/app/App.test.tsx:257-262`
   - **Verbatim Code**:
     ```typescript
     test('TC-T2-F8-02: Midnight Boundary Transition', () => {
       const task = { id: 200, target_date: '2026-07-04', is_completed: false };
       const todayString = '2026-07-05'; // clock advanced past midnight
       const overdue = !task.is_completed && task.target_date < todayString;
       expect(overdue).toBe(true);
     });
     ```

3. **TC-T2-F8-05: Client Timezone Mid-flight Shift**
   - **Path**: `redeeming-time-frontend/apps/app/App.test.tsx:288-293`
   - **Verbatim Code**:
     ```typescript
     test('TC-T2-F8-05: Client Timezone Mid-flight Shift', () => {
       // Simulates checking overdue using different timezone base
       const targetUtc = '2026-07-03T23:30:00Z';
       const userDateLocalStr = new Date(targetUtc).toLocaleDateString(undefined, { year: 'numeric', month: '2-digit', day: '2-digit' });
       expect(userDateLocalStr).toBeDefined();
     });
     ```

4. **TC-T3-02: Multi-Calendar + Category Isolation**
   - **Path**: `redeeming-time-frontend/apps/app/App.test.tsx:461-470`
   - **Verbatim Code**:
     ```typescript
     test('TC-T3-02: Multi-Calendar + Category Isolation', () => {
       const categories = [
         { id: 10, calendar: 1, name: 'Cat A' },
         { id: 11, calendar: 2, name: 'Cat B' }
       ];
       const activeCal = 2;
       const filtered = categories.filter(c => c.calendar === activeCal);
       expect(filtered.length).toBe(1);
       expect(filtered[0].name).toBe('Cat B');
     });
     ```

5. **TC-T3-04: Event Creation + Week Rail Synchronized Display**
   - **Path**: `redeeming-time-frontend/apps/app/App.test.tsx:496-499`
   - **Verbatim Code**:
     ```typescript
     test('TC-T3-04: Event Creation + Week Rail Synchronized Display', () => {
       const events = [{ title: 'Team Sync', start_time: '2026-07-04T09:00:00Z' }];
       expect(events[0].title).toBe('Team Sync');
     });
     ```

6. **TC-T3-05: Multi-Calendar + Task Selection Isolation**
   - **Path**: `redeeming-time-frontend/apps/app/App.test.tsx:501-510`
   - **Verbatim Code**:
     ```typescript
     test('TC-T3-05: Multi-Calendar + Task Selection Isolation', () => {
       const tasks = [
         { id: 201, calendar: 1, title: 'Task A' },
         { id: 202, calendar: 2, title: 'Task B' }
       ];
       const activeCal = 2;
       const filtered = tasks.filter(t => t.calendar === activeCal);
       expect(filtered.length).toBe(1);
       expect(filtered[0].title).toBe('Task B');
     });
     ```

7. **TC-T2-F5-02: Leap Year Grid Generation**
   - **Path**: `redeeming-time-frontend/apps/web/src/App.test.tsx:678-691`
   - **Verbatim Code**:
     ```typescript
     test('TC-T2-F5-02: Leap Year Grid Generation', () => {
       // Leap year Feb contains 29 days
       const feb2028 = new Date('2028-02-15');
       const first = new Date(feb2028.getFullYear(), feb2028.getMonth(), 1);
       const start = new Date(first);
       start.setDate(first.getDate() - first.getDay());
       const cells = Array.from({ length: 42 }, (_, index) => {
         const date = new Date(start);
         date.setDate(start.getDate() + index);
         return date;
       });
       // Cell should contain Feb 29th
       expect(cells.some(d => d.getFullYear() === 2028 && d.getMonth() === 1 && d.getDate() === 29)).toBe(true);
     });
     ```

8. **TC-T2-F6-01: End-of-Year Week Wrap**
   - **Path**: `redeeming-time-frontend/apps/web/src/App.test.tsx:824-836`
   - **Verbatim Code**:
     ```typescript
     test('TC-T2-F6-01: End-of-Year Week Wrap', () => {
       // Dec 31, 2026 is Thursday
       const anchor = new Date('2026-12-31');
       const weekStart = new Date(anchor);
       weekStart.setDate(anchor.getDate() - anchor.getDay());
       const dates = Array.from({ length: 7 }, (_, i) => {
         const d = new Date(weekStart);
         d.setDate(weekStart.getDate() + i);
         return d.getDate().toString();
       });
       // Starts Sunday Dec 27, ends Sat Jan 2
       expect(dates).toEqual(['27', '28', '29', '30', '31', '1', '2']);
     });
     ```

---

## 2. Logic Chain
1. Under the repository's testing requirements and standard E2E practice, test assertions must evaluate actual production logic, component rendering, or store states.
2. In the 8 cases listed in the **Observation** section, all assertions run calculations on isolated, local variables declared within each test scope.
3. Because these assertions do not interact with the Zustand store state, do not mount the application components, and do not make API calls via the network client, they cannot verify the correctness of the production codebase under these circumstances (self-certifying).
4. Thus, they represent an integrity violation by falsely passing without checking standard system behavior.
5. In order to fix this, we must replace the dummy checks with code that registers real mocks in `mockDb` / MSW, mounts components using `renderWithProviders`, manipulates state via `usePlannerStore`, and alters system clocks via `vi.useFakeTimers()`.

---

## 3. Caveats
- Since this investigation is read-only, I have not modified the source files nor executed the revised tests.
- The proposed timezone mock relies on spying on the global `Intl.DateTimeFormat` object, which is standard in Node.js/Vitest, but might require minor environment-specific adjustments if `Intl` object behaviors are frozen in the environment.

---

## 4. Conclusion
The Forensic Auditor's integrity violation verdict is fully validated. The 8 test cases are artificial and self-certifying. They must be replaced with the authentic behavioral integrations detailed in the accompanying `analysis.md`.

---

## 5. Verification Method
To independently verify:
1. Open `analysis.md` in this directory to view the proposed replacements.
2. Apply the rewrites to `/Users/kangdy25/Programming/Web/Redeeming_Time/redeeming-time-frontend/apps/app/App.test.tsx` and `/Users/kangdy25/Programming/Web/Redeeming_Time/redeeming-time-frontend/apps/web/src/App.test.tsx`.
3. In the terminal, navigate to `/Users/kangdy25/Programming/Web/Redeeming_Time/redeeming-time-frontend`.
4. Run the command:
   ```bash
   npm run test
   ```
5. Confirm that the test suite passes successfully.
6. To verify invalidation, temporarily inject a bug in the production grid math or timezone handler, and confirm that the rewritten tests fail (which they would not have done under the self-certifying dummy versions).
