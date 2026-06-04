import { useEffect, useState } from 'react';
import {
  Button,
  DatePicker,
  Dropdown,
  Input,
  Modal,
  Space,
  Spin,
  Switch,
  message,
} from 'antd';
import type { MenuProps } from 'antd';
import {
  BarChartOutlined,
  CameraOutlined,
  CodeOutlined,
  LineChartOutlined,
  PlusOutlined,
  ReloadOutlined,
  SaveOutlined,
  TableOutlined,
} from '@ant-design/icons';

import dayjs from 'dayjs';
import { useParams, useSearchParams } from 'react-router-dom';
import DashboardGrid from '../components/Dashboard/DashboardGrid';
import DashboardJsonDrawer from '../components/Dashboard/DashboardJsonDrawer';
import SnapshotDrawer from '../components/Dashboard/SnapshotDrawer';
import PanelEditorModal from '../components/Dashboard/PanelEditorModal';
import { useDashboardStore } from '../stores/useDashboardStore';
import type { PanelChartType, PanelConfig } from '../types/dashboard';
import { createDefaultPanel, nextPanelGrid } from '../utils/panelTemplates';
import { hydratePanelOption } from '../utils/panelData';

export default function DashboardEditorPage() {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const isEditMode = searchParams.get('edit') === 'true';
  const {
    currentDashboard,
    loading,
    editMode,
    loadDashboard,
    saveDashboard,
    setPanels,
    addPanel,
    updatePanel,
    refreshPanelData,
    setEditMode,
    setJsonDrawerOpen,
  } = useDashboardStore();

  const [editingPanel, setEditingPanel] = useState<PanelConfig | null>(null);
  const [saving, setSaving] = useState(false);
  const [snapshotOpen, setSnapshotOpen] = useState(false);
  const [dirty, setDirty] = useState(false);

  // 默认日期：16 点之前用昨天，16 点之后用今天
  const defaultDate = (() => {
    const now = dayjs();
    return now.hour() < 16 ? now.subtract(1, 'day').format('YYYY-MM-DD') : now.format('YYYY-MM-DD');
  })();

  useEffect(() => {
    setEditMode(isEditMode);
  }, [isEditMode, setEditMode]);

  useEffect(() => {
    if (id) {
      void loadDashboard(id).catch(() => message.error('加载仪表盘失败'));
    }
  }, [id, loadDashboard]);

  const handleSave = async () => {
    if (!currentDashboard) return;
    setSaving(true);
    try {
      await saveDashboard();
      setDirty(false);
      message.success('已保存');
    } catch (err) {
      message.error(err instanceof Error ? err.message : '保存失败');
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    if (dirty) {
      Modal.confirm({
        title: '放弃修改',
        content: '当前有未保存的修改，确定要放弃吗？',
        okText: '放弃',
        cancelText: '继续编辑',
        onOk: () => {
          window.history.replaceState(null, '', window.location.pathname);
          void loadDashboard(id!).then(() => setDirty(false));
          setEditMode(false);
        },
      });
    } else {
      window.history.replaceState(null, '', window.location.pathname);
      setEditMode(false);
    }
  };

  const handleAddPanel = async (chartType: PanelChartType) => {
    if (!currentDashboard) return;
    const panel = createDefaultPanel(chartType, nextPanelGrid(currentDashboard.panels));
    const hydrated = await hydratePanelOption(panel, currentDashboard.variables);
    addPanel(hydrated);
    message.success(`已添加${chartType === 'line' ? '折线图' : chartType === 'bar' ? '柱状图' : '表格'}`);
  };

  const addMenuItems: MenuProps['items'] = [
    { key: 'line', icon: <LineChartOutlined />, label: '折线图', onClick: () => void handleAddPanel('line') },
    { key: 'bar', icon: <BarChartOutlined />, label: '柱状图', onClick: () => void handleAddPanel('bar') },
    { key: 'table', icon: <TableOutlined />, label: '表格', onClick: () => void handleAddPanel('table') },
  ];

  const handlePanelSave = async (panel: PanelConfig) => {
    updatePanel(panel);
    setEditingPanel(null);
    try {
      const hydrated = await hydratePanelOption(panel, currentDashboard?.variables);
      updatePanel(hydrated);
    } catch {
      /* keep manual option */
    }
  };

  if (loading || !currentDashboard) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: 120 }}>
        <Spin size="large" tip="加载仪表盘..." />
      </div>
    );
  }

  return (
    <div className="dashboard-editor-page">
      <div className="dashboard-editor-toolbar">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
          <Space wrap>
            {editMode ? (
              <Input
                value={currentDashboard.title}
                onChange={(e) =>
                  useDashboardStore.setState({
                    currentDashboard: { ...currentDashboard, title: e.target.value },
                  })
                }
                style={{ width: 220 }}
                placeholder="仪表盘标题"
              />
            ) : (
              <h2 style={{ margin: 0 }}>{currentDashboard.title}</h2>
            )}
            <span className="toolbar-label">
              <Switch
                checked={editMode}
                onChange={(checked) => {
                  if (checked) {
                    window.history.replaceState(null, '', `?edit=true`);
                  } else {
                    window.history.replaceState(null, '', window.location.pathname);
                  }
                  setEditMode(checked);
                }}
                size="small"
              />
              <span style={{ marginLeft: 6 }}>编辑模式</span>
            </span>
            <DatePicker
              value={dayjs(currentDashboard.variables?.date ?? defaultDate)}
              onChange={(value) => {
                if (!value) return;
                useDashboardStore.setState({
                  currentDashboard: {
                    ...currentDashboard,
                    variables: { ...currentDashboard.variables, date: value.format('YYYY-MM-DD') },
                  },
                });
                setDirty(true);
              }}
              allowClear={false}
              style={{ width: 140 }}
            />
            <Button
              icon={<ReloadOutlined />}
              onClick={() => void refreshPanelData().then(() => message.success('数据已刷新'))}
            >
              刷新数据
            </Button>
            <Button icon={<CameraOutlined />} onClick={() => setSnapshotOpen(true)}>
              快照
            </Button>
          </Space>
          {editMode && (
            <Space wrap>
              <Dropdown menu={{ items: addMenuItems }}>
                <Button icon={<PlusOutlined />}>添加组件</Button>
              </Dropdown>
              <Button icon={<CodeOutlined />} onClick={() => setJsonDrawerOpen(true)}>
                JSON 配置
              </Button>
              <Button onClick={handleCancel}>取消</Button>
              <Button
                type="primary"
                icon={<SaveOutlined />}
                loading={saving}
                onClick={() => void handleSave()}
              >
                保存
              </Button>
            </Space>
          )}
        </div>
      </div>

      <DashboardGrid
        panels={currentDashboard.panels}
        editMode={editMode}
        onPanelsChange={setPanels}
        onEditPanel={editMode ? setEditingPanel : undefined}
      />

      <PanelEditorModal
        open={!!editingPanel}
        panel={editingPanel}
        onCancel={() => setEditingPanel(null)}
        onSave={(panel) => void handlePanelSave(panel)}
      />

      <DashboardJsonDrawer />

      <SnapshotDrawer
        open={snapshotOpen}
        dashboardId={currentDashboard.id}
        dashboardTitle={currentDashboard.title}
        onClose={() => setSnapshotOpen(false)}
      />
    </div>
  );
}
