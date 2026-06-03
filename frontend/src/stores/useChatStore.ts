import { create } from 'zustand';
import type { ChatMessage } from '../types';

interface ChatStore {
  chatOpen: boolean;
  messages: ChatMessage[];
  isChatLoading: boolean;
  openChat: () => void;
  closeChat: () => void;
  sendMessage: (content: string) => Promise<void>;
}

export const useChatStore = create<ChatStore>((set, get) => ({
  chatOpen: false,
  messages: [],
  isChatLoading: false,

  openChat: () => set({ chatOpen: true }),
  closeChat: () => set({ chatOpen: false }),

  sendMessage: async (content) => {
    const userMessage: ChatMessage = {
      id: `msg-${Date.now()}`,
      role: 'user',
      content,
      timestamp: new Date().toISOString(),
    };
    set({ messages: [...get().messages, userMessage], isChatLoading: true });
    try {
      const assistantMessage: ChatMessage = {
        id: `msg-${Date.now()}-ai`,
        role: 'assistant',
        content: 'AI 对话功能暂未接入，请使用仪表盘编辑器的「添加组件」创建折线图、柱状图或表格。',
        timestamp: new Date().toISOString(),
      };
      set({ messages: [...get().messages, assistantMessage], isChatLoading: false });
    } catch {
      set({ isChatLoading: false });
    }
  },
}));
