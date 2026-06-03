import { SafetyCertificateOutlined } from '@ant-design/icons';
import { Spin, Typography } from 'antd';
import { useEffect, useState, type ReactNode } from 'react';
import { isMockBackend, waitForBackend } from '../utils/backendHealth';

const { Text, Title } = Typography;

interface BackendGateProps {
  children: ReactNode;
}

export default function BackendGate({ children }: BackendGateProps) {
  const mockMode = isMockBackend();
  const [ready, setReady] = useState(mockMode);
  const [timedOut, setTimedOut] = useState(false);

  useEffect(() => {
    if (mockMode) return;

    let cancelled = false;

    void waitForBackend({ intervalMs: 500, maxAttempts: 60 }).then((ok) => {
      if (cancelled) return;
      if (ok) {
        setReady(true);
      } else {
        setTimedOut(true);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [mockMode]);

  if (ready) {
    return children;
  }

  return (
    <div className="backend-gate">
      <SafetyCertificateOutlined style={{ fontSize: 40, color: '#2563ab', marginBottom: 16 }} />
      {timedOut ? (
        <>
          <Title level={4} style={{ marginBottom: 8 }}>
            后端服务未响应
          </Title>
          <Text type="secondary">
            请确认 Backend 已启动（内部端口 3101），前端通过 3100 代理访问。启动后刷新本页即可。
          </Text>
        </>
      ) : (
        <>
          <Spin size="large" />
          <Title level={4} style={{ marginTop: 20, marginBottom: 8 }}>
            正在连接后端…
          </Title>
          <Text type="secondary">首次加载需等待 API 就绪（约数秒）</Text>
        </>
      )}
    </div>
  );
}
