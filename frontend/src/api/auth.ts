import { apiClient } from './client';
import { endpoints } from './endpoints';

export interface RoleSummary {
  id: string;
  name: string;
  description: string;
  is_system: boolean;
}

export interface UserProfile {
  id: string;
  username: string;
  email: string;
  display_name: string;
  is_active: boolean;
  is_grafana_admin: boolean;
  roles: RoleSummary[];
  permissions: string[];
}

export interface LoginPayload {
  username: string;
  password: string;
}

export interface LoginResponse {
  token: string;
  user: UserProfile;
}

export const authApi = {
  login: (payload: LoginPayload) =>
    apiClient.post<LoginResponse>(endpoints.authLogin, payload, false),

  me: () => apiClient.get<UserProfile>(endpoints.authMe),
};
