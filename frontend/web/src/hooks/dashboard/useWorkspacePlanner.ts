import { useEffect, useMemo } from 'react';
import {
  useDeleteCalendar,
  usePlannerSnapshot,
  usePlannerStore,
  type Calendar,
} from '@redeeming-time/shared';
import { createKoreaHolidayEvents } from '../../utils/planner';

export function useWorkspacePlanner(closeWorkspaceMenu: () => void) {
  const deleteCalendar = useDeleteCalendar();
  const snapshot = usePlannerSnapshot();
  const events = usePlannerStore((state) => state.events);
  const tasks = usePlannerStore((state) => state.tasks);
  const calendars = usePlannerStore((state) => state.calendars);
  const categories = usePlannerStore((state) => state.categories);
  const activeId = usePlannerStore((state) => state.activeCalendarId);
  const setActiveId = usePlannerStore((state) => state.setActiveCalendarId);

  useEffect(() => {
    if (calendars.length > 0 && !activeId) setActiveId(calendars[0].id);
  }, [calendars, activeId, setActiveId]);

  const currentId = activeId ?? calendars[0]?.id ?? 0;
  const active = calendars.find((calendar) => calendar.id === currentId);
  const global = calendars.find((calendar) => calendar.is_global);
  const activeEvents = useMemo(
    () => (active?.is_global ? events : events.filter((event) => event.calendar === currentId)),
    [active?.is_global, events, currentId],
  );
  const calendarEvents = useMemo(
    () => [...activeEvents, ...createKoreaHolidayEvents(currentId)],
    [activeEvents, currentId],
  );
  const statusNotice = snapshot.isError
    ? 'API 연결을 확인해 주세요. 저장된 일정 데이터를 불러오지 못했습니다.'
    : calendars.length === 0
      ? '캘린더가 아직 없습니다. 일정 추가 전에 워크스페이스를 먼저 준비해 주세요.'
      : '';

  async function remove(calendar: Calendar) {
    if (!window.confirm(`"${calendar.title}" 워크스페이스와 해당 일정이 삭제됩니다. 계속할까요?`))
      return;
    await deleteCalendar.mutateAsync(calendar.id);
    closeWorkspaceMenu();
  }

  return {
    snapshot,
    calendars,
    tasks,
    categories,
    activeId: currentId,
    setActiveId,
    active,
    global,
    color: active?.theme_color ?? '#6366F1',
    title: active?.title,
    activeEvents,
    calendarEvents,
    statusNotice,
    remove,
  };
}
