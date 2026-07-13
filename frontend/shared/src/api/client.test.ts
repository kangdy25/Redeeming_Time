import { http, HttpResponse } from 'msw';
import { afterEach, describe, expect, it } from 'vitest';

import { server } from '../../../test.setup';
import { ApiError, apiClient, getErrorMessage } from './client';
import { useAuthStore } from '../stores/authStore';

describe('API error handling', () => {
  afterEach(() => useAuthStore.getState().clearTokens());

  it('parses the standard API error contract', async () => {
    server.use(
      http.get('http://localhost:8000/api/calendars/', () =>
        HttpResponse.json(
          {
            error: {
              code: 'PERMISSION_DENIED',
              message: '접근할 수 없습니다.',
              fields: null,
            },
          },
          { status: 403 },
        ),
      ),
    );

    await expect(apiClient.calendars()).rejects.toMatchObject({
      name: 'ApiError',
      status: 403,
      code: 'PERMISSION_DENIED',
      message: '접근할 수 없습니다.',
    });
  });

  it('clears an expired authenticated session on 401', async () => {
    useAuthStore.getState().setTokens({ access: 'expired', refresh: 'refresh' });
    server.use(
      http.get('http://localhost:8000/api/calendars/', () =>
        HttpResponse.json(
          { error: { code: 'NOT_AUTHENTICATED', message: '로그인이 필요합니다.', fields: null } },
          { status: 401 },
        ),
      ),
    );

    await expect(apiClient.calendars()).rejects.toBeInstanceOf(ApiError);
    expect(useAuthStore.getState().accessToken).toBeNull();
  });

  it('blacklists the refresh token on logout', async () => {
    useAuthStore.getState().setTokens({ access: 'active-access', refresh: 'active-refresh' });
    server.use(
      http.post('http://localhost:8000/api/auth/token/blacklist/', async ({ request }) => {
        expect(request.headers.get('Authorization')).toBe('Bearer active-access');
        await expect(request.json()).resolves.toEqual({ refresh: 'active-refresh' });
        return new HttpResponse(null, { status: 204 });
      }),
    );

    await expect(apiClient.logout('active-refresh')).resolves.toBeUndefined();
  });

  it('follows paginated list links while accepting the new response envelope', async () => {
    const requestedPages: string[] = [];
    server.use(
      http.get('http://localhost:8000/api/calendars/', ({ request }) => {
        const url = new URL(request.url);
        const page = url.searchParams.get('page') ?? '1';
        requestedPages.push(page);
        expect(url.searchParams.get('page_size')).toBe('200');
        if (page === '1') {
          return HttpResponse.json({
            count: 3,
            next: 'http://localhost:8000/api/calendars/?page=2&page_size=200',
            previous: null,
            results: [
              { id: 1, title: 'First', description: '', theme_color: '#123456', created_at: '' },
              { id: 2, title: 'Second', description: '', theme_color: '#234567', created_at: '' },
            ],
          });
        }
        return HttpResponse.json({
          count: 3,
          next: null,
          previous: 'http://localhost:8000/api/calendars/?page_size=200',
          results: [
            { id: 3, title: 'Third', description: '', theme_color: '#345678', created_at: '' },
          ],
        });
      }),
    );

    const calendars = await apiClient.calendars();

    expect(calendars.map((calendar) => calendar.id)).toEqual([1, 2, 3]);
    expect(requestedPages).toEqual(['1', '2']);
  });

  it('reads the current user from a paginated users response', async () => {
    server.use(
      http.get('http://localhost:8000/api/users/me/', () =>
        HttpResponse.json({ detail: 'Not found.' }, { status: 404 }),
      ),
      http.get('http://localhost:8000/api/users/', () =>
        HttpResponse.json({
          count: 1,
          next: null,
          previous: null,
          results: [
            {
              id: 7,
              email: 'paged@example.com',
              nickname: 'Paged User',
              profile_image_url: '',
              social_provider: 'LOCAL',
              is_active: true,
              created_at: '',
              updated_at: '',
            },
          ],
        }),
      ),
    );

    await expect(apiClient.currentUser()).resolves.toMatchObject({
      id: 7,
      email: 'paged@example.com',
    });
  });

  it('uses the current-user endpoint when it is available', async () => {
    server.use(
      http.get('http://localhost:8000/api/users/me/', () =>
        HttpResponse.json({
          id: 8,
          email: 'me@example.com',
          nickname: 'Current User',
          profile_image_url: '',
          social_provider: 'LOCAL',
          is_active: true,
          created_at: '',
          updated_at: '',
        }),
      ),
    );

    await expect(apiClient.currentUser()).resolves.toMatchObject({
      id: 8,
      email: 'me@example.com',
    });
  });

  it('keeps compatibility with legacy field errors', async () => {
    server.use(
      http.post('http://localhost:8000/api/users/', () =>
        HttpResponse.json({ email: ['이미 사용 중인 이메일입니다.'] }, { status: 400 }),
      ),
    );

    await expect(
      apiClient.register({ email: 'used@example.com', password: 'password', nickname: '사용자' }),
    ).rejects.toThrow('이미 사용 중인 이메일입니다.');
  });

  it('provides a consistent fallback message', () => {
    expect(getErrorMessage(null, '실패했습니다.')).toBe('실패했습니다.');
    expect(getErrorMessage(new Error('구체적인 오류'))).toBe('구체적인 오류');
  });
});
