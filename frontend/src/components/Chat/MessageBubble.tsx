import { useState } from 'react';
import { Button, Space } from 'antd';
import { EditOutlined, PlusOutlined } from '@ant-design/icons';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import type { ChatMessage } from '../../stores/useChatStore';
import type { PanelConfig } from '../../types/dashboard';
import { useDashboardStore } from '../../stores/useDashboardStore';
import { hydratePanelOptionStrict } from '../../utils/panelData';
import { nextPanelGrid } from '../../utils/panelTemplates';
import { colorPrimary } from '../../theme/colors';
import { formatAiChatError } from '../../utils/aiChatError';

interface MessageBubbleProps {
  message: ChatMessage;
  variables?: Record<string, string>;
  onEditPanel?: (panel: PanelConfig) => void;
}

function toPanelConfig(suggested: PanelConfig, grid: PanelConfig['grid']): PanelConfig {
  return {
    ...suggested,
    id: `panel-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    grid,
  };
}

export default function MessageBubble({ message, variables, onEditPanel }: MessageBubbleProps) {
  const addPanel = useDashboardStore((s) => s.addPanel);
  const updatePanel = useDashboardStore((s) => s.updatePanel);
  const isUser = message.role === 'user';
  const [adding, setAdding] = useState(false);
  const [added, setAdded] = useState(false);
  const [hydrateError, setHydrateError] = useState<string | null>(null);
  const [lastAddedPanel, setLastAddedPanel] = useState<PanelConfig | null>(null);

  const handleAddChart = async () => {
    if (!message.suggestedPanel || added) return;
    const current = useDashboardStore.getState().currentDashboard;
    if (!current) return;

    setAdding(true);
    setHydrateError(null);
    console.log('[AI panel] suggested:', JSON.stringify(message.suggestedPanel.query, null, 2));
    const panel = toPanelConfig(message.suggestedPanel, nextPanelGrid(current.panels));
    addPanel(panel);
    setLastAddedPanel(panel);

    try {
      const hydrated = await hydratePanelOptionStrict(panel, variables);
      updatePanel(hydrated);
      setLastAddedPanel(hydrated);
      setAdded(true);
      // 滚动到新增组件
      setTimeout(() => {
        const el = document.querySelector(`[data-panel-id="${hydrated.id}"]`);
        el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 200);
    } catch (err) {
      setHydrateError(formatAiChatError(err));
    } finally {
      setAdding(false);
    }
  };

  const handleEdit = () => {
    const panel = lastAddedPanel ?? message.suggestedPanel;
    if (panel && onEditPanel) {
      onEditPanel(toPanelConfig(panel, panel.grid));
    }
  };

  const bubbleBg = isUser ? colorPrimary : message.isError ? '#fff2f0' : '#f0f0f0';
  const bubbleColor = isUser ? '#fff' : message.isError ? '#cf1322' : '#333';

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
          background: bubbleBg,
          color: bubbleColor,
          fontSize: 14,
          lineHeight: 1.6,
          border: message.isError ? '1px solid #ffccc7' : undefined,
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

      {message.suggestedPanel && !isUser && !message.isError && (
        <Space orientation="vertical" size={4} style={{ marginTop: 8, alignItems: 'flex-start' }}>
          <Button
            type={added ? 'default' : 'primary'}
            size="small"
            icon={added ? undefined : <PlusOutlined />}
            onClick={() => void handleAddChart()}
            loading={adding}
            disabled={added}
          >
            {added ? '已添加仪表盘' : '添加到仪表盘'}
          </Button>
          {hydrateError && (
            <>
              <span style={{ fontSize: 12, color: '#cf1322' }}>{hydrateError}</span>
              <Button size="small" icon={<EditOutlined />} onClick={handleEdit}>
                编辑 SQL
              </Button>
            </>
          )}
        </Space>
      )}

      <span style={{ fontSize: 11, color: '#bbb', marginTop: 4 }}>
        {new Date(message.timestamp).toLocaleTimeString('zh-CN')}
      </span>
    </div>
  );
}
