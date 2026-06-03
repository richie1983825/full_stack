import { useEffect, useState } from 'react';
import { Button, Empty, Input, Modal, Spin, Table, Tag, message } from 'antd';
import { PlusOutlined, DeleteOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { Link } from 'react-router-dom';
import { useDashboardStore } from '../stores/useDashboardStore';

interface DashboardRow {
  key: string;
  id: string;
  title: string;
  description?: string;
  panelCount: number;
  creator: string;
  team: string;
  hasSchedule: boolean;
  lastSnapshotAt?: string;
  createdAt: string;
}

export default function DashboardListPage() {
  const { dashboards, loadDashboards, createDashboard, deleteDashboard, loading } =
    useDashboardStore();
  const [createOpen, setCreateOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  useEffect(() => {
    void loadDashboards();
  }, [loadDashboards]);

  const handleBatchDelete = () => {
    if (selectedIds.length === 0) return;
    Modal.confirm({
      title: '删除仪表盘',
      content: `确认删除选中的 ${selectedIds.length} 个仪表盘？`,
      okText: '删除',
      okType: 'danger',
      cancelText: '取消',
      onOk: async () => {
        await Promise.all(selectedIds.map((id) => deleteDashboard(id)));
        message.success(`已删除 ${selectedIds.length} 个仪表盘`);
        setSelectedIds([]);
        void loadDashboards();
      },
    });
  };

  const handleCreate = async () => {
    if (!title.trim()) {
      message.warning('请输入仪表盘名称');
      return;
    }
    try {
      await createDashboard(title.trim());
      setCreateOpen(false);
      setTitle('');
      void loadDashboards();
    } catch (err) {
      message.error(err instanceof Error ? err.message : '创建失败');
    }
  };

  const rows: DashboardRow[] = dashboards.map((d) => ({
    key: d.id,
    id: d.id,
    title: d.title,
    description: d.description,
    panelCount: d.panelCount,
    creator: '—',
    team: '—',
    hasSchedule: false,
    lastSnapshotAt: undefined,
    createdAt: d.createdAt,
  }));

  const columns: ColumnsType<DashboardRow> = [
    {
      title: '名称',
      dataIndex: 'title',
      render: (title: string, record) => (
        <Link to={`/dashboards/${record.id}`}>{title}</Link>
      ),
    },
    {
      title: '创建人',
      dataIndex: 'creator',
      width: 100,
    },
    {
      title: '所属团队',
      dataIndex: 'team',
      width: 120,
    },
    {
      title: '定时快照',
      dataIndex: 'hasSchedule',
      width: 100,
      render: (v: boolean) => (v ? <Tag color="green">已开启</Tag> : <Tag>未开启</Tag>),
    },
    {
      title: '最近快照时间',
      dataIndex: 'lastSnapshotAt',
      width: 180,
      render: (v?: string) => v ?? '—',
    },
  ];

  return (
    <div className="page-container">
      <div className="admin-page-header">
        <h2>仪表盘</h2>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => setCreateOpen(true)}>
          新建仪表盘
        </Button>
      </div>

      {loading && dashboards.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 80 }}>
          <Spin size="large" />
        </div>
      ) : dashboards.length === 0 ? (
        <Empty description="暂无仪表盘">
          <Button type="primary" onClick={() => setCreateOpen(true)}>
            创建第一个仪表盘
          </Button>
        </Empty>
      ) : (
        <>
          {selectedIds.length > 0 && (
            <div style={{ marginBottom: 12, padding: '8px 12px', background: '#e6f4ff', borderRadius: 6, display: 'flex', alignItems: 'center', gap: 12 }}>
              <span>已选择 <strong>{selectedIds.length}</strong> 个仪表盘</span>
              <Button danger icon={<DeleteOutlined />} onClick={handleBatchDelete}>
                删除
              </Button>
            </div>
          )}
          <Table
            rowKey="id"
            loading={loading}
            columns={columns}
            dataSource={rows}
            rowSelection={{
              selectedRowKeys: selectedIds,
              onChange: (keys) => setSelectedIds(keys as string[]),
            }}
            pagination={{ pageSize: 20, hideOnSinglePage: true }}
          />
        </>
      )}

      <Modal
        title="新建仪表盘"
        open={createOpen}
        onCancel={() => setCreateOpen(false)}
        onOk={() => void handleCreate()}
        okText="创建"
        cancelText="取消"
      >
        <Input
          placeholder="仪表盘名称"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onPressEnter={() => void handleCreate()}
        />
      </Modal>
    </div>
  );
}
