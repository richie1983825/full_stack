import { Form, Input, Button, Card, Typography, Alert } from 'antd';
import { LockOutlined, UserOutlined } from '@ant-design/icons';
import { useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/useAuthStore';
import { ApiError } from '../api/types';
import { useHomePageStore } from '../stores/useHomePageStore';

const { Title, Text } = Typography;

export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const login = useAuthStore((s) => s.login);
  const token = useAuthStore((s) => s.token);
  const homePath = useHomePageStore((s) => s.getHomePath());
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  if (token) {
    return <Navigate to={homePath} replace />;
  }

  const from = (location.state as { from?: string } | null)?.from;

  const onFinish = async (values: { username: string; password: string }) => {
    setLoading(true);
    setError(null);
    try {
      await login(values.username, values.password);
      navigate(from && from !== '/login' ? from : homePath, { replace: true });
    } catch (err) {
      if (err instanceof ApiError && err.status === 0) {
        setError('后端服务未就绪，请稍后重试');
      } else {
        setError(err instanceof Error ? err.message : '登录失败');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <Card className="login-card">
        <Title level={3} style={{ marginBottom: 8 }}>
          登录 CMP
        </Title>
        <Text type="secondary">容量管理平台 · 统一监控与管理</Text>

        {error && (
          <Alert type="error" message={error} showIcon style={{ marginTop: 16 }} />
        )}

        <Form layout="vertical" onFinish={onFinish} style={{ marginTop: 24 }}>
          <Form.Item
            name="username"
            label="用户名"
            rules={[{ required: true, message: '请输入用户名' }]}
            initialValue="admin"
          >
            <Input prefix={<UserOutlined />} placeholder="admin" />
          </Form.Item>
          <Form.Item
            name="password"
            label="密码"
            rules={[{ required: true, message: '请输入密码' }]}
            initialValue="admin123"
          >
            <Input.Password prefix={<LockOutlined />} placeholder="admin123" />
          </Form.Item>
          <Button type="primary" htmlType="submit" block loading={loading}>
            登录
          </Button>
        </Form>
      </Card>
    </div>
  );
}
