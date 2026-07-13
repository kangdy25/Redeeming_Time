import type {
  Calendar,
  CalendarListParams,
  CalendarPayload,
  Category,
  CategoryPayload,
  Event,
  EventListParams,
  EventPayload,
  PaginatedResponse,
  PlannerSnapshot,
  RegisterPayload,
  Task,
  TaskListParams,
  TaskPayload,
  User,
} from '../types';
import { useAuthStore } from '../stores/authStore';
import { usePlannerStore } from '../stores/plannerStore';

const runtimeEnv =
  (globalThis as { process?: { env?: Record<string, string | undefined> } }).process?.env ?? {};

function inferApiBaseUrl() {
  const webApiBaseUrl = (
    globalThis as typeof globalThis & { __REDEEMING_TIME_WEB_API_BASE_URL__?: string }
  ).__REDEEMING_TIME_WEB_API_BASE_URL__;
  const explicitUrl =
    webApiBaseUrl || runtimeEnv.EXPO_PUBLIC_API_BASE_URL || runtimeEnv.VITE_API_BASE_URL;
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

export type ApiErrorFields = Record<string, unknown> | null;

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code: string,
    readonly fields: ApiErrorFields = null,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

type ApiErrorResponse = {
  error?: { code?: string; message?: string; fields?: ApiErrorFields };
  detail?: string;
  [key: string]: unknown;
};

function firstLegacyError(payload: ApiErrorResponse): string | undefined {
  if (payload.detail) return payload.detail;
  for (const value of Object.values(payload)) {
    if (Array.isArray(value) && value.length > 0) return String(value[0]);
    if (typeof value === 'string') return value;
  }
  return undefined;
}

export function getErrorMessage(error: unknown, fallback = '요청을 처리하지 못했습니다.') {
  return error instanceof Error && error.message ? error.message : fallback;
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const authorization = useAuthStore.getState().authorizationHeader();
  let response: Response;
  try {
    response = await fetch(/^https?:\/\//i.test(path) ? path : `${API_BASE_URL}${path}`, {
      ...init,
      headers: {
        'Content-Type': 'application/json',
        ...authorization,
        ...init.headers,
      },
    });
  } catch {
    throw new ApiError(
      '서버에 연결할 수 없습니다. 잠시 후 다시 시도해 주세요.',
      0,
      'NETWORK_ERROR',
    );
  }

  if (!response.ok) {
    const body = await response.text();
    let payload: ApiErrorResponse = {};
    try {
      payload = JSON.parse(body) as ApiErrorResponse;
    } catch {
      // Non-JSON errors can be returned by proxies before a request reaches the API.
    }
    if (response.status === 401 && authorization.Authorization) {
      useAuthStore.getState().clearTokens();
    }
    throw new ApiError(
      payload.error?.message ??
        firstLegacyError(payload) ??
        body ??
        `요청을 처리하지 못했습니다. (${response.status})`,
      response.status,
      payload.error?.code ?? `HTTP_${response.status}`,
      payload.error?.fields ?? null,
    );
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}

type ListItem = { id: number };
type ListQueryValue = string | number | boolean | null | undefined;
type ListQueryParams = Record<string, ListQueryValue>;

function withQueryParams(path: string, params: ListQueryParams) {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== null && value !== undefined) {
      query.set(key, String(value));
    }
  }
  if (!query.size) return path;
  return `${path}${path.includes('?') ? '&' : '?'}${query.toString()}`;
}

function isPaginatedResponse<T>(
  payload: PaginatedResponse<T> | T[],
): payload is PaginatedResponse<T> {
  return !Array.isArray(payload) && Array.isArray(payload.results);
}

/**
 * Accept both the legacy array response and the paginated API contract. This
 * makes the frontend safe to deploy before the backend pagination rollout.
 */
