import { type DashboardModel } from '../../hooks/useDashboardModel';

type DashboardSidebarProps = Pick<DashboardModel, 'shell' | 'workspace'>;

export function DashboardSidebar({ shell, workspace }: DashboardSidebarProps) {
  const {
    mobilePanel,
    section: activeSection,
    setSection: setActiveSection,
    setMobilePanel,
  } = shell.navigation;
  const { collapsed: isSidebarCollapsed, setCollapsed: setIsSidebarCollapsed } = shell.sidebar;
  const {
    color: selectedCalendarColor,
    title: activeCalendarTitle,
    activeEvents: activeCalendarEvents,
    tasks,
  } = workspace;

  return (
    <aside
      className={`sidebar mobile-panel-menu ${mobilePanel === 'menu' ? 'mobile-panel-active' : ''} ${isSidebarCollapsed ? 'collapsed' : ''}`}
    >
      {/* Workspace Stats Card */}
      <div className="sidebar-workspace-card">
        <div
          className="workspace-header"
          style={{
            justifyContent: isSidebarCollapsed ? 'center' : 'flex-start',
          }}
        >
          {isSidebarCollapsed ? (
            <button
              className="workspace-toggle-btn collapsed-arrow-toggle"
              onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
              aria-label="Toggle Sidebar"
              style={{
                background: 'none',
                border: 'none',
                width: '32px',
                height: '32px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--color-text-secondary)',
                fontSize: '16px',
              }}
            >
              ▶
            </button>
          ) : (
            <>
              <div
                className="workspace-color-dot"
                style={{ backgroundColor: selectedCalendarColor }}
              />
              <h3>{(activeCalendarTitle || '전체 캘린더') + '\u200B'}</h3>
              <button
                className="icon-btn collapse-btn"
                onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
                aria-label="Toggle Sidebar"
                style={{
                  marginLeft: 'auto',
                  padding: '4px 8px',
                  fontSize: '12px',
                }}
              >
                ◀
              </button>
            </>
          )}
        </div>
        {!isSidebarCollapsed && (
          <div className="workspace-stats">
            <div className="stat-item">
              <span className="stat-val">{activeCalendarEvents.length}</span>
              <span className="stat-lbl">
                일정
                <span className="sr-only">Events</span>
              </span>
            </div>
            <div className="stat-item">
              <span className="stat-val">{tasks.length}</span>
              <span className="stat-lbl">
                할일
                <span className="sr-only">Tasks</span>
              </span>
            </div>
          </div>
        )}
      </div>

      <div className="sidebar-menu">
        <button
          className={`menu-item ${activeSection === 'calendar' ? 'active' : ''}`}
          onClick={() => {
            setActiveSection('calendar');
            setMobilePanel('calendar');
          }}
        >
          <span className="menu-icon">📅</span>
          {!isSidebarCollapsed && <span>전체 일정</span>}
        </button>
        <button
          className={`menu-item ${activeSection === 'tasks' ? 'active' : ''}`}
          onClick={() => {
            setActiveSection('tasks');
            setMobilePanel('calendar');
          }}
        >
          <span className="menu-icon">📋</span>
          {!isSidebarCollapsed && <span>할일 보드</span>}
        </button>
        <button
          className={`menu-item ${activeSection === 'inbox' ? 'active' : ''}`}
          onClick={() => setActiveSection('inbox')}
        >
          <span className="menu-icon">📥</span>
          {!isSidebarCollapsed && <span>아이디어 보관함</span>}
        </button>
        <button
          className={`menu-item ${activeSection === 'profile' ? 'active' : ''}`}
          onClick={() => setActiveSection('profile')}
        >
          <span className="menu-icon">👤</span>
          {!isSidebarCollapsed && <span>마이페이지</span>}
        </button>
      </div>
    </aside>
  );
}
