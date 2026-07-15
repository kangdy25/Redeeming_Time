import { type FormEvent, useState } from 'react';
import {
  getErrorMessage,
  useDeleteCategory,
  useDeleteTask,
  useEditTask,
  useUpdateCategory,
  type Category,
  type Task,
  type TaskPriority,
} from '@redeeming-time/shared';

type Input = {
  selectedCategory: string;
  setSelectedCategory: (value: string) => void;
  setMessage: (value: string) => void;
};

export function useTaskEditors({ selectedCategory, setSelectedCategory, setMessage }: Input) {
  const updateCategory = useUpdateCategory();
  const deleteCategory = useDeleteCategory();
  const editTask = useEditTask();
  const deleteTask = useDeleteTask();
  const [category, setCategory] = useState<{ id: number; name: string; color: string } | null>(
    null,
  );
  const [task, setTask] = useState<{
    id: number;
    title: string;
    targetDate: string;
    priority: TaskPriority;
    category: string;
  } | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  async function saveCategory(event: FormEvent) {
    event.preventDefault();
    if (!category?.name.trim()) return;
    setIsSaving(true);
    try {
      await updateCategory.mutateAsync({
        id: category.id,
        payload: { name: category.name.trim(), color_code: category.color },
      });
      setCategory(null);
    } catch (error) {
      setMessage(getErrorMessage(error, '카테고리 수정에 실패했습니다.'));
    } finally {
      setIsSaving(false);
    }
  }

  async function removeCategory(target: Category) {
    if (
      !window.confirm(
        `"${target.name}" 카테고리를 삭제할까요? 포함된 할일은 카테고리 없음으로 이동합니다.`,
      )
    )
      return;
    try {
      await deleteCategory.mutateAsync(target.id);
      if (selectedCategory === String(target.id)) setSelectedCategory('');
      setCategory(null);
    } catch (error) {
      setMessage(getErrorMessage(error, '카테고리 삭제에 실패했습니다.'));
    }
  }

  async function saveTask(event: FormEvent) {
    event.preventDefault();
    if (!task?.title.trim()) return;
    setIsSaving(true);
    try {
      await editTask.mutateAsync({
        id: task.id,
        payload: {
          title: task.title.trim(),
          target_date: task.targetDate,
          priority: task.priority,
          category: task.category ? Number(task.category) : null,
        },
      });
      setTask(null);
    } catch (error) {
      setMessage(getErrorMessage(error, '할일 수정에 실패했습니다.'));
    } finally {
      setIsSaving(false);
    }
  }

  async function removeTask(target: Task) {
    if (!window.confirm(`"${target.title}" 할일을 삭제할까요?`)) return;
    try {
      await deleteTask.mutateAsync(target.id);
      setTask(null);
    } catch (error) {
      setMessage(getErrorMessage(error, '할일 삭제에 실패했습니다.'));
    }
  }

  return {
    category,
    setCategory,
    task,
    setTask,
    isSaving,
    saveCategory,
    removeCategory,
    saveTask,
    removeTask,
  };
}
