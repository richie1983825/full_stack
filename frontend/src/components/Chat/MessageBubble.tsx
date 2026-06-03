import { Button, Space } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import type { ChatMessage } from '../../types';
import type { PanelChartType, PanelConfig } from '../../types/dashboard';
import { useDashboardStore } from '../../stores/useDashboardStore';
import { nextPanelGrid } from '../../utils/panelTemplates';
import { colorPrimary } from '../../theme/colors';

function toPanelConfig(suggested: {
  id: string;
  title: string;
  chartType: string;
  option: Record<string, unknown>;
  grid: PanelConfig['grid'];
}): PanelConfig | null {
  const allowed: PanelChartType[] = ['line', 'bar', 'table'];
  if (!allowed.includes(suggested.chartType as PanelChartType)) return null;
  return {
    id: `panel-${Date.now()}`,
    title: suggested.title,
    chartType: suggested.chartType as PanelChartType,
    option: suggested.option,
    grid: suggested.grid,
    query: {},
  };
}

interface MessageBubbleProps {
  message: ChatMessage;
}

export default function MessageBubble({ message }: MessageBubbleProps) {
  const addPanel = useDashboardStore((s) => s.addPanel);
  const isUser = message.role === 'user';

  const handleAddChart = () => {
    if (!message.suggestedChart) return;
    const current = useDashboardStore.getState().currentDashboard;
    if (!current) return;
    const panel = toPanelConfig(message.suggestedChart);
    if (!panel) return;
    addPanel({ ...panel, grid: nextPanelGrid(current.panels) });
  };

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: isUser ? 'flex-end' : 'flex-start',
        marginBottom: 16,
      }}
    >
      <div
        style={{
          maxWidth: '90%',
          padding: '10px 14px',
          borderRadius: 12,
          background: isUser ? colorPrimary : '#f0f0f0',
          color: isUser ? '#fff' : '#333',
          fontSize: 14,
          lineHeight: 1.6,
        }}
      >
        {isUser ? (
          message.content
        ) : (
          <ReactMarkdown remarkPlugins={[remarkGfm]}>
            {message.content}
          </ReactMarkdown>
        )}
      </div>

      {/* AI 生成图表时显示添加按钮 */}
      {message.suggestedChart && !isUser && (
        <Space style={{ marginTop: 8 }}>
          <Button
            type="primary"
            size="small"
            icon={<PlusOutlined />}
            onClick={handleAddChart}
          >
            添加到仪表盘
          </Button>
        </Space>
      )}

      <span style={{ fontSize: 11, color: '#bbb', marginTop: 4 }}>
        {new Date(message.timestamp).toLocaleTimeString('zh-CN')}
      </span>
    </div>
  );
}
