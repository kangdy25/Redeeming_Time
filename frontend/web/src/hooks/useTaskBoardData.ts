import { useMemo } from 'react';
import { type Category, type Task } from '@redeeming-time/shared';
import { isoDate, monthCells } from '../utils/planner';

type TaskBoardDataInput = {
  tasks: Task[];
  categories: Category[];
  selectedDate: string;
  miniMonth: Date;
  weekly: boolean;
};

export function useTaskBoardData({
  tasks,
  categories,
  selectedDate,
  miniMonth,
  weekly,
}: TaskBoardDataInput) {
  const today = isoDate(new Date());
  const miniCells = useMemo(() => {
    if (!weekly) return monthCells(miniMonth);
    const selected = new Date(`${selectedDate}T00:00:00`);
    const start = new Date(selected);
    start.setDate(selected.getDate() - selected.getDay());
    return Array.from({ length: 7 }, (_, index) => {
      const date = new Date(start);
      date.setDate(start.getDate() + index);
      return date;
    });
  }, [miniMonth, selectedDate, weekly]);

  const selectedTasks = [...tasks]
    .sort((a, b) => a.target_date.localeCompare(b.target_date) || a.order - b.order)
    .filter((task) => task.target_date === selectedDate);
  const selectedOpenTasks = selectedTasks.filter((task) => !task.is_completed);
  const completionRate = selectedTasks.length
    ? Math.round(((selectedTasks.length - selectedOpenTasks.length) / selectedTasks.length) * 100)
    : 0;
  const overdueTasks = tasks.filter((task) => !task.is_completed && task.target_date < today);
  const categorySections = [
    ...categories.map((category) => ({
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

  return {
    today,
    miniCells,
    selectedTasks,
    selectedOpenTasks,
    completionRate,
    overdueTasks,
    taskCategories: categories,
    categorySections,
    taskCountByDate,
  };
}
