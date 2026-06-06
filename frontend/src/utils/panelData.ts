import { datasourceApi } from '../api/datasource';
import type { PanelConfig } from '../types/dashboard';

const GRID_ROW_HEIGHT = 100;
const GRID_MARGIN = 12;
const CARD_HEADER = 38;
const CARD_BODY_PADDING = 16;
const TABLE_HEADER = 39;
const TABLE_ROW = 39;
const TABLE_PAGINATION = 48;

/** 表格实际展示行数（开启分页时按 pageSize 计算） */
export function effectiveTableRowCount(panel: PanelConfig): number {
  const data = (panel.option as { data?: unknown[] } | undefined)?.data;
  const total = Array.isArray(data) ? data.length : 0;
  if (panel.pagination?.enabled) {
    const pageSize = panel.pagination.pageSize ?? 10;
    return Math.min(pageSize, Math.max(total, 1));
  }
  return Math.max(total, 1);
}

/** 根据表格行数计算 react-grid-layout 所需 h 值 */
export function computeTableGridHeight(
  rowCount: number,
  paginationEnabled = false,
): number {
  const contentPx =
    CARD_HEADER +
    CARD_BODY_PADDING +
    TABLE_HEADER +
    Math.max(rowCount, 1) * TABLE_ROW +
    (paginationEnabled ? TABLE_PAGINATION : 0);
  const h = Math.ceil((contentPx + GRID_MARGIN) / (GRID_ROW_HEIGHT + GRID_MARGIN));
  return Math.max(h, 2);
}

export function getTablePanelGridH(panel: PanelConfig): number {
  return computeTableGridHeight(
    effectiveTableRowCount(panel),
    panel.pagination?.enabled ?? false,
  );
}

function withTableGridHeight(panel: PanelConfig, rowCount?: number): PanelConfig {
  if (panel.chartType !== 'table') return panel;
  const rows = rowCount ?? effectiveTableRowCount(panel);
  const h = computeTableGridHeight(rows, panel.pagination?.enabled ?? false);
  return {
    ...panel,
    grid: { ...panel.grid, h },
  };
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
      legend: { bottom: 0, type: 'scroll' },
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
    legend: { bottom: 0, type: 'scroll' },
    xAxis: { type: 'category', data: categories },
    yAxis: { type: 'value' },
    series,
  };
}

// ============ SQL 查询执行 ============

import { resolveSql } from './resolveSql';

/**
 * 使用 SQL 数据源查询为面板填充数据
 */
async function hydrateFromSql(
  panel: PanelConfig,
  variables?: Record<string, string>,
  strict = false,
): Promise<PanelConfig> {
  const q = panel.query;
  const sql = resolveSql(q, variables);
  if (!sql || !q?.datasourceId) {
    if (strict && q?.datasourceId) {
      throw new Error('SQL 为空，无法查询数据');
    }
    return panel.chartType === 'table'
      ? withTableGridHeight(panel)
      : panel;
  }

  try {
    const result = await datasourceApi.query(q.datasourceId, sql);
    const option = buildChartFromSqlResult(result.rows, result.fields, panel.chartType);
    if (panel.chartType === 'table') {
      return withTableGridHeight({ ...panel, option });
    }
    return { ...panel, option };
  } catch (err) {
    if (strict) {
      throw err instanceof Error ? err : new Error('SQL 查询失败');
    }
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
  return hydrateFromSql(panel, variables, false);
}

/** 严格模式：查询失败时抛出错误（AI 添加面板时使用） */
export async function hydratePanelOptionStrict(
  panel: PanelConfig,
  variables?: Record<string, string>,
): Promise<PanelConfig> {
  return hydrateFromSql(panel, variables, true);
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
    panel.chartType === 'table' ? withTableGridHeight(panel) : panel,
  );

  for (const panel of sqlPanels) {
    hydrated.push(await hydrateFromSql(panel, variables));
  }

  // 保持原始顺序
  const panelMap = new Map(hydrated.map((p) => [p.id, p]));
  return panels.map((p) => panelMap.get(p.id) ?? p);
}
