/** 统一 API 响应格式（与后端约定） */
export interface ApiResponse<T = unknown> {
  errorCode: string;
  errorMessage: string;
  success: boolean;
  data: T;
}

/** API 业务错误 */
export class ApiError extends Error {
  readonly errorCode: string;
  readonly status?: number;

  constructor(errorCode: string, message: string, status?: number) {
    super(message);
    this.name = 'ApiError';
    this.errorCode = errorCode;
    this.status = status;
  }
}
