import { type CSSProperties } from 'react';
import { type Category, type Task, type TaskPriority } from '@redeeming-time/shared';
import { isoDate } from '../utils/planner';
import {
  taskBoardDateLabel,
  taskBoardTitleLabel,
  taskPriorities,
  taskWeekdayLabels,
} from '../utils/taskBoard';
import { useTaskBoardModel } from '../hooks/useTaskBoardModel';

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
    categorySections,
    editingCategory,
    setEditingCategory,
    saveCategoryEdit,
    isSavingEdit,
    removeCategory,
    prepareTaskForCategory,
    editingTask,
    setEditingTask,
    saveTaskEdit,
    removeTask,
    toggleTask,
  } = useTaskBoardModel({ tasks, categories, calendarId, selectedDate, setSelectedDate });

  return (
    <section className="task-board">
      <div className="task-board-hero">
        <div>
          <p className="eyebrow">
            할일 보드
            <span className="sr-only">Task Board</span>
          </p>
          <h2>{taskBoardTitleLabel(selectedDate)}</h2>
        </div>
        <div className="task-board-hero-side">
          <div className="task-board-stats" aria-label="Task board stats">
            <div>
              <strong>{selectedTasks.length}</strong>
              <span>전체</span>
            </div>
            <div className="task-board-progress-copy">
              <strong>{selectedOpenTasks.length}</strong>
              <span>남은 할일</span>
            </div>
            <div>
              <strong>{completionRate}%</strong>
              <span>완료율</span>
            </div>
            <button
              className="rollover-compact-button"
              type="button"
              onClick={rolloverOverdueTasks}
              disabled={overdueTasks.length === 0 || isRollingOver}
            >
              {isRollingOver ? '가져오는 중...' : '밀린 할일 가져오기'}
            </button>
          </div>
        </div>
      </div>
      {rolloverMessage && <p className="rollover-message">{rolloverMessage}</p>}

      <div className="task-workspace">
        <aside className="mini-calendar-panel">
          <div className="mini-calendar-header">
            <div>
              <span>Calendar</span>
              <h3>
                {useWeeklyTaskCalendar
                  ? `${miniCells[0].getMonth() + 1}월 ${miniCells[0].getDate()}일 – ${miniCells[6].getMonth() + 1}월 ${miniCells[6].getDate()}일`
                  : `${miniMonth.getFullYear()}년 ${miniMonth.getMonth() + 1}월`}
              </h3>
            </div>
            <div className="mini-month-controls">
              <button
                type="button"
                onClick={() => moveMiniMonth(-1)}
                aria-label="Previous task month"
              >
                ◀
              </button>
              <button type="button" onClick={jumpToToday}>
                오늘
              </button>
              <button type="button" onClick={() => moveMiniMonth(1)} aria-label="Next task month">
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
              const dateValue = isoDate(date);
              const taskCount = taskCountByDate[dateValue] ?? 0;
              const isSelected = dateValue === selectedDate;
              const isToday = dateValue === today;
              const isMuted = !useWeeklyTaskCalendar && date.getMonth() !== miniMonth.getMonth();

              return (
                <button
                  type="button"
                  className={`mini-day ${isSelected ? 'selected' : ''} ${isToday ? 'today' : ''} ${isMuted ? 'muted' : ''}`}
                  onClick={() => setSelectedDate(dateValue)}
                  key={dateValue}
                >
                  <span>{date.getDate()}</span>
                  {taskCount > 0 && <b>{taskCount}</b>}
                </button>
              );
            })}
          </div>
        </aside>

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

          <div className="task-board-list">
            {categorySections.map((section) => (
              <section className="task-category-section" key={section.id}>
                {editingCategory && editingCategory.id === section.category?.id ? (
                  <form className="category-edit-form" onSubmit={saveCategoryEdit}>
                    <input
                      aria-label="Edit category name"
                      value={editingCategory.name}
                      onChange={(event) => {
                        const name = event.target.value;
                        setEditingCategory((current) => (current ? { ...current, name } : current));
                      }}
                      autoFocus
                    />
                    <input
                      aria-label="Edit category color"
                      type="color"
                      value={editingCategory.color}
                      onChange={(event) => {
                        const color = event.target.value;
                        setEditingCategory((current) =>
                          current ? { ...current, color } : current,
                        );
                      }}
                    />
                    <button type="submit" disabled={isSavingEdit}>
                      저장
                    </button>
                    <button type="button" onClick={() => setEditingCategory(null)}>
                      취소
                    </button>
                  </form>
                ) : (
                  <header
                    className="task-category-pill"
                    style={
                      section.category
                        ? ({
                            '--category-color': section.category.color_code,
                          } as CSSProperties)
                        : undefined
                    }
                  >
                    <span className="task-category-mark" aria-hidden="true">
                      {section.category ? '●' : '○'}
                    </span>
                    <strong>{section.category?.name ?? '카테고리 없음'}</strong>
                    <span className="task-category-progress">
                      {section.tasks.filter((task) => task.is_completed).length}/
                      {section.tasks.length}
                    </span>
                    {section.category && (
                      <>
                        <button
                          type="button"
                          className="category-manage-button"
                          aria-label={`${section.category.name} 수정`}
                          onClick={() =>
                            setEditingCategory({
                              id: section.category!.id,
                              name: section.category!.name,
                              color: section.category!.color_code,
                            })
                          }
                        >
                          ✎
                        </button>
                        <button
                          type="button"
                          className="category-manage-button category-delete-button"
                          aria-label={`${section.category.name} 삭제`}
                          onClick={() => removeCategory(section.category!)}
                        >
                          ×
                        </button>
                      </>
                    )}
                    <button
                      type="button"
                      aria-label={`${section.category?.name ?? '카테고리 없음'}에 할일 추가`}
                      onClick={() => prepareTaskForCategory(section.category?.id ?? null)}
                      disabled={!calendarId}
                    >
                      +
                    </button>
                  </header>
                )}

                <div className="task-category-items">
                  {section.tasks.map((task) => {
                    const overdue = !task.is_completed && task.target_date < today;
                    if (editingTask?.id === task.id) {
                      return (
                        <form className="task-edit-form" onSubmit={saveTaskEdit} key={task.id}>
                          <input
                            aria-label="Edit task title"
                            value={editingTask.title}
                            onChange={(event) =>
                              setEditingTask({
                                ...editingTask,
                                title: event.target.value,
                              })
                            }
                            autoFocus
                          />
                          <select
                            aria-label="Edit task priority"
                            value={editingTask.priority}
                            onChange={(event) =>
                              setEditingTask({
                                ...editingTask,
                                priority: event.target.value as TaskPriority,
                              })
                            }
                          >
                            {taskPriorities.map((priority) => (
                              <option value={priority} key={priority}>
                                {priority}
                              </option>
                            ))}
                          </select>
                          <select
                            aria-label="Edit task category"
                            value={editingTask.category}
                            onChange={(event) =>
                              setEditingTask({
                                ...editingTask,
                                category: event.target.value,
                              })
                            }
                          >
                            <option value="">카테고리 없음</option>
                            {taskCategories.map((category) => (
                              <option value={category.id} key={category.id}>
                                {category.name}
                              </option>
                            ))}
                          </select>
                          <button type="submit" disabled={isSavingEdit}>
                            저장
                          </button>
                          <button type="button" onClick={() => setEditingTask(null)}>
                            취소
                          </button>
                        </form>
                      );
                    }
                    return (
                      <div
                        className={`todo-row priority-${task.priority.toLowerCase()} ${task.is_completed ? 'done' : ''}`}
                        key={task.id}
                      >
                        <button
                          className="todo-toggle"
                          type="button"
                          onClick={() => toggleTask.mutate(task)}
                        >
                          <span className="todo-check">{task.is_completed ? '✓' : ''}</span>
                          <span className="todo-main">
                            <strong>{task.title}</strong>
                            <span>
                              <em className={`badge-priority badge-${task.priority.toLowerCase()}`}>
                                {task.priority.charAt(0) + task.priority.slice(1).toLowerCase()}
                              </em>
                              {overdue && (
                                <em className="badge-rollover">
                                  이월 대기
                                  <span className="sr-only">rollover ready</span>
                                </em>
                              )}
                            </span>
                          </span>
                        </button>
                        <div className="todo-manage-actions">
                          <button
                            type="button"
                            aria-label={`${task.title} 수정`}
                            onClick={() =>
                              setEditingTask({
                                id: task.id,
                                title: task.title,
                                priority: task.priority,
                                category: task.category ? String(task.category) : '',
                              })
                            }
                          >
                            ✎
                          </button>
                          <button
                            type="button"
                            aria-label={`${task.title} 삭제`}
                            onClick={() => removeTask(task)}
                          >
                            ×
                          </button>
                        </div>
                      </div>
                    );
                  })}
                  {section.tasks.length === 0 && (
                    <button
                      type="button"
                      className="category-empty-row"
                      onClick={() => prepareTaskForCategory(section.category?.id ?? null)}
                    >
                      이 카테고리에 첫 할일 추가
                      <span aria-hidden="true">+</span>
                    </button>
                  )}
                </div>
              </section>
            ))}
          </div>
        </section>
      </div>
    </section>
  );
}
