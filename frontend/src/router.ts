import { createRouter, createWebHistory } from 'vue-router';

import { apiClient } from './api/client';
import { useAuthStore } from './stores/authStore';
import DashboardPage from './pages/DashboardPage.vue';
import EmailVerificationPage from './pages/EmailVerificationPage.vue';
import LoginPage from './pages/LoginPage.vue';
import PasswordResetPage from './pages/PasswordResetPage.vue';
import SocialAuthCallbackPage from './pages/SocialAuthCallbackPage.vue';

const publicNames = new Set(['login', 'social-callback', 'password-reset', 'verify-email']);

export const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/login', name: 'login', component: LoginPage },
    { path: '/dashboard', name: 'dashboard', component: DashboardPage },
    { path: '/auth/callback', name: 'social-callback', component: SocialAuthCallbackPage },
    { path: '/password-reset', name: 'password-reset', component: PasswordResetPage },
    { path: '/verify-email', name: 'verify-email', component: EmailVerificationPage },
    { path: '/', redirect: '/login' },
    { path: '/:pathMatch(.*)*', redirect: '/login' },
  ],
});

router.beforeEach(async (to) => {
  const auth = useAuthStore();
  if (auth.accessToken && !auth.sessionValidated) {
    try {
      const user = await apiClient.currentUser();
      if (user) auth.markSessionValidated();
      else auth.clearTokens();
    } catch {
      auth.clearTokens();
    }
  }
  if (!publicNames.has(String(to.name)) && !auth.isAuthenticated) return { name: 'login' };
  if (to.name === 'login' && auth.isAuthenticated) return { name: 'dashboard' };
  return true;
});
