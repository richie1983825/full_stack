import { useMemo, useState, type ReactNode } from 'react';
import { Link, Navigate, Outlet, useLocation } from 'react-router-dom';
import {
  BarChartOutlined,
  DatabaseOutlined,
  HomeOutlined,
  KeyOutlined,
  LogoutOutlined,
  SafetyCertificateOutlined,
  TeamOutlined,
  UserOutlined,
} from '@ant-design/icons';
import { Breadcrumb, Button, Dropdown, Layout, Menu, Space, Typography } from 'antd';
import type { MenuProps } from 'antd';
import HomePageSettingsModal from '../components/Layout/HomePageSettingsModal';
import { useAuthStore } from '../stores/useAuthStore';
import { useHomePageStore } from '../stores/useHomePageStore';
import { isHomePath } from '../utils/homePage';

const { Header, Content } = Layout;
const { Text } = Typography;

const breadcrumbMap: Record<string, string> = {
  '/': '仪表盘',
  '/admin/users': '用户',
  '/admin/roles': '角色',
  '/admin/permissions': '权限',
};

function resolveBreadcrumb(pathname: string): string {
  if (breadcrumbMap[pathname]) return breadcrumbMap[pathname];
  if (pathname.startsWith('/dashboards/')) return '编辑仪表盘';
  return '仪表盘';
}

export default function GrafanaLayout() {
  const location = useLocation();
  const { user, logout, hasPermission } = useAuthStore();
  const homeTarget = useHomePageStore((s) => s.target);
  const homePath = useHomePageStore((s) => s.getHomePath());
  const [homeSettingsOpen, setHomeSettingsOpen] = useState(false);
  const onHomePage = isHomePath(location.pathname, homeTarget);

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
        icon: <BarChartOutlined />,
        label: <Link to="/">仪表盘</Link>,
      },
      {
        key: 'datasources',
        icon: <DatabaseOutlined />,
        label: <Link to="/datasources">数据源</Link>,
      },
    ];

    if (showAdmin) {
      const adminChildren: MenuProps['items'] = [];

      if (hasPermission('users:read') || user?.is_grafana_admin) {
        adminChildren.push({
          key: 'admin-users',
          icon: <UserOutlined />,
          label: <Link to="/admin/users">用户管理</Link>,
        });
      }

      if (hasPermission('roles:read') || user?.is_grafana_admin) {
        adminChildren.push(
          {
            key: 'admin-roles',
            icon: <TeamOutlined />,
            label: <Link to="/admin/roles">角色管理</Link>,
          },
          {
            key: 'admin-permissions',
            icon: <KeyOutlined />,
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
      icon: <HomeOutlined />,
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

  const breadcrumbItems = useMemo(() => {
    const items: { title: ReactNode }[] = [];

    if (onHomePage) {
      items.push({ title: '首页' });
    } else {
      items.push({
        title: <Link to={homePath}>首页</Link>,
      });
      items.push({ title: resolveBreadcrumb(location.pathname) });
    }

    return items;
  }, [homePath, location.pathname, onHomePage]);

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
                <Space size={6}>
                  <UserOutlined />
                  <Text>{user?.display_name ?? user?.username}</Text>
                </Space>
              </Button>
            </Dropdown>
          </div>
        </div>
      </Header>

      <div className="grafana-subheader">
        <Breadcrumb items={breadcrumbItems} />
      </div>

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
