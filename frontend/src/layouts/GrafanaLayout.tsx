import { useMemo, useState } from 'react';
import { Link, Navigate, Outlet, useLocation } from 'react-router-dom';
import {
  LogoutOutlined,
  SafetyCertificateOutlined,
} from '@ant-design/icons';
import { Button, Dropdown, Layout, Menu } from 'antd';
import type { MenuProps } from 'antd';
import HomePageSettingsModal from '../components/Layout/HomePageSettingsModal';
import { useAuthStore } from '../stores/useAuthStore';
import { useHomePageStore } from '../stores/useHomePageStore';


const { Header, Content } = Layout;

export default function GrafanaLayout() {
  const location = useLocation();
  const { user, logout, hasPermission } = useAuthStore();
  const homePath = useHomePageStore((s) => s.getHomePath());
  const [homeSettingsOpen, setHomeSettingsOpen] = useState(false);

  const showAdmin =
    hasPermission('users:read') ||
    hasPermission('roles:read') ||
    user?.is_grafana_admin;

  const selectedKeys = useMemo(() => {
    if (location.pathname.startsWith('/admin/users')) return ['admin-users'];
    if (location.pathname.startsWith('/admin/roles')) return ['admin-roles'];
    if (location.pathname.startsWith('/admin/permissions')) return ['admin-permissions'];
    if (location.pathname.startsWith('/datasources')) return ['datasources'];
    return ['dashboard'];
  }, [location.pathname]);

  const menuItems = useMemo<MenuProps['items']>(() => {
    const items: MenuProps['items'] = [
      {
        key: 'dashboard',
        label: <Link to="/">仪表盘</Link>,
      },
      {
        key: 'datasources',
        label: <Link to="/datasources">数据源</Link>,
      },
    ];

    if (showAdmin) {
      const adminChildren: MenuProps['items'] = [];

      if (hasPermission('users:read') || user?.is_grafana_admin) {
        adminChildren.push({
          key: 'admin-users',
          label: <Link to="/admin/users">用户管理</Link>,
        });
      }

      if (hasPermission('roles:read') || user?.is_grafana_admin) {
        adminChildren.push(
          {
            key: 'admin-roles',
            label: <Link to="/admin/roles">角色管理</Link>,
          },
          {
            key: 'admin-permissions',
            label: <Link to="/admin/permissions">权限管理</Link>,
          },
        );
      }

      if (adminChildren.length > 0) {
        items.push({
          key: 'administration',
          label: '系统管理',
          children: adminChildren,
        });
      }
    }

    return items;
  }, [showAdmin, hasPermission, user?.is_grafana_admin]);

  const userMenuItems: MenuProps['items'] = [
    {
      key: 'home-settings',
      label: '设置首页',
      onClick: () => setHomeSettingsOpen(true),
    },
    { type: 'divider' as const },
    {
      key: 'logout',
      icon: <LogoutOutlined />,
      label: '退出登录',
      onClick: logout,
    },
  ];

  return (
    <Layout className="grafana-shell">
      <Header className="grafana-topbar">
        <div className="grafana-topbar-inner">
          <Link to={homePath} className="grafana-brand">
            <SafetyCertificateOutlined />
            <span>容量管理平台</span>
          </Link>
          <Menu
            mode="horizontal"
            selectedKeys={selectedKeys}
            items={menuItems}
            className="grafana-top-menu"
          />

          <div className="grafana-topbar-actions">
            <Dropdown menu={{ items: userMenuItems }} trigger={['click']}>
              <Button type="text" className="grafana-user-btn">
                <span style={{ color: 'rgba(255,255,255,0.85)' }}>{user?.display_name ?? user?.username}</span>
              </Button>
            </Dropdown>
          </div>
        </div>
      </Header>

      <HomePageSettingsModal
        open={homeSettingsOpen}
        onClose={() => setHomeSettingsOpen(false)}
      />

      <Content className="grafana-content">
        <Outlet />
      </Content>
    </Layout>
  );
}

export function ProtectedRoute() {
  const token = useAuthStore((s) => s.token);
  const location = useLocation();

  if (!token) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  return <Outlet />;
}

export function GuestRoute() {
  const token = useAuthStore((s) => s.token);
  const homePath = useHomePageStore((s) => s.getHomePath());

  if (token) {
    return <Navigate to={homePath} replace />;
  }

  return <Outlet />;
}
