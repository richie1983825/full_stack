import { http, HttpResponse } from 'msw';
import { endpoints } from '../api/endpoints';
import type { BusinessSystemInfo } from '../api/cmp';
import { defaultPanelQuery } from '../constants/defaultPanelQuery';
import type { DashboardSchedule, DashboardSnapshot } from '../types/snapshot';
import type { PanelConfig } from '../types/dashboard';
import { hydratePanels } from '../utils/panelData';
import { getPublicBaseUrl } from '../utils/publicUrl';
import { renderSnapshotHtml } from '../utils/snapshotHtml';
import { mockDatasourceService } from './services';

const API_PREFIX = '/api';

function apiPath(path: string) {
  return `${API_PREFIX}${path}`;
}

function ok<T>(data: T) {
  return HttpResponse.json({
    errorCode: '00000',
    errorMessage: '',
    success: true,
    data,
  });
}

function fail(code: string, message: string, status = 400) {
  return HttpResponse.json(
    {
      errorCode: code,
      errorMessage: message,
      success: false,
      data: null,
    },
    { status },
  );
}

interface MockDashboard {
  id: string;
  title: string;
  description?: string;
  panels: unknown[];
  variables: Record<string, string>;
  createdAt: string;
  updatedAt: string;
}

const mockDashboards: MockDashboard[] = [
  {
    id: '00000000-0000-0000-0000-000000000301',
    title: '数据概览',
    description: '默认仪表盘：折线图、柱状图、表格（SQL 数据源）',
    panels: [
      {
        id: 'panel-line-1',
        title: '仪表盘创建趋势',
        chartType: 'line',
        grid: { x: 0, y: 0, w: 6, h: 3 },
        query: defaultPanelQuery('line'),
        option: {
          tooltip: { trigger: 'axis' },
          legend: { bottom: 0 },
          xAxis: { type: 'category', data: ['2026-06-01', '2026-06-02'] },
          yAxis: { type: 'value' },
          series: [{ name: 'cnt', type: 'line', smooth: true, data: [1, 2] }],
        },
      },
      {
        id: 'panel-bar-1',
        title: '用户统计',
        chartType: 'bar',
        grid: { x: 6, y: 0, w: 6, h: 3 },
        query: defaultPanelQuery('bar'),
        option: {
          tooltip: { trigger: 'axis' },
          grid: { left: 120, right: 20, top: 20, bottom: 30 },
          xAxis: { type: 'value' },
          yAxis: { type: 'category', data: ['admin'] },
          series: [{ type: 'bar', data: [1] }],
        },
      },
      {
        id: 'panel-table-1',
        title: '用户列表',
        chartType: 'table',
        grid: { x: 0, y: 3, w: 12, h: 4 },
        query: defaultPanelQuery('table'),
        option: {
          fields: [
            { name: 'username', label: '用户名', type: 'string' },
            { name: 'email', label: '邮箱', type: 'string' },
          ],
          data: [{ username: 'admin', email: 'admin@cmp.local' }],
        },
      },
    ],
    variables: { date: '2026-05-13' },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

function newMockId() {
  return crypto.randomUUID();
}

function newSnapshotKey() {
  return crypto.randomUUID().replace(/-/g, '').slice(0, 16);
}

interface MockSnapshotStore {
  id: string;
  dashboardId: string;
  snapshotKey: string;
  title: string;
  variables: Record<string, string>;
  html: string;
  createdAt: string;
}

const mockSnapshotStore: MockSnapshotStore[] = [];
const mockScheduleStore = new Map<string, DashboardSchedule>();

function stripQueries(panels: PanelConfig[]): PanelConfig[] {
  return panels.map(({ query: _query, ...rest }) => rest);
}

const mockBusinessSystem: BusinessSystemInfo = {
  id: 'mock-system',
  name: '网络容量监控（Mock）',
  code: 'mock-cmp',
  description: 'Mock 模式下的业务系统模板',
  status: 'active',
  created_at: '2026-04-11T13:27:03.83+00:00',
  updated_at: '2026-04-11T13:27:03.83+00:00',
  datasource_reference: {
    panels: [],
    datasource_type: 'mock',
  },
};

/**
 * Mock 后端路由
 * 响应格式与 Rust 后端保持一致
 */
export const handlers = [
  http.post(apiPath(endpoints.businessSystems), () => ok(mockBusinessSystem)),

  http.get(apiPath('/dashboards/'), () =>
    ok(
      mockDashboards.map((d) => ({
        id: d.id,
        title: d.title,
        description: d.description,
        panelCount: d.panels.length,
        createdAt: d.createdAt,
        updatedAt: d.updatedAt,
      })),
    ),
  ),

  http.get(apiPath(`${endpoints.dashboards}/:id`), ({ params }) => {
    const dashboard = mockDashboards.find((d) => d.id === params.id);
    if (!dashboard) return fail('40401', '仪表盘不存在', 404);
    return ok(dashboard);
  }),

  http.post(apiPath('/dashboards/'), async ({ request }) => {
    const body = (await request.json()) as {
      title?: string;
      description?: string;
      panels?: unknown[];
      variables?: Record<string, string>;
    };
    if (!body.title?.trim()) return fail('10001', 'title is required');
    const now = new Date().toISOString();
    const created: MockDashboard = {
      id: newMockId(),
      title: body.title.trim(),
      description: body.description,
      panels: body.panels ?? [],
      variables: body.variables ?? { date: '2026-05-13' },
      createdAt: now,
      updatedAt: now,
    };
    mockDashboards.unshift(created);
    return ok(created);
  }),

  http.put(apiPath(`${endpoints.dashboards}/:id`), async ({ params, request }) => {
    const index = mockDashboards.findIndex((d) => d.id === params.id);
    if (index < 0) return fail('40401', '仪表盘不存在', 404);
    const body = (await request.json()) as Partial<MockDashboard>;
    const existing = mockDashboards[index];
    const updated: MockDashboard = {
      ...existing,
      title: body.title ?? existing.title,
      description: body.description ?? existing.description,
      panels: body.panels ?? existing.panels,
      variables: body.variables ?? existing.variables,
      updatedAt: new Date().toISOString(),
    };
    mockDashboards[index] = updated;
    return ok(updated);
  }),

  http.delete(apiPath(`${endpoints.dashboards}/:id`), ({ params }) => {
    const index = mockDashboards.findIndex((d) => d.id === params.id);
    if (index < 0) return fail('40401', '仪表盘不存在', 404);
    mockDashboards.splice(index, 1);
    return ok({ deleted: true });
  }),

  http.get(apiPath(`${endpoints.dashboards}/:id/snapshots`), ({ params }) => {
    const list = mockSnapshotStore
      .filter((s) => s.dashboardId === params.id)
      .map(
        (s): DashboardSnapshot => ({
          id: s.id,
          dashboardId: s.dashboardId,
          snapshotKey: s.snapshotKey,
          title: s.title,
          variables: s.variables,
          viewUrl: `${getPublicBaseUrl()}/snapshots/${s.snapshotKey}`,
          createdAt: s.createdAt,
        }),
      )
      .reverse();
    return ok(list);
  }),

  http.post(apiPath(`${endpoints.dashboards}/:id/snapshots`), async ({ params, request }) => {
    const dashboard = mockDashboards.find((d) => d.id === params.id);
    if (!dashboard) return fail('40401', '仪表盘不存在', 404);

    const body = (await request.json()) as { title?: string; expiresHours?: number };
    const panels = await hydratePanels(dashboard.panels as PanelConfig[]);
    const snapshotPanels = stripQueries(panels);
    const now = new Date().toISOString();
    const title =
      body.title?.trim() ||
      `${dashboard.title} · ${now}`;
    const generatedAt = new Date().toLocaleString();
    const html = renderSnapshotHtml(title, {}, snapshotPanels, generatedAt);
    const snapshotKey = newSnapshotKey();
    const id = newMockId();
    const createdAt = new Date().toISOString();

    mockSnapshotStore.push({
      id,
      dashboardId: dashboard.id as string,
      snapshotKey,
      title,
      variables: {},
      html,
      createdAt,
    });

    const snapshot: DashboardSnapshot = {
      id,
      dashboardId: dashboard.id as string,
      snapshotKey,
      title,
      variables: {},
      viewUrl: `${getPublicBaseUrl()}/snapshots/${snapshotKey}`,
      createdAt,
    };
    return ok(snapshot);
  }),

  http.delete(apiPath('/dashboards/:id/snapshots/:snapshotId'), ({ params }) => {
    const index = mockSnapshotStore.findIndex(
      (s) => s.dashboardId === params.id && s.id === params.snapshotId,
    );
    if (index < 0) return fail('40401', '快照不存在', 404);
    mockSnapshotStore.splice(index, 1);
    return ok({ deleted: true });
  }),

  http.get(apiPath(`${endpoints.dashboards}/:id/schedule`), ({ params }) => {
    return ok(mockScheduleStore.get(params.id as string) ?? null);
  }),

  http.put(apiPath(`${endpoints.dashboards}/:id/schedule`), async ({ params, request }) => {
    const dashboard = mockDashboards.find((d) => d.id === params.id);
    if (!dashboard) return fail('40401', '仪表盘不存在', 404);

    const body = (await request.json()) as {
      enabled: boolean;
      cronExpr: string;
      dateMode: string;
    };

    const now = new Date();
    const schedule: DashboardSchedule = {
      id: mockScheduleStore.get(params.id as string)?.id ?? newMockId(),
      dashboardId: params.id as string,
      enabled: body.enabled,
      cronExpr: body.cronExpr,
      dateMode: body.dateMode,
      lastRunAt: mockScheduleStore.get(params.id as string)?.lastRunAt,
      nextRunAt: body.enabled ? now.toISOString() : undefined,
    };
    mockScheduleStore.set(params.id as string, schedule);
    return ok(schedule);
  }),

  // ====== 数据源 ======

  http.get(apiPath('/datasources'), () => {
    return ok(mockDatasourceService.list());
  }),

  http.get(apiPath('/datasources/:id'), ({ params }) => {
    const ds = mockDatasourceService.getById(params.id as string);
    if (!ds) return fail('40401', '数据源不存在', 404);
    return ok(ds);
  }),

  http.post(apiPath('/datasources'), async ({ request }) => {
    const body = (await request.json()) as Record<string, unknown>;
    if (!body.name) return fail('10001', 'name is required');
    const created = mockDatasourceService.create(body);
    return ok(created);
  }),

  http.put(apiPath('/datasources/:id'), async ({ params, request }) => {
    const body = (await request.json()) as Record<string, unknown>;
    const updated = mockDatasourceService.update(params.id as string, body);
    if (!updated) return fail('40401', '数据源不存在', 404);
    return ok(updated);
  }),

  http.delete(apiPath('/datasources/:id'), ({ params }) => {
    const deleted = mockDatasourceService.delete(params.id as string);
    if (!deleted) return fail('40401', '数据源不存在', 404);
    return ok({ deleted: true });
  }),

  http.post(apiPath('/datasources/:id/query'), async ({ params, request }) => {
    const body = (await request.json()) as { sql?: string };
    const result = mockDatasourceService.query(params.id as string, body.sql ?? '');
    if (!result) return fail('40401', '数据源不存在', 404);
    return ok(result);
  }),

  // ====== Snapshot view ======

  http.get('/snapshots/:key', ({ params }) => {
    const item = mockSnapshotStore.find((s) => s.snapshotKey === params.key);
    if (!item) {
      return new HttpResponse('snapshot not found', { status: 404 });
    }
    return new HttpResponse(item.html, {
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    });
  }),
];
