# Handoff Report: react-router-dom and Auth Protection Analysis (Milestone 2)

## 1. Observation
I directly observed the structure of the web application and shared auth package. Below are the key findings and exact code blocks retrieved:

### A. Missing Router Dependency (`redeeming-time-frontend/apps/web/package.json`)
Lines 11-19:
```json
  "dependencies": {
    "@redeeming-time/shared": "file:../../shared",
    "@tanstack/react-query": "^5.90.0",
    "@vitejs/plugin-react": "^5.0.0",
    "vite": "^7.0.0",
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "zustand": "^5.0.0"
  },
```
There is no `react-router-dom` in the dependencies block.

### B. App Component Setup (`redeeming-time-frontend/apps/web/src/App.tsx`)
Lines 314-348:
```tsx
export default function App() {
  const [anchor] = useState(new Date());
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated());
  const snapshot = usePlannerSnapshot();
  const events = usePlannerStore((state) => state.events);
  const tasks = usePlannerStore((state) => state.tasks);
  const calendars = usePlannerStore((state) => state.calendars);
  const categories = usePlannerStore((state) => state.categories);

  return (
    <main className="app-shell">
      <header className="topbar">
        <div>
          <p className="eyebrow">Redeeming Time</p>
          <h1>Daily Schedule Planner</h1>
        </div>
        <div className="status-strip">
          <span>{calendars.length} calendars</span>
          <span>{isAuthenticated ? snapshot.isFetching ? 'Syncing' : snapshot.isError ? 'API needs attention' : 'Synced' : 'Sign in required'}</span>
        </div>
      </header>
      <div className="setup-grid">
        <AuthPanel />
        {isAuthenticated && <CalendarControls calendars={calendars} categories={categories} />}
      </div>
      <div className="content-grid">
        <div className="main-column">
          <WeekRail events={events} anchor={anchor} />
          <MonthGrid events={events} anchor={anchor} />
        </div>
        <TaskSidebar tasks={tasks} />
      </div>
    </main>
  );
}
```
Currently, `App` renders the core layout unconditionally and embeds `<AuthPanel />` directly in the setup grid.

### C. Application Mounting (`redeeming-time-frontend/apps/web/src/main.tsx`)
Lines 9-15:
```tsx
ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </React.StrictMode>,
);
```
No router providers wrap the `App` component.

### D. Shared Auth Store Definition (`redeeming-time-frontend/shared/src/stores/authStore.ts`)
Lines 13-20:
```typescript
interface AuthState {
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: () => boolean;
  setTokens: (tokens: { access: string; refresh: string }) => void;
  clearTokens: () => void;
  authorizationHeader: () => Record<string, string>;
}
```
And lines 22-25:
```typescript
export const useAuthStore = create<AuthState>((set, get) => ({
  accessToken: storage?.getItem(accessKey) ?? null,
  refreshToken: storage?.getItem(refreshKey) ?? null,
  isAuthenticated: () => Boolean(get().accessToken),
```
The store retrieves tokens from `localStorage` on instantiation and updates state reactively when `setTokens` or `clearTokens` are invoked.

---

## 2. Logic Chain
1. **Dependency Analysis**: Based on the observation in **1.A**, the app lacks `react-router-dom`. Because `react` and `react-dom` are at `^19.0.0`, the added `react-router-dom` dependency must be compatible with React 19. Version `^6.28.0` (or `^7.0.0`) is the correct choice.
2. **Mounting Setup**: Based on **1.C**, routing context must be available throughout the application. Wrapping `<App />` with `<BrowserRouter>` in `main.tsx` provides this.
3. **Route Separation and Protection**: Based on **1.B**, the current layout couples the auth panel and planning dashboard. To support `/login` and `/dashboard` routes, we can extract the login header/panel layout into a `LoginPage` component and the remainder of the calendar layout into a `DashboardPage` component.
4. **Reactivity & Redirects**: Based on **1.D**, `useAuthStore`'s `isAuthenticated()` selector evaluates whether the user holds an active `accessToken`. By invoking `useAuthStore((state) => state.isAuthenticated())` in both page components, React will re-evaluate authentication state upon token updates. We can then conditionally return `<Navigate to="/login" replace />` in `DashboardPage` or `<Navigate to="/dashboard" replace />` in `LoginPage` to enforce routing security reactively.

---

## 3. Caveats
- **Mock / Fake Token Lifetimes**: This analysis assumes JWT expiration is handled by API interceptors. It does not implement token refreshing within the route guard itself.
- **SSR Compatibility**: Although not currently used, `authStore.ts` checks for `globalThis.localStorage` before reading, meaning it won't crash in SSR or React Native environments.

---

## 4. Conclusion
Integrating `react-router-dom` is straightforward:
1. Add `"react-router-dom": "^6.28.0"` to `apps/web/package.json`.
2. Wrap `<App />` in `<BrowserRouter>` in `apps/web/src/main.tsx`.
3. Refactor `apps/web/src/App.tsx` by separating the layout into `LoginPage` and `DashboardPage` components, utilizing `<Navigate />` for reactive redirect-based route protection, and defining the routes (`/login`, `/dashboard`, and fallback `*`) within the default `App` export.

Detailed implementation code is saved in `/Users/kangdy25/Programming/Web/Redeeming_Time/.agents/explorer_m2/analysis.md`.

---

## 5. Verification Method
An implementer can verify the correctness of these changes by performing:
1. **Static Typing & Compilation Verification**:
   Execute the Vite type check command:
   ```bash
   npm --workspace @redeeming-time/web run build
   ```
2. **Access Security Verification**:
   - Navigate to `/dashboard` directly and confirm a redirect to `/login`.
   - Log in using valid credentials; verify automatic redirection to `/dashboard`.
   - Attempt to navigate back to `/login` when logged in; verify you are redirected back to `/dashboard`.
   - Click "Sign out" and verify redirection to `/login`.
