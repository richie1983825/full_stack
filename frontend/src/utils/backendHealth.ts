/** 是否使用 Mock 后端（不依赖真实服务） */
export function isMockBackend(): boolean {
  return import.meta.env.DEV
    ? import.meta.env.VITE_ENABLE_MOCK !== 'false'
    : import.meta.env.VITE_ENABLE_MOCK === 'true';
}

const HEALTH_URL = import.meta.env.VITE_BACKEND_HEALTH_URL ?? '/health';

export async function checkBackendHealth(): Promise<boolean> {
  try {
    const response = await fetch(HEALTH_URL, { cache: 'no-store' });
    return response.ok;
  } catch {
    return false;
  }
}

export function waitForBackend(options?: {
  intervalMs?: number;
  maxAttempts?: number;
}): Promise<boolean> {
  const intervalMs = options?.intervalMs ?? 1000;
  const maxAttempts = options?.maxAttempts ?? 90;

  return new Promise((resolve) => {
    let attempts = 0;

    const tick = async () => {
      if (await checkBackendHealth()) {
        resolve(true);
        return;
      }
      attempts += 1;
      if (attempts >= maxAttempts) {
        resolve(false);
        return;
      }
      window.setTimeout(() => void tick(), intervalMs);
    };

    void tick();
  });
}