async function requestList<T extends ListItem>(
  path: string,
  params: ListQueryParams = {},
): Promise<T[]> {
  let next: string | null = withQueryParams(path, { ...params, page_size: 200 });
  const requestedPages = new Set<string>();
  const items = new Map<number, T>();

  while (next) {
    if (requestedPages.has(next)) {
      throw new Error('The API returned a repeated pagination link.');
    }
    requestedPages.add(next);

    const payload: PaginatedResponse<T> | T[] = await request<PaginatedResponse<T> | T[]>(next);
    const pageItems = isPaginatedResponse(payload) ? payload.results : payload;
    for (const item of pageItems) {
      items.set(item.id, item);
    }
    next = isPaginatedResponse(payload) ? payload.next : null;
  }

  return [...items.values()];
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
  logout: (refresh: string) =>
    request<void>('/auth/token/blacklist/', {
      method: 'POST',
      body: JSON.stringify({ refresh }),
    }),
  currentUser: async () => {
    try {
      return await request<User>('/users/me/');
    } catch (error) {
      // Support the currently deployed backend until its P1 pagination release
      // adds /users/me/ alongside the new collection contract.
      if (!(error instanceof ApiError) || error.status !== 404) throw error;
      return (await requestList<User>('/users/'))[0];
    }
  },
  updateUser: (userId: number, payload: Partial<Pick<User, 'nickname' | 'profile_image_url'>>) =>
    request<User>(`/users/${userId}/`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    }),
  deleteUser: (userId: number) => request<void>(`/users/${userId}/`, { method: 'DELETE' }),
  calendars: () => requestList<Calendar>('/calendars/'),
  createCalendar: async (payload: CalendarPayload) => {
    const calendar = await request<Calendar>('/calendars/', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    usePlannerStore
      .getState()
      .syncPlanner({ calendars: [...usePlannerStore.getState().calendars, calendar] });
    return calendar;
  },
  deleteCalendar: async (calendarId: number) => {
    await request<void>(`/calendars/${calendarId}/`, { method: 'DELETE' });
    const state = usePlannerStore.getState();
    const calendars = state.calendars.filter((calendar) => calendar.id !== calendarId);
    state.syncPlanner({
      calendars,
      categories: state.categories.filter((category) => category.calendar !== calendarId),
      events: state.events.filter((event) => event.calendar !== calendarId),
      tasks: state.tasks.filter((task) => task.calendar !== calendarId),
    });
    if (state.activeCalendarId === calendarId) {
      state.setActiveCalendarId(calendars[0]?.id ?? null);
    }
  },
  categories: (params: CalendarListParams = {}) => requestList<Category>('/categories/', params),
  createCategory: async (payload: CategoryPayload) => {
    const category = await request<Category>('/categories/', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    usePlannerStore
      .getState()
      .syncPlanner({ categories: [...usePlannerStore.getState().categories, category] });
    return category;
  },
  updateCategory: async (categoryId: number, payload: Partial<CategoryPayload>) => {
    const category = await request<Category>(`/categories/${categoryId}/`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
    usePlannerStore.getState().syncPlanner({
      categories: usePlannerStore
        .getState()
        .categories.map((item) => (item.id === category.id ? category : item)),
    });
    return category;
  },
  deleteCategory: async (categoryId: number) => {
    await request<void>(`/categories/${categoryId}/`, { method: 'DELETE' });
    usePlannerStore.getState().syncPlanner({
      categories: usePlannerStore
        .getState()
        .categories.filter((category) => category.id !== categoryId),
      tasks: usePlannerStore
        .getState()
        .tasks.map((task) =>
          task.category === categoryId ? { ...task, category: null, category_detail: null } : task,
        ),
    });
  },
  events: (params: EventListParams = {}) => requestList<Event>('/events/', params),
  createEvent: async (payload: EventPayload) => {
    const event = await request<Event>('/events/', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    usePlannerStore
      .getState()
      .syncPlanner({ events: [...usePlannerStore.getState().events, event] });
    return event;
  },
  updateEvent: async (eventId: number, payload: Partial<EventPayload>) => {
    const event = await request<Event>(`/events/${eventId}/`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
    usePlannerStore.getState().syncPlanner({
      events: usePlannerStore
        .getState()
        .events.map((item) => (item.id === event.id ? event : item)),
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
  tasks: (params: TaskListParams = {}) => requestList<Task>('/tasks/', params),
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
      tasks: usePlannerStore
        .getState()
        .tasks.map((item) => (item.id === updatedTask.id ? updatedTask : item)),
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
