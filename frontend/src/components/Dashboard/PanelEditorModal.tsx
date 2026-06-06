import { Divider, Form, Input, InputNumber, Modal, Select, Switch } from 'antd';
import { useEffect, useState } from 'react';
import type { PanelChartType, PanelConfig, SqlMode } from '../../types/dashboard';
import { datasourceApi } from '../../api/datasource';
import SqlQueryEditor from './SqlQueryEditor';

interface PanelEditorModalProps {
  open: boolean;
  panel: PanelConfig | null;
  onCancel: () => void;
  onSave: (panel: PanelConfig) => void;
  variables?: Record<string, string>;
}

const chartTypeOptions = [
  { label: '折线图', value: 'line' },
  { label: '柱状图', value: 'bar' },
  { label: '表格', value: 'table' },
];

interface SqlQueryState {
  datasourceId?: string;
  sql?: string;
  sqlMode?: SqlMode;
  sqlTable?: string;
  sqlColumns?: string[];
  sqlWhere?: string;
  sqlOrderBy?: string;
}

export default function PanelEditorModal({
  open,
  panel,
  onCancel,
  onSave,
  variables,
}: PanelEditorModalProps) {
  const [form] = Form.useForm();
  const [sqlQuery, setSqlQuery] = useState<SqlQueryState>({});
  const [chartType, setChartType] = useState<PanelChartType>('line');

  useEffect(() => {
    if (!panel || !open) return;

    const q = panel.query;
    setChartType(panel.chartType);
    form.setFieldsValue({
      title: panel.title,
      chartType: panel.chartType,
      x: panel.grid.x,
      y: panel.grid.y,
      w: panel.grid.w,
      h: panel.grid.h,
      paginationEnabled: panel.pagination?.enabled ?? false,
      paginationPageSize: panel.pagination?.pageSize ?? 10,
    });

    const state: SqlQueryState = {
      datasourceId: q?.datasourceId,
      sql: q?.sql,
      sqlMode: q?.sqlMode,
      sqlTable: q?.sqlTable,
      sqlColumns: q?.sqlColumns,
      sqlWhere: q?.sqlWhere,
      sqlOrderBy: q?.sqlOrderBy,
    };

    setSqlQuery(state);

    // 如果面板没有 datasourceId，自动选择第一个可用数据源
    if (!state.datasourceId) {
      datasourceApi.list()
        .then((list) => {
          if (list.length > 0) {
            setSqlQuery((prev) => ({ ...prev, datasourceId: list[0].id }));
          }
        })
        .catch(() => {});
    }
  }, [panel, open, form]);

  const handleOk = async () => {
    if (!panel) return;
    const values = await form.validateFields();

    onSave({
      ...panel,
      title: values.title,
      chartType: values.chartType as PanelChartType,
      grid: { x: values.x, y: values.y, w: values.w, h: values.h },
      query: {
        datasourceId: sqlQuery.datasourceId,
        sql: sqlQuery.sql,
        sqlMode: sqlQuery.sqlMode,
        sqlTable: sqlQuery.sqlTable,
        sqlColumns: sqlQuery.sqlColumns,
        sqlWhere: sqlQuery.sqlWhere,
        sqlOrderBy: sqlQuery.sqlOrderBy,
      },
      pagination: {
        enabled: values.paginationEnabled ?? false,
        pageSize: values.paginationPageSize ?? 10,
      },
    });
  };

  return (
    <Modal
      title="编辑组件"
      open={open}
      onCancel={onCancel}
      onOk={() => void handleOk()}
      okText="保存"
      cancelText="取消"
      width={640}
      destroyOnHidden
    >
      <Form form={form} layout="vertical">
        {/* ===== 基本信息 ===== */}
        <Form.Item name="title" label="标题" rules={[{ required: true, message: '请输入标题' }]}>
          <Input />
        </Form.Item>
        <Form.Item name="chartType" label="类型" rules={[{ required: true }]}>
          <Select
            options={chartTypeOptions}
            onChange={(val) => setChartType(val as PanelChartType)}
          />
        </Form.Item>

        {/* ===== 显示 ===== */}
        <Divider style={{ fontSize: 13, margin: '12px 0 8px' }}>显示</Divider>
        <Form.Item label="位置与大小" style={{ marginBottom: 8 }}>
          <Input.Group compact>
            <span style={{ display: 'inline-block', padding: '4px 6px', border: '1px solid #d9d9d9', borderRadius: '6px 0 0 6px', background: '#fafafa', fontSize: 13 }}>列</span>
            <Form.Item name="x" noStyle>
              <InputNumber min={0} max={11} style={{ width: 50, borderLeft: 0, borderRadius: 0 }} />
            </Form.Item>
            <span style={{ display: 'inline-block', padding: '4px 6px', border: '1px solid #d9d9d9', background: '#fafafa', fontSize: 13, marginLeft: -1 }}>行</span>
            <Form.Item name="y" noStyle>
              <InputNumber min={0} style={{ width: 50, borderLeft: 0, borderRadius: 0 }} />
            </Form.Item>
            <span style={{ display: 'inline-block', padding: '4px 6px', border: '1px solid #d9d9d9', background: '#fafafa', fontSize: 13, marginLeft: -1 }}>宽</span>
            <Form.Item name="w" noStyle>
              <InputNumber min={1} max={12} style={{ width: 50, borderLeft: 0, borderRadius: 0 }} />
            </Form.Item>
            <span style={{ display: 'inline-block', padding: '4px 6px', border: '1px solid #d9d9d9', background: '#fafafa', fontSize: 13, marginLeft: -1 }}>高</span>
            <Form.Item name="h" noStyle>
              <InputNumber min={1} style={{ width: 50, borderLeft: 0, borderRadius: '0 6px 6px 0' }} />
            </Form.Item>
          </Input.Group>
        </Form.Item>
        {chartType === 'table' && (
          <Form.Item label="分页" style={{ marginBottom: 8 }}>
            <Form.Item name="paginationEnabled" valuePropName="checked" style={{ display: 'inline-block', marginBottom: 0, marginRight: 24 }}>
              <Switch />
            </Form.Item>
            <Form.Item
              noStyle
              shouldUpdate={(prev, cur) => prev.paginationEnabled !== cur.paginationEnabled}
            >
              {({ getFieldValue }) =>
                getFieldValue('paginationEnabled') ? (
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                    <span>每页</span>
                    <Form.Item name="paginationPageSize" noStyle>
                      <Select style={{ width: 90 }} options={[20, 50, 100, 1000].map((n) => ({ label: `${n} 条`, value: n }))} />
                    </Form.Item>
                  </span>
                ) : null
              }
            </Form.Item>
          </Form.Item>
        )}

        {/* ===== 查询 ===== */}
        <Divider style={{ fontSize: 13, margin: '12px 0 8px' }}>查询</Divider>
        <SqlQueryEditor
          datasourceId={sqlQuery.datasourceId}
          sql={sqlQuery.sql}
          sqlMode={sqlQuery.sqlMode}
          sqlTable={sqlQuery.sqlTable}
          sqlColumns={sqlQuery.sqlColumns}
          sqlWhere={sqlQuery.sqlWhere}
          sqlOrderBy={sqlQuery.sqlOrderBy}
          variables={variables}
          onChange={(values) => setSqlQuery((prev) => ({ ...prev, ...values }))}
        />
      </Form>
    </Modal>
  );
}
