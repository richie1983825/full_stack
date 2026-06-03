import type { MetricFieldMeta } from '../constants/networkMetricSchema';
import { resolveOrderBy } from '../constants/networkMetricSchema';

export type NetworkMetricTableRow = Record<string, unknown>;

export function sortNetworkMetricRows(
  rows: NetworkMetricTableRow[],
  orderBy?: string[],
): NetworkMetricTableRow[] {
  const sortKeys = resolveOrderBy(orderBy);

  return [...rows].sort((a, b) => {
    for (const key of sortKeys) {
      const cmp = String(a[key] ?? '').localeCompare(String(b[key] ?? ''), 'zh-CN');
      if (cmp !== 0) return cmp;
    }
    return 0;
  });
}

/** 按字段 mergeSame 标记合并单元格（Grafana 风格 field config） */
export function computeMergeRowSpan(
  rows: NetworkMetricTableRow[],
  field: MetricFieldMeta,
): number[] {
  const spans = Array.from({ length: rows.length }, () => 1);
  if (!field.mergeSame) return spans;

  let index = 0;
  while (index < rows.length) {
    const current = String(rows[index][field.name] ?? '');
    let next = index + 1;
    while (next < rows.length && String(rows[next][field.name] ?? '') === current) {
      next += 1;
    }
    spans[index] = next - index;
    for (let i = index + 1; i < next; i += 1) {
      spans[i] = 0;
    }
    index = next;
  }

  return spans;
}

export function formatMetricChange(value: unknown): string {
  if (value == null || value === '' || value === '-') return '-';
  const parsed = Number.parseFloat(String(value));
  if (!Number.isFinite(parsed)) return String(value);
  return `${parsed > 0 ? '+' : ''}${parsed}%`;
}
