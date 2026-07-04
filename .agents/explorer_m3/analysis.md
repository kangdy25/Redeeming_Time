# Milestone 3 Bento Grid Dashboard Design Analysis & Proposals

This report provides the visual and architectural design specifications for implementing the **Web Bento Grid Dashboard** under Milestone 3. 

The proposal includes:
1. **Deep Slate Dark Theme Spec** containing color palette, component mappings, and CSS custom properties.
2. **Bento Grid Layout Mapping** representing the grid coordinates and responsiveness of dashboard components.
3. **Neon Priority Badges Style Spec** for tasks (HIGH, MEDIUM, LOW, NONE).
4. **Calendar View Tabs Mechanism** to toggle between Week and Month views.
5. **Schedule Congestion Definition & Ambient Glow Effect** using CSS animations and custom selectors.
6. **Complete Code Replacements** for `apps/web/src/styles.css` and `apps/web/src/App.tsx` to facilitate quick implementation.

---

## 1. Deep Slate Dark Theme Specification

To transition the web frontend from a light/blue-gray scheme to a deep slate theme, we define the following CSS variables.

### Color Palette Tokens
*   **Root Background (`#09090B`)**: Deepest black/zinc-950 tone for the body layout canvas.
*   **Card/Panel Background (`#18181B`)**: Intermediate zinc-900 slate color to group modules.
*   **Borders (`#27272A`)**: Fine zinc-800 divider borders to bound grid cards cleanly.
*   **Active Accents / Highlights (`#14B8A6`)**: Bright, glowing cyan-teal accent color for interactive items.
*   **Text Primary (`#FAFAFA`)**: Crisp white/zinc-50 for high readability.
*   **Text Secondary (`#A1A1AA`)**: Zinc-400 slate text for descriptors, dates, and labels.
*   **Text Muted (`#71717A`)**: Zinc-500 text for placeholder information.

### Component Element Styling
*   **Inputs & Selects**: Colored `#09090B` (zinc-950) to recess inside the `#18181B` (zinc-900) panels. Border zinc-800 (`#27272A`), focusing to teal (`#14B8A6`).
*   **Segmented Controls (Auth Toggle & View Tabs)**: Fully rounded dark rails (`#09090B`) containing active pill states highlighted by border-color or subtle fill background (`#27272A`).
*   **Buttons**:
    *   *Primary*: Radiant teal background (`#14B8A6` / `#1F9D8A`), text `#09090B` or `#FAFAFA` for contrast, transitioning to neon glow on hover.
    *   *Subtle (Sign out)*: Gray outline or `#27272A` background, blending with the panel context.

---

## 2. Bento Grid Dashboard Layout Mapping

Rather than disjointed vertical panels, the layout is unified into a single responsive grid using **CSS Grid**.

### Grid Structure (Desktop)
*   **Container**: 12-column grid container with a gap of `20px`.
*   **Topbar**: Occupies the full width (`grid-column: span 12`).
*   **AuthPanel**: Recessed sidebar module spanning 4 columns (`grid-column: span 4`).
*   **CalendarControls (Setup Panel)**: Spans 8 columns (`grid-column: span 8`).
*   **Calendar Area (Bento Card wrapper)**: Spans 8 columns (`grid-column: span 8`) on the bottom left.
*   **TaskSidebar**: Spans 4 columns (`grid-column: span 4`) on the bottom right.

```
+----------------------------------------------------------------------------------------+
|                                  TOPBAR (span 12)                                      |
+------------------------------------+---------------------------------------------------+
|       AUTH PANEL (span 4)          |             PLANNER SETUP (span 8)                |
+------------------------------------+---------------------------------------------------+
|                                    |                                                   |
|      CALENDAR AREA (span 8)        |             TASK SIDEBAR (span 4)                 |
|      (Toggled Week / Month)        |                                                   |
|                                    |                                                   |
+------------------------------------+---------------------------------------------------+
```

