import type { ApiResponse } from './types';
import { ApiError } from './types';
import { handleSessionExpired } from '../utils/sessionExpired';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? '/api';
const AUTH_STORAGE_KEY = 'cmp-auth';

type RequestOptions = Omit<RequestInit, 'body'> & {
  body?: unknown;
  auth?: boolean;
};

function getStoredToken(): string | null {
  try {
    const raw = localStorage.getItem(AUTH_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { state?: { token?: string | null } };
    return parsed.state?.token ?? null;
  } catch {
    return null;
  }
}

function buildUrl(path: string): string {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  const base = API_BASE_URL.replace(/\/$/, '');
  return `${base}${normalizedPath}`;
}

/** 通用 HTTP 请求封装，前端仅通过此层访问后端 */
export async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { body, headers, auth = true, ...rest } = options;

  const requestHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(headers as Record<string, string>),
  };

  if (auth) {
    const token = getStoredToken();
    if (token) {
      requestHeaders.Authorization = `Bearer ${token}`;
    }
  }

  const response = await fetch(buildUrl(path), {
    ...rest,
    headers: requestHeaders,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  }).catch(() => {
    throw new ApiError('NETWORK', '无法连接后端服务', 0);
  });

  if (auth && response.status === 401) {
    handleSessionExpired();
  }

  const rawBody = await response.text();
  if (!rawBody) {
    if (!response.ok) {
      throw new ApiError(String(response.status), `请求失败 (${response.status})`, response.status);
    }
    return undefined as T;
  }

  let json: ApiResponse<T>;
  try {
    json = JSON.parse(rawBody) as ApiResponse<T>;
  } catch {
    throw new ApiError(String(response.status), '响应解析失败', response.status);
  }

  if (!response.ok || !json.success) {
    throw new ApiError(json.errorCode ?? String(response.status), json.errorMessage ?? '请求失败', response.status);
  }

  return json.data;
}

export const apiClient = {
  get: <T>(path: string, auth = true) => request<T>(path, { method: 'GET', auth }),
  post: <T>(path: string, body?: unknown, auth = true) =>
    request<T>(path, { method: 'POST', body, auth }),
  put: <T>(path: string, body?: unknown, auth = true) =>
    request<T>(path, { method: 'PUT', body, auth }),
  delete: <T>(path: string, auth = true) => request<T>(path, { method: 'DELETE', auth }),
};
