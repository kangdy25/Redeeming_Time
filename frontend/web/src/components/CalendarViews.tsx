import { useMemo } from 'react';

import type { Event } from '@redeeming-time/shared';

import { eventStyle, isKoreaHolidayEvent, isoDate, monthCells, sameDate } from '../utils/planner';

const weekdayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

interface CalendarViewProps {
  events: Event[];
  anchor: Date;
  onDateSelect?: (date: string) => void;
  onEventSelect?: (event: Event) => void;
}

export function MonthGrid({ events, anchor, onDateSelect, onEventSelect }: CalendarViewProps) {
  const cells = useMemo(() => monthCells(anchor), [anchor]);
  const currentMonth = anchor.getMonth();
  const todayStr = isoDate(new Date());

  return (
    <div className="month-grid">
      {weekdayLabels.map((day) => (
        <div className="weekday" key={day}>
          {day}
        </div>
      ))}
      {cells.map((date) => {
        const dayEvents = events
          .filter((event) => sameDate(event, date))
          .sort(
            (a, b) =>
              Number(b.is_all_day) - Number(a.is_all_day) ||
              a.start_time.localeCompare(b.start_time),
          );
        const cellDateStr = isoDate(date);
        const isToday = cellDateStr === todayStr;
        const hasKoreaHoliday = dayEvents.some(isKoreaHolidayEvent);
        return (
          <div
            className={`date-cell ${date.getMonth() === currentMonth ? '' : 'muted-cell'} ${isToday ? 'today-cell' : ''} ${hasKoreaHoliday ? 'holiday-cell' : ''}`}
            key={date.toISOString()}
            onClick={() => onDateSelect?.(cellDateStr)}
          >
            <div className="date-number">{date.getDate()}</div>
            <div className="event-stack">
              {dayEvents.slice(0, 3).map((event) => (
                <button
                  type="button"
                  className={`event-pill ${event.is_all_day ? 'all-day-event' : 'timed-event'}`}
                  style={eventStyle(event)}
                  onClick={(clickEvent) => {
                    clickEvent.stopPropagation();
                    onEventSelect?.(event);
                  }}
                  key={event.id}
                >
                  {event.title}
                </button>
              ))}
              {dayEvents.length > 3 && <span className="more-count">+{dayEvents.length - 3}</span>}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function WeekRail({ events, anchor, onDateSelect, onEventSelect }: CalendarViewProps) {
  const todayValue = isoDate(new Date());
  const weekStart = new Date(anchor);
  weekStart.setDate(anchor.getDate() - anchor.getDay());
  const days = Array.from(
    { length: 7 },
    (_, index) =>
      new Date(weekStart.getFullYear(), weekStart.getMonth(), weekStart.getDate() + index),
  );

  return (
    <div className="week-rail">
      {days.map((date) => (
        <div
          className={`week-day ${isoDate(date) === todayValue ? 'today-week-day' : ''}`}
          key={date.toISOString()}
          onClick={() => onDateSelect?.(isoDate(date))}
        >
          <span>{weekdayLabels[date.getDay()]}</span>
          <strong>{date.getDate()}</strong>
          {events
            .filter((event) => sameDate(event, date))
            .slice(0, 2)
            .map((event) => (
              <button
                type="button"
                className={`week-event ${event.is_all_day ? 'all-day-event' : 'timed-event'}`}
                style={eventStyle(event)}
                onClick={(clickEvent) => {
                  clickEvent.stopPropagation();
                  onEventSelect?.(event);
                }}
                key={event.id}
              >
                {event.title}
              </button>
            ))}
        </div>
      ))}
    </div>
  );
}
