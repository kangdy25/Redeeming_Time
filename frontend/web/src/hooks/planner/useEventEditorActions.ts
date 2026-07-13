import { type FormEvent } from 'react';
import {
  useCreateEvent,
  useDeleteEvent,
  useUpdateEvent,
  type Calendar,
  type Event,
} from '@redeeming-time/shared';
import { toApiDateTime } from '../../utils/planner';
import { type EventEditorForm } from './useEventEditorForm';

type Input = {
  calendars: Calendar[];
  calendarId: number;
  selectedEvent?: Event | null;
  onClose: () => void;
  form: EventEditorForm;
};

export function useEventEditorActions({
  calendars,
  calendarId,
  selectedEvent,
  onClose,
  form,
}: Input) {
  const mutation = useCreateEvent();
  const updateMutation = useUpdateEvent();
  const deleteMutation = useDeleteEvent();

  async function submit(event: FormEvent) {
    event.preventDefault();
    form.setMessage('');
    const date = form.start.substring(0, 10);
    const payload = {
      calendar: calendarId || calendars[0]?.id || 1,
      title: form.title,
      description: form.description,
      start_time: toApiDateTime(form.allDay ? `${date}T00:00` : form.start),
      end_time: toApiDateTime(form.allDay ? `${date}T23:59` : form.end),
      is_all_day: form.allDay,
      rrule: form.rrule,
      color_code: form.color,
    };
    try {
      if (form.editing && selectedEvent)
        await updateMutation.mutateAsync({ id: selectedEvent.id, payload });
      else await mutation.mutateAsync(payload);
      onClose();
    } catch (error) {
      form.setMessage(
        error instanceof Error
          ? error.message
          : form.editing
            ? '일정 수정에 실패했습니다.'
            : '일정 추가에 실패했습니다.',
      );
    }
  }

  async function remove() {
    if (
      !selectedEvent ||
      form.readOnly ||
      !window.confirm(`"${selectedEvent.title}" 일정을 삭제할까요?`)
    )
      return;
    try {
      await deleteMutation.mutateAsync(selectedEvent.id);
      onClose();
    } catch (error) {
      form.setMessage(error instanceof Error ? error.message : '일정 삭제에 실패했습니다.');
    }
  }

  return { submit, remove };
}
