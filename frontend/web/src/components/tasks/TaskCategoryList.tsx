import { type CSSProperties } from 'react';
import { type TaskPriority } from '@redeeming-time/shared';
import { type TaskBoardModel } from '../../hooks/useTaskBoardModel';
import { taskPriorities } from '../../utils/taskBoard';
import { ColorPresetPicker } from '../ui/ColorPresetPicker';

type TaskCategoryListProps = { model: TaskBoardModel; calendarId: number };

export function TaskCategoryList({ model, calendarId }: TaskCategoryListProps) {
  const { data, editor, composer, mutations, calendar } = model;
  const {
    category: editingCategory,
    setCategory: setEditingCategory,
    saveCategory: saveCategoryEdit,
    isSaving: isSavingEdit,
    removeCategory,
    task: editingTask,
    setTask: setEditingTask,
    saveTask: saveTaskEdit,
    removeTask,
  } = editor;
  const { categorySections, taskCategories } = data;
  const prepareTaskForCategory = composer.prepareForCategory;
  const toggleTask = mutations.toggleTask;
  const today = calendar.today;
  return (
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
              <ColorPresetPicker
                label="Edit category color"
                value={editingCategory.color}
                onChange={(color) => {
                  setEditingCategory((current) => (current ? { ...current, color } : current));
                }}
                disabled={isSavingEdit}
                className="category-edit-color-picker"
                variant="select"
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
                {section.tasks.filter((task) => task.is_completed).length}/{section.tasks.length}
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
                    <input
                      aria-label="Edit task date"
                      type="date"
                      value={editingTask.targetDate}
                      onChange={(event) =>
                        setEditingTask({
                          ...editingTask,
                          targetDate: event.target.value,
                        })
                      }
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
                          targetDate: task.target_date,
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
  );
}
