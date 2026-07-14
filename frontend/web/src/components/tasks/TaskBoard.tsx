import { type Category, type Task, type TaskPriority } from '@redeeming-time/shared';
import { taskBoardDateLabel, taskBoardTitleLabel, taskPriorities } from '../../utils/taskBoard';
import { useTaskBoardModel } from '../../hooks/useTaskBoardModel';
import { TaskBoardHeader } from './TaskBoardHeader';
import { TaskMiniCalendar } from './TaskMiniCalendar';
import { TaskCategoryList } from './TaskCategoryList';
import { ColorPresetPicker } from '../ui/ColorPresetPicker';

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
  const { data, calendar, composer, rollover } = model;

  return (
    <section className="task-board">
      <TaskBoardHeader
        selectedDateTitle={taskBoardTitleLabel(selectedDate)}
        totalCount={data.selectedTasks.length}
        openCount={data.selectedOpenTasks.length}
        completionRate={data.completionRate}
        overdueCount={data.overdueTasks.length}
        isRollingOver={rollover.isPending}
        rolloverMessage={rollover.message}
        onRollover={rollover.rollover}
      />

      <div className="task-workspace">
        <TaskMiniCalendar
          miniMonth={calendar.miniMonth}
          miniCells={data.miniCells}
          selectedDate={selectedDate}
          today={calendar.today}
          weekly={calendar.weekly}
          taskCountByDate={data.taskCountByDate}
          onMove={calendar.move}
          onToday={calendar.jumpToToday}
          onSelectDate={calendar.selectDate}
        />

        <section className="todo-panel">
          <form className="quick-task-form" onSubmit={composer.addTask}>
            <input
              id="quick-task-input"
              aria-label="Quick Task"
              placeholder={`${taskBoardDateLabel(selectedDate)}에 할일 추가`}
              value={composer.title}
              onChange={(event) => composer.setTitle(event.target.value)}
              disabled={!calendarId || composer.createTask.isPending}
            />
            <select
              aria-label="Quick Task Priority"
              value={composer.priority}
              onChange={(event) => composer.setPriority(event.target.value as TaskPriority)}
              disabled={!calendarId || composer.createTask.isPending}
            >
              {taskPriorities.map((priority) => (
                <option value={priority} key={priority}>
                  {priority.charAt(0) + priority.slice(1).toLowerCase()}
                </option>
              ))}
            </select>
            <select
              aria-label="Quick Task Category"
              value={composer.category}
              onChange={(event) => composer.setCategory(event.target.value)}
              disabled={!calendarId || composer.createTask.isPending}
            >
              <option value="">카테고리 없음</option>
              {data.taskCategories.map((category) => (
                <option value={category.id} key={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
            <button type="submit" disabled={!calendarId || composer.createTask.isPending}>
              추가
            </button>
          </form>
          <form className="task-category-form" onSubmit={composer.addCategory}>
            <input
              aria-label="Category"
              placeholder="새 할일 카테고리"
              value={composer.categoryName}
              onChange={(event) => composer.setCategoryName(event.target.value)}
              disabled={!calendarId || composer.createCategory.isPending}
            />
            <ColorPresetPicker
              label="Category color"
              value={composer.categoryColor}
              onChange={composer.setCategoryColor}
              disabled={!calendarId || composer.createCategory.isPending}
              className="task-category-color-picker"
            />
            <button
              type="submit"
              aria-label="Add Category"
              disabled={!calendarId || composer.createCategory.isPending}
            >
              카테고리 추가
            </button>
          </form>
          {composer.message && <p className="quick-task-message">{composer.message}</p>}

          <TaskCategoryList model={model} calendarId={calendarId} />
        </section>
      </div>
    </section>
  );
}
