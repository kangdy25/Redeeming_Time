import { type PlannerModalModel } from '../../hooks/usePlannerModalModel';
import { ColorPresetPicker } from '../ui/ColorPresetPicker';

type Props = { event: PlannerModalModel['event'] };

export function EventEditorForm({ event }: Props) {
  const {
    title: eventTitle,
    setTitle: setEventTitle,
    description: eventDescription,
    setDescription: setEventDescription,
    color: eventColor,
    setColor: setEventColor,
    start: eventStart,
    setStart: setEventStart,
    end: eventEnd,
    setEnd: setEventEnd,
    allDay: isAllDayEvent,
    rrule: eventRrule,
    setRrule: setEventRrule,
    readOnly: isReadOnlyEvent,
    editing: isEditingEvent,
    disabled,
    setDate,
    setStartTime,
    setEndTime,
    setAllDay,
    submit: submitEvent,
    remove: deleteEvent,
  } = event;

  return (
    <form className="event-form" onSubmit={submitEvent}>
      <div className="event-form-grid">
        <div className="field-stack field-span-2">
          <label htmlFor="event-title-input">새 일정명</label>
          <label htmlFor="event-title-input" className="sr-only">
            Event
          </label>
          <input
            id="event-title-input"
            aria-label="Event"
            value={eventTitle}
            onChange={(event) => setEventTitle(event.target.value)}
            disabled={disabled}
          />
        </div>
        <div className="field-stack field-span-2">
          <label htmlFor="event-description-input">설명</label>
          <textarea
            id="event-description-input"
            aria-label="Event Description"
            value={eventDescription}
            onChange={(event) => setEventDescription(event.target.value)}
            disabled={disabled}
            rows={2}
          />
        </div>
        <div className="field-stack field-span-2">
          <label htmlFor="visual-date-input">일정 날짜</label>
          <input
            id="visual-date-input"
            type="date"
            value={eventStart.substring(0, 10)}
            onChange={(event) => setDate(event.target.value)}
            disabled={disabled}
          />
        </div>
        <div className="time-pair">
          <div className="field-stack">
            <label htmlFor="visual-start-time">시작</label>
            <input
              id="visual-start-time"
              aria-label="Start Time"
              type="time"
              value={eventStart.substring(11, 16)}
              onChange={(event) => setStartTime(event.target.value)}
              disabled={disabled || isAllDayEvent}
            />
          </div>
          <div className="field-stack">
            <label htmlFor="visual-end-time">종료</label>
            <input
              id="visual-end-time"
              aria-label="End Time"
              type="time"
              value={eventEnd.substring(11, 16)}
              onChange={(event) => setEndTime(event.target.value)}
              disabled={disabled || isAllDayEvent}
            />
          </div>
          <label className="compact-toggle">
            <input
              aria-label="All Day Event"
              type="checkbox"
              checked={isAllDayEvent}
              onChange={(event) => setAllDay(event.target.checked)}
              disabled={disabled}
            />
            하루종일
          </label>
        </div>
        <div className="field-stack repeat-field">
          <label htmlFor="event-repeat-input">반복</label>
          <select
            id="event-repeat-input"
            aria-label="Repeat Rule"
            value={eventRrule}
            onChange={(event) => setEventRrule(event.target.value)}
            disabled={disabled}
          >
            <option value="">반복 없음</option>
            <option value="FREQ=DAILY">매일</option>
            <option value="FREQ=WEEKLY">매주</option>
            <option value="FREQ=MONTHLY">매월</option>
          </select>
        </div>
        <div className="field-stack event-color-field">
          <label>일정 색상</label>
          <div className="event-color-control">
            <ColorPresetPicker
              label="Event color"
              value={eventColor}
              onChange={setEventColor}
              disabled={disabled}
              className="event-color-picker"
            />
          </div>
        </div>
      </div>
      <div className="sr-only">
        <input
          placeholder=""
          value={eventStart}
          onChange={(event) => setEventStart(event.target.value)}
          type="datetime-local"
        />
        <input
          placeholder=""
          value={eventEnd}
          onChange={(event) => setEventEnd(event.target.value)}
          type="datetime-local"
        />
      </div>
      <div className="modal-action-row">
        {isEditingEvent && (
          <button type="button" className="danger-button" onClick={deleteEvent}>
            일정 삭제
          </button>
        )}
        <button type="submit" aria-label="Add Event" className="primary-button" disabled={disabled}>
          {isEditingEvent ? '일정 저장' : isReadOnlyEvent ? '공휴일 보기' : '일정 추가'}
        </button>
      </div>
    </form>
  );
}
