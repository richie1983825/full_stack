/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** 后端 API 基础路径，默认 /api */
  readonly VITE_API_BASE_URL: string;
  /** 是否启用 Mock 后端，默认 true */
  readonly VITE_ENABLE_MOCK: string;
  /** 真实后端代理地址（Vite dev server） */
  readonly VITE_API_PROXY_TARGET: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
