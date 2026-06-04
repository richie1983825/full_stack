import type { PanelQuery } from '../types/dashboard';

/** 编译 SQL：Code 模式直接用 sql 字段，Builder 模式组合生成。支持 ${var} 变量替换。 */
export function resolveSql(query?: PanelQuery, variables?: Record<string, string>): string | null {
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

  for (const [key, value] of Object.entries(variables ?? {})) {
    sql = sql.replace(new RegExp(`\\$\\{${key}\\}`, 'g'), value);
  }

  return sql;
}
