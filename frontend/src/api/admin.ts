import { apiClient } from './client';
import { endpoints } from './endpoints';
import type { UserProfile } from './auth';

export interface PermissionItem {
  id: string;
  code: string;
  resource: string;
  action: string;
  description: string;
}

export interface RoleDetail {
  id: string;
  name: string;
  description: string;
  is_system: boolean;
  permissions: PermissionItem[];
}

export interface PermissionGroup {
  resource: string;
  permissions: PermissionItem[];
}

export interface CreateUserPayload {
  username: string;
  email: string;
  password: string;
  display_name: string;
  is_active?: boolean;
  is_grafana_admin?: boolean;
  role_ids: string[];
}

export interface UpdateUserPayload {
  email?: string;
  display_name?: string;
  password?: string;
  is_active?: boolean;
  is_grafana_admin?: boolean;
  role_ids?: string[];
}

export interface CreateRolePayload {
  name: string;
  description?: string;
  permission_ids: string[];
}

export interface UpdateRolePayload {
  name?: string;
  description?: string;
  permission_ids?: string[];
}

export const adminApi = {
  listUsers: () => apiClient.get<UserProfile[]>(endpoints.adminUsers),
  createUser: (payload: CreateUserPayload) =>
    apiClient.post<UserProfile>(endpoints.adminUsers, payload),
  updateUser: (id: string, payload: UpdateUserPayload) =>
    apiClient.put<UserProfile>(endpoints.adminUser(id), payload),
  deleteUser: (id: string) =>
    apiClient.delete<{ deleted: boolean }>(endpoints.adminUser(id)),

  listRoles: () => apiClient.get<RoleDetail[]>(endpoints.adminRoles),
  createRole: (payload: CreateRolePayload) =>
    apiClient.post<RoleDetail>(endpoints.adminRoles, payload),
  updateRole: (id: string, payload: UpdateRolePayload) =>
    apiClient.put<RoleDetail>(endpoints.adminRole(id), payload),
  deleteRole: (id: string) =>
    apiClient.delete<{ deleted: boolean }>(endpoints.adminRole(id)),
  updateRolePermissions: (id: string, permissionIds: string[]) =>
    apiClient.put<RoleDetail>(endpoints.adminRolePermissions(id), {
      permission_ids: permissionIds,
    }),

  listPermissions: () => apiClient.get<PermissionItem[]>(endpoints.adminPermissions),
  listPermissionsGrouped: () =>
    apiClient.get<PermissionGroup[]>(endpoints.adminPermissionsGrouped),
};
