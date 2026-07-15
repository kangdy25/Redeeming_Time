import { useEffect, useRef, useState } from 'react';
import { apiClient, useAuthStore } from '@redeeming-time/shared';
import { type PlannerModalKind } from '../../components/planner/PlannerModals';
import { isoDate } from '../../utils/planner';

export type DashboardSection = 'calendar' | 'tasks' | 'inbox' | 'profile';
export type MobilePanel = 'calendar' | 'menu' | 'tasks';
type DashboardModalKind = PlannerModalKind | 'daily-events';

export function useDashboardShell() {
  const isAuthenticated = useAuthStore((state) => !!state.accessToken);
  const [profileImageUrl, setProfileImageUrl] = useState('');
  const [theme, setTheme] = useState<'light' | 'dark'>('dark');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [modal, setModal] = useState<DashboardModalKind | null>(null);
  const [workspaceMenuOpen, setWorkspaceMenuOpen] = useState(false);
  const workspaceSwitcherRef = useRef<HTMLDivElement>(null);
  const [mobilePanel, setMobilePanel] = useState<MobilePanel>('calendar');
  const [section, setSection] = useState<DashboardSection>('calendar');
  const [taskBoardDate, setTaskBoardDate] = useState(isoDate(new Date()));

  useEffect(() => {
    if (!isAuthenticated) return;
    void apiClient
      .currentUser()
      .then((user) => setProfileImageUrl(user?.profile_image_url ?? ''))
      .catch(() => {});
  }, [isAuthenticated]);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  useEffect(() => {
    function close(event: MouseEvent) {
      if (!workspaceSwitcherRef.current?.contains(event.target as Node))
        setWorkspaceMenuOpen(false);
    }
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);

  return {
    session: { isAuthenticated, profileImageUrl },
    theme: { value: theme, set: setTheme },
    sidebar: { collapsed: sidebarCollapsed, setCollapsed: setSidebarCollapsed },
    modal: { value: modal, set: setModal },
    workspaceMenu: {
      open: workspaceMenuOpen,
      setOpen: setWorkspaceMenuOpen,
      ref: workspaceSwitcherRef,
    },
    navigation: { mobilePanel, setMobilePanel, section, setSection },
    taskBoard: { date: taskBoardDate, setDate: setTaskBoardDate },
  };
}
