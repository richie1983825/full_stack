import type { PanelConfig } from '../types/dashboard';
import type { MetricFieldMeta } from '../constants/metricFieldMeta';
import { resolveTableFields } from '../constants/metricFieldMeta';
import {
  computeMergeRowSpan,
  formatMetricChange,
  sortTableRows,
  type TableRow,
} from './tableData';
import { normalizeChartOption } from './chartLayout';

export function renderSnapshotHtml(
  title: string,
  variables: Record<string, string>,
  panels: PanelConfig[],
  generatedAt: string,
): string {
  const date = variables.date ?? '-';
  let panelBlocks = '';
  let chartScripts = '';
  let chartIndex = 0;

  for (const panel of panels) {
    const { x, y, w, h } = panel.grid;
    const gridStyle = `grid-column:${x + 1} / span ${w}; grid-row:${y + 1} / span ${h};`;

    if (panel.chartType === 'table') {
      const tableOption = panel.option as {
        fields?: MetricFieldMeta[];
        data?: TableRow[];
        orderBy?: string[];
      };
      const rawData = tableOption.data ?? [];
      const fields = resolveTableFields(tableOption.fields, rawData);
      const data = sortTableRows(rawData, tableOption.orderBy);
      const mergeField = fields.find((field) => field.mergeSame);
      const mergeSpans = mergeField ? computeMergeRowSpan(data, mergeField) : [];

      const header = fields.map((field) => `<th>${field.label}</th>`).join('');
      const rows = data
        .map((row, index) => {
          const cells = fields
            .map((field) => {
              if (field.mergeSame && mergeSpans[index] === 0) return '';
              const value = row[field.name];
              const text =
                field.format === 'change'
                  ? formatMetricChange(value)
                  : String(value ?? '-');
              if (field.mergeSame && mergeSpans[index] > 1) {
                return `<td rowspan="${mergeSpans[index]}" style="vertical-align:middle;">${text}</td>`;
              }
              return `<td>${text}</td>`;
            })
            .join('');
          return `<tr>${cells}</tr>`;
        })
        .join('');

      panelBlocks += `
<section class="panel" style="${gridStyle}">
  <header class="panel-title">${panel.title}</header>
  <div class="panel-body">${data.length ? `<table><thead><tr>${header}</tr></thead><tbody>${rows}</tbody></table>` : '<p style="color:#999;padding:16px;">暂无数据</p>'}</div>
</section>`;
    } else {
      const chartId = `chart-${chartIndex++}`;
      const optionJson = JSON.stringify(
        normalizeChartOption((panel.option ?? {}) as Record<string, unknown>),
      );
      panelBlocks += `
<section class="panel" style="${gridStyle}">
  <header class="panel-title">${panel.title}</header>
  <div class="panel-body"><div id="${chartId}" class="chart"></div></div>
</section>`;
      chartScripts += `
(function(){
  var el=document.getElementById("${chartId}");
  if(!el||typeof echarts==="undefined")return;
  var chart=echarts.init(el);
  var option=${optionJson};
  chart.setOption(option);
  window.addEventListener("resize",function(){chart.resize();});
})();`;
    }
  }

  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${title} - 快照</title>
  <script src="https://cdn.jsdelivr.net/npm/echarts@5.6.0/dist/echarts.min.js"></script>
  <style>
    *{box-sizing:border-box;margin:0;padding:0}
    body{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Arial,sans-serif;background:#f0f6fc;color:#1f1f1f}
    .snapshot-header{background:linear-gradient(180deg,#1d4570 0%,#0f2847 100%);color:#fff;padding:16px 24px}
    .snapshot-header h1{font-size:20px;margin-bottom:6px}
    .snapshot-meta{font-size:13px;opacity:.85}
    .snapshot-badge{display:inline-block;margin-left:8px;padding:2px 8px;border-radius:4px;background:rgba(255,255,255,.15);font-size:12px}
    .dashboard-grid{display:grid;grid-template-columns:repeat(12,1fr);gap:12px;padding:16px;max-width:1440px;margin:0 auto}
    .panel{background:#fff;border:1px solid #e8e8e8;border-radius:6px;overflow:hidden;min-height:120px;display:flex;flex-direction:column}
    .panel-title{padding:8px 12px;font-weight:600;font-size:14px;border-bottom:1px solid #f0f0f0}
    .panel-body{flex:1;padding:8px;min-height:0}
    .chart{width:100%;height:100%;min-height:240px}
    table{width:100%;border-collapse:collapse;font-size:13px}
    th,td{border-bottom:1px solid #f0f0f0;padding:8px 10px;text-align:left}
    th{background:#fafafa;font-weight:600}
    tr:hover td{background:#fafafa}
    .snapshot-footer{text-align:center;color:#999;font-size:12px;padding:24px}
  </style>
</head>
<body>
  <header class="snapshot-header">
    <h1>${title}<span class="snapshot-badge">静态快照</span></h1>
    <div class="snapshot-meta">数据日期：${date} · 生成时间：${generatedAt}</div>
  </header>
  <main class="dashboard-grid">${panelBlocks}</main>
  <footer class="snapshot-footer">容量管理平台 · 仪表盘快照（数据已嵌入，无需登录即可查看）</footer>
  <script>${chartScripts}</script>
</body>
</html>`;
}
