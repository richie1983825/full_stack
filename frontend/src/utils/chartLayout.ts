/** ECharts 图例/网格布局：靠右对齐且留出边距，避免窄面板下文字被裁切 */

import { chartPalette } from '../theme/colors';

type LegendConfig = Record<string, unknown>;
type GridConfig = Record<string, unknown>;

const LEGEND_RIGHT_INSET = 8;
const LEGEND_TOP_INSET = 8;
const LEGEND_BOTTOM_INSET = 8;
const GRID_TOP_WITH_LEGEND = 44;
const GRID_BOTTOM_WITH_LEGEND = 52;

export function normalizeLegend(userLegend?: LegendConfig): LegendConfig {
  const legend: LegendConfig = {
    orient: 'horizontal',
    type: 'scroll',
    padding: [4, LEGEND_RIGHT_INSET, 4, 8],
    ...(userLegend ?? {}),
  };

  const hasBottom = legend.bottom != null;

  if (hasBottom) {
    delete legend.top;
    delete legend.right;
    legend.left ??= 'center';
    legend.bottom = Math.max(Number(legend.bottom) || 0, LEGEND_BOTTOM_INSET);
    return legend;
  }

  // 顶部图例：保持靠右，与容器右缘留出间距
  legend.top ??= LEGEND_TOP_INSET;
  legend.right ??= LEGEND_RIGHT_INSET;
  legend.left = 'auto';
  delete legend.bottom;
  delete legend.width;

  return legend;
}

export function normalizeGrid(
  userGrid: GridConfig | undefined,
  legend: LegendConfig | undefined,
): GridConfig {
  const legendAtTop = legend != null && legend.bottom == null;
  const legendAtBottom = legend != null && legend.bottom != null;

  const defaults: GridConfig = {
    left: 50,
    right: 24,
    bottom: legendAtBottom ? GRID_BOTTOM_WITH_LEGEND : 30,
    top: legendAtTop ? GRID_TOP_WITH_LEGEND : 20,
  };

  return {
    ...defaults,
    ...(userGrid ?? {}),
    right: Math.max(Number(userGrid?.right ?? defaults.right), 16),
  };
}

export function normalizeChartOption(userOption: Record<string, unknown>): Record<string, unknown> {
  const legend = normalizeLegend(userOption.legend as LegendConfig | undefined);
  const grid = normalizeGrid(userOption.grid as GridConfig | undefined, legend);

  return {
    color: [...chartPalette],
    ...userOption,
    legend,
    grid,
  };
}
