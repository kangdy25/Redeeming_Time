import { afterEach, beforeEach, describe, expect, test } from 'vitest';
import { fireEvent, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { useAuthStore } from '@redeeming-time/shared';
import { renderWithProviders } from '../../../test.utils';
import { LoginPage } from './LoginPage';

describe('LoginPage theme control', () => {
  beforeEach(() => {
    useAuthStore.setState({ accessToken: null, refreshToken: null, sessionValidated: false });
    delete document.documentElement.dataset.theme;
  });

  afterEach(() => {
    delete document.documentElement.dataset.theme;
  });

  test('writes the selected theme to the root data attribute', () => {
    renderWithProviders(
      <MemoryRouter>
        <LoginPage />
      </MemoryRouter>,
    );

    expect(document.documentElement.dataset.theme).toBe('dark');

    fireEvent.click(screen.getByRole('button', { name: 'Toggle Theme' }));

    expect(document.documentElement.dataset.theme).toBe('light');
  });
});
