import { Button } from 'antd';
import { CloseOutlined, MessageOutlined } from '@ant-design/icons';
import { useChatStore } from '../../stores/useChatStore';
import ChatPanel from './ChatPanel';

const HEADER_HEIGHT = 56;

export default function ChatSidebar() {
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
            className="chat-sidebar-panel"
            role="dialog"
            aria-label="AI 报表助手"
            style={{ top: HEADER_HEIGHT }}
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
