import { HomeOutlined } from '@ant-design/icons';
import { Modal, Radio, Select, Space, Typography, message } from 'antd';
import { useEffect, useState } from 'react';
import { useDashboardStore } from '../../stores/useDashboardStore';
import { useHomePageStore } from '../../stores/useHomePageStore';
import type { HomePageTarget } from '../../types/homePage';

const { Text } = Typography;

interface HomePageSettingsModalProps {
  open: boolean;
  onClose: () => void;
}

export default function HomePageSettingsModal({ open, onClose }: HomePageSettingsModalProps) {
  const target = useHomePageStore((s) => s.target);
  const setTarget = useHomePageStore((s) => s.setTarget);
  const { dashboards, loadDashboards, loading } = useDashboardStore();

  const [mode, setMode] = useState<'dashboard-list' | 'dashboard'>(
    target.type === 'dashboard' ? 'dashboard' : 'dashboard-list',
  );
  const [dashboardId, setDashboardId] = useState(
    target.type === 'dashboard' ? target.id : undefined,
  );

  useEffect(() => {
    if (!open) return;
    setMode(target.type === 'dashboard' ? 'dashboard' : 'dashboard-list');
    setDashboardId(target.type === 'dashboard' ? target.id : undefined);
    void loadDashboards();
  }, [open, target, loadDashboards]);

  const handleOk = () => {
    let next: HomePageTarget;
    if (mode === 'dashboard-list') {
      next = { type: 'dashboard-list' };
    } else {
      if (!dashboardId) {
        message.warning('请选择日报页面');
        return;
      }
      const selected = dashboards.find((item) => item.id === dashboardId);
      if (!selected) {
        message.warning('所选日报不存在，请重新选择');
        return;
      }
      next = { type: 'dashboard', id: selected.id, title: selected.title };
    }

    setTarget(next);
    message.success('首页已更新');
    onClose();
  };

  return (
    <Modal
      title={
        <Space>
          <HomeOutlined />
          设置首页
        </Space>
      }
      open={open}
      onCancel={onClose}
      onOk={handleOk}
      okText="保存"
      cancelText="取消"
      destroyOnHidden
    >
      <Text type="secondary" style={{ display: 'block', marginBottom: 16 }}>
        点击面包屑「首页」时将跳转到此处配置的页面，默认为仪表盘列表。
      </Text>

      <Radio.Group
        value={mode}
        onChange={(e) => setMode(e.target.value)}
        style={{ display: 'flex', flexDirection: 'column', gap: 12 }}
      >
        <Radio value="dashboard-list">仪表盘列表（默认）</Radio>
        <Radio value="dashboard">指定日报页面</Radio>
      </Radio.Group>

      {mode === 'dashboard' && (
        <Select
          showSearch
          placeholder="选择日报页面"
          style={{ width: '100%', marginTop: 16 }}
          loading={loading}
          value={dashboardId}
          onChange={setDashboardId}
          optionFilterProp="label"
          options={dashboards.map((item) => ({
            value: item.id,
            label: item.title,
          }))}
          notFoundContent={loading ? '加载中...' : '暂无日报，请先在仪表盘列表创建'}
        />
      )}
    </Modal>
  );
}
