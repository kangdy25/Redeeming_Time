import { type useDashboardModel } from '../hooks/useDashboardModel';
import { MonthGrid, WeekRail } from './CalendarViews';

type DashboardModel = ReturnType<typeof useDashboardModel>;

export function CalendarPanel({ model }: { model: DashboardModel }) {
  const {
    activeView,
    anchor,
    handlePrev,
    handleNext,
    handleToday,
    setActiveView,
    activeCalendarEvents,
    calendarStatusNotice,
    calendarEvents,
    openEventComposerForDate,
    openEventDetail,
  } = model;

  return (
    <section className="planner-panel calendar-area">
      <div className="calendar-heading">
        <div className="calendar-title-group">
          <h2>
            {activeView === 'month'
              ? `${anchor.getFullYear()}년 ${anchor.getMonth() + 1}월`
              : (() => {
                  const weekStart = new Date(
                    anchor.getFullYear(),
                    anchor.getMonth(),
                    anchor.getDate() - anchor.getDay(),
                  );
                  return `${weekStart.getFullYear()}년 ${weekStart.getMonth() + 1}월 ${weekStart.getDate()}일 주`;
                })()}
            <span className="sr-only">
              {activeView === 'month'
                ? anchor.toLocaleDateString('en-US', {
                    month: 'long',
                    year: 'numeric',
                  })
                : `Week of ${new Date(anchor.getFullYear(), anchor.getMonth(), anchor.getDate() - anchor.getDay()).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`}
            </span>
          </h2>
          <div className="nav-buttons">
            <button className="nav-btn" onClick={handlePrev}>
              ◀
            </button>
            <button className="nav-btn" onClick={handleNext}>
              ▶
            </button>
            <button className="nav-btn" onClick={handleToday}>
              오늘
            </button>
          </div>
        </div>

        <div className="calendar-controls-bar">
          <div className="segmented calendar-view-tabs">
            <button
              className={activeView === 'week' ? 'active' : ''}
              onClick={() => setActiveView('week')}
            >
              Week
            </button>
            <button
              className={activeView === 'month' ? 'active' : ''}
              onClick={() => setActiveView('month')}
            >
              Month
            </button>
          </div>
          <span className="event-count">{activeCalendarEvents.length} scheduled events</span>
        </div>
      </div>

      {calendarStatusNotice && <div className="calendar-status-notice">{calendarStatusNotice}</div>}

      <div className="calendar-body">
        {activeView === 'week' ? (
          <WeekRail
            events={calendarEvents}
            anchor={anchor}
            onDateSelect={openEventComposerForDate}
            onEventSelect={openEventDetail}
          />
        ) : (
          <MonthGrid
            events={calendarEvents}
            anchor={anchor}
            onDateSelect={openEventComposerForDate}
            onEventSelect={openEventDetail}
          />
        )}
      </div>
    </section>
  );
}
