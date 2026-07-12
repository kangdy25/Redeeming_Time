import { type FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import {
  apiClient,
  useCreateCategory,
  useCreateTask,
  useToggleTask,
  type Category,
  type Task,
  type TaskPriority,
} from '@redeeming-time/shared';
import { isoDate, monthCells } from '../utils/planner';

type TaskBoardModelInput = {
  tasks: Task[];
  categories: Category[];
  calendarId: number;
  selectedDate: string;
  setSelectedDate: (date: string) => void;
};

export function useTaskBoardModel({
  tasks,
  categories,
  calendarId,
  selectedDate,
  setSelectedDate,
}: TaskBoardModelInput) {
  const toggleTask = useToggleTask();
  const createTask = useCreateTask();
  const createCategory = useCreateCategory();
  const today = isoDate(new Date());
  const [miniMonth, setMiniMonth] = useState(() => {
    const date = new Date(`${selectedDate}T00:00:00`);
    return new Date(date.getFullYear(), date.getMonth(), 1);
  });
  const [quickTaskTitle, setQuickTaskTitle] = useState('');
  const [quickTaskPriority, setQuickTaskPriority] = useState<TaskPriority>('MEDIUM');
  const [quickTaskCategory, setQuickTaskCategory] = useState('');
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryColor, setNewCategoryColor] = useState('#14B8A6');
  const [quickTaskMessage, setQuickTaskMessage] = useState('');
  const [rolloverMessage, setRolloverMessage] = useState('');
  const [isRollingOver, setIsRollingOver] = useState(false);
  const [useWeeklyTaskCalendar, setUseWeeklyTaskCalendar] = useState(false);
  const [editingCategory, setEditingCategory] = useState<{
    id: number;
    name: string;
    color: string;
  } | null>(null);
  const [editingTask, setEditingTask] = useState<{
    id: number;
    title: string;
    priority: TaskPriority;
    category: string;
  } | null>(null);
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const quickTaskInputRef = useRef<HTMLInputElement>(null);
  const miniCells = useMemo(() => {
    if (!useWeeklyTaskCalendar) return monthCells(miniMonth);
    const selected = new Date(`${selectedDate}T00:00:00`);
    const start = new Date(selected);
    start.setDate(selected.getDate() - selected.getDay());
    return Array.from({ length: 7 }, (_, index) => {
      const date = new Date(start);
      date.setDate(start.getDate() + index);
      return date;
    });
  }, [miniMonth, selectedDate, useWeeklyTaskCalendar]);
  const sortedTasks = [...tasks].sort(
    (a, b) => a.target_date.localeCompare(b.target_date) || a.order - b.order,
  );
  const overdueTasks = tasks.filter((task) => !task.is_completed && task.target_date < today);
  const selectedTasks = sortedTasks.filter((task) => task.target_date === selectedDate);
  const selectedOpenTasks = selectedTasks.filter((task) => !task.is_completed);
  const selectedCompletedCount = selectedTasks.length - selectedOpenTasks.length;
  const completionRate =
    selectedTasks.length === 0
      ? 0
      : Math.round((selectedCompletedCount / selectedTasks.length) * 100);
  const taskCategories = categories;
  const categorySections = [
    ...taskCategories.map((category) => ({
      id: String(category.id),
      category,
      tasks: selectedTasks.filter((task) => task.category === category.id),
    })),
    {
      id: 'uncategorized',
      category: null,
      tasks: selectedTasks.filter((task) => task.category === null),
    },
  ].filter((section) => section.tasks.length > 0 || section.category !== null);
  const taskCountByDate = tasks.reduce<Record<string, number>>((counts, task) => {
    counts[task.target_date] = (counts[task.target_date] ?? 0) + 1;
    return counts;
  }, {});

  useEffect(() => {
    const date = new Date(`${selectedDate}T00:00:00`);
    setMiniMonth(new Date(date.getFullYear(), date.getMonth(), 1));
  }, [selectedDate]);

  useEffect(() => {
    if (!globalThis.matchMedia) return;
    const query = globalThis.matchMedia('(max-width: 760px)');
    const syncCalendarMode = () => setUseWeeklyTaskCalendar(query.matches);
    syncCalendarMode();
    query.addEventListener?.('change', syncCalendarMode);
    return () => query.removeEventListener?.('change', syncCalendarMode);
  }, []);

  async function addQuickTask(event: FormEvent) {
    event.preventDefault();
    const title = quickTaskTitle.trim();
    if (!title) {
      setQuickTaskMessage('할일 제목을 입력해 주세요.');
      return;
    }
    if (!calendarId) {
      setQuickTaskMessage('먼저 캘린더 워크스페이스를 만들어 주세요.');
      return;
    }

    setQuickTaskMessage('');
    try {
      await createTask.mutateAsync({
        calendar: calendarId,
        category: quickTaskCategory ? Number(quickTaskCategory) : null,
        title,
        target_date: selectedDate,
        priority: quickTaskPriority,
        order: selectedTasks.length,
      });
      setQuickTaskTitle('');
      setQuickTaskMessage('');
    } catch (error) {
      setQuickTaskMessage(error instanceof Error ? error.message : '할일 추가에 실패했습니다.');
    }
  }

  async function addTaskCategory(event: FormEvent) {
    event.preventDefault();
    const name = newCategoryName.trim();
    if (!name) {
      setQuickTaskMessage('카테고리 이름을 입력해 주세요.');
      return;
    }
    if (!calendarId) {
      setQuickTaskMessage('먼저 캘린더 워크스페이스를 만들어 주세요.');
      return;
    }

    setQuickTaskMessage('');
    try {
      const category = await createCategory.mutateAsync({
        calendar: calendarId,
        name,
        color_code: newCategoryColor,
      });
      setQuickTaskCategory(String(category.id));
      setNewCategoryName('');
      setQuickTaskMessage('');
    } catch (error) {
      setQuickTaskMessage(error instanceof Error ? error.message : '카테고리 추가에 실패했습니다.');
    }
  }

  function moveMiniMonth(offset: number) {
    if (useWeeklyTaskCalendar) {
      const date = new Date(`${selectedDate}T00:00:00`);
      date.setDate(date.getDate() + offset * 7);
      setSelectedDate(isoDate(date));
      return;
    }
    setMiniMonth((current) => new Date(current.getFullYear(), current.getMonth() + offset, 1));
  }

  function jumpToToday() {
    const date = new Date(`${today}T00:00:00`);
    setSelectedDate(today);
    setMiniMonth(new Date(date.getFullYear(), date.getMonth(), 1));
  }

  async function rolloverOverdueTasks() {
    if (overdueTasks.length === 0) {
      setRolloverMessage('이월할 할일이 없습니다.');
      return;
    }

    setRolloverMessage('');
    setIsRollingOver(true);
    try {
      await Promise.all(overdueTasks.map((task) => apiClient.updateTaskTargetDate(task, today)));
      jumpToToday();
      setRolloverMessage('');
    } catch (error) {
      setRolloverMessage(error instanceof Error ? error.message : '이월 처리에 실패했습니다.');
    } finally {
      setIsRollingOver(false);
    }
  }

  function prepareTaskForCategory(categoryId: number | null) {
    setQuickTaskCategory(categoryId === null ? '' : String(categoryId));
    quickTaskInputRef.current?.focus();
    quickTaskInputRef.current?.scrollIntoView({
      behavior: 'smooth',
      block: 'center',
    });
  }

  async function saveCategoryEdit(event: FormEvent) {
    event.preventDefault();
    if (!editingCategory?.name.trim()) return;
    setIsSavingEdit(true);
    try {
      await apiClient.updateCategory(editingCategory.id, {
        name: editingCategory.name.trim(),
        color_code: editingCategory.color,
      });
      setEditingCategory(null);
      setQuickTaskMessage('카테고리를 수정했습니다.');
    } catch (error) {
      setQuickTaskMessage(error instanceof Error ? error.message : '카테고리 수정에 실패했습니다.');
    } finally {
      setIsSavingEdit(false);
    }
  }

  async function removeCategory(category: Category) {
    if (
      !window.confirm(
        `"${category.name}" 카테고리를 삭제할까요? 포함된 할일은 카테고리 없음으로 이동합니다.`,
      )
    )
      return;
    try {
      await apiClient.deleteCategory(category.id);
      if (quickTaskCategory === String(category.id)) setQuickTaskCategory('');
      setEditingCategory(null);
      setQuickTaskMessage('카테고리를 삭제했습니다.');
    } catch (error) {
      setQuickTaskMessage(error instanceof Error ? error.message : '카테고리 삭제에 실패했습니다.');
    }
  }

  async function saveTaskEdit(event: FormEvent) {
    event.preventDefault();
    if (!editingTask?.title.trim()) return;
    setIsSavingEdit(true);
    try {
      await apiClient.editTask(editingTask.id, {
        title: editingTask.title.trim(),
        priority: editingTask.priority,
        category: editingTask.category ? Number(editingTask.category) : null,
      });
      setEditingTask(null);
      setQuickTaskMessage('할일을 수정했습니다.');
    } catch (error) {
      setQuickTaskMessage(error instanceof Error ? error.message : '할일 수정에 실패했습니다.');
    } finally {
      setIsSavingEdit(false);
    }
  }

  async function removeTask(task: Task) {
    if (!window.confirm(`"${task.title}" 할일을 삭제할까요?`)) return;
    try {
      await apiClient.deleteTask(task.id);
      setEditingTask(null);
      setQuickTaskMessage('할일을 삭제했습니다.');
    } catch (error) {
      setQuickTaskMessage(error instanceof Error ? error.message : '할일 삭제에 실패했습니다.');
    }
  }

  return {
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
  };
}
