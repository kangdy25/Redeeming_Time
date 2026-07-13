import { useToggleTask, type Category, type Task } from '@redeeming-time/shared';
import { useTaskBoardData } from './useTaskBoardData';
import { useTaskCalendar } from './tasks/useTaskCalendar';
import { useTaskComposer } from './tasks/useTaskComposer';
import { useTaskEditors } from './tasks/useTaskEditors';
import { useTaskRollover } from './tasks/useTaskRollover';

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
  const calendar = useTaskCalendar(selectedDate, setSelectedDate);
  const data = useTaskBoardData({
    tasks,
    categories,
    selectedDate,
    miniMonth: calendar.miniMonth,
    weekly: calendar.weekly,
  });
  const composer = useTaskComposer({
    calendarId,
    selectedDate,
    selectedTaskCount: data.selectedTasks.length,
  });
  const editor = useTaskEditors({
    selectedCategory: composer.category,
    setSelectedCategory: composer.setCategory,
    setMessage: composer.setMessage,
  });
  const rollover = useTaskRollover(data.overdueTasks, calendar.today, calendar.jumpToToday);
  const toggleTask = useToggleTask();

  return {
    data,
    calendar,
    composer,
    editor,
    rollover,
    mutations: { toggleTask },
  };
}

export type TaskBoardModel = ReturnType<typeof useTaskBoardModel>;
