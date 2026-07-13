import { type Calendar, type Event } from '@redeeming-time/shared';
import { useEventEditorActions } from './useEventEditorActions';
import { useEventEditorForm } from './useEventEditorForm';

type Input = {
  calendars: Calendar[];
  calendarId: number;
  draftDate?: string;
  selectedEvent?: Event | null;
  disabled: boolean;
  onClose: () => void;
};

export function useEventEditor({
  calendars,
  calendarId,
  draftDate,
  selectedEvent,
  disabled,
  onClose,
}: Input) {
  const form = useEventEditorForm(draftDate, selectedEvent);
  const actions = useEventEditorActions({ calendars, calendarId, selectedEvent, onClose, form });
  return {
    ...form,
    disabled: disabled || form.readOnly,
    ...actions,
  };
}
