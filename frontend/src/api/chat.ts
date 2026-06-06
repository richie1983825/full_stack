import { apiClient } from './client';
import type { PanelConfig, PanelQuery } from '../types/dashboard';

export interface ChatHistoryItem {
  role: 'user' | 'assistant';
  content: string;
}

export interface SendDashboardChatPayload {
  message: string;
  datasourceId: string;
  referenceTables?: string[];
  /** 参考表的列 schema */
  tableSchemas?: Record<string, { name: string; dataType: string }[]>;
  history?: ChatHistoryItem[];
}

export interface SuggestedPanelPayload {
  title: string;
  chartType: 'line' | 'bar' | 'table';
  query: PanelQuery;
  grid?: PanelConfig['grid'];
}

export interface ChatReply {
  id: string;
  role: 'assistant';
  content: string;
  suggestedPanel?: SuggestedPanelPayload;
  timestamp: string;
}

/** AI 对话相关 API */
export const chatApi = {
  send: (dashboardId: string, payload: SendDashboardChatPayload) =>
    apiClient.post<ChatReply>(`/dashboards/${dashboardId}/chat`, payload),
};
