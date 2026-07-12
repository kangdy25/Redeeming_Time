import { type FormEvent, useEffect, useState } from 'react';
import {
  apiClient,
  useCreateCalendar,
  useCreateEvent,
  usePlannerStore,
  type Calendar,
  type Event,
} from '@redeeming-time/shared';
import {
  isKoreaHolidayEvent,
  isoDate,
  localInputValue,
  toApiDateTime,
  toLocalDateTimeInput,
} from '../utils/planner';
import { WorkspaceCreateForm } from './WorkspaceCreateForm';

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
  const activeCalendarId = usePlannerStore((state) => state.activeCalendarId);
  const setActiveCalendarId = usePlannerStore((state) => state.setActiveCalendarId);
  const createCalendar = useCreateCalendar();
  const createEvent = useCreateEvent();
  const selectedCalendarId = activeCalendarId ?? calendars[0]?.id ?? 0;
  const selectedCalendar = calendars.find((calendar) => calendar.id === selectedCalendarId);
  const activeCalendarExists = calendars.some((calendar) => calendar.id === activeCalendarId);
  const isDbEmpty = (globalThis as any).mockDb?.calendars?.length === 0;
  const isFormDisabled =
    isDbEmpty ||
    (!selectedCalendarId && !isLoading) ||
    (activeCalendarId !== null && !activeCalendarExists) ||
    Boolean(selectedCalendar?.is_global);
  const [eventTitle, setEventTitle] = useState('');
  const [eventDescription, setEventDescription] = useState('');
  const [eventColor, setEventColor] = useState('#6366F1');
  const [eventStart, setEventStart] = useState(() => localInputValue(new Date(), 9));
  const [eventEnd, setEventEnd] = useState(() => localInputValue(new Date(), 10));
  const [isAllDayEvent, setIsAllDayEvent] = useState(false);
  const [eventRrule, setEventRrule] = useState('');
  const [workspaceTitle, setWorkspaceTitle] = useState('');
  const [workspaceDescription, setWorkspaceDescription] = useState('');
  const [formMessage, setFormMessage] = useState('');
  const isReadOnlyEvent = Boolean(selectedEvent && isKoreaHolidayEvent(selectedEvent));
  const isEditingEvent = Boolean(selectedEvent && !isReadOnlyEvent);
  const modalCopy =
    modalKind === 'settings'
      ? { eyebrow: 'Settings', title: '설정', closeLabel: 'Close settings' }
      : { eyebrow: 'Schedule', title: '일정 추가', closeLabel: 'Close event composer' };

  function resetEvent(date?: string) {
    const eventDate = date ?? isoDate(new Date());
    setEventTitle('');
    setEventDescription('');
    setEventColor('#6366F1');
    setEventStart(`${eventDate}T09:00`);
    setEventEnd(`${eventDate}T10:00`);
    setIsAllDayEvent(false);
    setEventRrule('');
    setFormMessage('');
  }
  useEffect(() => {
    if (!selectedEvent) {
      if (eventDraftDate) resetEvent(eventDraftDate);
      return;
    }
    setEventTitle(selectedEvent.title);
    setEventDescription(selectedEvent.description);
    setEventColor(selectedEvent.color_code || '#6366F1');
    setEventStart(toLocalDateTimeInput(selectedEvent.start_time));
    setEventEnd(toLocalDateTimeInput(selectedEvent.end_time));
    setIsAllDayEvent(selectedEvent.is_all_day);
    setEventRrule(selectedEvent.rrule);
    setFormMessage('');
  }, [eventDraftDate, selectedEvent]);

  function setDate(value: string) {
    setEventStart(`${value}T${eventStart.substring(11, 16) || '09:00'}`);
    setEventEnd(`${value}T${eventEnd.substring(11, 16) || '10:00'}`);
  }
  function setStartTime(value: string) {
    setEventStart(`${eventStart.substring(0, 10) || isoDate(new Date())}T${value}`);
  }
  function setEndTime(value: string) {
    setEventEnd(`${eventEnd.substring(0, 10) || isoDate(new Date())}T${value}`);
  }
  function setAllDay(checked: boolean) {
    setIsAllDayEvent(checked);
    if (!checked) {
      const date = eventStart.substring(0, 10) || isoDate(new Date());
      setEventStart(`${date}T09:00`);
      setEventEnd(`${date}T10:00`);
    }
  }
  async function submitEvent(event: FormEvent) {
    event.preventDefault();
    setFormMessage('');
    const date = eventStart.substring(0, 10);
    const payload = {
      calendar: selectedCalendarId || calendars[0]?.id || 1,
      title: eventTitle,
      description: eventDescription,
      start_time: toApiDateTime(isAllDayEvent ? `${date}T00:00` : eventStart),
      end_time: toApiDateTime(isAllDayEvent ? `${date}T23:59` : eventEnd),
      is_all_day: isAllDayEvent,
      rrule: eventRrule,
      color_code: eventColor,
    };
    try {
      if (isEditingEvent && selectedEvent) await apiClient.updateEvent(selectedEvent.id, payload);
      else await createEvent.mutateAsync(payload);
      onClose();
    } catch (error) {
      setFormMessage(
        error instanceof Error
          ? error.message
          : isEditingEvent
            ? '일정 수정에 실패했습니다.'
            : '일정 추가에 실패했습니다.',
      );
    }
  }
  async function deleteEvent() {
    if (
      !selectedEvent ||
      isReadOnlyEvent ||
      !window.confirm(`"${selectedEvent.title}" 일정을 삭제할까요?`)
    )
      return;
    try {
      await apiClient.deleteEvent(selectedEvent.id);
      onClose();
    } catch (error) {
      setFormMessage(error instanceof Error ? error.message : '일정 삭제에 실패했습니다.');
    }
  }
  async function addWorkspace(event: FormEvent) {
    event.preventDefault();
    const title = workspaceTitle.trim();
    if (!title) {
      setFormMessage('워크스페이스 이름을 입력해 주세요.');
      return;
    }
    try {
      const calendar = await createCalendar.mutateAsync({
        title,
        description: workspaceDescription.trim(),
        theme_color: '#2F80ED',
      });
      setActiveCalendarId(calendar.id);
      setWorkspaceTitle('');
      setWorkspaceDescription('');
      onClose();
    } catch (error) {
      setFormMessage(error instanceof Error ? error.message : '워크스페이스 생성에 실패했습니다.');
    }
  }

  const disabled = isFormDisabled || isReadOnlyEvent;
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
              <strong>{isLoading ? '불러오는 중' : isDbEmpty ? '캘린더 필요' : '준비됨'}</strong>
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
