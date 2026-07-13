import { useAuthStore } from '@redeeming-time/shared';
import { type DashboardModel } from '../hooks/useDashboardModel';

type DashboardHeaderProps = Pick<DashboardModel, 'shell' | 'workspace'>;

export function DashboardHeader({ shell, workspace }: DashboardHeaderProps) {
  const { setSection: setActiveSection, setMobilePanel } = shell.navigation;
  const {
    ref: workspaceSwitcherRef,
    open: isWorkspaceMenuOpen,
    setOpen: setIsWorkspaceMenuOpen,
  } = shell.workspaceMenu;
  const { value: theme, set: setTheme } = shell.theme;
  const { profileImageUrl } = shell.session;
  const {
    activeId: currentCalendarId,
    setActiveId: setActiveCalendarId,
    calendars,
    color: selectedCalendarColor,
    active: activeCalendar,
    remove: deleteWorkspace,
  } = workspace;
  const setActiveModal = shell.modal.set;

  return (
    <header className="top-nav">
      <div className="top-nav-left">
        <button
          type="button"
          className="brand-logo brand-home"
          onClick={() => {
            setActiveSection('calendar');
            setMobilePanel('calendar');
          }}
        >
          <div className="logo-icon">
            <img src="/logo.png" alt="" />
          </div>
          <span>Redeeming Time</span>
        </button>
      </div>
      <div className="top-nav-right">
        <div className="workspace-switcher" ref={workspaceSwitcherRef}>
          <select
            className="sr-only"
            aria-label="Workspace"
            value={currentCalendarId}
            onChange={(event) => setActiveCalendarId(Number(event.target.value))}
          >
            {calendars.length === 0 && <option value={0}>No calendar</option>}
            {calendars.map((calendar) => (
              <option value={calendar.id} key={calendar.id}>
                {calendar.title}
              </option>
            ))}
          </select>
          <button
            type="button"
            className={`workspace-switcher-button ${isWorkspaceMenuOpen ? 'active' : ''}`}
            onClick={() => setIsWorkspaceMenuOpen((open) => !open)}
            disabled={calendars.length === 0}
            aria-expanded={isWorkspaceMenuOpen}
          >
            <span
              className="workspace-switcher-dot"
              style={{ backgroundColor: selectedCalendarColor }}
            />
            <strong>{calendars.length}개 워크스페이스</strong>
            <span aria-hidden="true">⌄</span>
            <span className="sr-only">{calendars.length} calendars</span>
          </button>
          {isWorkspaceMenuOpen && (
            <div className="workspace-switcher-popover">
              <span>워크스페이스 전환</span>
              {calendars.map((calendar) => (
                <button
                  type="button"
                  className={calendar.id === currentCalendarId ? 'active' : ''}
                  onClick={() => {
                    setActiveCalendarId(calendar.id);
                    setIsWorkspaceMenuOpen(false);
                  }}
                  key={calendar.id}
                >
                  <i style={{ backgroundColor: calendar.theme_color }} />
                  <strong>{calendar.title}</strong>
                  {calendar.id === currentCalendarId && <span>✓</span>}
                </button>
              ))}
              <button
                type="button"
                onClick={() => {
                  setIsWorkspaceMenuOpen(false);
                  setActiveModal('settings');
                }}
              >
                <i aria-hidden="true">＋</i>
                <strong>워크스페이스 만들기</strong>
              </button>
              {activeCalendar && !activeCalendar.is_global && (
                <button
                  type="button"
                  className="workspace-delete-action"
                  onClick={() => void deleteWorkspace(activeCalendar)}
                >
                  <i aria-hidden="true">−</i>
                  <strong>현재 워크스페이스 삭제</strong>
                </button>
              )}
            </div>
          )}
        </div>
        <button
          className="primary-button subtle"
          onClick={() => useAuthStore.getState().clearTokens()}
        >
          로그아웃
          <span className="sr-only">Sign out</span>
        </button>
        <button
          className="icon-btn"
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          aria-label="Toggle Theme"
        >
          {theme === 'dark' ? '☀️' : '🌙'}
        </button>
        <button
          className="icon-btn profile-nav-button"
          onClick={() => setActiveSection('profile')}
          aria-label="My profile"
        >
          {profileImageUrl ? <img src={profileImageUrl} alt="" /> : '👤'}
        </button>
      </div>
    </header>
  );
}
