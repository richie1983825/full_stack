import { useCallback, useEffect, useState } from 'react';
import { Table, Typography } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { datasourceApi } from '../../api/datasource';
import TableExpandArrow from '../TableExpandArrow';
import type { ColumnMeta, TableMeta } from '../../types';

const { Text } = Typography;

interface DatasourceSchemaPanelProps {
  datasourceId: string;
}

export default function DatasourceSchemaPanel({ datasourceId }: DatasourceSchemaPanelProps) {
  const [tables, setTables] = useState<TableMeta[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [columnCache, setColumnCache] = useState<Record<string, ColumnMeta[]>>({});
  const [loadingColumns, setLoadingColumns] = useState<Record<string, boolean>>({});

  useEffect(() => {
    setLoading(true);
    setError(null);
    void datasourceApi
      .listTables(datasourceId)
      .then(setTables)
      .catch((err) => {
        setTables([]);
        setError(err instanceof Error ? err.message : '加载表列表失败');
      })
      .finally(() => setLoading(false));
  }, [datasourceId]);

  const loadColumns = useCallback(async (tableName: string) => {
    setLoadingColumns((prev) => ({ ...prev, [tableName]: true }));
    try {
      const cols = await datasourceApi.listColumns(datasourceId, tableName);
      setColumnCache((prev) => ({ ...prev, [tableName]: cols }));
    } catch {
      setColumnCache((prev) => ({ ...prev, [tableName]: [] }));
    } finally {
      setLoadingColumns((prev) => ({ ...prev, [tableName]: false }));
    }
  }, [datasourceId]);

  const tableColumns: ColumnsType<TableMeta> = [
    {
      title: '表名',
      dataIndex: 'name',
      width: 200,
      render: (name: string) => <Text code>{name}</Text>,
    },
    {
      title: '中文说明',
      dataIndex: 'comment',
      render: (comment?: string) => comment?.trim() || <Text type="secondary">—</Text>,
    },
  ];

  const columnColumns: ColumnsType<ColumnMeta> = [
    {
      title: '字段名',
      dataIndex: 'name',
      width: 180,
      render: (name: string) => <Text code>{name}</Text>,
    },
    {
      title: '类型',
      dataIndex: 'dataType',
      width: 140,
    },
    {
      title: '中文说明',
      dataIndex: 'comment',
      render: (comment?: string) => comment?.trim() || <Text type="secondary">—</Text>,
    },
  ];

  if (error) {
    return <Text type="danger">{error}</Text>;
  }

  return (
    <div className="datasource-schema-panel">
      <Text type="secondary" style={{ display: 'block', marginBottom: 8, fontSize: 12 }}>
        中文说明来自 PostgreSQL 表/字段注释（COMMENT ON TABLE / COMMENT ON COLUMN）
      </Text>
      <Table<TableMeta>
        size="small"
        loading={loading}
        dataSource={tables}
        rowKey="name"
        columns={tableColumns}
        pagination={{ pageSize: 10, hideOnSinglePage: true, size: 'small' }}
        expandable={{
          expandIcon: (props) => <TableExpandArrow {...props} />,
          onExpand: (expanded, record) => {
            if (expanded && !columnCache[record.name] && !loadingColumns[record.name]) {
              void loadColumns(record.name);
            }
          },
          expandedRowRender: (record) => (
            <Table<ColumnMeta>
              size="small"
              loading={loadingColumns[record.name]}
              dataSource={columnCache[record.name] ?? []}
              rowKey="name"
              columns={columnColumns}
              pagination={false}
              locale={{ emptyText: loadingColumns[record.name] ? '加载中…' : '暂无字段' }}
            />
          ),
          rowExpandable: () => true,
        }}
      />
    </div>
  );
}
