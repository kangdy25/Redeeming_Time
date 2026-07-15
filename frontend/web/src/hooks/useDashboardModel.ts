import { useCalendarNavigation } from './dashboard/useCalendarNavigation';
import { useDashboardShell } from './dashboard/useDashboardShell';
import { useWorkspacePlanner } from './dashboard/useWorkspacePlanner';

export function useDashboardModel() {
  const shell = useDashboardShell();
  const calendar = useCalendarNavigation({
    openEventModal: () => shell.modal.set('event'),
    openDailyEventsModal: () => shell.modal.set('daily-events'),
    setMobilePanel: shell.navigation.setMobilePanel,
  });
  const workspace = useWorkspacePlanner(() => shell.workspaceMenu.setOpen(false));

  return { shell, calendar, workspace };
}

export type DashboardModel = ReturnType<typeof useDashboardModel>;
