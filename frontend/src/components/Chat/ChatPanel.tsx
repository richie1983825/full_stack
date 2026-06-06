import { useState, useRef, useEffect, useCallback } from 'react';
import { Input, Button, Spin, Space, message } from 'antd';
import { SendOutlined, ThunderboltOutlined, BarChartOutlined } from '@ant-design/icons';
import { useChatStore, EMPTY_CHAT_MESSAGES } from '../../stores/useChatStore';
import { datasourceApi } from '../../api/datasource';
import ChatContextBar from './ChatContextBar';
import MessageBubble from './MessageBubble';
import type { PanelConfig } from '../../types/dashboard';

interface ChatPanelProps {
  dashboardId: string;
  variables?: Record<string, string>;
  onEditPanel?: (panel: PanelConfig) => void;
}

export default function ChatPanel({ dashboardId, variables, onEditPanel }: ChatPanelProps) {
  const messages = useChatStore((s) => s.messagesByDashboard[dashboardId] ?? EMPTY_CHAT_MESSAGES);
  const isChatLoading = useChatStore((s) => s.isChatLoading);
  const sendMessage = useChatStore((s) => s.sendMessage);
  const datasourceId = useChatStore((s) => s.datasourceId);
  const referenceTables = useChatStore((s) => s.referenceTables);

  const [input, setInput] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isChatLoading]);

  /** 获取参考表的列 schema */
  const fetchTableSchemas = useCallback(async () => {
    if (!datasourceId || referenceTables.length === 0) return undefined;
    const schemas: Record<string, { name: string; dataType: string }[]> = {};
    for (const table of referenceTables) {
      try {
        const cols = await datasourceApi.listColumns(datasourceId, table);
        schemas[table] = cols.map((c) => ({ name: c.name, dataType: c.dataType }));
      } catch {
        // ignore
      }
    }
    return schemas;
  }, [datasourceId, referenceTables]);

  const handleSend = async (text?: string) => {
    const trimmed = (text ?? input).trim();
    if (!trimmed || isChatLoading) return;
    const schemas = await fetchTableSchemas();
    void sendMessage(
      { dashboardId, datasourceId: datasourceId ?? '', referenceTables, variables, tableSchemas: schemas },
      trimmed,
    );
    setInput('');
  };

  const handleQuickAnalyze = () => {
    if (!datasourceId || referenceTables.length === 0) {
      message.warning('请先选择数据源和参考表');
      return;
    }
    void handleSend('/analyze');
  };

  const handleQuickBuild = () => {
    if (!datasourceId || referenceTables.length === 0) {
      message.warning('请先选择数据源和参考表');
      return;
    }
    void handleSend('/build_chart');
  };

  return (
    <div className="chat-panel-body" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <ChatContextBar />

      <div style={{ flex: 1, overflow: 'auto', padding: '16px 12px' }}>
        {messages.length === 0 && (
          <div style={{ textAlign: 'center', color: '#bbb', padding: '24px 0', fontSize: 13 }}>
            <div style={{ fontSize: 28, marginBottom: 8 }}>💬</div>
            描述你想要的报表，或点击下方快捷操作
          </div>
        )}

        {messages.map((msg) => (
          <MessageBubble
            key={msg.id}
            message={msg}
            variables={variables}
            onEditPanel={onEditPanel}
          />
        ))}

        {isChatLoading && (
          <div style={{ textAlign: 'center', padding: 16 }}>
            <Spin size="small" />
            <span style={{ marginLeft: 8, color: '#999', fontSize: 13 }}>AI 正在思考...</span>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* 快捷操作 */}
      <div style={{ padding: '8px 12px 0', borderTop: '1px solid #f0f0f0' }}>
        <Space size={8}>
          <Button
            size="small"
            icon={<ThunderboltOutlined />}
            onClick={handleQuickAnalyze}
            disabled={!datasourceId || referenceTables.length === 0 || isChatLoading}
          >
            一键分析
          </Button>
          <Button
            size="small"
            icon={<BarChartOutlined />}
            onClick={handleQuickBuild}
            disabled={!datasourceId || referenceTables.length === 0 || isChatLoading}
          >
            一键建图
          </Button>
        </Space>
      </div>

      <div style={{ padding: '12px' }}>
        <Input.TextArea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onPressEnter={(e) => {
            if (!e.shiftKey) {
              e.preventDefault();
              handleSend();
            }
          }}
          placeholder="描述报表需求，Shift+Enter 换行"
          autoSize={{ minRows: 1, maxRows: 4 }}
          disabled={isChatLoading}
          style={{ marginBottom: 8 }}
        />
        <Button
          type="primary"
          icon={<SendOutlined />}
          onClick={() => handleSend()}
          loading={isChatLoading}
          disabled={!datasourceId}
          block
        >
          发送
        </Button>
      </div>
    </div>
  );
}
