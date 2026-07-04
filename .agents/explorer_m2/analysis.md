# Milestone 2: Routing and Authentication Protection Integration Analysis

This analysis outlines the required changes to integrate `react-router-dom` in the web application (`apps/web`) to support client-side routing, page division between the Login Screen (`/login`) and the Planner Dashboard (`/dashboard`), and automatic route protection.

---

## 1. Package Dependencies (`apps/web/package.json`)

To enable client-side routing, we need to add `react-router-dom` as a production dependency. Since the project uses React 19, we must install a version of `react-router-dom` that is compatible with React 19.

- **Recommended Dependency**: `"react-router-dom": "^6.28.0"` (or `"react-router-dom": "^7.0.0"`)
- **Type Definitions**: `react-router-dom` contains built-in TypeScript declarations in version 6 and 7, so no additional `@types/react-router-dom` devDependency is required.

### Proposed Diff for `apps/web/package.json`
```json
  "dependencies": {
    "@redeeming-time/shared": "file:../../shared",
    "@tanstack/react-query": "^5.90.0",
    "@vitejs/plugin-react": "^5.0.0",
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
+   "react-router-dom": "^6.28.0",
    "vite": "^7.0.0",
    "zustand": "^5.0.0"
  }
```

---

## 2. Shared Authentication Store & JWT Management

We will use `useAuthStore` from `@redeeming-time/shared` to manage authentication state, retrieve stored tokens, and handle user sign-outs.

### Store Architecture Review
As implemented in `shared/src/stores/authStore.ts`, the auth store exposes the following relevant fields and methods:
1. `accessToken` and `refreshToken`: Hold token strings or `null`. They are automatically initialized from `localStorage` (`redeeming-time.access-token` and `redeeming-time.refresh-token`) on load.
2. `isAuthenticated()`: A selector function returning `Boolean(get().accessToken)`.
3. `setTokens({ access, refresh })`: Saves JWTs to `localStorage` and updates store state.
4. `clearTokens()`: Removes JWTs from `localStorage` and resets store state to `null`.
5. `authorizationHeader()`: Utility to generate a `Bearer <token>` HTTP header, automatically attached to API requests in `shared/src/api/client.ts`.

### Reactivity and Subscription
In React components, we subscribe to authentication changes by invoking the store hook:
```typescript
const isAuthenticated = useAuthStore((state) => state.isAuthenticated());
```
Zustand evaluates this selector whenever the store state changes. If `accessToken` updates from `null` to a token string (or vice-versa), `isAuthenticated()` returns a different boolean value. Zustand detects this value change and triggers a component re-render. This ensures our route protection reacts instantly to logins and logouts.

---

## 3. Code Modifications in `main.tsx`

We need to wrap our core application in `<BrowserRouter>` from `react-router-dom` to enable history tracking and routing contexts throughout the component tree.

### Proposed Code for `apps/web/src/main.tsx`
```tsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from '@redeeming-time/shared';

import App from './App';
import './styles.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </QueryClientProvider>
  </React.StrictMode>,
);
```

---

## 4. Code Modifications in `App.tsx`

We will split the application into separate route targets:
- `/login`: Renders the `LoginPage` component which displays the `AuthPanel`.
- `/dashboard`: Renders the `DashboardPage` component containing the calendar, tasks, and scheduling controls.
- Any other route (`*`): Redirects to `/dashboard` (which will redirect to `/login` if unauthenticated).

### Proposed Route Protection Flow
1. **Unauthenticated Users**: If a user attempts to access `/dashboard` (or any other route) while `isAuthenticated` is `false`, they are redirected using `<Navigate to="/login" replace />`.
2. **Authenticated Users**: If a user attempts to access `/login` (or the root page `/`) while `isAuthenticated` is `true`, they are redirected using `<Navigate to="/dashboard" replace />`.
3. **Logouts**: Clicking the Sign-out button triggers `clearTokens()`. This sets `accessToken` to `null` in the Zustand store, causing `isAuthenticated` to evaluate to `false` and automatically triggering the redirect to `/login`.

