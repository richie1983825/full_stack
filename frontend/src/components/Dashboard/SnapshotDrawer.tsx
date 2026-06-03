import {
  CameraOutlined,
  ClockCircleOutlined,
  CopyOutlined,
  DeleteOutlined,
  LinkOutlined,
} from '@ant-design/icons';
import {
  Button,
  Drawer,
  Form,
  Input,
  InputNumber,
  Popconfirm,
  Select,
  Space,
  Switch,
  Table,
  Tabs,
  Typography,
  message,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { useCallback, useEffect, useState } from 'react';
import { snapshotApi } from '../../api/snapshot';
import type { DashboardSchedule, DashboardSnapshot } from '../../types/snapshot';

const { Text, Paragraph } = Typography;

interface SnapshotDrawerProps {
  open: boolean;
  dashboardId: string;
  dashboardTitle: string;
  onClose: () => void;
}

export default function SnapshotDrawer({
  open,
  dashboardId,
  dashboardTitle,
  onClose,
}: SnapshotDrawerProps) {
  const [snapshots, setSnapshots] = useState<DashboardSnapshot[]>([]);
  const [schedule, setSchedule] = useState<DashboardSchedule | null>(null);
  const [loadingSnapshots, setLoadingSnapshots] = useState(false);
  const [creating, setCreating] = useState(false);
  const [savingSchedule, setSavingSchedule] = useState(false);
  const [snapshotTitle, setSnapshotTitle] = useState('');
  const [latestViewUrl, setLatestViewUrl] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const [form] = Form.useForm<{
    enabled: boolean;
    intervalHours: number;
    dateMode: DashboardSchedule['dateMode'];
  }>();

  const loadData = useCallback(async () => {
    setLoadingSnapshots(true);
    try {
      const [list, sched] = await Promise.all([
        snapshotApi.list(dashboardId),
        snapshotApi.getSchedule(dashboardId),
      ]);
      setSnapshots(list);
      setSchedule(sched);
      form.setFieldsValue({
        enabled: sched?.enabled ?? false,
        intervalHours: sched?.intervalHours ?? 24,
        dateMode: sched?.dateMode ?? 'dashboard',
      });
    } catch (err) {
      message.error(err instanceof Error ? err.message : '加载快照数据失败');
    } finally {
      setLoadingSnapshots(false);
    }
  }, [dashboardId, form]);

  useEffect(() => {
    if (open) {
      setSnapshotTitle('');
      setLatestViewUrl(null);
      void loadData();
    }
  }, [open, loadData]);

  const handleCreateSnapshot = async () => {
    setCreating(true);
    try {
      const created = await snapshotApi.create(dashboardId, {
        title: snapshotTitle.trim() || undefined,
      });
      setLatestViewUrl(created.viewUrl);
      message.success('快照已生成');
      await loadData();
    } catch (err) {
      message.error(err instanceof Error ? err.message : '生成快照失败');
    } finally {
      setCreating(false);
    }
  };

  const handleSaveSchedule = async () => {
    const values = await form.validateFields();
    setSavingSchedule(true);
    try {
      const saved = await snapshotApi.upsertSchedule(dashboardId, values);
      setSchedule(saved);
      message.success(values.enabled ? '定期快照已启用' : '定期快照已关闭');
    } catch (err) {
      message.error(err instanceof Error ? err.message : '保存计划失败');
    } finally {
      setSavingSchedule(false);
    }
  };

  const copyLink = async (url: string) => {
    try {
      await navigator.clipboard.writeText(url);
      message.success('链接已复制');
    } catch {
      message.error('复制失败，请手动复制');
    }
  };

  const handleDeleteSnapshot = async (snapshot: DashboardSnapshot) => {
    setDeletingId(snapshot.id);
    try {
      await snapshotApi.delete(dashboardId, snapshot.id);
      setSnapshots((prev) => prev.filter((s) => s.id !== snapshot.id));
      if (latestViewUrl === snapshot.viewUrl) {
        setLatestViewUrl(null);
      }
      message.success('快照已删除');
    } catch (err) {
      message.error(err instanceof Error ? err.message : '删除快照失败');
    } finally {
      setDeletingId(null);
    }
  };

  const columns: ColumnsType<DashboardSnapshot> = [
    {
      title: '标题',
      dataIndex: 'title',
      ellipsis: true,
    },
    {
      title: '数据日期',
      dataIndex: ['variables', 'date'],
      width: 120,
      render: (_, record) => record.variables?.date ?? '-',
    },
    {
      title: '生成时间',
      dataIndex: 'createdAt',
      width: 180,
      render: (value: string) => new Date(value).toLocaleString(),
    },
    {
      title: '操作',
      key: 'actions',
      width: 200,
      render: (_, record) => (
        <Space>
          <Button
            type="link"
            size="small"
            icon={<LinkOutlined />}
            href={record.viewUrl}
            target="_blank"
            rel="noreferrer"
          >
            查看
          </Button>
          <Button
            type="link"
            size="small"
            icon={<CopyOutlined />}
            onClick={() => void copyLink(record.viewUrl)}
          >
            复制
          </Button>
          <Popconfirm
            title="删除此快照？"
            description="删除后链接将失效，且无法恢复。"
            okText="删除"
            cancelText="取消"
            okButtonProps={{ danger: true, loading: deletingId === record.id }}
            onConfirm={() => void handleDeleteSnapshot(record)}
          >
            <Button
              type="link"
              size="small"
              danger
              icon={<DeleteOutlined />}
              loading={deletingId === record.id}
            >
              删除
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <Drawer
      title={
        <Space>
          <CameraOutlined />
          仪表盘快照
        </Space>
      }
      open={open}
      onClose={onClose}
      width={640}
      destroyOnHidden
    >
      <Paragraph type="secondary" style={{ marginBottom: 16 }}>
        参考 Grafana Snapshot：将当前仪表盘及数据嵌入静态 HTML，可无需登录分享查看。
      </Paragraph>

      <Tabs
        items={[
          {
            key: 'create',
            label: '立即快照',
            children: (
              <Space direction="vertical" style={{ width: '100%' }} size={16}>
                <div>
                  <Text type="secondary">快照标题（可选）</Text>
                  <Input
                    placeholder={`${dashboardTitle} · 快照`}
                    value={snapshotTitle}
                    onChange={(e) => setSnapshotTitle(e.target.value)}
                    style={{ marginTop: 8 }}
                  />
                </div>
                <Button
                  type="primary"
                  icon={<CameraOutlined />}
                  loading={creating}
                  onClick={() => void handleCreateSnapshot()}
                >
                  生成静态 HTML 快照
                </Button>
                {latestViewUrl && (
                  <div>
                    <Text type="secondary">最新快照链接</Text>
                    <Paragraph copyable={{ text: latestViewUrl }} style={{ marginTop: 8 }}>
                      <a href={latestViewUrl} target="_blank" rel="noreferrer">
                        {latestViewUrl}
                      </a>
                    </Paragraph>
                  </div>
                )}
              </Space>
            ),
          },
          {
            key: 'schedule',
            label: (
              <Space>
                <ClockCircleOutlined />
                定期快照
              </Space>
            ),
            children: (
              <Form form={form} layout="vertical" onFinish={() => void handleSaveSchedule()}>
                <Form.Item
                  name="enabled"
                  label="启用定期快照"
                  valuePropName="checked"
                >
                  <Switch />
                </Form.Item>
                <Form.Item
                  name="intervalHours"
                  label="间隔（小时）"
                  rules={[{ required: true, message: '请输入间隔' }]}
                >
                  <InputNumber min={1} max={168} style={{ width: '100%' }} />
                </Form.Item>
                <Form.Item
                  name="dateMode"
                  label="数据日期"
                  rules={[{ required: true }]}
                >
                  <Select
                    options={[
                      { value: 'dashboard', label: '使用仪表盘当前日期' },
                      { value: 'today', label: '当天' },
                      { value: 'yesterday', label: '昨天' },
                    ]}
                  />
                </Form.Item>
                {schedule?.lastRunAt && (
                  <Text type="secondary" style={{ display: 'block', marginBottom: 12 }}>
                    上次执行：{new Date(schedule.lastRunAt).toLocaleString()}
                    {schedule.nextRunAt && (
                      <> · 下次：{new Date(schedule.nextRunAt).toLocaleString()}</>
                    )}
                  </Text>
                )}
                <Button type="primary" htmlType="submit" loading={savingSchedule}>
                  保存计划
                </Button>
              </Form>
            ),
          },
          {
            key: 'history',
            label: '历史快照',
            children: (
              <Table
                rowKey="id"
                size="small"
                loading={loadingSnapshots}
                columns={columns}
                dataSource={snapshots}
                pagination={{ pageSize: 8, hideOnSinglePage: true }}
              />
            ),
          },
        ]}
      />
    </Drawer>
  );
}
