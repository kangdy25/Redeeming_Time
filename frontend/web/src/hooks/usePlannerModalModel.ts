import { type Calendar, type Event } from '@redeeming-time/shared';
import { type PlannerModalKind } from '../components/PlannerModals';
import { useEventEditor } from './planner/useEventEditor';
import { useWorkspaceCreator } from './planner/useWorkspaceCreator';

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
  const workspace = useWorkspaceCreator(calendars, isLoading, onClose);
  const event = useEventEditor({
    calendars,
    calendarId: workspace.selectedId,
    draftDate: eventDraftDate,
    selectedEvent,
    disabled: workspace.eventDisabled,
    onClose,
  });
  const copy =
    modalKind === 'settings'
      ? { eyebrow: 'Settings', title: '설정', closeLabel: 'Close settings' }
      : { eyebrow: 'Schedule', title: '일정 추가', closeLabel: 'Close event composer' };

  return { workspace, event, copy };
}
