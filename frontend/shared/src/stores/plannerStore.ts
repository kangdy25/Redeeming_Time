import { create } from 'zustand';

import type { Calendar, Category, Event, Task } from '../types';

interface PlannerState {
  activeCalendarId: number | null;
  calendars: Calendar[];
  categories: Category[];
  events: Event[];
  tasks: Task[];
  setActiveCalendarId: (calendarId: number | null) => void;
  syncPlanner: (payload: Partial<Pick<PlannerState, 'calendars' | 'categories' | 'events' | 'tasks'>>) => void;
  toggleTaskCompletion: (taskId: number) => void;
}

export const usePlannerStore = create<PlannerState>((set) => ({
  activeCalendarId: null,
  calendars: [],
  categories: [],
  events: [],
  tasks: [],
  setActiveCalendarId: (calendarId) => set({ activeCalendarId: calendarId }),
  syncPlanner: (payload) => set((state) => ({ ...state, ...payload })),
  toggleTaskCompletion: (taskId) =>
    set((state) => ({
      tasks: state.tasks.map((task) =>
        task.id === taskId ? { ...task, is_completed: !task.is_completed } : task,
      ),
    })),
}));
