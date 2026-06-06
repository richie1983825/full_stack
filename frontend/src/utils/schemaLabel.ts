import type { ColumnMeta, TableMeta } from '../types';

export function tableDisplayLabel(table: Pick<TableMeta, 'name' | 'comment'>): string {
  const comment = table.comment?.trim();
  return comment ? `${comment} (${table.name})` : table.name;
}

export function columnDisplayLabel(column: Pick<ColumnMeta, 'name' | 'dataType' | 'comment'>): string {
  const comment = column.comment?.trim();
  if (comment) {
    return `${comment} (${column.name}, ${column.dataType})`;
  }
  return `${column.name} (${column.dataType})`;
}

export function tableSearchText(table: TableMeta): string {
  return [table.name, table.comment].filter(Boolean).join(' ');
}

export function columnSearchText(column: ColumnMeta): string {
  return [column.name, column.comment, column.dataType].filter(Boolean).join(' ');
}

/** 兼容旧版 API 返回 string[] 的情况 */
export function normalizeTableMetaList(raw: unknown): TableMeta[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((item) => {
    if (typeof item === 'string') {
      return { name: item };
    }
    if (item && typeof item === 'object' && typeof (item as TableMeta).name === 'string') {
      const row = item as TableMeta;
      return { name: row.name, comment: row.comment };
    }
    return { name: String(item) };
  });
}

export function normalizeColumnMetaList(raw: unknown): ColumnMeta[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((item) => {
    if (item && typeof item === 'object' && typeof (item as ColumnMeta).name === 'string') {
      const row = item as ColumnMeta;
      return { name: row.name, dataType: row.dataType, comment: row.comment };
    }
    return { name: String(item), dataType: 'unknown' };
  });
}
