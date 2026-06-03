import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { HomePageTarget } from '../types/homePage';
import {
  DEFAULT_HOME_TARGET,
  homeTargetLabel,
  resolveHomePath,
} from '../utils/homePage';

interface HomePageStore {
  target: HomePageTarget;
  getHomePath: () => string;
  getHomeLabel: () => string;
  setTarget: (target: HomePageTarget) => void;
  resetIfDashboardDeleted: (dashboardId: string) => void;
}

export const useHomePageStore = create<HomePageStore>()(
  persist(
    (set, get) => ({
      target: DEFAULT_HOME_TARGET,

      getHomePath: () => resolveHomePath(get().target),

      getHomeLabel: () => homeTargetLabel(get().target),

      setTarget: (target) => set({ target }),

      resetIfDashboardDeleted: (dashboardId) => {
        const { target } = get();
        if (target.type === 'dashboard' && target.id === dashboardId) {
          set({ target: DEFAULT_HOME_TARGET });
        }
      },
    }),
    {
      name: 'cmp-home-page',
      partialize: (state) => ({ target: state.target }),
    },
  ),
);
