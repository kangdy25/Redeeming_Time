# Original User Request

## Initial Request — 2026-07-04T17:44:58+09:00

Implement a premium, Next-Gen Minimalist Dark UI/UX frontend for Redeeming Time across the Web and Mobile codebases, incorporating client-side routing, bento layouts, and interactive task rollover shields.

Working directory: /Users/kangdy25/Programming/Web/Redeeming_Time/redeeming-time-frontend
Integrity mode: development

## Requirements

### R1. Web Premium Bento Grid Dashboard
- Transform the desktop web dashboard layout (`apps/web`) using a Bento Grid paradigm.
- Apply a deep slate dark theme (background `#09090B`, cards `#18181B`, thin zinc-800 borders).
- Categories must map to high-contrast neon badge tags (e.g. Electric Indigo, Emerald Muted).
- Schedule congestion (via backend density metrics) must glow softly instead of using alert text.
- Implement calendar month/week switcher tabs.

### R2. Web URL Routing & Auth Redirection
- Install `react-router-dom` in `apps/web/`.
- Set up route definitions: `/login`, `/register`, and `/dashboard` (root `/`).
- Unauthenticated users trying to access `/` must be redirected to `/login`.
- Successful registration or login must store the JWT and redirect the user to `/dashboard`.

### R3. Translucent Rollover Shield
- Create a translucent glassmorphic card ("Rollover Notification Shield") at the top of the dashboard's task checklist.
- The shield must identify uncompleted tasks from yesterday or earlier, display their names/counts, and provide a single-click action to roll all overdue tasks to today.

### R4. Mobile Single-Screen Dark Dashboard
- Implement a matching dark dashboard in `apps/app/` using NativeWind.
- Optimize for single-handed thumb navigation by placing calendar switching, task listing, and floating action creators (tasks/events) at the bottom section of the screen.

## Acceptance Criteria

### Web Routing & Auth
- [ ] Navigating to `/` when unauthenticated redirects to `/login` with clean route handling.
- [ ] `/register` page provides nickname, email, password fields and correctly creates a user.
- [ ] `/login` page correctly authenticates via backend simplejwt and updates the auth state.

### Web Dashboard & Bento Grid
- [ ] Page background uses `#09090B` or similar zinc-950 slate/charcoal black.
- [ ] Dashboard is structured in a multi-column Bento Grid layout.
- [ ] Overloaded schedule days show a soft ambient outer glow (`shadow-[0_0_15px_rgba(...)]`).
- [ ] Toggling between Week and Month switchers rerenders the calendar grid seamlessly.
- [ ] Translucent Rollover Shield displays at the top of the task list when overdue tasks exist.
- [ ] Clicking "Roll all to today" in the Rollover Shield calls the backend's `/api/agent/skills/rollover/` or task update endpoint, and updates the task list.

### Mobile App (Expo)
- [ ] Expo app builds and compiles without errors.
- [ ] Uses matching NativeWind slate dark colors for background and cards.
- [ ] Quick log inputs and floating triggers are positioned in the bottom half of the viewport.
