import { Alert, Button, Drawer, Space, message } from 'antd';
import { useEffect, useState } from 'react';
import { useDashboardStore } from '../../stores/useDashboardStore';
import JsonEditor from '../Layout/JsonEditor';

export default function DashboardJsonDrawer() {
  const { currentDashboard, jsonDrawerOpen, setJsonDrawerOpen, applyJsonConfig, saveDashboard } =
    useDashboardStore();
  const [text, setText] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (jsonDrawerOpen && currentDashboard) {
      // 显示持久化配置（不含 option 运行时数据）
      const persistedPanels = currentDashboard.panels.map(
        ({ option: _option, ...rest }) => rest,
      );
      setText(
        JSON.stringify(
          {
            title: currentDashboard.title,
            description: currentDashboard.description,
            variables: currentDashboard.variables,
            panels: persistedPanels,
          },
          null,
          2,
        ),
      );
      setError(null);
    }
  }, [jsonDrawerOpen, currentDashboard]);

  const handleApply = () => {
    try {
      applyJsonConfig(text);
      setError(null);
      message.success('JSON 已应用到编辑区，请点击「保存」写入后端');
      setJsonDrawerOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'JSON 格式错误');
    }
  };

  const handleApplyAndSave = async () => {
    try {
      applyJsonConfig(text);
      await saveDashboard();
      setError(null);
      message.success('已保存');
      setJsonDrawerOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'JSON 格式错误');
    }
  };

  return (
    <Drawer
      title="JSON 配置"
      open={jsonDrawerOpen}
      onClose={() => setJsonDrawerOpen(false)}
      size={560}
      extra={
        <Space>
          <Button onClick={() => setJsonDrawerOpen(false)}>取消</Button>
          <Button onClick={handleApply}>应用</Button>
          <Button type="primary" onClick={() => void handleApplyAndSave()}>
            应用并保存
          </Button>
        </Space>
      }
    >
      <Alert
        type="info"
        showIcon
        message="可编辑 title、description、variables、panels 字段，结构与 Grafana 面板 JSON 类似。"
        style={{ marginBottom: 12 }}
      />
      {error && <Alert type="error" message={error} showIcon style={{ marginBottom: 12 }} />}
      <JsonEditor value={text} onChange={setText} rows={28} />
    </Drawer>
  );
}
