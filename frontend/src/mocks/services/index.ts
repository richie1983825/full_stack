import type { Dashboard } from '../../types';
import { colorPrimary } from '../../theme/colors';
import type { DataSource } from '../../types';
import { sampleDashboards, sampleDataSources, newMockDsId } from '../data/sampleData';

/** Mock 后端 — 仪表盘服务 */
export const mockDashboardService = {
  list() {
    return sampleDashboards.map(({ panels: _panels, ...rest }) => rest);
  },

  getById(id: string) {
    return sampleDashboards.find((d) => d.id === id) ?? null;
  },

  create(payload: { title: string; description?: string }): Dashboard {
    const newDashboard: Dashboard = {
      id: `db-${Date.now()}`,
      title: payload.title,
      description: payload.description ?? '',
      panels: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    sampleDashboards.push(newDashboard);
    return newDashboard;
  },

  update(id: string, payload: Partial<Dashboard>): Dashboard | null {
    const idx = sampleDashboards.findIndex((d) => d.id === id);
    if (idx === -1) return null;
    sampleDashboards[idx] = {
      ...sampleDashboards[idx],
      ...payload,
      updatedAt: new Date().toISOString(),
    };
    return sampleDashboards[idx];
  },
};

/** Mock 后端 — 数据源服务 */
export const mockDatasourceService = {
  list() {
    return sampleDataSources;
  },

  getById(id: string) {
    return sampleDataSources.find((d) => d.id === id) ?? null;
  },

  create(payload: Record<string, unknown>): DataSource {
    const now = new Date().toISOString();
    const newDs: DataSource = {
      id: newMockDsId(),
      name: String(payload.name ?? ''),
      description: payload.description ? String(payload.description) : undefined,
      dbType: String(payload.dbType ?? 'postgres'),
      host: String(payload.host ?? ''),
      port: Number(payload.port ?? 5432),
      database: String(payload.database ?? ''),
      username: String(payload.username ?? ''),
      createdAt: now,
      updatedAt: now,
    };
    sampleDataSources.push(newDs);
    return newDs;
  },

  update(id: string, payload: Record<string, unknown>): DataSource | null {
    const idx = sampleDataSources.findIndex((d) => d.id === id);
    if (idx === -1) return null;
    const existing = sampleDataSources[idx];
    const updated: DataSource = {
      ...existing,
      name: payload.name !== undefined ? String(payload.name) : existing.name,
      description: payload.description !== undefined ? (payload.description ? String(payload.description) : undefined) : existing.description,
      dbType: payload.dbType !== undefined ? String(payload.dbType) : existing.dbType,
      host: payload.host !== undefined ? String(payload.host) : existing.host,
      port: payload.port !== undefined ? Number(payload.port) : existing.port,
      database: payload.database !== undefined ? String(payload.database) : existing.database,
      username: payload.username !== undefined ? String(payload.username) : existing.username,
      updatedAt: new Date().toISOString(),
    };
    sampleDataSources[idx] = updated;
    return updated;
  },

  delete(id: string): boolean {
    const idx = sampleDataSources.findIndex((d) => d.id === id);
    if (idx === -1) return false;
    sampleDataSources.splice(idx, 1);
    return true;
  },

  query(id: string, _sql: string) {
    const ds = mockDatasourceService.getById(id);
    if (!ds) return null;
    // Mock query result based on datasource name
    return {
      fields: [
        { name: 'id', type: 'number' as const, label: 'ID' },
        { name: 'name', type: 'string' as const, label: '名称' },
        { name: 'value', type: 'number' as const, label: '值' },
      ],
      rows: [
        { id: 1, name: '示例数据 A', value: 100 },
        { id: 2, name: '示例数据 B', value: 200 },
        { id: 3, name: '示例数据 C', value: 150 },
      ],
    };
  },
};

/** Mock 后端 — AI 对话服务 */
export const mockChatService = {
  send(message: string) {
    return generateAIResponse(message);
  },
};

function generateAIResponse(message: string): {
  id: string;
  role: 'assistant';
  content: string;
  suggestedChart?: Record<string, unknown>;
  timestamp: string;
} {
  const lower = message.toLowerCase();

  if (lower.includes('折线图') || lower.includes('趋势') || lower.includes('营收')) {
    return {
      id: `msg-${Date.now()}`,
      role: 'assistant',
      content: `好的，我为您生成了一张**月度营收趋势图**。它展示了华东、华南、华北三个区域近半年的营收变化趋势。

您可以：
- 拖拽面板调整位置或大小
- 点击面板标题编辑名称
- 继续对话让我修改图表样式`,
      suggestedChart: {
        id: `panel-ai-${Date.now()}`,
        title: '月度营收趋势',
        chartType: 'line',
        grid: { x: 0, y: 10, w: 6, h: 3 },
        option: {
          xAxis: { type: 'category', data: ['1月', '2月', '3月', '4月', '5月', '6月'] },
          yAxis: { type: 'value', name: '营收(万元)' },
          series: [
            { name: '华东', type: 'line', data: [820, 932, 901, 934, 1290, 1330], smooth: true },
            { name: '华南', type: 'line', data: [620, 732, 701, 834, 990, 1130], smooth: true },
            { name: '华北', type: 'line', data: [520, 632, 601, 734, 890, 930], smooth: true },
          ],
          tooltip: { trigger: 'axis' },
          legend: { bottom: 0 },
        },
      },
      timestamp: new Date().toISOString(),
    };
  }

  if (lower.includes('饼图') || lower.includes('占比') || lower.includes('比例')) {
    return {
      id: `msg-${Date.now()}`,
      role: 'assistant',
      content: `好的，我为您生成了一张**产品类别占比饼图**。可以直观看到各品类的营收分布情况。`,
      suggestedChart: {
        id: `panel-ai-${Date.now()}`,
        title: '产品类别营收占比',
        chartType: 'pie',
        grid: { x: 6, y: 10, w: 3, h: 3 },
        option: {
          tooltip: { trigger: 'item' },
          legend: { bottom: 0 },
          series: [{
            type: 'pie',
            radius: ['40%', '70%'],
            data: [
              { value: 1048, name: '电子产品' },
              { value: 735, name: '家居用品' },
              { value: 580, name: '服装' },
              { value: 484, name: '食品' },
              { value: 300, name: '其他' },
            ],
          }],
        },
      },
      timestamp: new Date().toISOString(),
    };
  }

  if (lower.includes('柱状图') || lower.includes('柱形图') || lower.includes('订单')) {
    return {
      id: `msg-${Date.now()}`,
      role: 'assistant',
      content: `好的，我为您生成了一张**各区域订单量柱状图**，直观对比各区域的订单数量。`,
      suggestedChart: {
        id: `panel-ai-${Date.now()}`,
        title: '各区域订单量',
        chartType: 'bar',
        grid: { x: 9, y: 10, w: 3, h: 3 },
        option: {
          xAxis: { type: 'category', data: ['华东', '华南', '华北', '西南', '华中'] },
          yAxis: { type: 'value', name: '订单量' },
          series: [{
            type: 'bar',
            data: [3200, 2800, 2400, 1800, 1600],
            itemStyle: { color: colorPrimary },
          }],
        },
      },
      timestamp: new Date().toISOString(),
    };
  }

  return {
    id: `msg-${Date.now()}`,
    role: 'assistant',
    content: `您好！我是报表助手。您可以这样与我交互：

- **"展示近半年营收趋势折线图"** — 我会生成对应的图表
- **"分析产品类别占比饼图"** — 生成饼图
- **"对比各区域订单量柱状图"** — 生成柱状图

请描述您需要的报表，我会尽力帮您生成！`,
    timestamp: new Date().toISOString(),
  };
}
