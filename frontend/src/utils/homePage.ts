import type { HomePageTarget } from '../types/homePage';

export const DEFAULT_HOME_TARGET: HomePageTarget = { type: 'dashboard-list' };

export function resolveHomePath(target: HomePageTarget): string {
  if (target.type === 'dashboard-list') return '/';
  return `/dashboards/${target.id}`;
}

export function isHomePath(pathname: string, target: HomePageTarget): boolean {
  const homePath = resolveHomePath(target);
  const normalized = pathname.endsWith('/') && pathname.length > 1
    ? pathname.slice(0, -1)
    : pathname;
  return normalized === homePath;
}

export function homeTargetLabel(target: HomePageTarget): string {
  if (target.type === 'dashboard-list') return '仪表盘列表';
  return target.title;
}
