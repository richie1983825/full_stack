import { create } from 'zustand';
import { dashboardApi } from '../api/dashboard';
import type { Dashboard, DashboardSummary, PanelConfig } from '../types/dashboard';
import { hydratePanels } from '../utils/panelData';
import { useHomePageStore } from './useHomePageStore';

interface DashboardStore {
  dashboards: DashboardSummary[];
  currentDashboard: Dashboard | null;
  loading: boolean;
  editMode: boolean;
  jsonDrawerOpen: boolean;

  loadDashboards: () => Promise<void>;
  loadDashboard: (id: string) => Promise<void>;
  createDashboard: (title: string, description?: string) => Promise<Dashboard>;
  deleteDashboard: (id: string) => Promise<void>;
  saveDashboard: (payload?: Partial<Pick<Dashboard, 'title' | 'description' | 'panels' | 'variables'>>) => Promise<void>;
  setPanels: (panels: PanelConfig[]) => void;
  addPanel: (panel: PanelConfig) => void;
  updatePanel: (panel: PanelConfig) => void;
  removePanel: (id: string) => void;
  setVariable: (key: string, value: string) => void;
  refreshPanelData: () => Promise<void>;
  setEditMode: (enabled: boolean) => void;
  setJsonDrawerOpen: (open: boolean) => void;
  applyJsonConfig: (json: string) => void;
}

function mapDashboard(raw: Record<string, unknown>): Dashboard {
  return {
    id: String(raw.id),
    title: String(raw.title),
    description: raw.description ? String(raw.description) : undefined,
    panels: (raw.panels as PanelConfig[]) ?? [],
    variables: (raw.variables as Record<string, string>) ?? { date: '2026-05-13' },
    createdAt: String(raw.createdAt),
    updatedAt: String(raw.updatedAt),
  };
}

function mapSummary(raw: Record<string, unknown>): DashboardSummary {
  return {
    id: String(raw.id),
    title: String(raw.title),
    description: raw.description ? String(raw.description) : undefined,
    panelCount: Number(raw.panelCount ?? 0),
    parentId: raw.parentId ? String(raw.parentId) : undefined,
    kind: (raw.kind as 'folder' | 'dashboard') ?? 'dashboard',
    createdAt: String(raw.createdAt),
    updatedAt: String(raw.updatedAt),
  };
}

export const useDashboardStore = create<DashboardStore>((set, get) => ({
  dashboards: [],
  currentDashboard: null,
  loading: false,
  editMode: true,
  jsonDrawerOpen: false,

  loadDashboards: async () => {
    set({ loading: true });
    try {
      const list = await dashboardApi.list();
      set({
        dashboards: list.map((item) => mapSummary(item as unknown as Record<string, unknown>)),
        loading: false,
      });
    } catch {
      set({ loading: false });
      throw new Error('加载仪表盘列表失败');
    }
  },

  loadDashboard: async (id: string) => {
    set({ loading: true });
    try {
      const raw = await dashboardApi.getById(id);
      const dashboard = mapDashboard(raw as unknown as Record<string, unknown>);
      const panels = await hydratePanels(dashboard.panels, dashboard.variables);
      set({ currentDashboard: { ...dashboard, panels }, loading: false });
    } catch {
      set({ loading: false });
      throw new Error('加载仪表盘失败');
    }
  },

  createDashboard: async (title, description) => {
    const created = await dashboardApi.create({ title, description });
    const dashboard = mapDashboard(created as unknown as Record<string, unknown>);
    await get().loadDashboards();
    return dashboard;
  },

  deleteDashboard: async (id) => {
    await dashboardApi.delete(id);
    useHomePageStore.getState().resetIfDashboardDeleted(id);
    const { currentDashboard } = get();
    if (currentDashboard?.id === id) {
      set({ currentDashboard: null });
    }
    await get().loadDashboards();
  },

  saveDashboard: async (payload) => {
    const { currentDashboard } = get();
    if (!currentDashboard) return;

    // 保存前剥离 option（Grafana 风格：JSON 只存配置，不存数据）
    const panelsToSave = (payload?.panels ?? currentDashboard.panels).map(
      ({ option: _option, ...rest }) => rest,
    );

    const updated = await dashboardApi.update(currentDashboard.id, {
      title: payload?.title ?? currentDashboard.title,
      description: payload?.description ?? currentDashboard.description,
      panels: panelsToSave,
      variables: payload?.variables ?? currentDashboard.variables,
    });
    const saved = mapDashboard(updated as unknown as Record<string, unknown>);
    // 保存后重新水合面板数据（从 SQL 查询获取实时数据）
    const hydratedPanels = await hydratePanels(saved.panels);
    set({
      currentDashboard: { ...saved, panels: hydratedPanels },
    });
    await get().loadDashboards();
  },

  setPanels: (panels) => {
    const { currentDashboard } = get();
    if (!currentDashboard) return;
    set({ currentDashboard: { ...currentDashboard, panels } });
  },

  addPanel: (panel) => {
    const { currentDashboard } = get();
    if (!currentDashboard) return;
    set({ currentDashboard: { ...currentDashboard, panels: [...currentDashboard.panels, panel] } });
  },

  updatePanel: (panel) => {
    const { currentDashboard } = get();
    if (!currentDashboard) return;
    const panels = currentDashboard.panels.map((p) => (p.id === panel.id ? panel : p));
    set({ currentDashboard: { ...currentDashboard, panels } });
  },

  removePanel: (id) => {
    const { currentDashboard } = get();
    if (!currentDashboard) return;
    set({
      currentDashboard: {
        ...currentDashboard,
        panels: currentDashboard.panels.filter((p) => p.id !== id),
      },
    });
  },

  setVariable: (key, value) => {
    const { currentDashboard } = get();
    if (!currentDashboard) return;
    set({
      currentDashboard: {
        ...currentDashboard,
        variables: { ...currentDashboard.variables, [key]: value },
      },
    });
  },

  refreshPanelData: async () => {
    const { currentDashboard } = get();
    if (!currentDashboard) return;
    const panels = await hydratePanels(currentDashboard.panels, currentDashboard.variables);
    set({ currentDashboard: { ...currentDashboard, panels } });
  },

  setEditMode: (enabled) => set({ editMode: enabled }),
  setJsonDrawerOpen: (open) => set({ jsonDrawerOpen: open }),

  applyJsonConfig: (json) => {
    const parsed = JSON.parse(json) as Partial<Dashboard>;
    const { currentDashboard } = get();
    if (!currentDashboard) return;
    set({
      currentDashboard: {
        ...currentDashboard,
        title: parsed.title ?? currentDashboard.title,
        description: parsed.description ?? currentDashboard.description,
        variables: parsed.variables ?? currentDashboard.variables,
        panels: (parsed.panels as PanelConfig[]) ?? currentDashboard.panels,
      },
    });
  },
}));
