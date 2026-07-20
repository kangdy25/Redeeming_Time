import { defineStore } from 'pinia';

import { usePlannerStore } from './plannerStore';

const accessKey = 'redeeming-time.access-token';
const refreshKey = 'redeeming-time.refresh-token';

function storage() {
  return typeof globalThis.localStorage === 'undefined' ? undefined : globalThis.localStorage;
}

export const useAuthStore = defineStore('auth', {
  state: () => ({
    accessToken: (storage()?.getItem(accessKey) ?? null) as string | null,
    refreshToken: (storage()?.getItem(refreshKey) ?? null) as string | null,
    sessionValidated: false,
  }),
  getters: {
    isAuthenticated: (state) => Boolean(state.accessToken && state.sessionValidated),
    authorizationHeader: (state): Record<string, string> =>
      state.accessToken ? { Authorization: `Bearer ${state.accessToken}` } : {},
  },
  actions: {
    setTokens(tokens: { access: string; refresh: string }) {
      usePlannerStore().resetPlanner();
      storage()?.setItem(accessKey, tokens.access);
      storage()?.setItem(refreshKey, tokens.refresh);
      this.accessToken = tokens.access;
      this.refreshToken = tokens.refresh;
      this.sessionValidated = true;
    },
    markSessionValidated() {
      this.sessionValidated = true;
    },
    clearTokens() {
      usePlannerStore().resetPlanner();
      storage()?.removeItem(accessKey);
      storage()?.removeItem(refreshKey);
      this.accessToken = null;
      this.refreshToken = null;
      this.sessionValidated = false;
    },
  },
});
