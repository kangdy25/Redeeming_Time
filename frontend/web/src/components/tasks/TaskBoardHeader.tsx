type TaskBoardHeaderProps = {
  selectedDateTitle: string;
  totalCount: number;
  openCount: number;
  completionRate: number;
  overdueCount: number;
  isRollingOver: boolean;
  rolloverMessage: string;
  onRollover: () => void;
};

export function TaskBoardHeader({
  selectedDateTitle,
  totalCount,
  openCount,
  completionRate,
  overdueCount,
  isRollingOver,
  rolloverMessage,
  onRollover,
}: TaskBoardHeaderProps) {
  return (
    <>
      <div className="task-board-hero">
        <div>
          <p className="eyebrow">
            할일 보드<span className="sr-only">Task Board</span>
          </p>
          <h2>{selectedDateTitle}</h2>
        </div>
        <div className="task-board-hero-side">
          <div className="task-board-stats" aria-label="Task board stats">
            <div>
              <strong>{totalCount}</strong>
              <span>전체</span>
            </div>
            <div className="task-board-progress-copy">
              <strong>{openCount}</strong>
              <span>남은 할일</span>
            </div>
            <div>
              <strong>{completionRate}%</strong>
              <span>완료율</span>
            </div>
            <button
              className="rollover-compact-button"
              type="button"
              onClick={onRollover}
              disabled={overdueCount === 0 || isRollingOver}
            >
              {isRollingOver ? '가져오는 중...' : '밀린 할일 가져오기'}
            </button>
          </div>
        </div>
      </div>
      {rolloverMessage && <p className="rollover-message">{rolloverMessage}</p>}
    </>
  );
}
