import { isoDate } from '../../utils/planner';
import { taskWeekdayLabels } from '../../utils/taskBoard';

type TaskMiniCalendarProps = {
  miniMonth: Date;
  miniCells: Date[];
  selectedDate: string;
  today: string;
  weekly: boolean;
  taskCountByDate: Record<string, number>;
  onMove: (offset: number) => void;
  onToday: () => void;
  onSelectDate: (date: string) => void;
};

export function TaskMiniCalendar({
  miniMonth,
  miniCells,
  selectedDate,
  today,
  weekly,
  taskCountByDate,
  onMove,
  onToday,
  onSelectDate,
}: TaskMiniCalendarProps) {
  return (
    <aside className="mini-calendar-panel">
      <div className="mini-calendar-header">
        <div>
          <span>Calendar</span>
          <h3>
            {weekly
              ? `${miniCells[0].getMonth() + 1}월 ${miniCells[0].getDate()}일 – ${miniCells[6].getMonth() + 1}월 ${miniCells[6].getDate()}일`
              : `${miniMonth.getFullYear()}년 ${miniMonth.getMonth() + 1}월`}
          </h3>
        </div>
        <div className="mini-month-controls">
          <button type="button" onClick={() => onMove(-1)} aria-label="Previous task month">
            ◀
          </button>
          <button type="button" onClick={onToday}>
            오늘
          </button>
          <button type="button" onClick={() => onMove(1)} aria-label="Next task month">
            ▶
          </button>
        </div>
      </div>
      <div className="mini-calendar-grid">
        {taskWeekdayLabels.map((day) => (
          <span className="mini-weekday" key={day}>
            {day}
          </span>
        ))}
        {miniCells.map((date) => {
          const value = isoDate(date);
          const muted = !weekly && date.getMonth() !== miniMonth.getMonth();
          return (
            <button
              type="button"
              className={`mini-day ${value === selectedDate ? 'selected' : ''} ${value === today ? 'today' : ''} ${muted ? 'muted' : ''}`}
              onClick={() => onSelectDate(value)}
              key={value}
            >
              <span>{date.getDate()}</span>
              {(taskCountByDate[value] ?? 0) > 0 && <b>{taskCountByDate[value]}</b>}
            </button>
          );
        })}
      </div>
    </aside>
  );
}
