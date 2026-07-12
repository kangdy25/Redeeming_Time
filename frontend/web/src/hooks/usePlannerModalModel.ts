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
import { type PlannerModalKind } from '../components/PlannerModals';

type PlannerModalModelInput = {
  calendars: Calendar[];
  isLoading?: boolean;
  modalKind: PlannerModalKind;
  eventDraftDate?: string;
  selectedEvent?: Event | null;
  onClose: () => void;
};

export function usePlannerModalModel({
  calendars,
  isLoading,
  modalKind,
  eventDraftDate,
  selectedEvent,
  onClose,
}: PlannerModalModelInput) {
  const activeCalendarId = usePlannerStore((state) => state.activeCalendarId);
  const setActiveCalendarId = usePlannerStore((state) => state.setActiveCalendarId);
  const createCalendar = useCreateCalendar();
  const createEvent = useCreateEvent();
  const selectedCalendarId = activeCalendarId ?? calendars[0]?.id ?? 0;
  const selectedCalendar = calendars.find((calendar) => calendar.id === selectedCalendarId);
  const activeCalendarExists = calendars.some((calendar) => calendar.id === activeCalendarId);
  const isFormDisabled =
    calendars.length === 0 ||
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

  return {
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
  };
}
