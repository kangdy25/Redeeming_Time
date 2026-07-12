import { type Category, type Task, type TaskPriority } from '@redeeming-time/shared';
import { taskBoardDateLabel, taskBoardTitleLabel, taskPriorities } from '../utils/taskBoard';
import { useTaskBoardModel } from '../hooks/useTaskBoardModel';
import { TaskBoardHeader } from './tasks/TaskBoardHeader';
import { TaskMiniCalendar } from './tasks/TaskMiniCalendar';
import { TaskCategoryList } from './tasks/TaskCategoryList';

export function TaskBoard({
  tasks,
  categories,
  calendarId,
  selectedDate,
  setSelectedDate,
}: {
  tasks: Task[];
  categories: Category[];
  calendarId: number;
  selectedDate: string;
  setSelectedDate: (date: string) => void;
}) {
  const model = useTaskBoardModel({ tasks, categories, calendarId, selectedDate, setSelectedDate });
  const {
    today,
    miniMonth,
    miniCells,
    selectedTasks,
    selectedOpenTasks,
    completionRate,
    overdueTasks,
    isRollingOver,
    rolloverMessage,
    rolloverOverdueTasks,
    useWeeklyTaskCalendar,
    moveMiniMonth,
    jumpToToday,
    taskCountByDate,
    quickTaskInputRef,
    addQuickTask,
    quickTaskTitle,
    setQuickTaskTitle,
    createTask,
    quickTaskPriority,
    setQuickTaskPriority,
    taskCategories,
    quickTaskCategory,
    setQuickTaskCategory,
    addTaskCategory,
    newCategoryName,
    setNewCategoryName,
    newCategoryColor,
    setNewCategoryColor,
    createCategory,
    quickTaskMessage,
  } = model;

  return (
    <section className="task-board">
      <TaskBoardHeader
        selectedDateTitle={taskBoardTitleLabel(selectedDate)}
        totalCount={selectedTasks.length}
        openCount={selectedOpenTasks.length}
        completionRate={completionRate}
        overdueCount={overdueTasks.length}
        isRollingOver={isRollingOver}
        rolloverMessage={rolloverMessage}
        onRollover={rolloverOverdueTasks}
      />

      <div className="task-workspace">
        <TaskMiniCalendar
          miniMonth={miniMonth}
          miniCells={miniCells}
          selectedDate={selectedDate}
          today={today}
          weekly={useWeeklyTaskCalendar}
          taskCountByDate={taskCountByDate}
          onMove={moveMiniMonth}
          onToday={jumpToToday}
          onSelectDate={setSelectedDate}
        />

        <section className="todo-panel">
          <form className="quick-task-form" onSubmit={addQuickTask}>
            <input
              ref={quickTaskInputRef}
              aria-label="Quick Task"
              placeholder={`${taskBoardDateLabel(selectedDate)}에 할일 추가`}
              value={quickTaskTitle}
              onChange={(event) => setQuickTaskTitle(event.target.value)}
              disabled={!calendarId || createTask.isPending}
            />
            <select
              aria-label="Quick Task Priority"
              value={quickTaskPriority}
              onChange={(event) => setQuickTaskPriority(event.target.value as TaskPriority)}
              disabled={!calendarId || createTask.isPending}
            >
              {taskPriorities.map((priority) => (
                <option value={priority} key={priority}>
                  {priority.charAt(0) + priority.slice(1).toLowerCase()}
                </option>
              ))}
            </select>
            <select
              aria-label="Quick Task Category"
              value={quickTaskCategory}
              onChange={(event) => setQuickTaskCategory(event.target.value)}
              disabled={!calendarId || createTask.isPending}
            >
              <option value="">카테고리 없음</option>
              {taskCategories.map((category) => (
                <option value={category.id} key={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
            <button type="submit" disabled={!calendarId || createTask.isPending}>
              추가
            </button>
          </form>
          <form className="task-category-form" onSubmit={addTaskCategory}>
            <input
              aria-label="Category"
              placeholder="새 할일 카테고리"
              value={newCategoryName}
              onChange={(event) => setNewCategoryName(event.target.value)}
              disabled={!calendarId || createCategory.isPending}
            />
            <input
              aria-label="Category color"
              value={newCategoryColor}
              onChange={(event) => setNewCategoryColor(event.target.value)}
              type="color"
              disabled={!calendarId || createCategory.isPending}
            />
            <button
              type="submit"
              aria-label="Add Category"
              disabled={!calendarId || createCategory.isPending}
            >
              카테고리 추가
            </button>
          </form>
          {quickTaskMessage && <p className="quick-task-message">{quickTaskMessage}</p>}

          <TaskCategoryList {...model} calendarId={calendarId} />
        </section>
      </div>
    </section>
  );
}