---

## 3. Neon Priority Badges

Task list priorities are rendered as high-contrast capsules with translucent borders and soft shadows.

### Styles by Priority
*   **HIGH**: Magenta-rose neon style.
    *   Text color: `#FF2E93`
    *   Background: `rgba(255, 46, 147, 0.1)`
    *   Border: `1px solid rgba(255, 46, 147, 0.4)`
    *   Glow: `box-shadow: 0 0 8px rgba(255, 46, 147, 0.2)`
*   **MEDIUM**: Amber-orange neon style.
    *   Text color: `#FF9F00`
    *   Background: `rgba(255, 159, 0, 0.1)`
    *   Border: `1px solid rgba(255, 159, 0, 0.4)`
    *   Glow: `box-shadow: 0 0 8px rgba(255, 159, 0, 0.2)`
*   **LOW**: Cyan-teal neon style.
    *   Text color: `#00F0FF`
    *   Background: `rgba(0, 240, 255, 0.1)`
    *   Border: `1px solid rgba(0, 240, 255, 0.4)`
    *   Glow: `box-shadow: 0 0 8px rgba(0, 240, 255, 0.2)`
*   **NONE**: Muted zinc style.
    *   Text color: `#A1A1AA`
    *   Background: `rgba(161, 161, 170, 0.05)`
    *   Border: `1px solid #27272A`

---

## 4. Calendar View Tabs Switcher

Instead of placing the `WeekRail` and `MonthGrid` vertically stack-rendered, we add a state-controlled selector to toggle them.

### State Controller
In `DashboardPage`, define:
```tsx
const [activeView, setActiveView] = useState<'week' | 'month'>('month');
```

The header segment of the calendar container integrates a layout switch:
```tsx
<div className="segmented calendar-view-tabs">
  <button className={activeView === 'week' ? 'active' : ''} onClick={() => setActiveView('week')}>
    Week
  </button>
  <button className={activeView === 'month' ? 'active' : ''} onClick={() => setActiveView('month')}>
    Month
  </button>
</div>
```

---

## 5. Schedule Congestion Definition & Ambient Glow

### Definition Rules
A calendar day (or weekday card) is considered **congested** when:
1.  **Backend API Warning**: Any event scheduled on that day returns `congestion_warning.is_congested === true` from the Django backend.
2.  **Daily Event Duration Threshold**: The combined duration of all scheduled events on that specific day exceeds **8 hours** (aligned with backend `daily_hours > 8`).
3.  **Overlapping Events Count**: At least **3 events mutually overlap** during the day (aligned with backend `overlap_count >= 3`).
4.  **Count Density Fallback**: Total events in that single day exceeds **3**.

### Client-side Helper Implementation
```typescript
function isDayCongested(date: Date, events: Event[]) {
  const dayEvents = events.filter((event) => sameDate(event, date));
  
  // Rule 1: Check API warnings
  const apiCongested = dayEvents.some((event) => event.congestion_warning?.is_congested);
  if (apiCongested) return true;
  
  // Rule 2: Cumulative daily duration > 8 hours
  const totalDurationHours = dayEvents.reduce((acc, event) => {
    const start = new Date(event.start_time).getTime();
    const end = new Date(event.end_time).getTime();
    return acc + (Math.max(end - start, 0) / 3600000);
  }, 0);
  if (totalDurationHours > 8) return true;

  // Rule 3: Mutual Overlap Check (overlap count >= 3 events)
  for (let i = 0; i < dayEvents.length; i++) {
    const eventA = dayEvents[i];
    const startA = new Date(eventA.start_time).getTime();
    const endA = new Date(eventA.end_time).getTime();
    
    let overlapCount = 0;
    for (let j = 0; j < dayEvents.length; j++) {
      if (i === j) continue;
      const eventB = dayEvents[j];
      const startB = new Date(eventB.start_time).getTime();
      const endB = new Date(eventB.end_time).getTime();
      
      if (startA < endB && endA > startB) {
        overlapCount++;
      }
    }
    // overlapCount >= 2 means this event overlaps with at least 2 other events
    if (overlapCount >= 2) return true;
  }

  // Rule 4: Day contains more than 3 events
  if (dayEvents.length > 3) return true;

  return false;
}
```

