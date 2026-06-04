import { Button } from 'antd';
import { CloseOutlined, MessageOutlined } from '@ant-design/icons';
import { useChatStore } from '../../stores/useChatStore';
import ChatPanel from './ChatPanel';

interface ChatSidebarProps {
  /** 展开后以浮动对话框形式展示，而非贴边全高侧栏 */
  floating?: boolean;
}

export default function ChatSidebar({ floating = false }: ChatSidebarProps) {
  const { chatOpen, openChat, closeChat } = useChatStore();

  return (
    <>
      {!chatOpen && (
        <button
          type="button"
          className="chat-sidebar-rail"
          aria-label="展开 AI 对话"
          onClick={openChat}
        >
          <MessageOutlined className="chat-sidebar-rail-icon" />
          <span className="chat-sidebar-rail-label">AI 对话</span>
        </button>
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
              >
                关闭
              </Button>
            </div>
            <ChatPanel />
          </aside>
        </>
      )}
    </>
  );
}
