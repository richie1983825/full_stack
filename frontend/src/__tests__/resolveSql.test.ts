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

  it('模拟保存后重新水合：SQL 含 ${date} + 变量含 date', () => {
    // 这是关键场景：用户编辑面板写入带 ${date} 的 SQL，保存后重新加载
    const panelQuery = {
      sql: "SELECT node, category, metrics, current_value FROM \"net_work_metrics\" WHERE created_at::date='${date}' LIMIT 100",
      sqlMode: 'code' as const,
      datasourceId: 'ds-1',
    };
    const variables = { date: '2026-06-02' };
    const sql = resolveSql(panelQuery, variables);
    expect(sql).not.toContain('${date}');
    expect(sql).toContain("2026-06-02");
  });

  it('空变量时保留占位符（不自动填充）', () => {
    const sql = resolveSql(
      { sql: "SELECT * FROM t WHERE dt = '${date}'", sqlMode: 'code' },
      {},
    );
    // 空变量时不替换，保留占位符——由调用方负责提供变量
    expect(sql).toContain('${date}');
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
