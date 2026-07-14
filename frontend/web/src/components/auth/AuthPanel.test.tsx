import { beforeEach, describe, expect, test, vi } from 'vitest';
import { fireEvent, screen } from '@testing-library/react';
import { useAuthStore } from '@redeeming-time/shared';
import { renderWithProviders } from '../../../../test.utils';
import { AuthPanel } from './AuthPanel';

const { navigateToExternalUrl, createSocialAuthVerifier, clearSocialAuthVerifier } = vi.hoisted(() => ({
  navigateToExternalUrl: vi.fn(),
  createSocialAuthVerifier: vi.fn(),
  clearSocialAuthVerifier: vi.fn(),
}));

vi.mock('../../utils/browserNavigation', () => ({
  navigateToExternalUrl,
  createSocialAuthVerifier,
  clearSocialAuthVerifier,
}));

describe('AuthPanel social login controls', () => {
  beforeEach(() => {
    navigateToExternalUrl.mockReset();
    createSocialAuthVerifier.mockReset();
    clearSocialAuthVerifier.mockReset();
    createSocialAuthVerifier.mockReturnValue('tab-verifier');
    useAuthStore.setState({ accessToken: null, refreshToken: null, sessionValidated: false });
  });

  test.each([
    ['Google', 'http://localhost:8000/api/auth/social/google/start/?handoff_verifier=tab-verifier'],
    ['Kakao', 'http://localhost:8000/api/auth/social/kakao/start/?handoff_verifier=tab-verifier'],
  ] as const)('starts %s OAuth and prevents a second provider selection', (label, url) => {
    renderWithProviders(<AuthPanel />);

    fireEvent.click(screen.getByRole('button', { name: `${label}로 계속` }));

    expect(navigateToExternalUrl).toHaveBeenCalledWith(url);
    const activeButton = screen.getByRole('button', { name: `${label} 로그인으로 이동 중` });
    expect(activeButton).toBeDisabled();
    expect(activeButton).toHaveAttribute('aria-busy', 'true');
    expect(
      screen.getByRole('button', { name: label === 'Google' ? 'Kakao로 계속' : 'Google로 계속' }),
    ).toBeDisabled();
  });
});
