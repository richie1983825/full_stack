import type { PanelChartType, PanelConfig } from '../types/dashboard';
import { defaultPanelQuery } from '../constants/defaultPanelQuery';
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
    query: defaultPanelQuery(chartType),
    option: {},
  };

  if (chartType === 'table') {
    base.option = {
      data: [{ 列1: '示例', 列2: '示例', 列3: '0' }],
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
