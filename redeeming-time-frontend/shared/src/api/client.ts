import type { Calendar, Category, Event, PlannerSnapshot, Task } from '../types';
import { useAuthStore } from '../stores/authStore';

const runtimeEnv = (globalThis as { process?: { env?: Record<string, string | undefined> } }).process?.env ?? {};

export const API_BASE_URL =
  runtimeEnv.EXPO_PUBLIC_API_BASE_URL ?? runtimeEnv.VITE_API_BASE_URL ?? 'http://localhost:8000/api';

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
    throw new Error(detail || `Request failed with ${response.status}`);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}

export const apiClient = {
  token: (email: string, password: string) =>
    request<{ access: string; refresh: string }>('/auth/token/', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),
  calendars: () => request<Calendar[]>('/calendars/'),
  categories: () => request<Category[]>('/categories/'),
  events: () => request<Event[]>('/events/'),
  tasks: () => request<Task[]>('/tasks/'),
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
