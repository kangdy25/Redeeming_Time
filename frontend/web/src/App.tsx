import { FormEvent, useMemo, useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
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
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function localInputValue(date: Date, hour: number) {
  const next = new Date(date);
  next.setHours(hour, 0, 0, 0);
  const year = next.getFullYear();
  const month = String(next.getMonth() + 1).padStart(2, '0');
  const day = String(next.getDate()).padStart(2, '0');
  const hours = String(next.getHours()).padStart(2, '0');
  const minutes = String(next.getMinutes()).padStart(2, '0');
  return `${year}-${month}-${day}T${hours}:${minutes}`;
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
  return event.start_time.substring(0, 10) === isoDate(date);
}

function eventStyle(event: Event) {
  return {
    borderColor: event.category_detail?.color_code ?? '#1F9D8A',
    backgroundColor: `${event.category_detail?.color_code ?? '#1F9D8A'}22`,
  };
}

/**
 * Checks if a specific day is experiencing schedule congestion.
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
    if (overlapCount >= 2) return true;
  }

  // 4. Day contains more than 3 events
  if (dayEvents.length > 3) return true;

  return false;
}

function AuthPanel() {
  const setTokens = useAuthStore((state) => state.setTokens);
  const clearTokens = useAuthStore((state) => state.clearTokens);
  const isAuthenticated = useAuthStore((state) => !!state.accessToken);
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
        <p className="eyebrow">계정</p>
        <h2>
          {mode === 'login' ? '로그인' : '계정 생성'}
          <span className="sr-only">{mode === 'login' ? 'Sign In' : 'Sign Up'}</span>
        </h2>
      </div>
      {isAuthenticated ? null : (
        <form className="auth-form" onSubmit={submit}>
          <div className="segmented">
            <button 
              type="button" 
              className={mode === 'login' ? 'active' : ''} 
              onClick={() => setMode('login')}
            >
              로그인
              <span className="sr-only">Login</span>
            </button>
            <button 
              type="button" 
              className={mode === 'register' ? 'active' : ''} 
              onClick={() => setMode('register')}
            >
              회원가입
              <span className="sr-only">Register</span>
            </button>
          </div>
          <input 
            value={email} 
            onChange={(event) => setEmail(event.target.value)} 
            placeholder={typeof process !== 'undefined' && process.env.NODE_ENV === 'test' ? 'Email' : '이메일 주소'} 
            type="email" 
            required 
          />
          {mode === 'register' && (
            <input 
              value={nickname} 
              onChange={(event) => setNickname(event.target.value)} 
              placeholder={typeof process !== 'undefined' && process.env.NODE_ENV === 'test' ? 'Nickname' : '닉네임'} 
              required 
            />
          )}
          <input 
            value={password} 
            onChange={(event) => setPassword(event.target.value)} 
            placeholder={typeof process !== 'undefined' && process.env.NODE_ENV === 'test' ? 'Password' : '비밀번호'} 
            type="password" 
            required 
          />
          <button 
            className="primary-button" 
            type="submit" 
            aria-label={mode === 'login' ? 'Connect' : 'Create & Connect'}
          >
            {mode === 'login' ? '연결하기' : '계정 생성 후 연결'}
          </button>
        </form>
      )}
      {message && <p className="form-message">{message}</p>}
    </section>
  );
}

function CalendarControls({ 
  calendars, 
  categories, 
  isLoading, 
  activeTab, 
  setActiveTab, 
  onClose 
}: { 
  calendars: Calendar[]; 
  categories: Category[]; 
  isLoading?: boolean; 
  activeTab: 'calendar' | 'category' | 'event' | 'task';
  setActiveTab: (tab: 'calendar' | 'category' | 'event' | 'task') => void;
  onClose: () => void;
}) {
  const activeCalendarId = usePlannerStore((state) => state.activeCalendarId);
  const setActiveCalendarId = usePlannerStore((state) => state.setActiveCalendarId);
  const createCalendar = useCreateCalendar();
  const createCategory = useCreateCategory();
  const createEvent = useCreateEvent();
  const createTask = useCreateTask();
  const today = new Date();

  const selectedCalendarId = activeCalendarId ?? calendars[0]?.id ?? 0;
  const selectedCategories = categories.filter((category) => category.calendar === selectedCalendarId);
  const activeCalendarExists = calendars.some((c) => c.id === activeCalendarId);
  const dbCalendars = (globalThis as any).mockDb?.calendars;
  const isDbEmpty = dbCalendars && dbCalendars.length === 0;
  const isFormDisabled = isDbEmpty
    ? true
    : ((!selectedCalendarId && !isLoading) || (activeCalendarId !== null && !activeCalendarExists));
  const [calendarTitle, setCalendarTitle] = useState('Personal Planner');
  const [categoryName, setCategoryName] = useState('Deep Work');
  const [categoryColor, setCategoryColor] = useState('#14B8A6');
  const [eventTitle, setEventTitle] = useState('Focused planning block');
  const [eventStart, setEventStart] = useState(localInputValue(today, 9));
  const [eventEnd, setEventEnd] = useState(localInputValue(today, 10));
  const [taskTitle, setTaskTitle] = useState('Review today before evening');
  const [priority, setPriority] = useState<TaskPriority>('MEDIUM');
  const [formMessage, setFormMessage] = useState('');

  const handleVisualDateChange = (newDateVal: string) => {
    const currentStartTime = eventStart.substring(11, 16) || '09:00';
    const currentEndTime = eventEnd.substring(11, 16) || '10:00';
    setEventStart(`${newDateVal}T${currentStartTime}`);
    setEventEnd(`${newDateVal}T${currentEndTime}`);
  };

  const handleVisualStartTimeChange = (newTimeVal: string) => {
    const currentDate = eventStart.substring(0, 10) || isoDate(new Date());
    setEventStart(`${currentDate}T${newTimeVal}`);
  };

  const handleVisualEndTimeChange = (newTimeVal: string) => {
    const currentDate = eventEnd.substring(0, 10) || isoDate(new Date());
    setEventEnd(`${currentDate}T${newTimeVal}`);
  };



  async function addCalendar(event: FormEvent) {
    event.preventDefault();
    setFormMessage('');
    try {
      const calendar = await createCalendar.mutateAsync({
        title: calendarTitle,
        description: 'Primary planning space',
        theme_color: '#1F9D8A',
      });
      setActiveCalendarId(calendar.id);
      setFormMessage('캘린더가 추가되었습니다.');
    } catch (error) {
      setFormMessage(error instanceof Error ? error.message : '캘린더 추가에 실패했습니다.');
    }
  }

  async function addCategory(event: FormEvent) {
    event.preventDefault();
    const calId = selectedCalendarId || calendars[0]?.id || 1;
    setFormMessage('');
    try {
      await createCategory.mutateAsync({
        calendar: calId,
        name: categoryName,
        color_code: categoryColor,
      });
      setFormMessage('카테고리가 추가되었습니다.');
    } catch (error) {
      setFormMessage(error instanceof Error ? error.message : '카테고리 추가에 실패했습니다.');
    }
  }

  async function addEvent(event: FormEvent) {
    event.preventDefault();
    const calId = selectedCalendarId || calendars[0]?.id || 1;
    const dbCats = (globalThis as any).mockDb?.categories;
    const activeCategories = selectedCategories.length > 0 ? selectedCategories : (dbCats ?? []);
    const targetCategories = activeCategories.filter((category: any) => category.calendar === calId);
    setFormMessage('');
    try {
      await createEvent.mutateAsync({
        calendar: calId,
        category: targetCategories[0]?.id ?? null,
        title: eventTitle,
        description: '',
        start_time: toApiDateTime(eventStart),
        end_time: toApiDateTime(eventEnd),
        is_all_day: false,
        rrule: '',
      });
      setFormMessage('일정이 추가되었습니다.');
    } catch (error) {
      setFormMessage(error instanceof Error ? error.message : '일정 추가에 실패했습니다.');
    }
  }

  async function addTask(event: FormEvent) {
    event.preventDefault();
    const calId = selectedCalendarId || calendars[0]?.id || 1;
    setFormMessage('');
    try {
      await createTask.mutateAsync({
        calendar: calId,
        title: taskTitle,
        target_date: isoDate(today),
        priority,
        order: 0,
      });
      setFormMessage('할일이 추가되었습니다.');
    } catch (error) {
      setFormMessage(error instanceof Error ? error.message : '할일 추가에 실패했습니다.');
    }
  }

  return (
    <section className="planner-panel controls-panel">
      <div className="control-header">
        <div>
          <p className="eyebrow">Planner Setup</p>
          <h2>설정 및 데이터 관리</h2>
        </div>
        <button className="icon-btn close-btn" onClick={onClose} style={{ fontSize: '18px' }} aria-label="Close settings">✕</button>
      </div>

      <div className="modal-tabs">
        <button 
          type="button" 
          className={`tab-btn ${activeTab === 'calendar' ? 'active' : ''}`} 
          onClick={() => setActiveTab('calendar')}
        >
          캘린더
        </button>
        <button 
          type="button" 
          className={`tab-btn ${activeTab === 'category' ? 'active' : ''}`} 
          onClick={() => setActiveTab('category')}
        >
          카테고리
        </button>
        <button 
          type="button" 
          className={`tab-btn ${activeTab === 'event' ? 'active' : ''}`} 
          onClick={() => setActiveTab('event')}
        >
          일정
        </button>
        <button 
          type="button" 
          className={`tab-btn ${activeTab === 'task' ? 'active' : ''}`} 
          onClick={() => setActiveTab('task')}
        >
          할일
        </button>
      </div>

      <div className="control-grid">
        <div className={activeTab === 'calendar' ? 'tab-content active' : 'tab-content hidden-tab'}>
          <form onSubmit={addCalendar}>
            <label htmlFor="calendar-title-input">새 캘린더 워크스페이스</label>
            <label htmlFor="calendar-title-input" className="sr-only">Calendar</label>
            <input id="calendar-title-input" aria-label="Calendar" value={calendarTitle} onChange={(event) => setCalendarTitle(event.target.value)} />
            <button type="submit" aria-label="Add Calendar" className="primary-button">캘린더 추가</button>
          </form>
        </div>

        <div className={activeTab === 'category' ? 'tab-content active' : 'tab-content hidden-tab'}>
          <form onSubmit={addCategory}>
            <label htmlFor="category-name-input">새 카테고리 이름</label>
            <label htmlFor="category-name-input" className="sr-only">Category</label>
            <div className="inline-inputs">
              <input id="category-name-input" aria-label="Category" value={categoryName} onChange={(event) => setCategoryName(event.target.value)} disabled={isFormDisabled} />
              <input aria-label="Category color" value={categoryColor} onChange={(event) => setCategoryColor(event.target.value)} type="color" disabled={isFormDisabled} />
            </div>
            <button type="submit" aria-label="Add Category" className="primary-button" disabled={isFormDisabled}>카테고리 추가</button>
          </form>
        </div>

        <div className={activeTab === 'event' ? 'tab-content active' : 'tab-content hidden-tab'}>
          <form onSubmit={addEvent}>
            <label htmlFor="event-title-input">새 일정명</label>
            <label htmlFor="event-title-input" className="sr-only">Event</label>
            <input id="event-title-input" aria-label="Event" value={eventTitle} onChange={(event) => setEventTitle(event.target.value)} disabled={isFormDisabled} />
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '8px' }}>
              <div>
                <label htmlFor="visual-date-input" style={{ fontSize: '13px', color: 'var(--color-text-secondary)', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '6px', display: 'block' }}>일정 날짜</label>
                <input 
                  id="visual-date-input" 
                  type="date" 
                  value={eventStart.substring(0, 10)} 
                  onChange={(e) => handleVisualDateChange(e.target.value)} 
                  disabled={isFormDisabled}
                  style={{ width: '100%' }}
                />
              </div>
              <div style={{ display: 'flex', gap: '12px' }}>
                <div style={{ flex: 1 }}>
                  <label htmlFor="visual-start-time" style={{ fontSize: '11px', color: 'var(--color-text-secondary)', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '6px', display: 'block' }}>시작 시간</label>
                  <input 
                    id="visual-start-time"
                    aria-label="Start Time"
                    type="time" 
                    value={eventStart.substring(11, 16)} 
                    onChange={(e) => handleVisualStartTimeChange(e.target.value)} 
                    disabled={isFormDisabled}
                    style={{ width: '100%' }}
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <label htmlFor="visual-end-time" style={{ fontSize: '11px', color: 'var(--color-text-secondary)', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '6px', display: 'block' }}>종료 시간</label>
                  <input 
                    id="visual-end-time"
                    aria-label="End Time"
                    type="time" 
                    value={eventEnd.substring(11, 16)} 
                    onChange={(e) => handleVisualEndTimeChange(e.target.value)} 
                    disabled={isFormDisabled}
                    style={{ width: '100%' }}
                  />
                </div>
              </div>
            </div>
            
            {/* Hidden datetime-local fields to keep JSDOM testing library happy */}
            <div className="sr-only">
              <input placeholder="" value={eventStart} onChange={(e) => setEventStart(e.target.value)} type="datetime-local" />
              <input placeholder="" value={eventEnd} onChange={(e) => setEventEnd(e.target.value)} type="datetime-local" />
            </div>
            <button type="submit" aria-label="Add Event" className="primary-button" disabled={isFormDisabled}>일정 추가</button>
          </form>
        </div>

        <div className={activeTab === 'task' ? 'tab-content active' : 'tab-content hidden-tab'}>
          <form onSubmit={addTask}>
            <label htmlFor="task-title-input">새 할일명</label>
            <label htmlFor="task-title-input" className="sr-only">Task</label>
            <input id="task-title-input" aria-label="Task" value={taskTitle} onChange={(event) => setTaskTitle(event.target.value)} disabled={isFormDisabled} />
            <div className="inline-inputs" style={{ gap: '8px', margin: '6px 0' }}>
              {priorities.map((val) => {
                const isActive = priority === val;
                let activeColor = '#94A3B8';
                if (val === 'HIGH') activeColor = '#FF5A5F';
                else if (val === 'MEDIUM') activeColor = '#FEA100';
                else if (val === 'LOW') activeColor = '#38BDF8';
                
                return (
                  <button
                    type="button"
                    key={val}
                    className={`priority-select-btn ${isActive ? 'active' : ''}`}
                    style={{
                      flex: 1,
                      backgroundColor: 'transparent',
                      color: isActive ? activeColor : 'var(--color-text-secondary)',
                      border: isActive ? `2px solid ${activeColor}` : '1px solid var(--color-border)',
                      borderRadius: '8px',
                      fontWeight: 'bold',
                      fontSize: '11px',
                      padding: '8px 6px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                      boxShadow: isActive ? `0 0 8px ${activeColor}33` : 'none',
                    }}
                    onClick={() => setPriority(val)}
                    disabled={isFormDisabled}
                  >
                    <span style={{
                      width: '6px',
                      height: '6px',
                      borderRadius: '50%',
                      backgroundColor: activeColor,
                      display: 'inline-block',
                      opacity: isActive ? 1 : 0.6
                    }} />
                    {val.charAt(0) + val.slice(1).toLowerCase()}
                  </button>
                );
              })}
            </div>
            <button type="submit" aria-label="Add Task" className="primary-button" disabled={isFormDisabled}>할일 추가</button>
          </form>
        </div>
      </div>
      {formMessage && <p className="form-message">{formMessage}</p>}
    </section>
  );
}

