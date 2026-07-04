import { create } from 'zustand';

interface AuthState {
  accessToken: string | null;
  refreshToken: string | null;
  setTokens: (tokens: { access: string; refresh: string }) => void;
  clearTokens: () => void;
  authorizationHeader: () => Record<string, string>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  accessToken: null,
  refreshToken: null,
  setTokens: ({ access, refresh }) => set({ accessToken: access, refreshToken: refresh }),
  clearTokens: () => set({ accessToken: null, refreshToken: null }),
  authorizationHeader: () => {
    const token = get().accessToken;
    const headers: Record<string, string> = {};
    if (!token) {
      return headers;
    }
    headers.Authorization = `Bearer ${token}`;
    return headers;
  },
}));
