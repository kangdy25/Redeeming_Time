import { Navigate } from 'react-router-dom';
import IdeaInbox from '../IdeaInbox';
import { ProfilePanel as ProfilePanelComponent } from '../components/ProfilePanel';
import { TaskBoard } from '../components/TaskBoard';
import { useDashboardModel } from '../hooks/useDashboardModel';
import { DashboardHeader } from '../components/DashboardHeader';
import { DashboardSidebar } from '../components/DashboardSidebar';
import { CalendarPanel } from '../components/CalendarPanel';
import { DashboardMobileNav } from '../components/DashboardMobileNav';
import { DashboardModalLayer } from '../components/DashboardModalLayer';

export function DashboardPage() {
  const model = useDashboardModel();
  const {
    isAuthenticated,
    mobilePanel,
    activeSection,
    taskBoardDate,
    setTaskBoardDate,
    tasks,
    categories,
    activeCalendar,
    globalCalendar,
  } = model;
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="app-container">
      <DashboardHeader {...model} />

      <div className="workspace-layout">
        {/* Sidebar */}
        <DashboardSidebar {...model} />

        {/* Main Panel */}
        <main className="main-content">
          <div
            className={`center-panel mobile-panel-calendar ${activeSection === 'profile' ? 'profile-main-panel' : ''} ${mobilePanel === 'calendar' ? 'mobile-panel-active' : ''}`}
          >
            {activeSection === 'profile' ? (
              <ProfilePanelComponent />
            ) : activeSection === 'tasks' ? (
              <TaskBoard
                tasks={tasks}
                categories={categories}
                calendarId={globalCalendar?.id ?? activeCalendar?.id ?? 0}
                selectedDate={taskBoardDate}
                setSelectedDate={setTaskBoardDate}
              />
            ) : activeSection === 'inbox' ? (
              <IdeaInbox />
            ) : (
              <CalendarPanel {...model} />
            )}
          </div>
        </main>
      </div>

      <DashboardMobileNav {...model} />

      <DashboardModalLayer {...model} />
    </div>
  );
}
