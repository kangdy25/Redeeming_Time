import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { apiClient, useAuthStore } from '@redeeming-time/shared';
import { LoginPage } from './pages/LoginPage';
import { DashboardPage } from './pages/DashboardPage';
import { SocialAuthCallbackPage } from './pages/SocialAuthCallbackPage';
import { PasswordResetPage } from './pages/PasswordResetPage';
import { EmailVerificationPage } from './pages/EmailVerificationPage';

export default function App() {
  const accessToken = useAuthStore((state) => state.accessToken);
  const sessionValidated = useAuthStore((state) => state.sessionValidated);
  const markSessionValidated = useAuthStore((state) => state.markSessionValidated);
  const clearTokens = useAuthStore((state) => state.clearTokens);
  const isAuthenticated = Boolean(accessToken && sessionValidated);

  useEffect(() => {
    if (!accessToken || sessionValidated) return;
    let active = true;

    void apiClient
      .currentUser()
      .then((user) => {
        if (!active) return;
        if (user) markSessionValidated();
        else clearTokens();
      })
      .catch(() => {
        if (active) clearTokens();
      });

    return () => {
      active = false;
    };
  }, [accessToken, sessionValidated, markSessionValidated, clearTokens]);

  if (accessToken && !sessionValidated) {
    return null;
  }

  return (
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <Routes>
        <Route path="/auth/callback" element={<SocialAuthCallbackPage />} />
        <Route path="/password-reset" element={<PasswordResetPage />} />
        <Route path="/verify-email" element={<EmailVerificationPage />} />
        <Route
          path="/login"
          element={isAuthenticated ? <Navigate to="/dashboard" replace /> : <LoginPage />}
        />
        <Route
          path="/dashboard"
          element={isAuthenticated ? <DashboardPage /> : <Navigate to="/login" replace />}
        />
        <Route
          path="/"
          element={<Navigate to={isAuthenticated ? '/dashboard' : '/login'} replace />}
        />
        <Route
          path="*"
          element={<Navigate to={isAuthenticated ? '/dashboard' : '/login'} replace />}
        />
      </Routes>
    </BrowserRouter>
  );
}
