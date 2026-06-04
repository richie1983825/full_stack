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

  it('空变量保留占位符', () => {
    const sql = resolveSql(
      { sql: "SELECT * FROM t WHERE dt = '${date}'", sqlMode: 'code' },
      {},
    );
    expect(sql).toBe("SELECT * FROM t WHERE dt = '${date}'");
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