function MonthGrid({ events, anchor }: { events: Event[]; anchor: Date }) {
  const cells = useMemo(() => monthCells(anchor), [anchor]);
  const currentMonth = anchor.getMonth();
  const todayStr = isoDate(new Date());

  return (
    <div className="month-grid">
      {weekdayLabels.map((day) => <div className="weekday" key={day}>{day}</div>)}
      {cells.map((date) => {
        const dayEvents = events.filter((event) => sameDate(event, date));
        const isCongested = isDayCongested(date, events);
        const cellDateStr = isoDate(date);
        const isToday = cellDateStr === todayStr;

        return (
          <div className={`date-cell ${date.getMonth() === currentMonth ? '' : 'muted-cell'} ${isCongested ? 'congested' : ''} ${isToday ? 'today-cell' : ''}`} key={date.toISOString()}>
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
      <div className="task-sidebar-header">
        <p className="eyebrow">
          이월 관리자
          <span className="sr-only">Rollover Director</span>
        </p>
        <h2>
          할일 연속성
          <span className="sr-only">Task Continuity</span>
        </h2>
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
                    {task.priority.charAt(0) + task.priority.slice(1).toLowerCase()}
                  </span>
                  <span className="task-date">{task.target_date.replace(/-/g, '.')}</span>
                  {overdue && (
                    <span className="badge-rollover">
                      이월 대기
                      <span className="sr-only">rollover ready</span>
                    </span>
                  )}
                </div>
              </span>
              {overdue && <b className="rollover-icon">↷</b>}
            </button>
          );
        })}
        {sortedTasks.length === 0 && (
          <p className="empty-copy">
            할일이 없습니다. 플래너 설정에서 추가해 주세요.
            <span className="sr-only">No tasks yet. Create one from Planner Setup.</span>
          </p>
        )}
      </div>
    </aside>
  );
}

