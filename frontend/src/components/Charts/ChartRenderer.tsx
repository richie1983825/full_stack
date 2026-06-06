import ReactECharts from 'echarts-for-react';
import type { ColumnsType } from 'antd/es/table';
import type { MetricFieldMeta } from '../../constants/metricFieldMeta';
import type { PanelConfig } from '../../types/dashboard';
import { Table, Tag } from 'antd';
import {
  computeMergeRowSpan,
  formatMetricChange,
  sortTableRows,
  type TableRow,
} from '../../utils/tableData';
import { normalizeChartOption } from '../../utils/chartLayout';
import { resolveTableFields } from '../../constants/metricFieldMeta';

interface ChartRendererProps {
  config: PanelConfig;
}

function changeTagColor(value: unknown): 'red' | 'green' | 'default' {
  const parsed = Number.parseFloat(String(value ?? ''));
  if (!Number.isFinite(parsed)) return 'default';
  if (parsed > 0) return 'red';
  if (parsed < 0) return 'green';
  return 'default';
}

function buildColumns(
  fields: MetricFieldMeta[],
  data: TableRow[],
): ColumnsType<TableRow> {
  const mergeSpans = new Map<string, number[]>();
  for (const field of fields) {
    if (field.mergeSame) {
      mergeSpans.set(field.name, computeMergeRowSpan(data, field));
    }
  }

  return fields.map((field) => {
    const base = {
      title: field.label,
      dataIndex: field.name,
      key: field.name,
    };

    if (field.mergeSame) {
      const spans = mergeSpans.get(field.name) ?? [];
      return {
        ...base,
        width: 120,
        onCell: (_: TableRow, index?: number) => ({
          rowSpan: spans[index ?? 0] ?? 1,
          style: { verticalAlign: 'middle' },
        }),
      };
    }

    if (field.name === 'metric_name' || field.name === 'metrics') {
      return { ...base, ellipsis: true };
    }

    if (field.format === 'change') {
      return {
        ...base,
        width: 90,
        render: (value: unknown) => (
          <Tag color={changeTagColor(value)}>{formatMetricChange(value)}</Tag>
        ),
      };
    }

    return base;
  });
}

export default function ChartRenderer({ config }: ChartRendererProps) {
  if (config.chartType === 'table') {
    const tableOption = config.option as {
      fields?: MetricFieldMeta[];
      data?: TableRow[];
      orderBy?: string[];
    };
    const rawData = tableOption.data ?? [];
    const fields = resolveTableFields(tableOption.fields, rawData);
    if (!rawData.length) return <div style={{ padding: 24, color: '#999' }}>暂无数据</div>;

    const data = sortTableRows(rawData, tableOption.orderBy);
    const columns = buildColumns(fields, data);

    const pagination =
      config.pagination?.enabled
        ? { pageSize: config.pagination.pageSize, showSizeChanger: false }
        : false;

    return (
      <Table
        className="panel-table"
        dataSource={data}
        columns={columns}
        rowKey={(record) => JSON.stringify(record)}
        size="small"
        pagination={pagination}
        scroll={{ x: 'max-content' }}
      />
    );
  }

  const userOption = config.option as Record<string, unknown>;
  const option = normalizeChartOption(userOption);

  return (
    <ReactECharts
      option={option}
      style={{ height: '100%', width: '100%' }}
      opts={{ renderer: 'canvas' }}
      notMerge
    />
  );
}
