import type { NetworkMetric } from '../api/cmp';

/** Grafana 风格字段类型 */
export type MetricFieldType = 'string' | 'number';

/** Grafana 风格字段格式 */
export type MetricFieldFormat = 'plain' | 'with_unit' | 'change';

/** 查询结果字段元数据（列顺序 = fields 数组顺序） */
export interface MetricFieldMeta {
  name: string;
  label: string;
  type: MetricFieldType;
  mergeSame?: boolean;
  format?: MetricFieldFormat;
}

/** Grafana DataFrame：fields + rows */
export interface NetworkMetricsFrame {
  fields: MetricFieldMeta[];
  rows: NetworkMetric[];
}

interface MetricFieldDef {
  name: keyof NetworkMetric | 'current_value' | 'historical_peak' | 'mom_change' | 'yoy_change';
  label: string;
  type: MetricFieldType;
  format?: MetricFieldFormat;
  mergeSame?: boolean;
}

/** 与 metrics.rs SQL ORDER BY 一致 */
export const DEFAULT_NETWORK_METRICS_ORDER_BY = [
  'node_type',
  'metric_category',
  'metric_name',
] as const;

/** 与 metrics.rs SQL SELECT 展示字段顺序一致 */
export const DEFAULT_NETWORK_METRICS_TABLE_FIELDS = [
  'node_type',
  'metric_category',
  'metric_name',
  'current_value',
  'historical_peak',
  'mom_change',
  'yoy_change',
] as const;

export type NetworkMetricsOrderField = (typeof DEFAULT_NETWORK_METRICS_ORDER_BY)[number];

/** 与 backend metric_schema.rs / SQL SELECT 展示字段顺序一致 */
const DEFAULT_TABLE_FIELD_DEFS: MetricFieldDef[] = [
  { name: 'node_type', label: '节点类型', type: 'string', mergeSame: true },
  { name: 'metric_category', label: '指标类别', type: 'string' },
  { name: 'metric_name', label: '指标名称', type: 'string' },
  { name: 'current_value', label: '当前值', type: 'number', format: 'with_unit' },
  { name: 'historical_peak', label: '历史峰值', type: 'number', format: 'with_unit' },
  { name: 'mom_change', label: '环比', type: 'number', format: 'change' },
  { name: 'yoy_change', label: '周同比', type: 'number', format: 'change' },
];

export function defaultTableFieldMeta(): MetricFieldMeta[] {
  return DEFAULT_TABLE_FIELD_DEFS.map((def) => ({
    name: def.name,
    label: def.label,
    type: def.type,
    mergeSame: def.mergeSame,
    format: def.format,
  }));
}

export function resolveTableFields(selected?: string[]): MetricFieldMeta[] {
  if (!selected?.length) return defaultTableFieldMeta();
  const resolved = selected
    .map((name) => DEFAULT_TABLE_FIELD_DEFS.find((def) => def.name === name))
    .filter((def): def is MetricFieldDef => def != null)
    .map((def) => ({
      name: def.name,
      label: def.label,
      type: def.type,
      mergeSame: def.mergeSame,
      format: def.format,
    }));
  return resolved.length ? resolved : defaultTableFieldMeta();
}

export function formatFieldValue(metric: NetworkMetric, field: MetricFieldMeta): string {
  switch (field.name) {
    case 'node_type':
      return metric.node_type;
    case 'metric_category':
      return metric.metric_category;
    case 'metric_name':
      return metric.metric_name;
    case 'current_value':
      return `${metric.current_value}${metric.unit}`;
    case 'historical_peak':
      return `${metric.historical_peak}${metric.unit}`;
    case 'mom_change':
      return metric.mom_change ?? '-';
    case 'yoy_change':
      return metric.yoy_change ?? '-';
    default:
      return '-';
  }
}

export function getMetricFieldValue(metric: NetworkMetric, field: string): string {
  switch (field) {
    case 'node_type':
      return metric.node_type;
    case 'metric_category':
      return metric.metric_category;
    case 'metric_name':
      return metric.metric_name;
    case 'current_value':
      return metric.current_value;
    case 'historical_peak':
      return metric.historical_peak;
    case 'mom_change':
      return metric.mom_change ?? '';
    case 'yoy_change':
      return metric.yoy_change ?? '';
    default:
      return '';
  }
}

export function resolveOrderBy(orderBy?: string[]): string[] {
  if (!orderBy?.length) {
    return [...DEFAULT_NETWORK_METRICS_ORDER_BY];
  }
  return orderBy;
}

/** Grafana ORDER BY：按 query.orderBy 排序，默认与 SQL 一致 */
export function sortMetricsByOrder(
  metrics: NetworkMetric[],
  orderBy?: string[],
): NetworkMetric[] {
  const keys = resolveOrderBy(orderBy);
  return [...metrics].sort((a, b) => {
    for (const key of keys) {
      const cmp = getMetricFieldValue(a, key).localeCompare(
        getMetricFieldValue(b, key),
        'zh-CN',
      );
      if (cmp !== 0) return cmp;
    }
    return 0;
  });
}

/** 按遍历顺序去重（保留 SQL 排序后的首次出现顺序） */
export function uniqueInOrder(
  metrics: NetworkMetric[],
  field: string,
  limit?: number,
): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const metric of metrics) {
    const value = getMetricFieldValue(metric, field);
    if (seen.has(value)) continue;
    seen.add(value);
    result.push(value);
    if (limit != null && result.length >= limit) break;
  }
  return result;
}

export function sortNetworkMetrics(metrics: NetworkMetric[]): NetworkMetric[] {
  return sortMetricsByOrder(metrics);
}
