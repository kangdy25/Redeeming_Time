import '@testing-library/jest-dom';
import { beforeAll, beforeEach, afterEach, afterAll, vi } from 'vitest';
import { setupServer } from 'msw/node';
import { http, HttpResponse } from 'msw';
import { useAuthStore, usePlannerStore } from '@redeeming-time/shared';

// Mock LocalStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => { store[key] = value.toString(); },
    removeItem: (key: string) => { delete store[key]; },
    clear: () => { store = {}; }
  };
})();
Object.defineProperty(globalThis, 'localStorage', { value: localStorageMock });

// Save initial Zustand states for cleanups
const initialAuthState = {
  accessToken: null,
  refreshToken: null,
};

const initialPlannerState = {
  activeCalendarId: null,
  calendars: [],
  categories: [],
  events: [],
  tasks: [],
};

export const resetStores = () => {
  useAuthStore.setState(initialAuthState);
  usePlannerStore.setState(initialPlannerState);
  localStorageMock.clear();
};

// React Native mock components mapping to HTML DOM tags for fast rendering
vi.mock('react-native', () => {
  const React = require('react');
  
  const View = ({ children, className, style, ...props }: any) => 
    React.createElement('div', { ...props, className, style }, children);
    
  const Text = ({ children, className, style, ...props }: any) => 
    React.createElement('span', { ...props, className, style }, children);
    
  const TouchableOpacity = ({ children, onPress, className, style, ...props }: any) => 
    React.createElement('button', { ...props, onClick: onPress, className, style }, children);
    
  const ScrollView = ({ children, className, style, ...props }: any) => 
    React.createElement('div', { ...props, className, style: { overflowY: 'auto', ...style } }, children);
    
  const SafeAreaView = ({ children, className, style, ...props }: any) => 
    React.createElement('div', { ...props, className, style }, children);

  return {
    View,
    Text,
    TouchableOpacity,
    ScrollView,
    SafeAreaView,
  };
});

// Dynamic mock store database that test cases can update or query
export const mockDb = {
  calendars: [] as any[],
  categories: [] as any[],
  events: [] as any[],
  tasks: [] as any[],
  reset() {
    this.calendars = [
      { id: 1, title: 'Personal Space', description: 'Primary', theme_color: '#1F9D8A', created_at: '2026-07-04T00:00:00Z' }
    ];
    this.categories = [
      { id: 10, calendar: 1, name: 'Deep Work', color_code: '#E11D48', created_at: '2026-07-04T00:00:00Z' }
    ];
    this.events = [
      {
        id: 100,
        calendar: 1,
        category: 10,
        category_detail: { id: 10, calendar: 1, name: 'Deep Work', color_code: '#E11D48', created_at: '2026-07-04T00:00:00Z' },
        title: 'Overloaded Focus block',
        description: 'Testing event',
        start_time: '2026-07-04T09:00:00Z',
        end_time: '2026-07-04T18:00:00Z',
        is_all_day: false,
        rrule: '',
        congestion_warning: {
          is_congested: true,
          daily_hours: 9.0,
          overlap_count: 3,
          reasons: ['Daily total duration exceeds 8 hours.']
        },
        created_at: '2026-07-04T00:00:00Z',
        updated_at: '2026-07-04T00:00:00Z'
      }
    ];
    this.tasks = [
      {
        id: 200,
        calendar: 1,
        creator: 1,
        title: 'Review overdue item',
        is_completed: false,
        target_date: '2026-07-03', // Yesterday relative to July 4th
        priority: 'HIGH',
        order: 0,
        created_at: '2026-07-03T00:00:00Z',
        updated_at: '2026-07-03T00:00:00Z'
      }
    ];
  }
};

// Initialize mock database
mockDb.reset();

