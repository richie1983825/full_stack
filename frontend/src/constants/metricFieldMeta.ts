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

export function resolveOrderBy(orderBy?: string[]): string[] {
  return orderBy?.length ? orderBy : [];
}

/** 从 SQL 查询结果的 fields 或首行数据推断表格列 */
export function resolveTableFields(
  fields?: MetricFieldMeta[],
  rows?: Record<string, unknown>[],
): MetricFieldMeta[] {
  if (fields?.length) return fields;
  const first = rows?.[0];
  if (!first) return [];
  return Object.keys(first).map((name) => ({
    name,
    label: name,
    type: 'string' as const,
  }));
}
