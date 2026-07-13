import { type FormEvent, useState } from 'react';
import {
  getErrorMessage,
  useCreateCategory,
  useCreateTask,
  type TaskPriority,
} from '@redeeming-time/shared';

type Input = {
  calendarId: number;
  selectedDate: string;
  selectedTaskCount: number;
};

export function useTaskComposer({ calendarId, selectedDate, selectedTaskCount }: Input) {
  const createTask = useCreateTask();
  const createCategory = useCreateCategory();
  const [title, setTitle] = useState('');
  const [priority, setPriority] = useState<TaskPriority>('MEDIUM');
  const [category, setCategory] = useState('');
  const [categoryName, setCategoryName] = useState('');
  const [categoryColor, setCategoryColor] = useState('#14B8A6');
  const [message, setMessage] = useState('');

  async function addTask(event: FormEvent) {
    event.preventDefault();
    const trimmed = title.trim();
    if (!trimmed) return setMessage('할일 제목을 입력해 주세요.');
    if (!calendarId) return setMessage('먼저 캘린더 워크스페이스를 만들어 주세요.');
    setMessage('');
    try {
      await createTask.mutateAsync({
        calendar: calendarId,
        category: category ? Number(category) : null,
        title: trimmed,
        target_date: selectedDate,
        priority,
        order: selectedTaskCount,
      });
      setTitle('');
    } catch (error) {
      setMessage(getErrorMessage(error, '할일 추가에 실패했습니다.'));
    }
  }

  async function addCategory(event: FormEvent) {
    event.preventDefault();
    const name = categoryName.trim();
    if (!name) return setMessage('카테고리 이름을 입력해 주세요.');
    if (!calendarId) return setMessage('먼저 캘린더 워크스페이스를 만들어 주세요.');
    setMessage('');
    try {
      const created = await createCategory.mutateAsync({
        calendar: calendarId,
        name,
        color_code: categoryColor,
      });
      setCategory(String(created.id));
      setCategoryName('');
    } catch (error) {
      setMessage(getErrorMessage(error, '카테고리 추가에 실패했습니다.'));
    }
  }

  function prepareForCategory(categoryId: number | null) {
    setCategory(categoryId === null ? '' : String(categoryId));
    const input = document.getElementById('quick-task-input');
    input?.focus();
    input?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  return {
    title,
    setTitle,
    priority,
    setPriority,
    category,
    setCategory,
    categoryName,
    setCategoryName,
    categoryColor,
    setCategoryColor,
    message,
    setMessage,
    createTask,
    createCategory,
    addTask,
    addCategory,
    prepareForCategory,
  };
}
