import { useEffect, useState } from 'react';
import { Select, Space, Typography } from 'antd';
import { datasourceApi } from '../../api/datasource';
import type { DataSource, TableMeta } from '../../types';
import { useChatStore } from '../../stores/useChatStore';
import { tableDisplayLabel } from '../../utils/schemaLabel';

const { Text } = Typography;

export default function ChatContextBar() {
  const datasourceId = useChatStore((s) => s.datasourceId);
  const referenceTables = useChatStore((s) => s.referenceTables);
  const setDatasourceId = useChatStore((s) => s.setDatasourceId);
  const setReferenceTables = useChatStore((s) => s.setReferenceTables);
  const initDatasourceSelection = useChatStore((s) => s.initDatasourceSelection);

  const [dataSources, setDataSources] = useState<DataSource[]>([]);
  const [tables, setTables] = useState<TableMeta[]>([]);
  const [loadingDs, setLoadingDs] = useState(false);
  const [loadingTables, setLoadingTables] = useState(false);

  useEffect(() => {
    setLoadingDs(true);
    void datasourceApi
      .list()
      .then((list) => {
        setDataSources(list);
        initDatasourceSelection(list.map((d) => d.id));
      })
      .catch(() => setDataSources([]))
      .finally(() => setLoadingDs(false));
    // initDatasourceSelection 来自 zustand，引用稳定
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!datasourceId) {
      setTables([]);
      return;
    }
    setLoadingTables(true);
    void datasourceApi
      .listTables(datasourceId)
      .then(setTables)
      .catch(() => setTables([]))
      .finally(() => setLoadingTables(false));
  }, [datasourceId]);

  return (
    <div className="chat-context-bar">
      <Space orientation="vertical" size={8} style={{ width: '100%' }}>
        <div>
          <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 4 }}>
            数据源
          </Text>
          <Select
            style={{ width: '100%' }}
            placeholder="选择数据源"
            loading={loadingDs}
            value={datasourceId ?? undefined}
            onChange={(v) => {
              setDatasourceId(v);
              setReferenceTables([]);
            }}
            options={dataSources.map((d) => ({
              label: `${d.name} (${d.database})`,
              value: d.id,
            }))}
          />
        </div>
        <div>
          <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 4 }}>
            选择表（多选）
          </Text>
          <Select
            mode="multiple"
            allowClear
            style={{ width: '100%' }}
            placeholder="选择参考表"
            loading={loadingTables}
            disabled={!datasourceId}
            value={referenceTables}
            onChange={setReferenceTables}
            options={tables.map((t) => ({
              label: tableDisplayLabel(t),
              value: t.name,
            }))}
            maxTagCount="responsive"
          />
        </div>
      </Space>
    </div>
  );
}
