import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { ConfigProvider } from 'antd';
import zhCN from 'antd/locale/zh_CN';
import App from './App';
import './index.css';
import { colorPrimary, brand, navBackground, colorPrimaryBg } from './theme/colors';

async function enableMockBackend() {
  const useMock = import.meta.env.DEV
    ? import.meta.env.VITE_ENABLE_MOCK !== 'false'
    : import.meta.env.VITE_ENABLE_MOCK === 'true';

  if (!useMock) return;

  const { worker } = await import('./mocks/browser');
  await worker.start({ onUnhandledRequest: 'bypass' });
  console.log('[Mock Backend] MSW 已启动，API 请求由 Mock 后端处理');
}

async function bootstrap() {
  await enableMockBackend();

  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <ConfigProvider
        locale={zhCN}
        theme={{
          token: {
            colorPrimary,
            colorLink: colorPrimary,
            colorInfo: brand[400],
            colorPrimaryBg,
            borderRadius: 6,
          },
          components: {
            Layout: {
              headerBg: navBackground,
              siderBg: navBackground,
            },
            Menu: {
              darkItemBg: navBackground,
              darkSubMenuItemBg: brand[700],
            },
          },
        }}
      >
        <App />
      </ConfigProvider>
    </StrictMode>,
  );
}

bootstrap();