### Soft Ambient Outer Glow Stylesheet
To render the visual alert without layout jitter or browser clipping inside the grid:
```css
/* Congestion warning indicators */
.date-cell.congested,
.week-day.congested {
  position: relative;
  border-color: rgba(239, 68, 68, 0.4) !important;
  box-shadow: 0 0 16px rgba(239, 68, 68, 0.2), inset 0 0 8px rgba(239, 68, 68, 0.08);
  transition: all 0.3s ease;
}

/* Pulsing outline overlay to highlight congestion clearly */
.date-cell.congested::before,
.week-day.congested::before {
  content: "";
  position: absolute;
  inset: -1px;
  border-radius: inherit;
  border: 1px solid rgba(239, 68, 68, 0.5);
  box-shadow: 0 0 10px rgba(239, 68, 68, 0.35);
  pointer-events: none;
  z-index: 2;
  animation: pulse-ambient-glow 2.5s infinite ease-in-out;
}

@keyframes pulse-ambient-glow {
  0%, 100% {
    opacity: 0.5;
    box-shadow: 0 0 8px rgba(239, 68, 68, 0.15);
  }
  50% {
    opacity: 1;
    box-shadow: 0 0 14px rgba(239, 68, 68, 0.35);
  }
}
```

---

## 6. Complete CSS Code Replacement Proposal

Replace `/Users/kangdy25/Programming/Web/Redeeming_Time/redeeming-time-frontend/apps/web/src/styles.css` with the following contents:

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

:root {
  --color-bg-root: #09090B;
  --color-bg-card: #18181B;
  --color-border: #27272A;
  --color-border-hover: #3F3F46;
  --color-text-primary: #FAFAFA;
  --color-text-secondary: #A1A1AA;
  --color-text-muted: #71717A;
  
  --color-accent: #14B8A6;
  --color-accent-hover: #0D9488;
  --color-accent-muted: rgba(20, 184, 166, 0.15);
  
  --color-bg-input: #09090B;
  
  color: var(--color-text-primary);
  background-color: var(--color-bg-root);
  font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
}

body {
  margin: 0;
  min-width: 320px;
  background-color: var(--color-bg-root);
  color: var(--color-text-primary);
}

button {
  font: inherit;
}

.app-shell {
  min-height: 100vh;
  padding: 28px;
  background-color: var(--color-bg-root);
}

/* 12-Column Bento Grid Container */
.bento-dashboard {
  display: grid;
  grid-template-columns: repeat(12, 1fr);
  gap: 18px;
  max-width: 1440px;
  margin: 0 auto;
}

.topbar,
.calendar-heading,
.status-strip,
.week-rail,
.task-row {
  display: flex;
}

.topbar {
  grid-column: span 12;
  align-items: flex-end;
  justify-content: space-between;
  gap: 20px;
  padding: 12px 0 24px;
}

.topbar h1,
.planner-panel h2 {
  margin: 0;
  letter-spacing: -0.02em;
}

.topbar h1 {
  font-size: clamp(24px, 3.5vw, 36px);
  font-weight: 800;
  color: var(--color-text-primary);
}

.eyebrow {
  margin: 0 0 4px;
  color: var(--color-accent);
  font-size: 11px;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.1em;
}

.status-strip {
  gap: 10px;
  flex-wrap: wrap;
}

.status-strip span {
  border: 1px solid var(--color-border);
  border-radius: 999px;
  padding: 6px 14px;
  background: var(--color-bg-card);
  font-size: 13px;
  font-weight: 700;
  color: var(--color-text-secondary);
}

