import type { PanelChartType, PanelConfig } from '../types/dashboard';
import { defaultNetworkMetricsQuery } from '../constants/networkMetricsQuery';
import { colorPrimary } from '../theme/colors';

export function createPanelId() {
  return `panel-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

export function createDefaultPanel(
  chartType: PanelChartType,
  grid: { x: number; y: number; w: number; h: number },
): PanelConfig {
  const id = createPanelId();
  const titles: Record<PanelChartType, string> = {
    line: '折线图',
    bar: '柱状图',
    table: '表格',
  };

  const base: PanelConfig = {
    id,
    title: titles[chartType],
    chartType,
    grid,
    query: defaultNetworkMetricsQuery(chartType),
    option: {},
  };

  if (chartType === 'table') {
    base.option = {
      data: [{ 节点类型: '示例', 指标名称: '示例', 当前值: '0', 单位: '%' }],
    };
  } else if (chartType === 'bar') {
    base.option = {
      tooltip: { trigger: 'axis' },
      grid: { left: 80, right: 20, top: 20, bottom: 30 },
      xAxis: { type: 'category', data: [] },
      yAxis: { type: 'value' },
      series: [{ type: 'bar', data: [], itemStyle: { color: colorPrimary } }],
    };
  } else {
    base.option = {
      tooltip: { trigger: 'axis' },
      legend: { bottom: 0 },
      xAxis: { type: 'category', data: [] },
      yAxis: { type: 'value' },
      series: [{ type: 'line', data: [], smooth: true }],
    };
  }

  return base;
}

export function nextPanelGrid(panels: PanelConfig[]) {
  const maxY = panels.reduce((max, panel) => Math.max(max, panel.grid.y + panel.grid.h), 0);
  return { x: 0, y: maxY, w: 6, h: 3 };
}
