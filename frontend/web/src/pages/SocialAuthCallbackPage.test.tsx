import { afterEach, beforeEach, describe, expect, test } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { http, HttpResponse } from 'msw';
import { useAuthStore } from '@redeeming-time/shared';
import { renderWithProviders } from '../../../test.utils';
import { server } from '../../../test.setup';
import { SocialAuthCallbackPage } from './SocialAuthCallbackPage';

function renderCallback(path: string) {
  window.history.replaceState({}, '', path);
  return renderWithProviders(
    <BrowserRouter>
      <Routes>
        <Route path="/auth/callback" element={<SocialAuthCallbackPage />} />
        <Route path="/dashboard" element={<p>Dashboard reached</p>} />
      </Routes>
    </BrowserRouter>,
  );
}

describe('SocialAuthCallbackPage', () => {
  beforeEach(() => {
    useAuthStore.setState({ accessToken: null, refreshToken: null, sessionValidated: false });
    window.sessionStorage.clear();
  });

  afterEach(() => {
    window.sessionStorage.clear();
    window.history.replaceState({}, '', '/');
  });

  test('removes a one-time code, exchanges it, and replaces the callback route', async () => {
    window.sessionStorage.setItem('redeeming-time.social-auth-verifier', 'tab-verifier');
    server.use(
      http.post('http://localhost:8000/api/auth/social/exchange/', async ({ request }) => {
        await expect(request.json()).resolves.toEqual({
          code: 'short-lived-code',
          verifier: 'tab-verifier',
        });
        return HttpResponse.json({ access: 'callback-access', refresh: 'callback-refresh' });
      }),
    );

    renderCallback('/auth/callback?code=short-lived-code');

    await waitFor(() => expect(screen.getByText('Dashboard reached')).toBeInTheDocument());
    expect(window.location.pathname).toBe('/dashboard');
    expect(window.location.search).toBe('');
    expect(window.sessionStorage.getItem('redeeming-time.social-auth-verifier')).toBeNull();
    expect(useAuthStore.getState()).toMatchObject({
      accessToken: 'callback-access',
      refreshToken: 'callback-refresh',
      sessionValidated: true,
    });
  });

  test('removes OAuth error details and displays only the mapped Korean message', async () => {
    renderCallback('/auth/callback?error=access_denied&error_description=private-provider-detail');

    expect(await screen.findByRole('alert')).toHaveTextContent('소셜 로그인이 취소되었습니다.');
    expect(window.location.pathname).toBe('/auth/callback');
    expect(window.location.search).toBe('');
    expect(screen.queryByText('private-provider-detail')).not.toBeInTheDocument();
  });

  test('maps safe API error codes without displaying backend error text', async () => {
    window.sessionStorage.setItem('redeeming-time.social-auth-verifier', 'tab-verifier');
    server.use(
      http.post('http://localhost:8000/api/auth/social/exchange/', () =>
        HttpResponse.json(
          {
            error: {
              code: 'INVALID_SOCIAL_HANDOFF_CODE',
              message: 'private backend detail',
              fields: null,
            },
          },
          { status: 400 },
        ),
      ),
    );

    renderCallback('/auth/callback?code=expired-code');

    expect(await screen.findByRole('alert')).toHaveTextContent(
      '로그인 코드가 유효하지 않거나 만료되었습니다. 다시 로그인해 주세요.',
    );
    expect(screen.queryByText('private backend detail')).not.toBeInTheDocument();
  });

  test('rejects a callback opened without the browser-bound verifier', async () => {
    renderCallback('/auth/callback?code=short-lived-code');

    expect(await screen.findByRole('alert')).toHaveTextContent(
      '이 브라우저에서 시작한 로그인 요청을 찾을 수 없습니다. 다시 시도해 주세요.',
    );
  });
});
