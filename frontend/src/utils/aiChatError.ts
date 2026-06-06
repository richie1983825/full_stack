import { ApiError } from '../api/types';

const AI_ERROR_MESSAGES: Record<string, string> = {
  AI_50301: 'AI 服务未配置，请联系管理员配置 DeepSeek API Key',
  AI_50302: 'AI 请求超时，请稍后重试',
  AI_42901: 'AI 请求过于频繁，请稍后再试',
  AI_40201: 'DeepSeek 账户余额不足，请充值后重试',
  AI_40101: 'DeepSeek API Key 无效，请检查后端配置',
  AI_50001: 'AI 服务异常，请稍后重试',
  AI_40001: '请求无效',
};

export function formatAiChatError(error: unknown): string {
  if (error instanceof ApiError) {
    const mapped = AI_ERROR_MESSAGES[error.errorCode];
    if (mapped) return mapped;
    const status = error.status ?? 0;
    if (status === 504 || status === 408) return AI_ERROR_MESSAGES.AI_50302;
    if (status === 429) return AI_ERROR_MESSAGES.AI_42901;
    if (status === 402) return AI_ERROR_MESSAGES.AI_40201;
    if (status === 503) return AI_ERROR_MESSAGES.AI_50301;
    return error.message || 'AI 对话失败';
  }
  if (error instanceof Error) {
    return error.message;
  }
  return 'AI 对话失败';
}

export function isAiServiceError(error: unknown): boolean {
  if (error instanceof ApiError) {
    const status = error.status ?? 0;
    return error.errorCode.startsWith('AI_') || [402, 429, 503, 504, 408].includes(status);
  }
  return false;
}
