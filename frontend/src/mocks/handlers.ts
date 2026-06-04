import { http, HttpResponse } from 'msw';
import { endpoints } from '../api/endpoints';
import type { BusinessSystemInfo, NetworkMetric } from '../api/cmp';
import { defaultTableFieldMeta } from '../constants/networkMetricSchema';
import type { DashboardSchedule, DashboardSnapshot } from '../types/snapshot';
import type { PanelConfig } from '../types/dashboard';
import { defaultNetworkMetricsQuery } from '../constants/networkMetricsQuery';
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

const mockMetrics: NetworkMetric[] = [
  {
    id: 'mock-1',
    created_at: '2026-05-13T00:00:00',
    updated_at: null,
    node_type: 'DCI线路',
    metric_category: '资源使用率',
    metric_name: '南方-威新主53口联通裸纤40G',
    unit: '%',
    current_value: '6.652',
    historical_peak: '6.652',
    mom_change: '1.1',
    yoy_change: '-1.1',
  },
  {
    id: 'mock-2',
    created_at: '2026-05-13T00:00:00',
    updated_at: null,
    node_type: 'DCI线路',
    metric_category: '资源使用率',
    metric_name: '南方-威新主54口联通裸纤40G',
    unit: '%',
    current_value: '82.5',
    historical_peak: '88.0',
    mom_change: '3.2',
    yoy_change: '1.5',
  },
  {
    id: 'mock-3',
    created_at: '2026-05-13T00:00:00',
    updated_at: null,
    node_type: '核心交换机',
    metric_category: '带宽利用率',
    metric_name: '核心节点-A 出口带宽',
    unit: '%',
    current_value: '45.3',
    historical_peak: '72.1',
    mom_change: '-2.0',
    yoy_change: '0.8',
  },
];

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
    title: '网络容量日报',
    description: '默认仪表盘：折线图、柱状图、表格',
    panels: [
      {
        id: 'panel-line-1',
        title: '节点类型指标趋势',
        chartType: 'line',
        grid: { x: 0, y: 0, w: 6, h: 3 },
        query: defaultNetworkMetricsQuery('line'),
        option: {
          tooltip: { trigger: 'axis' },
          legend: { bottom: 0 },
          xAxis: { type: 'category', data: ['指标A', '指标B'] },
          yAxis: { type: 'value' },
          series: [{ name: 'DCI线路', type: 'line', smooth: true, data: [6.6, 82.5] }],
        },
      },
      {
        id: 'panel-bar-1',
        title: 'Top10 使用率',
        chartType: 'bar',
        grid: { x: 6, y: 0, w: 6, h: 3 },
        query: defaultNetworkMetricsQuery('bar'),
        option: {
          tooltip: { trigger: 'axis' },
          grid: { left: 120, right: 20, top: 20, bottom: 30 },
          xAxis: { type: 'value' },
          yAxis: { type: 'category', data: mockMetrics.map((m) => m.metric_name) },
          series: [{ type: 'bar', data: mockMetrics.map((m) => Number.parseFloat(m.current_value)) }],
        },
      },
      {
        id: 'panel-table-1',
        title: '网络指标明细',
        chartType: 'table',
        grid: { x: 0, y: 3, w: 12, h: 4 },
        query: defaultNetworkMetricsQuery('table'),
        option: {
          data: mockMetrics.map((item) => ({
            节点类型: item.node_type,
            指标名称: item.metric_name,
            当前值: `${item.current_value}${item.unit}`,
          })),
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
  http.post(apiPath(endpoints.networkMetrics), async ({ request }) => {
    const body = (await request.json()) as { params?: { date?: string } };
    const date = body.params?.date;

    if (!date) {
      return fail('10001', "param 'date' is required");
    }

    return ok({ fields: defaultTableFieldMeta(), rows: mockMetrics });
  }),

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
