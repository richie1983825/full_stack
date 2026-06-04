export interface DashboardSnapshot {
  id: string;
  dashboardId: string;
  snapshotKey: string;
  title: string;
  variables: Record<string, string>;
  viewUrl: string;
  createdAt: string;
  expiresAt?: string;
}

export interface DashboardSchedule {
  id: string;
  dashboardId: string;
  enabled: boolean;
  cronExpr: string;
  dateMode: string;
  lastRunAt?: string;
  nextRunAt?: string;
}

export interface CreateSnapshotPayload {
  title?: string;
  expiresHours?: number;
}

export interface UpsertSchedulePayload {
  enabled: boolean;
  cronExpr: string;
  dateMode?: string;
}
