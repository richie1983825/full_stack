import { Form, Input, InputNumber, Modal, Select, Switch } from 'antd';
import { useEffect, useState } from 'react';
import type { PanelChartType, PanelConfig, SqlMode } from '../../types/dashboard';
import { datasourceApi } from '../../api/datasource';
import SqlQueryEditor from './SqlQueryEditor';

interface PanelEditorModalProps {
  open: boolean;
  panel: PanelConfig | null;
  onCancel: () => void;
  onSave: (panel: PanelConfig) => void;
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
      destroyOnClose
    >
      <Form form={form} layout="vertical">
        <Form.Item name="title" label="标题" rules={[{ required: true, message: '请输入标题' }]}>
          <Input />
        </Form.Item>
        <Form.Item name="chartType" label="类型" rules={[{ required: true }]}>
          <Select
            options={chartTypeOptions}
            onChange={(val) => setChartType(val as PanelChartType)}
          />
        </Form.Item>
        {chartType === 'table' && (
          <Form.Item label="分页" style={{ marginBottom: 0 }}>
            <Form.Item name="paginationEnabled" valuePropName="checked" style={{ display: 'inline-block', marginRight: 16 }}>
              <Switch />
            </Form.Item>
            <Form.Item
              noStyle
              shouldUpdate={(prev, cur) => prev.paginationEnabled !== cur.paginationEnabled}
            >
              {({ getFieldValue }) =>
                getFieldValue('paginationEnabled') ? (
                  <Form.Item name="paginationPageSize" label="每页条数" style={{ display: 'inline-block' }}>
                    <InputNumber min={5} max={200} style={{ width: 100 }} />
                  </Form.Item>
                ) : null
              }
            </Form.Item>
          </Form.Item>
        )}
        <Form.Item label="布局 (x / y / w / h)" style={{ marginBottom: 0 }}>
          <Input.Group compact>
            <Form.Item name="x" noStyle>
              <InputNumber min={0} max={11} style={{ width: '25%' }} placeholder="x" />
            </Form.Item>
            <Form.Item name="y" noStyle>
              <InputNumber min={0} style={{ width: '25%' }} placeholder="y" />
            </Form.Item>
            <Form.Item name="w" noStyle>
              <InputNumber min={1} max={12} style={{ width: '25%' }} placeholder="w" />
            </Form.Item>
            <Form.Item name="h" noStyle>
              <InputNumber min={1} max={12} style={{ width: '25%' }} placeholder="h" />
            </Form.Item>
          </Input.Group>
        </Form.Item>

        <Form.Item label="数据源查询">
          <SqlQueryEditor
            datasourceId={sqlQuery.datasourceId}
            sql={sqlQuery.sql}
            sqlMode={sqlQuery.sqlMode}
            sqlTable={sqlQuery.sqlTable}
            sqlColumns={sqlQuery.sqlColumns}
            sqlWhere={sqlQuery.sqlWhere}
            sqlOrderBy={sqlQuery.sqlOrderBy}
            onChange={(values) => setSqlQuery((prev) => ({ ...prev, ...values }))}
          />
        </Form.Item>
      </Form>
    </Modal>
  );
}
