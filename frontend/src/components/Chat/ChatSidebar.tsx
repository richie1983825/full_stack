import { Button } from 'antd';
import { CloseOutlined, MessageOutlined } from '@ant-design/icons';
import { useChatStore } from '../../stores/useChatStore';
import ChatPanel from './ChatPanel';

interface ChatSidebarProps {
  /** 编辑模式：折叠条嵌入布局，展开后全高浮层覆盖右侧 */
  floating?: boolean;
  dashboardId: string;
  variables?: Record<string, string>;
  onEditPanel?: (panel: import('../../types/dashboard').PanelConfig) => void;
}

export default function ChatSidebar({ floating = false, dashboardId, variables, onEditPanel }: ChatSidebarProps) {
  const { chatOpen, openChat, closeChat } = useChatStore();

  const rail = (
    <button
      type="button"
      className={`chat-sidebar-rail${floating ? ' chat-sidebar-rail--inline' : ''}`}
      aria-label="展开 AI 助手"
      onClick={openChat}
    >
      <MessageOutlined className="chat-sidebar-rail-icon" />
      <span className="chat-sidebar-rail-label">用 AI 搭建报表</span>
    </button>
  );

  return (
    <>
      {floating ? (
        <div className="chat-sidebar-slot">{!chatOpen && rail}</div>
      ) : (
        !chatOpen && rail
      )}

      {chatOpen && (
        <>
          <div
            className="chat-sidebar-backdrop"
            aria-hidden
            onClick={closeChat}
          />
          <aside
            className={`chat-sidebar-panel${floating ? ' chat-sidebar-panel--float' : ''}`}
            role="dialog"
            aria-label="AI 报表助手"
          >
            <div className="chat-sidebar-header">
              <span className="chat-sidebar-title">AI 报表助手</span>
              <Button
                type="text"
                className="chat-sidebar-close"
                icon={<CloseOutlined />}
                aria-label="关闭"
                onClick={closeChat}
              />
            </div>
            <ChatPanel dashboardId={dashboardId} variables={variables} onEditPanel={onEditPanel} />
          </aside>
        </>
      )}
    </>
  );
}