/* Auth Section spans 4 cols */
.auth-panel {
  grid-column: span 4;
}

/* Controls Section spans 8 cols */
.controls-panel {
  grid-column: span 8;
}

/* Calendar Section spans 8 cols */
.calendar-area {
  grid-column: span 8;
  overflow: hidden;
}

/* Task Sidebar spans 4 cols */
.task-sidebar {
  grid-column: span 4;
}

/* Universal Bento Panel Style */
.planner-panel {
  background: var(--color-bg-card);
  border: 1px solid var(--color-border);
  border-radius: 12px;
  padding: 20px;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.2), 0 2px 4px -2px rgba(0, 0, 0, 0.2);
}

.auth-form,
.control-grid form {
  display: grid;
  gap: 12px;
}

.auth-form {
  margin-top: 20px;
}

/* Dark Palette Input Controls */
.auth-form input,
.control-grid input,
.control-grid select,
.control-header select {
  width: 100%;
  box-sizing: border-box;
  border: 1px solid var(--color-border);
  border-radius: 8px;
  padding: 10px 12px;
  font-size: 14px;
  color: var(--color-text-primary);
  background: var(--color-bg-input);
  outline: none;
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
}

.auth-form input:focus,
.control-grid input:focus,
.control-grid select:focus,
.control-header select:focus {
  border-color: var(--color-accent);
  box-shadow: 0 0 0 2px var(--color-accent-muted);
}

/* Segmented Control design for Dark Slate */
.segmented {
  display: grid;
  grid-template-columns: 1fr 1fr;
  border: 1px solid var(--color-border);
  background: var(--color-bg-input);
  border-radius: 8px;
  overflow: hidden;
  padding: 2px;
}

.segmented button,
.primary-button,
.control-grid button {
  border: 0;
  cursor: pointer;
  font-weight: 750;
  font-size: 14px;
  transition: all 0.2s ease;
}

.segmented button {
  padding: 8px;
  border-radius: 6px;
  color: var(--color-text-secondary);
  background: transparent;
}

.segmented button.active {
  color: var(--color-text-primary);
  background: var(--color-border);
}

.segmented button:hover:not(.active) {
  color: var(--color-text-primary);
}

/* High Contrast Accent Buttons */
.primary-button,
.control-grid button {
  color: var(--color-bg-root);
  background: var(--color-accent);
  border-radius: 8px;
  padding: 11px 14px;
  font-weight: 800;
}

.primary-button:hover:not(:disabled),
.control-grid button:hover:not(:disabled) {
  background: var(--color-accent-hover);
  box-shadow: 0 0 12px rgba(20, 184, 166, 0.3);
}

.primary-button.subtle {
  margin-top: 12px;
  color: var(--color-text-primary);
  background: var(--color-border);
  border: 1px solid var(--color-border);
}

.primary-button.subtle:hover {
  background: var(--color-border-hover);
  box-shadow: none;
}

.form-message {
  margin: 14px 0 0;
  color: var(--color-accent);
  font-size: 13px;
  font-weight: 700;
}

.control-header {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(180px, 260px);
  gap: 16px;
  align-items: end;
  margin-bottom: 20px;
}

.control-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(160px, 1fr));
  gap: 14px;
}

.control-grid label {
  font-size: 11px;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--color-text-secondary);
  margin-bottom: 2px;
}

.inline-inputs {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 8px;
}

.inline-inputs input[type="color"] {
  width: 48px;
  min-height: 40px;
  padding: 4px;
  background: var(--color-bg-input);
  cursor: pointer;
}

.control-grid button:disabled,
.control-grid input:disabled,
.control-grid select:disabled {
  cursor: not-allowed;
  opacity: 0.4;
}

/* Calendar Styling Updates */
.calendar-heading {
  align-items: center;
  justify-content: space-between;
  gap: 14px;
  padding-bottom: 18px;
  border-bottom: 1px solid var(--color-border);
}

