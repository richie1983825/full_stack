import { useEffect, useState } from 'react';
import {
  Button,
  Dropdown,
  Input,
  Space,
  Spin,
  Switch,
  message,
} from 'antd';
import type { MenuProps } from 'antd';
import {
  ArrowLeftOutlined,
  BarChartOutlined,
  CameraOutlined,
  CodeOutlined,
  EditOutlined,
  LineChartOutlined,
  PlusOutlined,
  ReloadOutlined,
  SaveOutlined,
  TableOutlined,
} from '@ant-design/icons';
import { Link, useParams, useSearchParams } from 'react-router-dom';
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
      message.success('已保存');
    } catch (err) {
      message.error(err instanceof Error ? err.message : '保存失败');
    } finally {
      setSaving(false);
    }
  };

  const handleAddPanel = async (chartType: PanelChartType) => {
    if (!currentDashboard) return;
    const panel = createDefaultPanel(chartType, nextPanelGrid(currentDashboard.panels));
    const hydrated = await hydratePanelOption(panel);
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
      const hydrated = await hydratePanelOption(panel);
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
        <Space wrap>
          <Link to="/">
            <Button icon={<ArrowLeftOutlined />}>返回列表</Button>
          </Link>
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
          {!editMode && (
            <Link to={`/dashboards/${id}?edit=true`}>
              <Button type="primary" icon={<EditOutlined />}>
                编辑仪表盘
              </Button>
            </Link>
          )}
        </Space>

        {editMode && (
          <Space wrap>
            <span className="toolbar-label">
              编辑模式
              <Switch checked={editMode} onChange={setEditMode} size="small" style={{ marginLeft: 8 }} />
            </span>
            <Dropdown menu={{ items: addMenuItems }} disabled={!editMode}>
              <Button type="primary" icon={<PlusOutlined />} disabled={!editMode}>
                添加组件
              </Button>
            </Dropdown>
            <Button
              icon={<ReloadOutlined />}
              onClick={() => void refreshPanelData().then(() => message.success('数据已刷新'))}
            >
              刷新数据
            </Button>
            <Button icon={<CodeOutlined />} onClick={() => setJsonDrawerOpen(true)}>
              JSON 配置
            </Button>
            <Button icon={<CameraOutlined />} onClick={() => setSnapshotOpen(true)}>
              快照
            </Button>
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