// Setup MSW handlers
export const handlers = [
  // User Registration
  http.post('http://localhost:8000/api/users/', async ({ request }) => {
    const body = (await request.json()) as any;
    if (!body.email || !body.password || !body.nickname) {
      return new HttpResponse(JSON.stringify({ detail: 'Missing required fields' }), { status: 400 });
    }
    if (body.email.includes('@invalid')) {
      return new HttpResponse(JSON.stringify({ detail: 'Invalid email format' }), { status: 400 });
    }
    return HttpResponse.json({
      id: 99,
      email: body.email,
      nickname: body.nickname,
      profile_image_url: '',
      social_provider: 'LOCAL',
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    });
  }),

  // Authentication Mock
  http.post('http://localhost:8000/api/auth/token/', async ({ request }) => {
    const { email, password } = (await request.json()) as any;
    if (password === 'wrong-password') {
      return new HttpResponse(JSON.stringify({ detail: 'Authentication failed.' }), { status: 401 });
    }
    return HttpResponse.json({
      access: 'mock-access-token',
      refresh: 'mock-refresh-token'
    });
  }),
  
  // Calendars
  http.get('http://localhost:8000/api/calendars/', () => {
    return HttpResponse.json(mockDb.calendars);
  }),
  
  http.post('http://localhost:8000/api/calendars/', async ({ request }) => {
    const body = (await request.json()) as any;
    if (!body.title) {
      return new HttpResponse(JSON.stringify({ detail: 'Title is required' }), { status: 400 });
    }
    const newCalendar = {
      id: mockDb.calendars.length + 1,
      title: body.title,
      description: body.description || '',
      theme_color: body.theme_color || '#1F9D8A',
      created_at: new Date().toISOString()
    };
    mockDb.calendars.push(newCalendar);
    return HttpResponse.json(newCalendar);
  }),

  // Categories
  http.get('http://localhost:8000/api/categories/', () => {
    return HttpResponse.json(mockDb.categories);
  }),

  http.post('http://localhost:8000/api/categories/', async ({ request }) => {
    const body = (await request.json()) as any;
    const newCategory = {
      id: mockDb.categories.length + 10,
      calendar: body.calendar,
      name: body.name,
      color_code: body.color_code || '#1F9D8A',
      created_at: new Date().toISOString()
    };
    mockDb.categories.push(newCategory);
    return HttpResponse.json(newCategory);
  }),
  
  // Events
  http.get('http://localhost:8000/api/events/', () => {
    return HttpResponse.json(mockDb.events);
  }),

  http.post('http://localhost:8000/api/events/', async ({ request }) => {
    const body = (await request.json()) as any;
    if (new Date(body.end_time) < new Date(body.start_time)) {
      return new HttpResponse(JSON.stringify({ detail: 'End time before start time' }), { status: 400 });
    }
    const categoryDetail = mockDb.categories.find(c => c.id === body.category) || null;
    const newEvent = {
      id: mockDb.events.length + 100,
      calendar: body.calendar,
      category: body.category,
      category_detail: categoryDetail,
      creator: 1,
      title: body.title,
      description: body.description || '',
      start_time: body.start_time,
      end_time: body.end_time,
      is_all_day: body.is_all_day || false,
      rrule: body.rrule || '',
      congestion_warning: {
        is_congested: false,
        daily_hours: 0,
        overlap_count: 0,
        reasons: []
      },
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    mockDb.events.push(newEvent);
    return HttpResponse.json(newEvent);
  }),

  // Tasks
  http.get('http://localhost:8000/api/tasks/', () => {
    return HttpResponse.json(mockDb.tasks);
  }),

  http.post('http://localhost:8000/api/tasks/', async ({ request }) => {
    const body = (await request.json()) as any;
    const newTask = {
      id: mockDb.tasks.length + 200,
      calendar: body.calendar,
      creator: 1,
      title: body.title,
      is_completed: false,
      target_date: body.target_date,
      priority: body.priority,
      order: body.order || 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    mockDb.tasks.push(newTask);
    return HttpResponse.json(newTask);
  }),

  http.patch('http://localhost:8000/api/tasks/:id/', async ({ params, request }) => {
    const id = Number(params.id);
    const body = (await request.json()) as any;
    const taskIndex = mockDb.tasks.findIndex(t => t.id === id);
    if (taskIndex === -1) {
      return new HttpResponse(JSON.stringify({ detail: 'Not found' }), { status: 404 });
    }
    const updatedTask = {
      ...mockDb.tasks[taskIndex],
      ...body,
      updated_at: new Date().toISOString()
    };
    mockDb.tasks[taskIndex] = updatedTask;
    return HttpResponse.json(updatedTask);
  }),

  // Agent Rollover API endpoint
  http.post('http://localhost:8000/api/agent/skills/rollover/', async ({ request }) => {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Agent ')) {
      return new HttpResponse(JSON.stringify({ detail: 'Agent authorization required' }), { status: 403 });
    }
    const body = (await request.json()) as any;
    const { task_ids, target_date } = body;
    
    mockDb.tasks = mockDb.tasks.map(task => {
      if (task_ids.includes(task.id)) {
        return { ...task, target_date, updated_at: new Date().toISOString() };
      }
      return task;
    });

    return HttpResponse.json({ success: true, rolled_over_count: task_ids.length });
  })
];

export const server = setupServer(...handlers);

beforeAll(() => server.listen({ onUnhandledRequest: 'bypass' }));
afterEach(() => {
  server.resetHandlers();
  resetStores();
  mockDb.reset();
});
afterAll(() => server.close());
vi.stubGlobal('vi', vi);
(globalThis as any).mockDb = mockDb;
