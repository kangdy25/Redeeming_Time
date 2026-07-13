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
