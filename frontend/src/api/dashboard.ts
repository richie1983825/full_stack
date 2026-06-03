import { apiClient } from './client';
import { endpoints } from './endpoints';
import type { Dashboard, DashboardSummary, PanelConfig } from '../types/dashboard';

export interface CreateDashboardPayload {
  title: string;
  description?: string;
  panels?: PanelConfig[];
  variables?: Record<string, string>;
  parentId?: string;
  kind?: 'folder' | 'dashboard';
}

export interface UpdateDashboardPayload {
  title?: string;
  description?: string;
  panels?: PanelConfig[];
  variables?: Record<string, string>;
}

export const dashboardApi = {
  list: () => apiClient.get<DashboardSummary[]>(endpoints.dashboards),

  /** 列出根目录项目（文件夹 + 仪表盘） */
  listTree: () => apiClient.get<DashboardSummary[]>(endpoints.dashboardTree),

  /** 列出指定文件夹的子项目 */
  listChildren: (parentId: string) =>
    apiClient.get<DashboardSummary[]>(endpoints.dashboardChildren(parentId)),

  getById: (id: string) => apiClient.get<Dashboard>(endpoints.dashboard(id)),

  create: (payload: CreateDashboardPayload) =>
    apiClient.post<Dashboard>(endpoints.dashboards, payload),

  update: (id: string, payload: UpdateDashboardPayload) =>
    apiClient.put<Dashboard>(endpoints.dashboard(id), payload),

  delete: (id: string) =>
    apiClient.delete<{ deleted: boolean }>(endpoints.dashboard(id)),

  /** 移动项目到指定文件夹 */
  move: (id: string, parentId: string | null) =>
    apiClient.put<Dashboard>(endpoints.dashboardMove(id), { parentId }),
};
