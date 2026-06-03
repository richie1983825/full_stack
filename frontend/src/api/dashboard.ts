import { apiClient } from './client';
import { endpoints } from './endpoints';
import type { Dashboard, DashboardSummary, PanelConfig } from '../types/dashboard';

export interface CreateDashboardPayload {
  title: string;
  description?: string;
  panels?: PanelConfig[];
  variables?: Record<string, string>;
}

export interface UpdateDashboardPayload {
  title?: string;
  description?: string;
  panels?: PanelConfig[];
  variables?: Record<string, string>;
}

export const dashboardApi = {
  list: () => apiClient.get<DashboardSummary[]>(endpoints.dashboards),

  getById: (id: string) => apiClient.get<Dashboard>(endpoints.dashboard(id)),

  create: (payload: CreateDashboardPayload) =>
    apiClient.post<Dashboard>(endpoints.dashboards, payload),

  update: (id: string, payload: UpdateDashboardPayload) =>
    apiClient.put<Dashboard>(endpoints.dashboard(id), payload),

  delete: (id: string) =>
    apiClient.delete<{ deleted: boolean }>(endpoints.dashboard(id)),
};