.calendar-controls-bar {
  display: flex;
  align-items: center;
  gap: 14px;
}

.calendar-heading span.event-count {
  color: var(--color-text-secondary);
  font-weight: 700;
  font-size: 13px;
}

.calendar-body {
  padding-top: 18px;
}

.week-rail {
  gap: 10px;
  overflow-x: auto;
  padding-bottom: 8px;
}

.week-day {
  background: var(--color-bg-input);
  border: 1px solid var(--color-border);
  border-radius: 10px;
  min-width: 136px;
  min-height: 120px;
  padding: 14px;
  display: flex;
  flex-direction: column;
  box-sizing: border-box;
}

.week-day span {
  display: block;
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  color: var(--color-text-secondary);
}

.week-day small {
  display: block;
  font-size: 11px;
  margin-top: 4px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.week-day strong {
  display: block;
  margin: 4px 0 10px;
  font-size: 32px;
  font-weight: 800;
}

.month-grid {
  display: grid;
  grid-template-columns: repeat(7, minmax(92px, 1fr));
  border-top: 1px solid var(--color-border);
  border-left: 1px solid var(--color-border);
  border-radius: 8px;
  overflow: hidden;
}

.weekday,
.date-cell {
  min-height: 120px;
  border-right: 1px solid var(--color-border);
  border-bottom: 1px solid var(--color-border);
  box-sizing: border-box;
}

.weekday {
  min-height: 38px;
  display: grid;
  place-items: center;
  color: var(--color-text-secondary);
  font-size: 12px;
  font-weight: 800;
  background: var(--color-bg-card);
}

.date-cell {
  padding: 10px;
  background: var(--color-bg-card);
}

.muted-cell {
  background: rgba(9, 9, 11, 0.5);
  color: var(--color-text-muted);
}

.date-number {
  font-weight: 800;
  margin-bottom: 8px;
  font-size: 14px;
}

.event-stack {
  display: grid;
  gap: 5px;
}

.event-pill {
  overflow: hidden;
  border-left: 4px solid;
  border-radius: 4px;
  padding: 4px 8px;
  white-space: nowrap;
  text-overflow: ellipsis;
  font-size: 11px;
  font-weight: 700;
  color: var(--color-text-primary);
}

.more-count {
  color: var(--color-text-secondary);
  font-size: 12px;
  font-weight: 700;
  margin-top: 2px;
}

.empty-copy {
  color: var(--color-text-secondary);
  font-size: 14px;
  text-align: center;
  padding: 24px 0;
}

/* Congestion Soft Ambient Outer Glow */
.date-cell.congested,
.week-day.congested {
  position: relative;
  border-color: rgba(239, 68, 68, 0.4) !important;
  box-shadow: 0 0 16px rgba(239, 68, 68, 0.2), inset 0 0 8px rgba(239, 68, 68, 0.08);
  transition: all 0.3s ease;
}

.date-cell.congested::before,
.week-day.congested::before {
  content: "";
  position: absolute;
  inset: -1px;
  border-radius: inherit;
  border: 1px solid rgba(239, 68, 68, 0.5);
  box-shadow: 0 0 10px rgba(239, 68, 68, 0.35);
  pointer-events: none;
  z-index: 2;
  animation: pulse-ambient-glow 2.5s infinite ease-in-out;
}

@keyframes pulse-ambient-glow {
  0%, 100% {
    opacity: 0.5;
    box-shadow: 0 0 8px rgba(239, 68, 68, 0.15);
  }
  50% {
    opacity: 1;
    box-shadow: 0 0 14px rgba(239, 68, 68, 0.35);
  }
}

/* Task Sidebar Styling */
.task-list {
  display: grid;
  gap: 12px;
  margin-top: 20px;
}

.task-row {
  width: 100%;
  align-items: center;
  gap: 14px;
  border: 1px solid var(--color-border);
  border-radius: 10px;
  padding: 14px;
  color: inherit;
  background: var(--color-bg-input);
  text-align: left;
  transition: border-color 0.2s ease, background-color 0.2s ease;
}

.task-row:hover {
  border-color: var(--color-accent);
  background: rgba(24, 24, 27, 0.6);
}

.task-row.done {
  opacity: 0.5;
}

.task-content {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-width: 0;
}

.task-title {
  display: block;
  font-size: 14px;
  font-weight: 700;
  color: var(--color-text-primary);
  word-break: break-word;
}

.task-meta {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  margin-top: 6px;
}

.task-date {
  font-size: 12px;
  color: var(--color-text-secondary);
}

/* Neon Priority Badges */
.badge-priority {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 2px 6px;
  font-size: 9px;
  font-weight: 800;
  border-radius: 4px;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  border-style: solid;
  border-width: 1px;
}

.badge-high {
  color: #FF2E93;
  background: rgba(255, 46, 147, 0.1);
  border-color: rgba(255, 46, 147, 0.4);
  box-shadow: 0 0 8px rgba(255, 46, 147, 0.2);
}

.badge-medium {
  color: #FF9F00;
  background: rgba(255, 159, 0, 0.1);
  border-color: rgba(255, 159, 0, 0.4);
  box-shadow: 0 0 8px rgba(255, 159, 0, 0.2);
}

.badge-low {
  color: #00F0FF;
  background: rgba(0, 240, 255, 0.1);
  border-color: rgba(0, 240, 255, 0.4);
  box-shadow: 0 0 8px rgba(0, 240, 255, 0.2);
}

.badge-none {
  color: var(--color-text-secondary);
  background: rgba(161, 161, 170, 0.05);
  border-color: var(--color-border);
}

/* Rollover indicators */
.badge-rollover {
  font-size: 11px;
  font-weight: 700;
  color: var(--color-accent);
  background: var(--color-accent-muted);
  padding: 1px 6px;
  border-radius: 4px;
}

.rollover-icon {
  font-size: 18px;
  color: var(--color-accent);
}

.check-dot {
  display: grid;
  place-items: center;
  flex: 0 0 22px;
  height: 22px;
  border: 2px solid var(--color-border);
  border-radius: 50%;
  color: transparent;
  font-weight: 900;
  font-size: 12px;
  transition: all 0.2s ease;
}

.task-row:hover .check-dot {
  border-color: var(--color-accent);
}

.task-row.done .check-dot {
  border-color: var(--color-accent);
  color: var(--color-accent);
  background: var(--color-accent-muted);
}

/* View switcher segmented tabs specific colors */
.calendar-view-tabs {
  min-width: 140px;
}

@media (max-width: 1024px) {
  .app-shell {
    padding: 18px;
  }

  .bento-dashboard {
    display: flex;
    flex-direction: column;
    gap: 18px;
  }

  .topbar {
    padding-bottom: 12px;
  }

  .auth-panel,
  .controls-panel,
  .calendar-area,
  .task-sidebar {
    width: 100%;
  }

  .control-header,
  .control-grid {
    grid-template-columns: 1fr;
  }

  .status-strip {
    margin-top: 14px;
  }

  .month-grid {
    overflow-x: auto;
    grid-template-columns: repeat(7, 112px);
  }
}
```

---

## 7. Complete JSX React Component Code Replacement Proposal

Replace `/Users/kangdy25/Programming/Web/Redeeming_Time/redeeming-time-frontend/apps/web/src/App.tsx` with the following contents:

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
    borderColor: event.category_detail?.color_code ?? '#14B8A6',
    backgroundColor: `${event.category_detail?.color_code ?? '#14B8A6'}22`,
  };
}

/**
 * Checks if a specific day is experiencing schedule congestion.
 * Congestion triggers when:
 * 1. An event on that day returns congestion_warning.is_congested from the API.
 * 2. Cumulative event duration on that day exceeds 8 hours.
 * 3. 3 or more events mutually overlap (pairwise overlap count >= 2 for any single event).
 * 4. Fallback: total events scheduled for that day exceeds 3.
 */
function isDayCongested(date: Date, events: Event[]): boolean {
  const dayEvents = events.filter((event) => sameDate(event, date));
  if (dayEvents.length === 0) return false;

  // 1. API Congestion flag check
  const hasApiCongestedEvent = dayEvents.some((event) => event.congestion_warning?.is_congested);
  if (hasApiCongestedEvent) return true;

  // 2. Cumulative event duration > 8 hours
  let totalDurationMs = 0;
  for (const event of dayEvents) {
    const start = new Date(event.start_time).getTime();
    const end = new Date(event.end_time).getTime();
    totalDurationMs += Math.max(end - start, 0);
  }
  const totalDurationHours = totalDurationMs / 3600000;
  if (totalDurationHours > 8) return true;

  // 3. Mutual Overlaps check (overlap_count >= 3)
  // For each event on the day, count how many other events it overlaps with.
  for (let i = 0; i < dayEvents.length; i++) {
    const eventA = dayEvents[i];
    const startA = new Date(eventA.start_time).getTime();
    const endA = new Date(eventA.end_time).getTime();

    let overlapCount = 0;
    for (let j = 0; j < dayEvents.length; j++) {
      if (i === j) continue;
      const eventB = dayEvents[j];
      const startB = new Date(eventB.start_time).getTime();
      const endB = new Date(eventB.end_time).getTime();

      // Check interval intersection
      if (startA < endB && endA > startB) {
        overlapCount++;
      }
    }
    // If a single event overlaps with 2 or more other events, at least 3 events intersect.
    if (overlapCount >= 2) return true;
  }

  // 4. Day contains more than 3 events
  if (dayEvents.length > 3) return true;

  return false;
}

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
      setMessage('Authenticated. Planner data is now synced with the API.');
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
  const [categoryColor, setCategoryColor] = useState('#14B8A6');
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
      theme_color: '#14B8A6',
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
    <div className="month-grid">
      {weekdayLabels.map((day) => <div className="weekday" key={day}>{day}</div>)}
      {cells.map((date) => {
        const dayEvents = events.filter((event) => sameDate(event, date));
        const isCongested = isDayCongested(date, events);
        return (
          <div className={`date-cell ${date.getMonth() === currentMonth ? '' : 'muted-cell'} ${isCongested ? 'congested' : ''}`} key={date.toISOString()}>
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
    <div className="week-rail">
      {days.map((date) => {
        const isCongested = isDayCongested(date, events);
        return (
          <div className={`week-day ${isCongested ? 'congested' : ''}`} key={date.toISOString()}>
            <span>{weekdayLabels[date.getDay()]}</span>
            <strong>{date.getDate()}</strong>
            {events.filter((event) => sameDate(event, date)).slice(0, 2).map((event) => (
              <small style={{ color: event.category_detail?.color_code ?? '#14B8A6' }} key={event.id}>{event.title}</small>
            ))}
          </div>
        );
      })}
    </div>
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
              <span className="task-content">
                <strong className="task-title">{task.title}</strong>
                <div className="task-meta">
                  <span className={`badge-priority badge-${task.priority.toLowerCase()}`}>
                    {task.priority}
                  </span>
                  <span className="task-date">{task.target_date}</span>
                  {overdue && <span className="badge-rollover">rollover ready</span>}
                </div>
              </span>
              {overdue && <b className="rollover-icon">↷</b>}
            </button>
          );
        })}
        {sortedTasks.length === 0 && <p className="empty-copy">No tasks yet. Create one from Planner Setup.</p>}
      </div>
    </aside>
  );
}

function LoginPage() {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated());

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <main className="app-shell bento-dashboard">
      <header className="topbar">
        <div>
          <p className="eyebrow">Redeeming Time</p>
          <h1>Daily Schedule Planner</h1>
        </div>
        <div className="status-strip">
          <span>Sign in required</span>
        </div>
      </header>
      <AuthPanel />
    </main>
  );
}

function DashboardPage() {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated());

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  const [anchor] = useState(new Date());
  const [activeView, setActiveView] = useState<'week' | 'month'>('month');
  const snapshot = usePlannerSnapshot();
  const events = usePlannerStore((state) => state.events);
  const tasks = usePlannerStore((state) => state.tasks);
  const calendars = usePlannerStore((state) => state.calendars);
  const categories = usePlannerStore((state) => state.categories);

  return (
    <main className="app-shell bento-dashboard">
      <header className="topbar">
        <div>
          <p className="eyebrow">Redeeming Time</p>
          <h1>Daily Schedule Planner</h1>
        </div>
        <div className="status-strip">
          <span>{calendars.length} calendars</span>
          <span>{snapshot.isFetching ? 'Syncing' : snapshot.isError ? 'API needs attention' : 'Synced'}</span>
        </div>
      </header>
      
      <AuthPanel />
      <CalendarControls calendars={calendars} categories={categories} />
      
      <section className="planner-panel calendar-area">
        <div className="calendar-heading">
          <div>
            <p className="eyebrow">{activeView === 'month' ? 'Month View' : 'Week View'}</p>
            <h2>
              {activeView === 'month' 
                ? anchor.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })
                : `Week of ${new Date(anchor.getFullYear(), anchor.getMonth(), anchor.getDate() - anchor.getDay()).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}`
              }
            </h2>
          </div>
          
          <div className="calendar-controls-bar">
            <div className="segmented calendar-view-tabs">
              <button className={activeView === 'week' ? 'active' : ''} onClick={() => setActiveView('week')}>
                Week
              </button>
              <button className={activeView === 'month' ? 'active' : ''} onClick={() => setActiveView('month')}>
                Month
              </button>
            </div>
            <span className="event-count">{events.length} scheduled events</span>
          </div>
        </div>
        
        <div className="calendar-body">
          {activeView === 'week' ? (
            <WeekRail events={events} anchor={anchor} />
          ) : (
            <MonthGrid events={events} anchor={anchor} />
          )}
        </div>
      </section>
      
      <TaskSidebar tasks={tasks} />
    </main>
  );
}

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

## 8. Verification Strategy & Implementation Checklists

For the implementer, the following assertions should hold:

### Dark Slate Palette Checklist
- [ ] Root body bg matches `#09090B`.
- [ ] Card panels match `#18181B`.
- [ ] Card borders match `#27272A`.
- [ ] Primary button hover contains the neon-shadow bloom (`box-shadow: 0 0 12px rgba(20, 184, 166, 0.3)`).

### Bento Grid Layout Checklist
- [ ] Auth panel spans 4 columns on desktop, control setup spans 8.
- [ ] Calendar toggler spans 8 columns, task list spans 4.
- [ ] Sub-1024px screen widths break the CSS grid gracefully to stack items vertically (flex-direction layout or single column grids).

### Toggle View Logic Checklist
- [ ] Clicking "Week" renders the `WeekRail` only.
- [ ] Clicking "Month" renders the `MonthGrid` only.
- [ ] View headers dynamically transition dates (e.g. Month name vs. Week commencing date).

### Priority Badges Checklist
- [ ] Task lists render priorities as capsules rather than dotted strings.
- [ ] Priority borders and backgrounds apply high contrast styling corresponding to HIGH, MEDIUM, LOW, and NONE classes.

### Schedule Congestion Ambient Glow Checklist
- [ ] Days with > 3 events display the red neon pulsing border warning (`box-shadow` & pulsed overlay border).
- [ ] Days with > 8 hours of cumulative event durations trigger the glow warning.
- [ ] Days with overlapping events (at least 3 intersecting) trigger the glow warning.
