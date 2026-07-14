import { type FormEvent, useState } from 'react';
import {
  getErrorMessage,
  useCreateCalendar,
  usePlannerStore,
  type Calendar,
} from '@redeeming-time/shared';
import { DEFAULT_WORKSPACE_COLOR } from '../../utils/colorPresets';

export function useWorkspaceCreator(
  calendars: Calendar[],
  isLoading: boolean | undefined,
  onClose: () => void,
) {
  const activeId = usePlannerStore((state) => state.activeCalendarId);
  const setActiveId = usePlannerStore((state) => state.setActiveCalendarId);
  const mutation = useCreateCalendar();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [message, setMessage] = useState('');
  const selectedId = activeId ?? calendars[0]?.id ?? 0;
  const selected = calendars.find((calendar) => calendar.id === selectedId);
  const activeExists = calendars.some((calendar) => calendar.id === activeId);
  const eventDisabled =
    calendars.length === 0 ||
    (!selectedId && !isLoading) ||
    (activeId !== null && !activeExists) ||
    Boolean(selected?.is_global);

  async function submit(event: FormEvent) {
    event.preventDefault();
    const trimmed = title.trim();
    if (!trimmed) return setMessage('워크스페이스 이름을 입력해 주세요.');
    setMessage('');
    try {
      const calendar = await mutation.mutateAsync({
        title: trimmed,
        description: description.trim(),
        theme_color: DEFAULT_WORKSPACE_COLOR,
      });
      setActiveId(calendar.id);
      setTitle('');
      setDescription('');
      onClose();
    } catch (error) {
      setMessage(getErrorMessage(error, '워크스페이스 생성에 실패했습니다.'));
    }
  }

  return {
    selectedId,
    selected,
    eventDisabled,
    title,
    setTitle,
    description,
    setDescription,
    message,
    mutation,
    submit,
  };
}
