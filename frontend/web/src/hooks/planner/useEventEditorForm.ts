import { useEffect, useState } from 'react';
import { type Event } from '@redeeming-time/shared';
import {
  isKoreaHolidayEvent,
  isoDate,
  localInputValue,
  toLocalDateTimeInput,
} from '../../utils/planner';
import { DEFAULT_EVENT_COLOR } from '../../utils/colorPresets';

export function useEventEditorForm(draftDate?: string, selectedEvent?: Event | null) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [color, setColor] = useState(DEFAULT_EVENT_COLOR);
  const [start, setStart] = useState(() => localInputValue(new Date(), 9));
  const [end, setEnd] = useState(() => localInputValue(new Date(), 10));
  const [allDay, setAllDayState] = useState(false);
  const [rrule, setRrule] = useState('');
  const [message, setMessage] = useState('');
  const readOnly = Boolean(selectedEvent && isKoreaHolidayEvent(selectedEvent));
  const editing = Boolean(selectedEvent && !readOnly);

  useEffect(() => {
    if (!selectedEvent) {
      if (draftDate) {
        setTitle('');
        setDescription('');
        setColor(DEFAULT_EVENT_COLOR);
        setStart(`${draftDate}T09:00`);
        setEnd(`${draftDate}T10:00`);
        setAllDayState(false);
        setRrule('');
        setMessage('');
      }
      return;
    }
    setTitle(selectedEvent.title);
    setDescription(selectedEvent.description);
    setColor(selectedEvent.color_code || DEFAULT_EVENT_COLOR);
    setStart(toLocalDateTimeInput(selectedEvent.start_time));
    setEnd(toLocalDateTimeInput(selectedEvent.end_time));
    setAllDayState(selectedEvent.is_all_day);
    setRrule(selectedEvent.rrule);
    setMessage('');
  }, [draftDate, selectedEvent]);

  function setDate(value: string) {
    setStart(`${value}T${start.substring(11, 16) || '09:00'}`);
    setEnd(`${value}T${end.substring(11, 16) || '10:00'}`);
  }
  function setStartTime(value: string) {
    setStart(`${start.substring(0, 10) || isoDate(new Date())}T${value}`);
  }
  function setEndTime(value: string) {
    setEnd(`${end.substring(0, 10) || isoDate(new Date())}T${value}`);
  }
  function setAllDay(value: boolean) {
    setAllDayState(value);
    if (!value) {
      const date = start.substring(0, 10) || isoDate(new Date());
      setStart(`${date}T09:00`);
      setEnd(`${date}T10:00`);
    }
  }

  return {
    title,
    setTitle,
    description,
    setDescription,
    color,
    setColor,
    start,
    setStart,
    end,
    setEnd,
    allDay,
    rrule,
    setRrule,
    message,
    setMessage,
    readOnly,
    editing,
    setDate,
    setStartTime,
    setEndTime,
    setAllDay,
  };
}

export type EventEditorForm = ReturnType<typeof useEventEditorForm>;