### Proposed Code for `apps/web/src/App.tsx`
```tsx
import { FormEvent, useMemo, useState } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import {
  apiClient,
  useAuthStore,
  useCreateCalendar,
  useCreateCategory,
  useCreateEvent,
  useCreateTask,
  usePlannerSnapshot,
  usePlannerStore,
  useToggleTask,
  type Calendar,
  type Category,
  type Event,
  type Task,
  type TaskPriority,
} from '@redeeming-time/shared';

const weekdayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const priorities: TaskPriority[] = ['HIGH', 'MEDIUM', 'LOW', 'NONE'];

function isoDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

function localInputValue(date: Date, hour: number) {
  const next = new Date(date);
  next.setHours(hour, 0, 0, 0);
  return next.toISOString().slice(0, 16);
}

function toApiDateTime(value: string) {
  return new Date(value).toISOString();
}

function monthCells(anchor: Date) {
  const first = new Date(anchor.getFullYear(), anchor.getMonth(), 1);
  const start = new Date(first);
  start.setDate(first.getDate() - first.getDay());
  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(start);
    date.setDate(start.getDate() + index);
    return date;
  });
}

function sameDate(event: Event, date: Date) {
  return event.start_time.slice(0, 10) === isoDate(date);
}

function eventStyle(event: Event) {
  return {
    borderColor: event.category_detail?.color_code ?? '#1F9D8A',
    backgroundColor: `${event.category_detail?.color_code ?? '#1F9D8A'}18`,
  };
}

// ----------------------------------------------------
// AuthPanel Component (Modified for Route Protection)
// ----------------------------------------------------
function AuthPanel() {
  const setTokens = useAuthStore((state) => state.setTokens);
  const clearTokens = useAuthStore((state) => state.clearTokens);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated());
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('demo@example.com');
  const [password, setPassword] = useState('redeeming-demo-pass');
  const [nickname, setNickname] = useState('Demo User');
  const [message, setMessage] = useState('');

  async function submit(event: FormEvent) {
    event.preventDefault();
    setMessage('');
    try {
      if (mode === 'register') {
        await apiClient.register({ email, password, nickname });
      }
      const tokens = await apiClient.token(email, password);
      setTokens(tokens);
      setMessage('Authenticated. Redirecting...');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Authentication failed.');
    }
  }

  return (
    <section className="planner-panel auth-panel">
      <div>
        <p className="eyebrow">Account</p>
        <h2>{isAuthenticated ? 'Connected Session' : mode === 'login' ? 'Login' : 'Create Account'}</h2>
      </div>
      {isAuthenticated ? (
        <button className="primary-button subtle" onClick={clearTokens}>Sign out</button>
      ) : (
        <form className="auth-form" onSubmit={submit}>
          <div className="segmented">
            <button type="button" className={mode === 'login' ? 'active' : ''} onClick={() => setMode('login')}>Login</button>
            <button type="button" className={mode === 'register' ? 'active' : ''} onClick={() => setMode('register')}>Register</button>
          </div>
          <input value={email} onChange={(event) => setEmail(event.target.value)} placeholder="Email" type="email" required />
          {mode === 'register' && (
            <input value={nickname} onChange={(event) => setNickname(event.target.value)} placeholder="Nickname" required />
          )}
          <input value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Password" type="password" required />
          <button className="primary-button" type="submit">{mode === 'login' ? 'Connect' : 'Create & Connect'}</button>
        </form>
      )}
      {message && <p className="form-message">{message}</p>}
    </section>
  );
}

// ----------------------------------------------------
// Other Sub-Components (Preserved)
// ----------------------------------------------------
function CalendarControls({ calendars, categories }: { calendars: Calendar[]; categories: Category[] }) {
  const activeCalendarId = usePlannerStore((state) => state.activeCalendarId);
  const setActiveCalendarId = usePlannerStore((state) => state.setActiveCalendarId);
  const createCalendar = useCreateCalendar();
  const createCategory = useCreateCategory();
  const createEvent = useCreateEvent();
  const createTask = useCreateTask();
  const today = new Date();

  const selectedCalendarId = activeCalendarId ?? calendars[0]?.id ?? 0;
  const selectedCategories = categories.filter((category) => category.calendar === selectedCalendarId);
  const [calendarTitle, setCalendarTitle] = useState('Personal Planner');
  const [categoryName, setCategoryName] = useState('Deep Work');
  const [categoryColor, setCategoryColor] = useState('#1F9D8A');
  const [eventTitle, setEventTitle] = useState('Focused planning block');
  const [eventStart, setEventStart] = useState(localInputValue(today, 9));
  const [eventEnd, setEventEnd] = useState(localInputValue(today, 10));
  const [taskTitle, setTaskTitle] = useState('Review today before evening');
  const [priority, setPriority] = useState<TaskPriority>('MEDIUM');

  async function addCalendar(event: FormEvent) {
    event.preventDefault();
    const calendar = await createCalendar.mutateAsync({
      title: calendarTitle,
      description: 'Primary planning space',
      theme_color: '#1F9D8A',
    });
    setActiveCalendarId(calendar.id);
  }

  async function addCategory(event: FormEvent) {
    event.preventDefault();
    if (!selectedCalendarId) return;
    await createCategory.mutateAsync({
      calendar: selectedCalendarId,
      name: categoryName,
      color_code: categoryColor,
    });
  }

  async function addEvent(event: FormEvent) {
    event.preventDefault();
    if (!selectedCalendarId) return;
    await createEvent.mutateAsync({
      calendar: selectedCalendarId,
      category: selectedCategories[0]?.id ?? null,
      title: eventTitle,
      description: 'Created from the web planner.',
      start_time: toApiDateTime(eventStart),
      end_time: toApiDateTime(eventEnd),
      is_all_day: false,
      rrule: '',
    });
  }

  async function addTask(event: FormEvent) {
    event.preventDefault();
    if (!selectedCalendarId) return;
    await createTask.mutateAsync({
      calendar: selectedCalendarId,
      title: taskTitle,
      target_date: isoDate(today),
      priority,
      order: 0,
    });
  }

  return (
    <section className="planner-panel controls-panel">
      <div className="control-header">
        <div>
          <p className="eyebrow">Planner Setup</p>
          <h2>Create Real Data</h2>
        </div>
        <select value={selectedCalendarId} onChange={(event) => setActiveCalendarId(Number(event.target.value))}>
          {calendars.length === 0 && <option value={0}>No calendar</option>}
          {calendars.map((calendar) => <option value={calendar.id} key={calendar.id}>{calendar.title}</option>)}
        </select>
      </div>
      <div className="control-grid">
        <form onSubmit={addCalendar}>
          <label>Calendar</label>
          <input value={calendarTitle} onChange={(event) => setCalendarTitle(event.target.value)} />
          <button type="submit">Add Calendar</button>
        </form>
        <form onSubmit={addCategory}>
          <label>Category</label>
          <div className="inline-inputs">
            <input value={categoryName} onChange={(event) => setCategoryName(event.target.value)} disabled={!selectedCalendarId} />
            <input aria-label="Category color" value={categoryColor} onChange={(event) => setCategoryColor(event.target.value)} type="color" disabled={!selectedCalendarId} />
          </div>
          <button type="submit" disabled={!selectedCalendarId}>Add Category</button>
        </form>
        <form onSubmit={addEvent}>
          <label>Event</label>
          <input value={eventTitle} onChange={(event) => setEventTitle(event.target.value)} disabled={!selectedCalendarId} />
          <div className="inline-inputs">
            <input value={eventStart} onChange={(event) => setEventStart(event.target.value)} type="datetime-local" disabled={!selectedCalendarId} />
            <input value={eventEnd} onChange={(event) => setEventEnd(event.target.value)} type="datetime-local" disabled={!selectedCalendarId} />
          </div>
          <button type="submit" disabled={!selectedCalendarId}>Add Event</button>
        </form>
        <form onSubmit={addTask}>
          <label>Task</label>
          <input value={taskTitle} onChange={(event) => setTaskTitle(event.target.value)} disabled={!selectedCalendarId} />
          <select value={priority} onChange={(event) => setPriority(event.target.value as TaskPriority)} disabled={!selectedCalendarId}>
            {priorities.map((value) => <option value={value} key={value}>{value}</option>)}
          </select>
          <button type="submit" disabled={!selectedCalendarId}>Add Task</button>
        </form>
      </div>
    </section>
  );
}

function MonthGrid({ events, anchor }: { events: Event[]; anchor: Date }) {
  const cells = useMemo(() => monthCells(anchor), [anchor]);
  const currentMonth = anchor.getMonth();

  return (
    <section className="planner-panel calendar-area">
      <div className="calendar-heading">
        <div>
          <p className="eyebrow">Month</p>
          <h2>{anchor.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}</h2>
        </div>
        <span>{events.length} scheduled events</span>
      </div>
      <div className="month-grid">
        {weekdayLabels.map((day) => <div className="weekday" key={day}>{day}</div>)}
        {cells.map((date) => {
          const dayEvents = events.filter((event) => sameDate(event, date));
          return (
            <div className={`date-cell ${date.getMonth() === currentMonth ? '' : 'muted-cell'}`} key={date.toISOString()}>
              <div className="date-number">{date.getDate()}</div>
              <div className="event-stack">
                {dayEvents.slice(0, 3).map((event) => (
                  <div className="event-pill" style={eventStyle(event)} key={event.id}>{event.title}</div>
                ))}
                {dayEvents.length > 3 && <span className="more-count">+{dayEvents.length - 3}</span>}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function WeekRail({ events, anchor }: { events: Event[]; anchor: Date }) {
  const weekStart = new Date(anchor);
  weekStart.setDate(anchor.getDate() - anchor.getDay());
  const days = Array.from({ length: 7 }, (_, index) => {
    const date = new Date(weekStart);
    date.setDate(weekStart.getDate() + index);
    return date;
  });

  return (
    <section className="week-rail">
      {days.map((date) => (
        <div className="week-day" key={date.toISOString()}>
          <span>{weekdayLabels[date.getDay()]}</span>
          <strong>{date.getDate()}</strong>
          {events.filter((event) => sameDate(event, date)).slice(0, 2).map((event) => (
            <small style={{ color: event.category_detail?.color_code ?? '#1F9D8A' }} key={event.id}>{event.title}</small>
          ))}
        </div>
      ))}
    </section>
  );
}

function TaskSidebar({ tasks }: { tasks: Task[] }) {
  const toggleTask = useToggleTask();
  const today = isoDate(new Date());
  const sortedTasks = [...tasks].sort((a, b) => a.target_date.localeCompare(b.target_date) || a.order - b.order);

  return (
    <aside className="planner-panel task-sidebar">
      <div>
        <p className="eyebrow">Rollover Director</p>
        <h2>Task Continuity</h2>
      </div>
      <div className="task-list">
        {sortedTasks.map((task) => {
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
          );
        })}
        {sortedTasks.length === 0 && <p className="empty-copy">No tasks yet. Create one from Planner Setup.</p>}
      </div>
    </aside>
  );
}

// ----------------------------------------------------
// New Page Components for Routing
// ----------------------------------------------------
export function LoginPage() {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated());

  // Route Protection: If authenticated, redirect to /dashboard
  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <main className="app-shell">
      <header className="topbar">
        <div>
          <p className="eyebrow">Redeeming Time</p>
          <h1>Daily Schedule Planner</h1>
        </div>
        <div className="status-strip">
          <span>Sign in required</span>
        </div>
      </header>
      <div className="setup-grid" style={{ gridTemplateColumns: '1fr', justifyItems: 'center', padding: '2rem' }}>
        <div style={{ maxWidth: '480px', width: '100%' }}>
          <AuthPanel />
        </div>
      </div>
    </main>
  );
}

export function DashboardPage() {
  const [anchor] = useState(new Date());
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated());
  const snapshot = usePlannerSnapshot();
  const events = usePlannerStore((state) => state.events);
  const tasks = usePlannerStore((state) => state.tasks);
  const calendars = usePlannerStore((state) => state.calendars);
  const categories = usePlannerStore((state) => state.categories);
  const clearTokens = useAuthStore((state) => state.clearTokens);

  // Route Protection: If not authenticated, redirect to /login
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return (
    <main className="app-shell">
      <header className="topbar">
        <div>
          <p className="eyebrow">Redeeming Time</p>
          <h1>Daily Schedule Planner</h1>
        </div>
        <div className="status-strip">
          <span>{calendars.length} calendars</span>
          <span>{snapshot.isFetching ? 'Syncing' : snapshot.isError ? 'API needs attention' : 'Synced'}</span>
          <button
            className="primary-button subtle"
            style={{ marginLeft: '1rem', padding: '0.25rem 0.5rem', fontSize: '0.85rem' }}
            onClick={clearTokens}
          >
            Sign out
          </button>
        </div>
      </header>
      <div className="setup-grid">
        <CalendarControls calendars={calendars} categories={categories} />
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

// ----------------------------------------------------
// Main App Component with Route Definition
// ----------------------------------------------------
export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/dashboard" element={<DashboardPage />} />
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}
```

---

## 5. Verification Plan

An implementer can verify the correctness of the routing and authentication flow by executing the following steps:

1. **Build and Type Checking**:
   Ensure compilation passes by running the type checker:
   ```bash
   npm --workspace @redeeming-time/web run build
   ```
2. **Access Control Check**:
   - Open browser, navigate to `http://localhost:5173/` or `http://localhost:5173/dashboard`.
   - Confirm that since you are unauthenticated, you are immediately redirected to `/login` and the browser URL changes to `/login`.
3. **Authentication Execution**:
   - Complete the Login/Register form in `AuthPanel`.
   - On successful connection, confirm the store updates state and you are redirected to `/dashboard`.
   - Attempt to manually navigate back to `/login` by changing the URL in the browser. Confirm you are instantly redirected back to `/dashboard`.
4. **Sign-out & Reset**:
   - Click "Sign out" in the header.
   - Confirm the tokens are cleared from `localStorage`, `isAuthenticated` resolves to `false`, and you are immediately redirected back to `/login`.
