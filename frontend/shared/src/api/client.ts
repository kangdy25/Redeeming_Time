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
  calendars: () => request<Calendar[]>('/calendars/'),
  createCalendar: (payload: CalendarPayload) =>
    request<Calendar>('/calendars/', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  categories: () => request<Category[]>('/categories/'),
  createCategory: (payload: CategoryPayload) =>
    request<Category>('/categories/', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  events: () => request<Event[]>('/events/'),
  createEvent: (payload: EventPayload) =>
    request<Event>('/events/', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  tasks: () => request<Task[]>('/tasks/'),
  createTask: (payload: TaskPayload) =>
    request<Task>('/tasks/', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  updateTask: (task: Task) =>
    request<Task>(`/tasks/${task.id}/`, {
      method: 'PATCH',
      body: JSON.stringify({ is_completed: task.is_completed }),
    }),
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
