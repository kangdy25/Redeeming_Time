import { defineStore } from 'pinia';

import type { Calendar, Category, Event, Task } from '../types';

type PlannerState = {
  calendars: Calendar[];
  categories: Category[];
  events: Event[];
  tasks: Task[];
};

export const usePlannerStore = defineStore('planner', {
  state: () => ({
    activeCalendarId: null as number | null,
    calendars: [] as Calendar[],
    categories: [] as Category[],
    events: [] as Event[],
    tasks: [] as Task[],
  }),
  actions: {
    setActiveCalendarId(calendarId: number | null) {
      this.activeCalendarId = calendarId;
    },
    resetPlanner() {
      this.activeCalendarId = null;
      this.calendars = [];
      this.categories = [];
      this.events = [];
      this.tasks = [];
    },
    syncPlanner(payload: Partial<PlannerState>) {
      Object.assign(this, payload);
    },
    toggleTaskCompletion(taskId: number) {
      this.tasks = this.tasks.map((task) =>
        task.id === taskId ? { ...task, is_completed: !task.is_completed } : task,
      );
    },
  },
});
