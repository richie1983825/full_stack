import { describe, it, expect } from 'vitest';
import { resolveSql } from '../utils/resolveSql';

describe('resolveSql', () => {
  it('Builder 模式生成 SQL', () => {
    const sql = resolveSql(
      {
        sqlMode: 'builder',
        sqlTable: 'users',
        sqlColumns: ['name', 'email'],
        sqlWhere: "status = 'active'",
        sqlOrderBy: 'name ASC',
      },
      {},
    );
    expect(sql).toBe(
      'SELECT name, email FROM "users" WHERE status = \'active\' ORDER BY name ASC LIMIT 100',
    );
  });

  it('Builder 模式通配符 *', () => {
    const sql = resolveSql(
      { sqlMode: 'builder', sqlTable: 'dashboards' },
      {},
    );
    expect(sql).toBe('SELECT * FROM "dashboards" LIMIT 100');
  });

  it('Code 模式直接使用 sql 字段', () => {
    const sql = resolveSql(
      { sql: 'SELECT 1', sqlMode: 'code' },
      {},
    );
    expect(sql).toBe('SELECT 1');
  });

  it('替换 ${date} 变量', () => {
    const sql = resolveSql(
      {
        sql: "SELECT * FROM t WHERE dt = '${date}'",
        sqlMode: 'code',
      },
      { date: '2026-06-03' },
    );
    expect(sql).toBe("SELECT * FROM t WHERE dt = '2026-06-03'");
  });

  it('替换多个变量', () => {
    const sql = resolveSql(
      {
        sql: "SELECT * FROM t WHERE dt = '${date}' AND cat = '${category}'",
        sqlMode: 'code',
      },
      { date: '2026-06-03', category: 'usage' },
    );
    expect(sql).toBe("SELECT * FROM t WHERE dt = '2026-06-03' AND cat = 'usage'");
  });

  it('空变量时自动补全默认日期', () => {
    const sql = resolveSql(
      { sql: "SELECT * FROM t WHERE dt = '${date}'", sqlMode: 'code' },
      {},
    );
    // 没有显式传 date 时，自动用默认日期填充，不应有 ${date} 占位符
    expect(sql).not.toContain('${date}');
    expect(sql).toMatch(/dt = '\d{4}-\d{2}-\d{2}'/);
  });

  it('无 query 返回 null', () => {
    const sql = resolveSql(undefined, {});
    expect(sql).toBeNull();
  });

  it('无 sql 返回 null', () => {
    const sql = resolveSql({ sqlMode: 'code' }, {});
    expect(sql).toBeNull();
  });
});
