import { datasourceApi } from '../api/datasource';
import type { PanelConfig } from '../types/dashboard';

const GRID_ROW_HEIGHT = 100;
const GRID_MARGIN = 12;
const CARD_HEADER = 38;
const CARD_BODY_PADDING = 16;
const TABLE_HEADER = 39;
const TABLE_ROW = 39;

/** 根据表格行数计算 react-grid-layout 所需的最小 h 值 */
export function computeTableGridHeight(rowCount: number): number {
  const contentPx =
    CARD_HEADER + CARD_BODY_PADDING + TABLE_HEADER + Math.max(rowCount, 1) * TABLE_ROW;
  const h = Math.ceil((contentPx + GRID_MARGIN) / (GRID_ROW_HEIGHT + GRID_MARGIN));
  return Math.max(h, 2);
}

function withTableGridHeight(panel: PanelConfig, rowCount: number): PanelConfig {
  if (panel.chartType !== 'table') return panel;
  return {
    ...panel,
    grid: { ...panel.grid, h: computeTableGridHeight(rowCount) },
  };
}

function tableRowCount(panel: PanelConfig): number {
  const data = (panel.option as { data?: unknown[] } | undefined)?.data;
  return Array.isArray(data) ? data.length : 0;
}

// ============ SQL 查询结果 → ECharts option ============

/**
 * 从 SQL 查询结果构建 ECharts option（参照 Grafana 数据帧转换）。
 * 约定：
 * - 表格: 直接展示所有列和行
 * - 折线图/柱状图: 第一列为类别轴 (X)，其余数字列为系列 (series)
 */
function buildChartFromSqlResult(
  rows: Record<string, unknown>[],
  fields: { name: string; type: string }[],
  chartType: PanelConfig['chartType'],
): Record<string, unknown> {
  if (chartType === 'table') {
    return { data: rows, fields };
  }

  if (rows.length === 0) {
    return chartType === 'bar'
      ? { xAxis: { type: 'value' }, yAxis: { type: 'category', data: [] }, series: [] }
      : {
          tooltip: { trigger: 'axis' },
          legend: { bottom: 0 },
          xAxis: { type: 'category', data: [] },
          yAxis: { type: 'value' },
          series: [],
        };
  }

  const fieldNames = fields.map((f) => f.name);
  const categoryField = fieldNames[0]; // 第一列为类别 (X 轴)
  const valueFields = fieldNames.slice(1).filter((name) =>
    rows.some((r) => typeof r[name] === 'number'),
  );

  const categories = rows.map((r) => String(r[categoryField] ?? ''));

  if (chartType === 'bar') {
    const series = valueFields.map((vf) => ({
      name: vf,
      type: 'bar' as const,
      data: rows.map((r) => {
        const v = r[vf];
        return typeof v === 'number' ? v : 0;
      }),
    }));
    return {
      tooltip: { trigger: 'axis' },
      legend: { bottom: 0 },
      xAxis: { type: 'value' },
      yAxis: { type: 'category', data: categories },
      series,
    };
  }

  // 折线图
  const series = valueFields.map((vf) => ({
    name: vf,
    type: 'line' as const,
    smooth: true,
    data: rows.map((r) => {
      const v = r[vf];
      return typeof v === 'number' ? v : 0;
    }),
  }));

  return {
    tooltip: { trigger: 'axis' },
    legend: { bottom: 0 },
    xAxis: { type: 'category', data: categories },
    yAxis: { type: 'value' },
    series,
  };
}

// ============ SQL 查询执行 ============

/** 编译 SQL：Code 模式直接用 sql 字段，Builder 模式组合生成。支持 ${var} 变量替换。 */
function resolveSql(query: PanelConfig['query'], variables?: Record<string, string>): string | null {
  if (!query) return null;

  let sql: string | null = null;

  if (query.sqlMode === 'builder' && query.sqlTable) {
    const cols = query.sqlColumns && query.sqlColumns.length > 0
      ? query.sqlColumns.join(', ')
      : '*';
    let s = `SELECT ${cols} FROM "${query.sqlTable}"`;
    if (query.sqlWhere?.trim()) s += ` WHERE ${query.sqlWhere.trim()}`;
    if (query.sqlOrderBy?.trim()) s += ` ORDER BY ${query.sqlOrderBy.trim()}`;
    s += ' LIMIT 100';
    sql = s;
  } else if (query.sql?.trim()) {
    sql = query.sql.trim();
  }

  if (!sql) return null;

  // 替换变量 ${date} 等
  if (variables) {
    for (const [key, value] of Object.entries(variables)) {
      sql = sql.replace(new RegExp(`\\$\\{${key}\\}`, 'g'), value);
    }
  }

  return sql;
}

/**
 * 使用 SQL 数据源查询为面板填充数据
 */
async function hydrateFromSql(panel: PanelConfig, variables?: Record<string, string>): Promise<PanelConfig> {
  const q = panel.query;
  const sql = resolveSql(q, variables);
  if (!sql || !q?.datasourceId) {
    return panel.chartType === 'table'
      ? withTableGridHeight(panel, tableRowCount(panel))
      : panel;
  }

  try {
    const result = await datasourceApi.query(q.datasourceId, sql);
    const option = buildChartFromSqlResult(result.rows, result.fields, panel.chartType);
    if (panel.chartType === 'table') {
      return withTableGridHeight({ ...panel, option }, result.rows.length);
    }
    return { ...panel, option };
  } catch {
    return { ...panel, option: {} };
  }
}

// ============ Panel hydration（统一入口） ============

/**
 * 为单个面板填充数据（统一走 SQL 数据源）
 */
export async function hydratePanelOption(
  panel: PanelConfig,
  variables?: Record<string, string>,
): Promise<PanelConfig> {
  return hydrateFromSql(panel, variables);
}

/**
 * 批量填充面板数据
 */
export async function hydratePanels(
  panels: PanelConfig[],
  variables?: Record<string, string>,
): Promise<PanelConfig[]> {
  const sqlPanels = panels.filter((p) => {
    const q = p.query;
    return !!(q?.datasourceId && (q?.sql || (q?.sqlMode === 'builder' && q?.sqlTable)));
  });
  const staticPanels = panels.filter((p) => {
    const q = p.query;
    return !(q?.datasourceId && (q?.sql || (q?.sqlMode === 'builder' && q?.sqlTable)));
  });

  const hydrated: PanelConfig[] = staticPanels.map((panel) =>
    panel.chartType === 'table' ? withTableGridHeight(panel, tableRowCount(panel)) : panel,
  );

  for (const panel of sqlPanels) {
    hydrated.push(await hydrateFromSql(panel, variables));
  }

  // 保持原始顺序
  const panelMap = new Map(hydrated.map((p) => [p.id, p]));
  return panels.map((p) => panelMap.get(p.id) ?? p);
}
