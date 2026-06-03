// 默认 CMP 数据源 UUID（与后端 seed 一致）
export const DEFAULT_DATASOURCE_ID = '00000000-0000-0000-0000-000000000401';

import type { PanelChartType, PanelQuery } from '../types/dashboard';

/** 默认仪表盘各面板的 SQL 查询定义（Grafana 通用风格） */
export function defaultNetworkMetricsQuery(chartType: PanelChartType): PanelQuery {
  switch (chartType) {
    case 'table':
      return {
        datasourceId: DEFAULT_DATASOURCE_ID,
        sql: 'SELECT username, email, is_active, created_at FROM users ORDER BY created_at DESC LIMIT 10',
        sqlMode: 'code',
      };
    case 'bar':
      return {
        datasourceId: DEFAULT_DATASOURCE_ID,
        sql: 'SELECT username, 1 AS score FROM users LIMIT 5',
        sqlMode: 'code',
      };
    case 'line':
    default:
      return {
        datasourceId: DEFAULT_DATASOURCE_ID,
        sql: 'SELECT created_at::date AS day, COUNT(*) AS cnt FROM dashboards GROUP BY created_at::date ORDER BY created_at::date LIMIT 30',
        sqlMode: 'code',
      };
  }
}
