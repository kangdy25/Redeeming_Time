import { type Calendar, type Event } from '@redeeming-time/shared';
import { WorkspaceCreateForm } from './WorkspaceCreateForm';
import { usePlannerModalModel } from '../hooks/usePlannerModalModel';

export type PlannerModalKind = 'settings' | 'event';

type Props = {
  calendars: Calendar[];
  isLoading?: boolean;
  modalKind: PlannerModalKind;
  eventDraftDate?: string;
  selectedEvent?: Event | null;
  onClose: () => void;
};

export function PlannerModals({
  calendars,
  isLoading,
  modalKind,
  eventDraftDate,
  selectedEvent,
  onClose,
}: Props) {
  const {
    selectedCalendar,
    disabled,
    eventTitle,
    setEventTitle,
    eventDescription,
    setEventDescription,
    eventColor,
    setEventColor,
    eventStart,
    setEventStart,
    eventEnd,
    setEventEnd,
    isAllDayEvent,
    eventRrule,
    setEventRrule,
    workspaceTitle,
    setWorkspaceTitle,
    workspaceDescription,
    setWorkspaceDescription,
    formMessage,
    isReadOnlyEvent,
    isEditingEvent,
    modalCopy,
    setDate,
    setStartTime,
    setEndTime,
    setAllDay,
    submitEvent,
    deleteEvent,
    addWorkspace,
    createCalendar,
  } = usePlannerModalModel({
    calendars,
    isLoading,
    modalKind,
    eventDraftDate,
    selectedEvent,
    onClose,
  });
  return (
    <section className="planner-panel controls-panel">
      <div className="control-header">
        <div>
          <p className="eyebrow">{modalCopy.eyebrow}</p>
          <h2>{modalKind === 'event' && selectedEvent ? '일정 상세' : modalCopy.title}</h2>
        </div>
        <button
          className="icon-btn close-btn"
          onClick={onClose}
          style={{ fontSize: '18px' }}
          aria-label={modalCopy.closeLabel}
        >
          ✕
        </button>
      </div>
      <div className="control-grid">
        <div className={modalKind === 'settings' ? 'tab-content active' : 'tab-content hidden-tab'}>
          <div className="settings-only-panel">
            <div>
              <span>현재 워크스페이스</span>
              <strong>{selectedCalendar?.title ?? '선택된 캘린더 없음'}</strong>
            </div>
            <div>
              <span>동기화 상태</span>
              <strong>
                {isLoading ? '불러오는 중' : calendars.length === 0 ? '캘린더 필요' : '준비됨'}
              </strong>
            </div>
          </div>
          <WorkspaceCreateForm
            title={workspaceTitle}
            description={workspaceDescription}
            isSubmitting={createCalendar.isPending}
            onTitleChange={setWorkspaceTitle}
            onDescriptionChange={setWorkspaceDescription}
            onSubmit={addWorkspace}
          />
        </div>
        <div className={modalKind === 'event' ? 'tab-content active' : 'tab-content hidden-tab'}>
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
                <label htmlFor="event-color-input">일정 색상</label>
                <div className="event-color-control">
                  <input
                    id="event-color-input"
                    aria-label="Event color"
                    type="color"
                    value={eventColor}
                    onChange={(event) => setEventColor(event.target.value)}
                    disabled={disabled}
                  />
                  <span>{eventColor.toUpperCase()}</span>
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
              <button
                type="submit"
                aria-label="Add Event"
                className="primary-button"
                disabled={disabled}
              >
                {isEditingEvent ? '일정 저장' : isReadOnlyEvent ? '공휴일 보기' : '일정 추가'}
              </button>
            </div>
          </form>
        </div>
      </div>
      {formMessage && <p className="form-message">{formMessage}</p>}
    </section>
  );
}