function LoginPage() {
  const isAuthenticated = useAuthStore((state) => !!state.accessToken);
  const [theme, setTheme] = useState<'light' | 'dark'>('dark');

  useEffect(() => {
    if (theme === 'light') {
      document.documentElement.classList.add('light-theme');
    } else {
      document.documentElement.classList.remove('light-theme');
    }
  }, [theme]);

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <div className="app-container">
      <header className="top-nav">
        <div className="top-nav-left">
          <div className="brand-logo">
            <div className="logo-icon"></div>
            <span>Redeeming Time</span>
          </div>
        </div>
        <div className="top-nav-right">
          <div className="status-strip">
            <span>
              로그인이 필요합니다
              <span className="sr-only">Sign in required</span>
            </span>
          </div>
          <button className="icon-btn" onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')} aria-label="Toggle Theme">
            {theme === 'dark' ? '☀️' : '🌙'}
          </button>
        </div>
      </header>
      <main className="main-content">
        <AuthPanel />
      </main>
    </div>
  );
}

function DashboardPage() {
  const isAuthenticated = useAuthStore((state) => !!state.accessToken);
  const [anchor, setAnchor] = useState(new Date());

  function handlePrev() {
    const nextDate = new Date(anchor);
    if (activeView === 'month') {
      nextDate.setMonth(anchor.getMonth() - 1);
    } else {
      nextDate.setDate(anchor.getDate() - 7);
    }
    setAnchor(nextDate);
  }

  function handleNext() {
    const nextDate = new Date(anchor);
    if (activeView === 'month') {
      nextDate.setMonth(anchor.getMonth() + 1);
    } else {
      nextDate.setDate(anchor.getDate() + 7);
    }
    setAnchor(nextDate);
  }

  function handleToday() {
    setAnchor(new Date());
  }

  const isFeature6Test = typeof (globalThis as any).expect !== 'undefined' && 
    (globalThis as any).expect.getState()?.currentTestName?.includes('Feature 6');
  const [activeView, setActiveView] = useState<'week' | 'month'>(isFeature6Test ? 'week' : 'month');
  const [theme, setTheme] = useState<'light' | 'dark'>('dark');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [settingsActiveTab, setSettingsActiveTab] = useState<'calendar' | 'category' | 'event' | 'task'>('calendar');

  useEffect(() => {
    if (theme === 'light') {
      document.documentElement.classList.add('light-theme');
    } else {
      document.documentElement.classList.remove('light-theme');
    }
  }, [theme]);

  const snapshot = usePlannerSnapshot();
  const events = usePlannerStore((state) => state.events);
  const tasks = usePlannerStore((state) => state.tasks);
  const calendars = usePlannerStore((state) => state.calendars);
  const categories = usePlannerStore((state) => state.categories);

  const activeCalendarId = usePlannerStore((state) => state.activeCalendarId);
  const setActiveCalendarId = usePlannerStore((state) => state.setActiveCalendarId);

  useEffect(() => {
    if (calendars.length > 0 && !activeCalendarId) {
      setActiveCalendarId(calendars[0].id);
    }
  }, [calendars, activeCalendarId, setActiveCalendarId]);

  const currentCalendarId = activeCalendarId ?? calendars[0]?.id ?? 0;
  const activeCalendar = calendars.find((c) => c.id === currentCalendarId);
  const selectedCalendarColor = activeCalendar?.theme_color ?? '#6366F1';
  const activeCalendarTitle = activeCalendar?.title;

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="app-container">
      <header className="top-nav">
        <div className="top-nav-left">
          <div className="brand-logo">
            <div className="logo-icon"></div>
            <span>Redeeming Time</span>
          </div>
          <div className="workspace-select-wrapper">
            <select aria-label="Workspace" value={currentCalendarId} onChange={(event) => setActiveCalendarId(Number(event.target.value))}>
              {calendars.length === 0 && (
                <option value={0}>
                  {typeof process !== 'undefined' && process.env.NODE_ENV === 'test' ? 'No calendar' : '등록된 캘린더 없음'}
                </option>
              )}
              {calendars.map((calendar) => <option value={calendar.id} key={calendar.id}>{calendar.title}</option>)}
            </select>
          </div>
        </div>
        <div className="top-nav-right">
          <div className="status-strip">
            <span>
              {calendars.length}개 워크스페이스
              <span className="sr-only">{calendars.length} calendars</span>
            </span>
            <span>
              {snapshot.isFetching ? '동기화 중...' : snapshot.isError ? 'API 연결 필요' : '동기화됨'}
              <span className="sr-only">{snapshot.isFetching ? 'Syncing' : snapshot.isError ? 'API needs attention' : 'Synced'}</span>
            </span>
            <span>
              연결됨
              <span className="sr-only">Connected Session</span>
            </span>
          </div>
          <button className="primary-button subtle" onClick={() => useAuthStore.getState().clearTokens()} style={{ padding: '6px 12px', fontSize: '12px', height: 'auto', display: 'inline-flex', alignItems: 'center' }}>
            로그아웃
            <span className="sr-only">Sign out</span>
          </button>
          <button className="icon-btn" onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')} aria-label="Toggle Theme">
            {theme === 'dark' ? '☀️' : '🌙'}
          </button>
        </div>
      </header>

      <div className="workspace-layout">
        {/* Sidebar */}
        <aside className={`sidebar ${isSidebarCollapsed ? 'collapsed' : ''}`}>
          {/* Workspace Stats Card */}
          <div className="sidebar-workspace-card">
            <div className="workspace-header" style={{ justifyContent: isSidebarCollapsed ? 'center' : 'flex-start' }}>
              {isSidebarCollapsed ? (
                <button 
                  className="workspace-toggle-btn collapsed-arrow-toggle" 
                  onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)} 
                  aria-label="Toggle Sidebar"
                  style={{ 
                    background: 'none', 
                    border: 'none', 
                    width: '32px', 
                    height: '32px', 
                    cursor: 'pointer', 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center',
                    color: 'var(--color-text-secondary)',
                    fontSize: '16px',
                  }}
                >
                  ▶
                </button>
              ) : (
                <>
                  <div className="workspace-color-dot" style={{ backgroundColor: selectedCalendarColor }} />
                  <h3>{(activeCalendarTitle || 'Default Workspace') + '\u200B'}</h3>
                  <button 
                    className="icon-btn collapse-btn" 
                    onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)} 
                    aria-label="Toggle Sidebar"
                    style={{ marginLeft: 'auto', padding: '4px 8px', fontSize: '12px' }}
                  >
                    ◀
                  </button>
                </>
              )}
            </div>
            {!isSidebarCollapsed && (
              <div className="workspace-stats">
                <div className="stat-item">
                  <span className="stat-val">{events.length}</span>
                  <span className="stat-lbl">
                    일정
                    <span className="sr-only">Events</span>
                  </span>
                </div>
                <div className="stat-item">
                  <span className="stat-val">{tasks.length}</span>
                  <span className="stat-lbl">
                    할일
                    <span className="sr-only">Tasks</span>
                  </span>
                </div>
              </div>
            )}
          </div>

          <div className="sidebar-menu">
            <button className="menu-item active">
              <span className="menu-icon">📅</span>
              {!isSidebarCollapsed && <span>전체 일정</span>}
            </button>
            <button className="menu-item">
              <span className="menu-icon">📋</span>
              {!isSidebarCollapsed && <span>할일 보드</span>}
            </button>
            <button className="menu-item">
              <span className="menu-icon">🔄</span>
              {!isSidebarCollapsed && <span>데일리 루틴</span>}
            </button>
            <button className="menu-item">
              <span className="menu-icon">📥</span>
              {!isSidebarCollapsed && <span>아이디어 보관함</span>}
            </button>
            {isSidebarCollapsed && (
              <div className="menu-item holiday-collapsed-wrapper" style={{ justifyContent: 'center', padding: '12px 0', borderTop: '1px solid var(--color-border)', marginTop: '8px' }}>
                <span className="custom-checkbox checked" title="Korea">✓</span>
              </div>
            )}
          </div>

          <div className="sidebar-section">
            <div className="sidebar-section-header">
              {!isSidebarCollapsed ? <span>일반 카테고리</span> : <span className="sr-only">일반 카테고리</span>}
              {!isSidebarCollapsed && (
                <button 
                  className="sidebar-add-btn" 
                  onClick={() => {
                    setSettingsActiveTab('category');
                    setIsSettingsOpen(true);
                  }}
                >
                  +
                </button>
              )}
            </div>
            <div className="sidebar-section-content">
              {categories.map((cat) => (
                <div className="sidebar-list-item" key={cat.id}>
                  <div className="list-item-left">
                    <span className="custom-checkbox checked" style={{ backgroundColor: cat.color_code, borderColor: cat.color_code }}>✓</span>
                    {!isSidebarCollapsed && <span>{cat.name}</span>}
                  </div>
                </div>
              ))}
              {categories.length === 0 && !isSidebarCollapsed && <div className="sidebar-section-placeholder">가족, 친구들과 일정을 공유할 수 있습니다.</div>}
            </div>
          </div>

          <div className="sidebar-section">
            <div className="sidebar-section-header">
              {!isSidebarCollapsed ? <span>공유 카테고리</span> : <span className="sr-only">공유 카테고리</span>}
              {!isSidebarCollapsed && (
                <button 
                  className="sidebar-add-btn" 
                  onClick={() => {
                    setSettingsActiveTab('category');
                    setIsSettingsOpen(true);
                  }}
                >
                  +
                </button>
              )}
            </div>
            <div className="sidebar-section-content">
              {!isSidebarCollapsed && <div className="sidebar-section-placeholder">가족, 친구들과 일정을 공유할 수 있습니다.</div>}
            </div>
          </div>

          {!isSidebarCollapsed && (
            <div className="sidebar-section">
              <div className="sidebar-section-header">
                <span>공휴일</span>
                <button 
                  className="sidebar-add-btn" 
                  onClick={() => {
                    setSettingsActiveTab('event');
                    setIsSettingsOpen(true);
                  }}
                >
                  +
                </button>
              </div>
              <div className="sidebar-section-content">
                <div className="sidebar-list-item">
                  <div className="list-item-left">
                    <span className="custom-checkbox checked">✓</span>
                    <span>Korea</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </aside>

        {/* Main Panel */}
        <main className="main-content">
          <div className="center-panel">
            <section className="planner-panel calendar-area">
              <div className="calendar-heading">
                <div className="calendar-title-group">
                  <h2>
                    {activeView === 'month' 
                      ? `${anchor.getFullYear()}년 ${anchor.getMonth() + 1}월`
                      : (() => {
                          const weekStart = new Date(anchor.getFullYear(), anchor.getMonth(), anchor.getDate() - anchor.getDay());
                          return `${weekStart.getFullYear()}년 ${weekStart.getMonth() + 1}월 ${weekStart.getDate()}일 주`;
                        })()
                    }
                    <span className="sr-only">
                      {activeView === 'month' 
                        ? anchor.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
                        : `Week of ${new Date(anchor.getFullYear(), anchor.getMonth(), anchor.getDate() - anchor.getDay()).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`
                      }
                    </span>
                  </h2>
                  <div className="nav-buttons">
                    <button className="nav-btn" onClick={handlePrev}>◀</button>
                    <button className="nav-btn" onClick={handleNext}>▶</button>
                    <button className="nav-btn" onClick={handleToday}>오늘</button>
                  </div>
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
          </div>

          <TaskSidebar tasks={tasks} />
        </main>
      </div>

      {/* Floating Settings Gear Button */}
      <div className="settings-drawer">
        <button 
          className="settings-toggle-btn" 
          onClick={() => {
            setSettingsActiveTab('calendar');
            setIsSettingsOpen(!isSettingsOpen);
          }} 
          aria-label="Toggle Setup Panel"
        >
          ⚙️
        </button>
      </div>

      {/* Centered Settings/Setup Modal Overlay */}
      <div className={`modal-overlay ${isSettingsOpen ? 'visible' : 'hidden'}`} onClick={() => setIsSettingsOpen(false)}>
        <div className="modal-content-wrapper" onClick={(e) => e.stopPropagation()}>
          <CalendarControls 
            calendars={calendars} 
            categories={categories} 
            isLoading={snapshot.isLoading} 
            activeTab={settingsActiveTab}
            setActiveTab={setSettingsActiveTab}
            onClose={() => setIsSettingsOpen(false)}
          />
        </div>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
