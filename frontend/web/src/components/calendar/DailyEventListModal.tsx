import { type CSSProperties, type KeyboardEvent, useEffect, useRef } from 'react';
import { type Event } from '@redeeming-time/shared';
import { eventColor } from '../../utils/planner';

type Props = {
  date: string;
  events: Event[];
  onAdd: () => void;
  onClose: () => void;
  onEventSelect: (event: Event) => void;
};

const weekdays = ['일', '월', '화', '수', '목', '금', '토'];

function dateTitle(date: string) {
  const [year, month, day] = date.split('-').map(Number);
  const value = new Date(year, month - 1, day);
  return `${year}년 ${month}월 ${day}일 ${weekdays[value.getDay()]}요일`;
}

function eventTime(event: Event) {
  if (event.is_all_day) return '하루 종일';
  const format = new Intl.DateTimeFormat('ko-KR', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
  return `${format.format(new Date(event.start_time))} – ${format.format(new Date(event.end_time))}`;
}

export function DailyEventListModal({ date, events, onAdd, onClose, onEventSelect }: Props) {
  const dialogRef = useRef<HTMLElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const sortedEvents = [...events].sort(
    (first, second) =>
      Number(second.is_all_day) - Number(first.is_all_day) ||
      first.start_time.localeCompare(second.start_time),
  );
  const title = dateTitle(date);

  useEffect(() => {
    closeButtonRef.current?.focus();
  }, []);

  function handleKeyDown(event: KeyboardEvent<HTMLElement>) {
    if (event.key === 'Escape') {
      event.preventDefault();
      onClose();
      return;
    }
    if (event.key !== 'Tab') return;

    const focusable = dialogRef.current?.querySelectorAll<HTMLElement>(
      'button:not(:disabled), [href], input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex]:not([tabindex="-1"])',
    );
    if (!focusable?.length) return;

    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  return (
    <section
      ref={dialogRef}
      className="planner-panel controls-panel daily-events-panel"
      role="dialog"
      aria-modal="true"
      aria-labelledby="daily-events-title"
      onKeyDown={handleKeyDown}
    >
      <div className="control-header">
        <div>
          <p className="eyebrow">Daily schedule</p>
          <h2 id="daily-events-title">{title} 일정</h2>
        </div>
        <button
          ref={closeButtonRef}
          className="icon-btn close-btn"
          onClick={onClose}
          style={{ fontSize: '18px' }}
          aria-label="날짜별 일정 목록 닫기"
        >
          ✕
        </button>
      </div>

      <div className="daily-events-list">
        {sortedEvents.length === 0 ? (
          <p className="daily-events-empty">이 날짜에는 등록된 일정이 없습니다.</p>
        ) : (
          <ul>
            {sortedEvents.map((event) => (
              <li key={event.id}>
                <button
                  type="button"
                  className="daily-event-row"
                  style={{ '--event-color': eventColor(event) } as CSSProperties}
                  onClick={() => onEventSelect(event)}
                  aria-label={`${event.title} 일정 상세 보기`}
                >
                  <span className="daily-event-row__swatch" aria-hidden="true" />
                  <span className="daily-event-row__content">
                    <strong>{event.title}</strong>
                    <span className="daily-event-row__time">{eventTime(event)}</span>
                    {event.description && (
                      <span className="daily-event-row__description">{event.description}</span>
                    )}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <button type="button" className="primary-button daily-events-add" onClick={onAdd}>
        일정 추가
      </button>
    </section>
  );
}
