import { apiClient } from './client';
import { endpoints } from './endpoints';
import type {
  CreateSnapshotPayload,
  DashboardSchedule,
  DashboardSnapshot,
  UpsertSchedulePayload,
} from '../types/snapshot';

export const snapshotApi = {
  list: (dashboardId: string) =>
    apiClient.get<DashboardSnapshot[]>(endpoints.dashboardSnapshots(dashboardId)),

  create: (dashboardId: string, payload?: CreateSnapshotPayload) =>
    apiClient.post<DashboardSnapshot>(endpoints.dashboardSnapshots(dashboardId), payload ?? {}),

  delete: (dashboardId: string, snapshotId: string) =>
    apiClient.delete<{ deleted: boolean }>(endpoints.dashboardSnapshot(dashboardId, snapshotId)),

  getSchedule: (dashboardId: string) =>
    apiClient.get<DashboardSchedule | null>(endpoints.dashboardSchedule(dashboardId)),

  upsertSchedule: (dashboardId: string, payload: UpsertSchedulePayload) =>
    apiClient.put<DashboardSchedule>(endpoints.dashboardSchedule(dashboardId), payload),
};
