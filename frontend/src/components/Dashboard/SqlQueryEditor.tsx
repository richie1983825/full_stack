import { useEffect, useState, useCallback } from 'react';
import { Form, Input, Select, Tabs, Space, Button, Modal, message } from 'antd';
import type { DataSource, DataSourceQueryResult } from '../../types';
import type { SqlMode } from '../../types/dashboard';
import { datasourceApi } from '../../api/datasource';

interface ColumnMeta {
  name: string;
  dataType: string;
}

interface SqlQueryEditorProps {
  datasourceId?: string;
  sql?: string;
  sqlMode?: SqlMode;
  sqlTable?: string;
  sqlColumns?: string[];
  sqlWhere?: string;
  sqlOrderBy?: string;
  onChange: (values: {
    datasourceId?: string;
    sql?: string;
    sqlMode?: SqlMode;
    sqlTable?: string;
    sqlColumns?: string[];
    sqlWhere?: string;
    sqlOrderBy?: string;
  }) => void;
}

export default function SqlQueryEditor({
  datasourceId,
  sql,
  sqlMode,
  sqlTable,
  sqlColumns,
  sqlWhere,
  sqlOrderBy,
  onChange,
}: SqlQueryEditorProps) {
  const [dataSources, setDataSources] = useState<DataSource[]>([]);
  const [dsLoading, setDsLoading] = useState(false);
  const [tables, setTables] = useState<string[]>([]);
  const [tablesLoading, setTablesLoading] = useState(false);
  const [columns, setColumns] = useState<ColumnMeta[]>([]);
  const [columnsLoading, setColumnsLoading] = useState(false);
  /** 查询结果的实际输出列（含别名），执行预览后填充 */
  const [resultColumns, setResultColumns] = useState<ColumnMeta[]>([]);
  const [preview, setPreview] = useState<DataSourceQueryResult | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);

  // Load data sources list; if current ID not in list, fetch individually
  useEffect(() => {
    const load = async () => {
      setDsLoading(true);
      try {
        const list = await datasourceApi.list();
        setDataSources(list);
        if (datasourceId && !list.some((ds) => ds.id === datasourceId)) {
          try {
            const single = await datasourceApi.getById(datasourceId);
            setDataSources((prev) => [...prev, single]);
          } catch { /* ignore */ }
        }
      } catch {
        if (datasourceId) {
          try {
            const single = await datasourceApi.getById(datasourceId);
            setDataSources([single]);
          } catch { /* ignore */ }
        }
      } finally {
        setDsLoading(false);
      }
    };
    void load();
  }, [datasourceId]);

  const loadTables = useCallback(async (dsId: string) => {
    setTablesLoading(true);
    setTables([]);
    try {
      const t = await datasourceApi.listTables(dsId);
      setTables(t);
    } catch { /* ignore */ } finally {
      setTablesLoading(false);
    }
  }, []);

  const loadColumns = useCallback(async (dsId: string, tbl: string) => {
    setColumnsLoading(true);
    setColumns([]);
    try {
      const c = await datasourceApi.listColumns(dsId, tbl);
      setColumns(c);
    } catch { /* ignore */ } finally {
      setColumnsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (datasourceId) void loadTables(datasourceId);
  }, [datasourceId, loadTables]);

  useEffect(() => {
    if (datasourceId && sqlTable && sqlMode === 'builder') {
      void loadColumns(datasourceId, sqlTable);
    }
  }, [datasourceId, sqlTable, sqlMode, loadColumns]);

  const generatedSql = buildSql(sqlTable, sqlColumns, sqlWhere, sqlOrderBy);
  const effectiveMode: SqlMode = sqlMode ?? 'builder';

  const handleTabChange = (key: string) => {
    const mode = key as SqlMode;
    if (mode === 'code') {
      // Builder → Code: 生成 SQL 并切换
      const gen = buildSql(sqlTable, sqlColumns, sqlWhere, sqlOrderBy);
      onChange({
        datasourceId, sql: gen || sql, sqlMode: 'code',
        sqlTable, sqlColumns, sqlWhere, sqlOrderBy,
      });
    } else {
      // Code → Builder: Grafana 风格 — 不允许直接切换，提示会清空
      const hasBuilderContent = sqlTable || (sqlColumns && sqlColumns.length > 0) || sqlWhere || sqlOrderBy;
      Modal.confirm({
        title: '切换到 Builder',
        content: hasBuilderContent
          ? '切换后当前 Builder 配置将被覆盖，是否继续？'
          : '切换到 Builder 将清空当前 SQL 编辑内容，是否继续？',
        okText: '切换',
        cancelText: '取消',
        onOk: () => {
          setResultColumns([]);
          onChange({
            datasourceId, sql, sqlMode: 'builder',
            sqlTable: undefined, sqlColumns: undefined,
            sqlWhere: undefined, sqlOrderBy: undefined,
          });
        },
      });
    }
  };

  const handlePreview = async () => {
    if (!datasourceId) {
      message.warning('请先选择数据源');
      return;
    }
    const querySql = effectiveMode === 'code' ? sql : generatedSql;
    if (!querySql?.trim()) {
      message.warning('请输入 SQL 查询语句');
      return;
    }
    setPreviewLoading(true);
    try {
      const result = await datasourceApi.query(datasourceId, querySql);
      setPreview(result);
      setResultColumns(result.fields.map((f) => ({ name: f.name, dataType: f.type })));
    } catch (err) {
      message.error(err instanceof Error ? err.message : '查询失败');
      setPreview(null);
    } finally {
      setPreviewLoading(false);
    }
  };

  return (
    <div className="sql-query-editor">
      <Form.Item label="数据源" style={{ marginBottom: 12 }}>
        <Select
          value={datasourceId}
          loading={dsLoading}
          placeholder="选择已配置的数据源"
          showSearch
          allowClear
          optionFilterProp="label"
          onChange={(val) => {
            setResultColumns([]);
            onChange({ datasourceId: val, sql, sqlMode: effectiveMode, sqlTable: undefined, sqlColumns: undefined, sqlWhere, sqlOrderBy });
          }}
          options={(() => {
            const opts = dataSources.map((ds) => ({
              label: `${ds.name} (${ds.host}:${ds.port}/${ds.database})`,
              value: ds.id,
            }));
            if (datasourceId && !opts.some((o) => o.value === datasourceId)) {
              opts.unshift({ label: `数据源 (${datasourceId.slice(0, 8)}...)`, value: datasourceId });
            }
            return opts;
          })()}
        />
      </Form.Item>

      <Tabs
        activeKey={effectiveMode}
        onChange={handleTabChange}
        items={[
          {
            key: 'builder',
            label: 'Builder',
            children: (
              <div>
                <Form.Item label="表名" style={{ marginBottom: 8 }}>
                  <Select
                    value={sqlTable}
                    loading={tablesLoading}
                    placeholder="选择表"
                    allowClear
                    showSearch
                    optionFilterProp="label"
                    onChange={(val) => {
                      setResultColumns([]);
                      onChange({ datasourceId, sql, sqlMode: 'builder', sqlTable: val, sqlColumns: undefined, sqlWhere, sqlOrderBy });
                    }}
                    options={tables.map((t) => ({ label: t, value: t }))}
                    notFoundContent={tablesLoading ? '加载中...' : '无表'}
                  />
                </Form.Item>
                <Form.Item label="字段" style={{ marginBottom: 8 }}>
                  <Select
                    mode="multiple"
                    value={sqlColumns}
                    loading={columnsLoading}
                    placeholder="选择字段（留空 = SELECT *）"
                    allowClear
                    showSearch
                    optionFilterProp="label"
                    onChange={(vals) =>
                      onChange({ datasourceId, sql, sqlMode: 'builder', sqlTable, sqlColumns: vals, sqlWhere, sqlOrderBy })
                    }
                    options={(resultColumns.length > 0 ? resultColumns : columns).map((c) => ({
                      label: `${c.name}  (${c.dataType})`,
                      value: c.name,
                    }))}
                    notFoundContent={sqlTable ? (columnsLoading ? '加载中...' : '执行预览以获取输出列') : '请先选择表'}
                  />
                </Form.Item>
                <Form.Item label="WHERE" style={{ marginBottom: 8 }}>
                  <Input
                    value={sqlWhere}
                    placeholder="例如：status = 'active'"
                    onChange={(e) => onChange({ datasourceId, sql, sqlMode: 'builder', sqlTable, sqlColumns, sqlWhere: e.target.value, sqlOrderBy })}
                  />
                </Form.Item>
                <Form.Item label="ORDER BY" style={{ marginBottom: 8 }}>
                  <Input
                    value={sqlOrderBy}
                    placeholder="例如：created_at DESC"
                    onChange={(e) => onChange({ datasourceId, sql, sqlMode: 'builder', sqlTable, sqlColumns, sqlWhere, sqlOrderBy: e.target.value })}
                  />
                </Form.Item>
                {sqlTable && (
                  <div style={{ padding: '4px 0', fontSize: 13, color: '#888' }}>
                    生成的 SQL：<code>{generatedSql}</code>
                  </div>
                )}
              </div>
            ),
          },
          {
            key: 'code',
            label: 'SQL (Code)',
            children: (
              <Form.Item label="SQL 语句" style={{ marginBottom: 8 }}>
                <Input.TextArea
                  value={sql}
                  rows={6}
                  placeholder="SELECT * FROM table_name LIMIT 100"
                  onChange={(e) =>
                    onChange({ datasourceId, sql: e.target.value, sqlMode: 'code', sqlTable, sqlColumns, sqlWhere, sqlOrderBy })
                  }
                />
              </Form.Item>
            ),
          },
        ]}
      />

      <Space style={{ marginTop: 8 }}>
        <Button onClick={handlePreview} loading={previewLoading} size="small">
          执行查询预览
        </Button>
      </Space>

      {preview && (
        <div style={{ marginTop: 8, maxHeight: 200, overflow: 'auto', background: '#f5f5f5', padding: 8, borderRadius: 4, fontSize: 12 }}>
          <div style={{ fontWeight: 600, marginBottom: 4 }}>查询结果（{preview.rows.length} 行）</div>
          {preview.rows.length > 0 && (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  {preview.fields.map((f) => (
                    <th key={f.name} style={{ border: '1px solid #ddd', padding: '2px 6px', textAlign: 'left', background: '#e8e8e8' }}>
                      {f.label || f.name}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {preview.rows.map((row, i) => (
                  <tr key={i}>
                    {preview.fields.map((f) => (
                      <td key={f.name} style={{ border: '1px solid #ddd', padding: '2px 6px' }}>
                        {String(row[f.name] ?? '')}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}

function buildSql(table?: string, columns?: string[], where?: string, orderBy?: string): string {
  if (!table) return '';
  const cols = columns && columns.length > 0 ? columns.join(', ') : '*';
  let s = `SELECT ${cols} FROM "${table}"`;
  if (where?.trim()) s += ` WHERE ${where.trim()}`;
  if (orderBy?.trim()) s += ` ORDER BY ${orderBy.trim()}`;
  s += ' LIMIT 100';
  return s;
}
