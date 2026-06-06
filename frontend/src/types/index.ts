// ============ 仪表盘 & 面板 ============

/** 图表类型枚举 */
export type ChartType =
  | 'line'
  | 'bar'
  | 'pie'
  | 'area'
  | 'scatter'
  | 'table'
  | 'stat'
  | 'gauge';

/** 单个面板配置 */
export interface PanelConfig {
  id: string;
  title: string;
  chartType: ChartType;
  /** ECharts option，或表格数据源 */
  option: Record<string, unknown>;
  /** 面板在网格中的位置 */
  grid: {
    x: number;
    y: number;
    w: number;
    h: number;
  };
  /** 数据源 ID */
  dataSourceId?: string;
}

/** 仪表盘配置 */
export interface Dashboard {
  id: string;
  title: string;
  description?: string;
  panels: PanelConfig[];
  createdAt: string;
  updatedAt: string;
}

// ============ 对话 & AI ============

/** 对话角色 */
export type MessageRole = 'user' | 'assistant' | 'system';

/** 聊天消息 */
export interface ChatMessage {
  id: string;
  role: MessageRole;
  content: string;
  /** AI 生成的图表配置（当 AI 建议生成报表时） */
  suggestedChart?: PanelConfig;
  timestamp: string;
}

// ============ 数据源 ============

/** 数据源 */
export interface DataSource {
  id: string;
  name: string;
  description?: string;
  /** 数据库类型: postgres | mysql | ... */
  dbType: string;
  host: string;
  port: number;
  database: string;
  username: string;
  /** 返回时隐藏密码 */
  createdAt: string;
  updatedAt: string;
}

export interface CreateDataSourcePayload {
  name: string;
  description?: string;
  dbType?: string;
  host: string;
  port?: number;
  database: string;
  username: string;
  password: string;
}

export interface UpdateDataSourcePayload {
  name?: string;
  description?: string;
  dbType?: string;
  host?: string;
  port?: number;
  database?: string;
  username?: string;
  password?: string;
}

/** 数据库表元数据（含 PostgreSQL COMMENT） */
export interface TableMeta {
  name: string;
  comment?: string;
}

/** 数据库列元数据（含 PostgreSQL COMMENT） */
export interface ColumnMeta {
  name: string;
  dataType: string;
  comment?: string;
}

export interface DataField {
  name: string;
  type: 'string' | 'number' | 'date' | 'boolean';
  label: string;
}

export interface DataSourceQueryResult {
  fields: DataField[];
  rows: Record<string, unknown>[];
}
