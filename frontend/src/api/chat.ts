import { apiClient } from './client';
import { endpoints } from './endpoints';
import type { PanelConfig } from '../types';

export interface ChatReply {
  id: string;
  role: 'assistant';
  content: string;
  suggestedChart?: PanelConfig;
  timestamp: string;
}

export interface SendChatPayload {
  message: string;
}

/** AI 对话相关 API */
export const chatApi = {
  send: (payload: SendChatPayload) => apiClient.post<ChatReply>(endpoints.chat, payload),
};
