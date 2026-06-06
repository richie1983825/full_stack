import { ApiError } from '../api/types';

const AUTH_STORAGE_KEY = 'cmp-auth';

let redirecting = false;
let onSessionExpired: (() => void) | null = null;

export function registerSessionExpiredHandler(handler: (() => void) | null) {
  onSessionExpired = handler;
}

/** 清除登录态并跳转登录页；抛出 ApiError 以中断当前请求链 */
export function handleSessionExpired(): never {
  if (!redirecting) {
    redirecting = true;
    localStorage.removeItem(AUTH_STORAGE_KEY);
    if (onSessionExpired) {
      onSessionExpired();
    } else {
      window.location.replace(`${window.location.origin}/login?expired=1`);
    }
  }
  throw new ApiError('SESSION_EXPIRED', '登录已过期，请重新登录', 401);
}
