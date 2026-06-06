import { create } from 'zustand';
import { chatApi, type SuggestedPanelPayload } from '../api/chat';
import type { PanelConfig } from '../types/dashboard';
import { formatAiChatError } from '../utils/aiChatError';
import { getLastDatasourceId, setLastDatasourceId } from '../utils/chatContextStorage';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  suggestedPanel?: PanelConfig;
  /** assistant 消息是否为错误提示 */
  isError?: boolean;
  timestamp: string;
}

/** 稳定空数组，避免 selector 每次返回新引用导致无限渲染 */
export const EMPTY_CHAT_MESSAGES: ChatMessage[] = [];

interface SendMessageContext {
  dashboardId: string;
  datasourceId: string;
  referenceTables: string[];
  variables?: Record<string, string>;
  /** 参考表的列 schema */
  tableSchemas?: Record<string, { name: string; dataType: string }[]>;
}

interface ChatStore {
  chatOpen: boolean;
  messagesByDashboard: Record<string, ChatMessage[]>;
  isChatLoading: boolean;
  datasourceId: string | null;
  referenceTables: string[];

  openChat: () => void;
  closeChat: () => void;
  setDatasourceId: (id: string | null) => void;
  setReferenceTables: (tables: string[]) => void;
  sendMessage: (context: SendMessageContext, content: string) => Promise<void>;
  clearDashboardMessages: (dashboardId: string) => void;
  initDatasourceSelection: (availableIds: string[]) => void;
}

function toSuggestedPanel(raw: SuggestedPanelPayload): PanelConfig {
  return {
    id: `panel-ai-${Date.now()}`,
    title: raw.title,
    chartType: raw.chartType,
    grid: raw.grid ?? { x: 0, y: 0, w: 6, h: 3 },
    query: raw.query,
    option: {},
  };
}

export const useChatStore = create<ChatStore>((set, get) => ({
  chatOpen: false,
  messagesByDashboard: {},
  isChatLoading: false,
  datasourceId: null,
  referenceTables: [],

  openChat: () => set({ chatOpen: true }),
  closeChat: () => set({ chatOpen: false }),

  setDatasourceId: (id) => {
    if (id) setLastDatasourceId(id);
    set({ datasourceId: id });
  },

  setReferenceTables: (tables) => set({ referenceTables: tables }),

  clearDashboardMessages: (dashboardId) => {
    const { messagesByDashboard } = get();
    if (!messagesByDashboard[dashboardId]) return;
    const next = { ...messagesByDashboard };
    delete next[dashboardId];
    set({ messagesByDashboard: next });
  },

  initDatasourceSelection: (availableIds) => {
    if (availableIds.length === 0) {
      set({ datasourceId: null });
      return;
    }
    const { datasourceId } = get();
    if (datasourceId && availableIds.includes(datasourceId)) return;
    const last = getLastDatasourceId();
    if (last && availableIds.includes(last)) {
      set({ datasourceId: last });
      return;
    }
    if (availableIds.length === 1) {
      setLastDatasourceId(availableIds[0]);
      set({ datasourceId: availableIds[0] });
    }
  },

  sendMessage: async (context, content) => {
    const { dashboardId, datasourceId, referenceTables } = context;
    if (!datasourceId) {
      const errMsg: ChatMessage = {
        id: `msg-${Date.now()}-err`,
        role: 'assistant',
        content: '请先选择数据源后再发送消息',
        isError: true,
        timestamp: new Date().toISOString(),
      };
      const prev = get().messagesByDashboard[dashboardId] ?? EMPTY_CHAT_MESSAGES;
      set({
        messagesByDashboard: { ...get().messagesByDashboard, [dashboardId]: [...prev, errMsg] },
      });
      return;
    }

    const userMessage: ChatMessage = {
      id: `msg-${Date.now()}`,
      role: 'user',
      content,
      timestamp: new Date().toISOString(),
    };
    const prev = get().messagesByDashboard[dashboardId] ?? EMPTY_CHAT_MESSAGES;
    const withUser = [...prev, userMessage];
    set({
      messagesByDashboard: { ...get().messagesByDashboard, [dashboardId]: withUser },
      isChatLoading: true,
    });

    try {
      const history = prev
        .filter((m) => !m.isError && (m.role === 'user' || m.role === 'assistant'))
        .slice(-10)
        .map(({ role, content: text }) => ({ role, content: text }));

      const reply = await chatApi.send(dashboardId, {
        message: content,
        datasourceId,
        referenceTables,
        tableSchemas: context.tableSchemas,
        history,
      });

      const assistantMessage: ChatMessage = {
        id: reply.id,
        role: 'assistant',
        content: reply.content,
        suggestedPanel: reply.suggestedPanel ? toSuggestedPanel(reply.suggestedPanel) : undefined,
        timestamp: reply.timestamp,
      };
      set({
        messagesByDashboard: {
          ...get().messagesByDashboard,
          [dashboardId]: [...withUser, assistantMessage],
        },
        isChatLoading: false,
      });
    } catch (error) {
      const assistantMessage: ChatMessage = {
        id: `msg-${Date.now()}-err`,
        role: 'assistant',
        content: formatAiChatError(error),
        isError: true,
        timestamp: new Date().toISOString(),
      };
      set({
        messagesByDashboard: {
          ...get().messagesByDashboard,
          [dashboardId]: [...withUser, assistantMessage],
        },
        isChatLoading: false,
      });
    }
  },
}));
