/** 面板图表类型（当前支持） */
export type PanelChartType = 'line' | 'bar' | 'table';

export interface PanelGrid {
  x: number;
  y: number;
  w: number;
  h: number;
}

export type SqlMode = 'builder' | 'code';

/** 面板数据查询配置（参照 Grafana：数据源 + SQL） */
export interface PanelQuery {
  /** 关联数据源 ID */
  datasourceId?: string;
  /** SQL 查询语句（Code 模式） */
  sql?: string;
  /** SQL 编辑模式: builder / code */
  sqlMode?: SqlMode;
  /** Builder 模式下选择的表名 */
  sqlTable?: string;
  /** Builder 模式下选择的字段 */
  sqlColumns?: string[];
  /** Builder 模式下的 WHERE 条件 */
  sqlWhere?: string;
  /** Builder 模式下的排序字段 */
  sqlOrderBy?: string;
}

export interface PanelConfig {
  id: string;
  title: string;
  chartType: PanelChartType;
  /** ECharts 渲染选项（运行时填充，不持久化） */
  option?: Record<string, unknown>;
  grid: PanelGrid;
  query?: PanelQuery;
}

export interface Dashboard {
  id: string;
  title: string;
  description?: string;
  panels: PanelConfig[];
  variables?: Record<string, string>;
  createdAt: string;
  updatedAt: string;
}

export interface DashboardSummary {
  id: string;
  title: string;
  description?: string;
  panelCount: number;
  createdAt: string;
  updatedAt: string;
}
