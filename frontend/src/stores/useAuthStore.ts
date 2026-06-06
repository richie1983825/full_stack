import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { authApi, type UserProfile } from '../api/auth';

interface AuthStore {
  token: string | null;
  user: UserProfile | null;
  loading: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
  fetchMe: () => Promise<void>;
  hasPermission: (code: string) => boolean;
}

export const useAuthStore = create<AuthStore>()(
  persist(
    (set, get) => ({
      token: null,
      user: null,
      loading: false,

      login: async (username, password) => {
        set({ loading: true });
        try {
          const data = await authApi.login({ username, password });
          set({ token: data.token, user: data.user, loading: false });
        } catch (error) {
          set({ loading: false });
          throw error;
        }
      },

      logout: () => {
        set({ token: null, user: null });
      },

      fetchMe: async () => {
        const { token } = get();
        if (!token) return;
        set({ loading: true });
        try {
          const user = await authApi.me();
          set({ user, loading: false });
        } catch {
          set({ loading: false });
        }
      },

      hasPermission: (code: string) => {
        const { user } = get();
        if (!user) return false;
        return user.is_grafana_admin || user.permissions.includes(code);
      },
    }),
    {
      name: 'cmp-auth',
      partialize: (state) => ({ token: state.token, user: state.user }),
    },
  ),
);
