import { Navigate } from 'react-router-dom';
import IdeaInbox from '../components/ideas/IdeaInbox';
import { ProfilePanel as ProfilePanelComponent } from '../components/profile/ProfilePanel';
import { TaskBoard } from '../components/tasks/TaskBoard';
import { useDashboardModel } from '../hooks/useDashboardModel';
import { DashboardHeader } from '../components/dashboard/DashboardHeader';
import { DashboardSidebar } from '../components/dashboard/DashboardSidebar';
import { CalendarPanel } from '../components/calendar/CalendarPanel';
import { DashboardMobileNav } from '../components/dashboard/DashboardMobileNav';
import { DashboardModalLayer } from '../components/dashboard/DashboardModalLayer';

export function DashboardPage() {
  const model = useDashboardModel();
  const { shell, workspace } = model;
  const { mobilePanel, section: activeSection } = shell.navigation;
  const { date: taskBoardDate, setDate: setTaskBoardDate } = shell.taskBoard;
  const { tasks, categories, active: activeCalendar, global: globalCalendar } = workspace;
  const { isAuthenticated } = shell.session;
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

      <DashboardMobileNav navigation={shell.navigation} />

      <DashboardModalLayer {...model} />
    </div>
  );
}
