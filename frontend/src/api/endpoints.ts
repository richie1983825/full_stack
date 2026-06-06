/** 后端 API 路径（不含 base URL） */
export const endpoints = {
  // ====== 容量管理平台（遗留） ======
  businessSystems: '/v1/ops_dbapi/api/business_systems',

  // ====== 认证 ======
  authLogin: '/auth/login',
  authMe: '/auth/me',

  // ====== 管理 ======
  adminUsers: '/admin/users',
  adminUser: (id: string) => `/admin/users/${id}`,
  adminRoles: '/admin/roles',
  adminRole: (id: string) => `/admin/roles/${id}`,
  adminRolePermissions: (id: string) => `/admin/roles/${id}/permissions`,
  adminPermissions: '/admin/permissions',
  adminPermissionsGrouped: '/admin/permissions/grouped',

  // legacy mock endpoints (保留兼容旧模块)
  dashboards: '/dashboards/',
  dashboard: (id: string) => `/dashboards/${id}`,
  dashboardTree: '/dashboards/tree',
  dashboardChildren: (id: string) => `/dashboards/${id}/children`,
  dashboardMove: (id: string) => `/dashboards/${id}/move`,
  dashboardSnapshots: (id: string) => `/dashboards/${id}/snapshots`,
  dashboardSnapshot: (dashboardId: string, snapshotId: string) =>
    `/dashboards/${dashboardId}/snapshots/${snapshotId}`,
  dashboardSchedule: (id: string) => `/dashboards/${id}/schedule`,
  snapshotView: (key: string) => `/snapshots/${key}`,
  datasources: '/datasources',
  datasource: (id: string) => `/datasources/${id}`,
  datasourceQuery: (id: string) => `/datasources/${id}/query`,
  datasourceTables: (id: string) => `/datasources/${id}/tables`,
  datasourceColumns: (id: string, table: string) =>
    `/datasources/${id}/tables/${table}/columns`,
} as const;
