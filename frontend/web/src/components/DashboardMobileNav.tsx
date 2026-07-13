import { type DashboardModel } from '../hooks/useDashboardModel';

type DashboardMobileNavProps = Pick<DashboardModel['shell'], 'navigation'>;

export function DashboardMobileNav({ navigation }: DashboardMobileNavProps) {
  const {
    mobilePanel,
    section: activeSection,
    setSection: setActiveSection,
    setMobilePanel,
  } = navigation;
  return (
    <nav className="mobile-bottom-nav" aria-label="Mobile planner navigation">
      <button
        type="button"
        className={mobilePanel === 'calendar' && activeSection === 'calendar' ? 'active' : ''}
        onClick={() => {
          setActiveSection('calendar');
          setMobilePanel('calendar');
        }}
      >
        <span>📅</span>
        <strong>캘린더</strong>
      </button>
      <button
        type="button"
        className={activeSection === 'tasks' ? 'active' : ''}
        onClick={() => {
          setActiveSection('tasks');
          setMobilePanel('calendar');
        }}
      >
        <span>✓</span>
        <strong>할일</strong>
      </button>
      <button
        type="button"
        className={activeSection === 'inbox' ? 'active' : ''}
        onClick={() => {
          setActiveSection('inbox');
          setMobilePanel('calendar');
        }}
      >
        <span>✦</span>
        <strong>아이디어</strong>
      </button>
      <button
        type="button"
        onClick={() => {
          setActiveSection('profile');
          setMobilePanel('calendar');
        }}
      >
        <span>👤</span>
        <strong>마이페이지</strong>
      </button>
    </nav>
  );
}
