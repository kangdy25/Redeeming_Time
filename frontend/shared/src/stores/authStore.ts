import { create } from 'zustand';

interface TokenStorage {
  getItem: (key: string) => string | null;
  setItem: (key: string, value: string) => void;
  removeItem: (key: string) => void;
}

function isTokenStorage(storage: unknown): storage is TokenStorage {
  return (
    typeof storage === 'object' &&
    storage !== null &&
    typeof (storage as TokenStorage).getItem === 'function' &&
    typeof (storage as TokenStorage).setItem === 'function' &&
    typeof (storage as TokenStorage).removeItem === 'function'
  );
}

const getStorage = () => {
  const storage = (globalThis as { localStorage?: unknown }).localStorage;
  return isTokenStorage(storage) ? storage : undefined;
};
const accessKey = 'redeeming-time.access-token';
const refreshKey = 'redeeming-time.refresh-token';

interface AuthState {
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: () => boolean;
  setTokens: (tokens: { access: string; refresh: string }) => void;
  clearTokens: () => void;
  authorizationHeader: () => Record<string, string>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  accessToken: getStorage()?.getItem(accessKey) ?? null,
  refreshToken: getStorage()?.getItem(refreshKey) ?? null,
  isAuthenticated: () => Boolean(get().accessToken),
  setTokens: ({ access, refresh }) => {
    getStorage()?.setItem(accessKey, access);
    getStorage()?.setItem(refreshKey, refresh);
    set({ accessToken: access, refreshToken: refresh });
  },
  clearTokens: () => {
    getStorage()?.removeItem(accessKey);
    getStorage()?.removeItem(refreshKey);
    set({ accessToken: null, refreshToken: null });
  },
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
