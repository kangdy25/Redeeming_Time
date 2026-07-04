import { useMemo, useState } from 'react';
import { usePlannerSnapshot, usePlannerStore, useToggleTask, type Event, type Task } from '@redeeming-time/shared';

const weekdayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function isoDate(date: Date) {
  return date.toISOString().slice(0, 10);
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
        {weekdayLabels.map((day) => (
          <div className="weekday" key={day}>{day}</div>
        ))}
        {cells.map((date) => {
          const dayEvents = events.filter((event) => sameDate(event, date));
          return (
            <div className={`date-cell ${date.getMonth() === currentMonth ? '' : 'muted-cell'}`} key={date.toISOString()}>
              <div className="date-number">{date.getDate()}</div>
              <div className="event-stack">
                {dayEvents.slice(0, 3).map((event) => (
                  <div className="event-pill" style={eventStyle(event)} key={event.id}>
                    {event.title}
                  </div>
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
            <small style={{ color: event.category_detail?.color_code ?? '#1F9D8A' }} key={event.id}>
              {event.title}
            </small>
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
        {sortedTasks.length === 0 && <p className="empty-copy">No tasks returned from the planner API.</p>}
      </div>
    </aside>
  );
}

export default function App() {
  const [anchor] = useState(new Date());
  const snapshot = usePlannerSnapshot();
  const events = usePlannerStore((state) => state.events);
  const tasks = usePlannerStore((state) => state.tasks);
  const calendars = usePlannerStore((state) => state.calendars);

  return (
    <main className="app-shell">
      <header className="topbar">
        <div>
          <p className="eyebrow">Redeeming Time</p>
          <h1>Daily Schedule Planner</h1>
        </div>
        <div className="status-strip">
          <span>{calendars.length} calendars</span>
          <span>{snapshot.isFetching ? 'Syncing' : snapshot.isError ? 'API offline' : 'Synced'}</span>
        </div>
      </header>
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
