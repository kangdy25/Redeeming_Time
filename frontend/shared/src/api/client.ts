import type {
  Calendar,
  CalendarPayload,
  Category,
  CategoryPayload,
  Event,
  EventPayload,
  PlannerSnapshot,
  RegisterPayload,
  Task,
  TaskPayload,
  User,
} from '../types';
import { useAuthStore } from '../stores/authStore';
import { usePlannerStore } from '../stores/plannerStore';

const runtimeEnv = (globalThis as { process?: { env?: Record<string, string | undefined> } }).process?.env ?? {};

function inferApiBaseUrl() {
  const explicitUrl = runtimeEnv.EXPO_PUBLIC_API_BASE_URL ?? runtimeEnv.VITE_API_BASE_URL;
  if (explicitUrl) {
    return explicitUrl.replace(/\/$/, '');
  }

  const location = (globalThis as { location?: { hostname?: string; protocol?: string } }).location;
  if (location?.hostname && !['localhost', '127.0.0.1'].includes(location.hostname)) {
    return `${location.protocol}//${location.hostname}:8000/api`;
  }

  return 'http://localhost:8000/api';
}

export const API_BASE_URL = inferApiBaseUrl();

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...useAuthStore.getState().authorizationHeader(),
      ...init.headers,
    },
  });

  if (!response.ok) {
    const detail = await response.text();
    let message = detail || `Request failed with ${response.status}`;
    try {
      const parsed = JSON.parse(detail) as { detail?: string; [key: string]: unknown };
      message = parsed.detail ?? JSON.stringify(parsed);
    } catch {
      message = detail || `Request failed with ${response.status}`;
    }
    throw new Error(message);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}

export const apiClient = {
  register: (payload: RegisterPayload) =>
    request<User>('/users/', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  token: (email: string, password: string) =>
    request<{ access: string; refresh: string }>('/auth/token/', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),
  currentUser: async () => (await request<User[]>('/users/'))[0],
  updateUser: (userId: number, payload: Partial<Pick<User, 'nickname' | 'profile_image_url'>>) =>
    request<User>(`/users/${userId}/`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    }),
  calendars: () => request<Calendar[]>('/calendars/'),
  createCalendar: async (payload: CalendarPayload) => {
    const calendar = await request<Calendar>('/calendars/', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    usePlannerStore.getState().syncPlanner({ calendars: [...usePlannerStore.getState().calendars, calendar] });
    return calendar;
  },
  categories: () => request<Category[]>('/categories/'),
  createCategory: async (payload: CategoryPayload) => {
    const category = await request<Category>('/categories/', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    usePlannerStore.getState().syncPlanner({ categories: [...usePlannerStore.getState().categories, category] });
    return category;
  },
  updateCategory: async (categoryId: number, payload: Partial<CategoryPayload>) => {
    const category = await request<Category>(`/categories/${categoryId}/`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
    usePlannerStore.getState().syncPlanner({
      categories: usePlannerStore.getState().categories.map((item) => (item.id === category.id ? category : item)),
    });
    return category;
  },
  deleteCategory: async (categoryId: number) => {
    await request<void>(`/categories/${categoryId}/`, { method: 'DELETE' });
    usePlannerStore.getState().syncPlanner({
      categories: usePlannerStore.getState().categories.filter((category) => category.id !== categoryId),
      tasks: usePlannerStore.getState().tasks.map((task) => (
        task.category === categoryId ? { ...task, category: null, category_detail: null } : task
      )),
    });
  },
  events: () => request<Event[]>('/events/'),
  createEvent: async (payload: EventPayload) => {
    const event = await request<Event>('/events/', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    usePlannerStore.getState().syncPlanner({ events: [...usePlannerStore.getState().events, event] });
    return event;
  },
  updateEvent: async (eventId: number, payload: Partial<EventPayload>) => {
    const event = await request<Event>(`/events/${eventId}/`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
    usePlannerStore.getState().syncPlanner({
      events: usePlannerStore.getState().events.map((item) => (item.id === event.id ? event : item)),
    });
    return event;
  },
  deleteEvent: async (eventId: number) => {
    await request<void>(`/events/${eventId}/`, {
      method: 'DELETE',
    });
    usePlannerStore.getState().syncPlanner({
      events: usePlannerStore.getState().events.filter((event) => event.id !== eventId),
    });
  },
  tasks: () => request<Task[]>('/tasks/'),
  createTask: async (payload: TaskPayload) => {
    const task = await request<Task>('/tasks/', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    usePlannerStore.getState().syncPlanner({ tasks: [...usePlannerStore.getState().tasks, task] });
    return task;
  },
  updateTask: (task: Task) =>
    request<Task>(`/tasks/${task.id}/`, {
      method: 'PATCH',
      body: JSON.stringify({ is_completed: task.is_completed }),
    }),
  editTask: async (taskId: number, payload: Partial<TaskPayload>) => {
    const task = await request<Task>(`/tasks/${taskId}/`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
    usePlannerStore.getState().syncPlanner({
      tasks: usePlannerStore.getState().tasks.map((item) => (item.id === task.id ? task : item)),
    });
    return task;
  },
  deleteTask: async (taskId: number) => {
    await request<void>(`/tasks/${taskId}/`, { method: 'DELETE' });
    usePlannerStore.getState().syncPlanner({
      tasks: usePlannerStore.getState().tasks.filter((task) => task.id !== taskId),
    });
  },
  updateTaskTargetDate: async (task: Task, targetDate: string) => {
    const updatedTask = await request<Task>(`/tasks/${task.id}/`, {
      method: 'PATCH',
      body: JSON.stringify({ target_date: targetDate }),
    });
    usePlannerStore.getState().syncPlanner({
      tasks: usePlannerStore.getState().tasks.map((item) => (item.id === updatedTask.id ? updatedTask : item)),
    });
    return updatedTask;
  },
  plannerSnapshot: async (): Promise<PlannerSnapshot> => {
    const [calendars, categories, events, tasks] = await Promise.all([
      apiClient.calendars(),
      apiClient.categories(),
      apiClient.events(),
      apiClient.tasks(),
    ]);
    return { calendars, categories, events, tasks };
  },
};
