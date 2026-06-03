import { useEffect, useState, useCallback } from 'react';
import { Button, Dropdown, Empty, Input, Modal, Spin, Table, Tag, message } from 'antd';
import { PlusOutlined, DeleteOutlined, FolderOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { Link } from 'react-router-dom';
import { useDashboardStore } from '../stores/useDashboardStore';
import { dashboardApi } from '../api/dashboard';
import type { DashboardSummary } from '../types/dashboard';

interface TreeItem extends DashboardSummary {
  children?: TreeItem[];
}

export default function DashboardListPage() {
  const { deleteDashboard } = useDashboardStore();
  const [items, setItems] = useState<TreeItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [createKind, setCreateKind] = useState<'folder' | 'dashboard'>('dashboard');
  const [title, setTitle] = useState('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [expandedKeys, setExpandedKeys] = useState<string[]>([]);
  const [moveOpen, setMoveOpen] = useState(false);

  const loadTree = useCallback(async () => {
    setLoading(true);
    try {
      const list = await dashboardApi.listTree();
      setItems(list.map((i) => ({ ...i, children: i.kind === 'folder' ? [] : undefined })));
    } catch {
      message.error('加载失败');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadTree();
  }, [loadTree]);

  const loadChildren = useCallback(async (parentId: string): Promise<TreeItem[]> => {
    try {
      const list = await dashboardApi.listChildren(parentId);
      return list.map((i) => ({ ...i, children: i.kind === 'folder' ? [] : undefined }));
    } catch {
      return [];
    }
  }, []);

  const handleExpand = useCallback(async (expanded: boolean, record: TreeItem) => {
    if (expanded) {
      // Load children into the record
      const children = await loadChildren(record.id);
      setItems((prev) => updateChildren(prev, record.id, children));
      setExpandedKeys((prev) => [...prev, record.id]);
    } else {
      setExpandedKeys((prev) => prev.filter((k) => k !== record.id));
    }
  }, [loadChildren]);

  const handleCreate = async () => {
    if (!title.trim()) {
      message.warning('请输入名称');
      return;
    }
    try {
      await dashboardApi.create({ title: title.trim(), kind: createKind });
      setCreateOpen(false);
      setTitle('');
      void loadTree();
      setExpandedKeys([]);
    } catch (err) {
      message.error(err instanceof Error ? err.message : '创建失败');
    }
  };

  const handleBatchDelete = () => {
    if (selectedIds.length === 0) return;
    Modal.confirm({
      title: '删除',
      content: `确认删除选中的 ${selectedIds.length} 个项目？`,
      okText: '删除',
      okType: 'danger',
      cancelText: '取消',
      onOk: async () => {
        await Promise.all(selectedIds.map((id) => deleteDashboard(id)));
        message.success(`已删除 ${selectedIds.length} 个项目`);
        setSelectedIds([]);
        void loadTree();
        setExpandedKeys([]);
      },
    });
  };

  const handleBatchMove = async (targetId: string | null) => {
    if (selectedIds.length === 0) return;
    await Promise.all(selectedIds.map((id) => dashboardApi.move(id, targetId)));
    message.success(`已移动 ${selectedIds.length} 个项目`);
    setSelectedIds([]);
    setMoveOpen(false);
    void loadTree();
    setExpandedKeys([]);
  };

  const getAllIds = (list: TreeItem[]): string[] => {
    const ids: string[] = [];
    for (const item of list) {
      ids.push(item.id);
      if (item.children) ids.push(...getAllIds(item.children));
    }
    return ids;
  };

  const columns: ColumnsType<TreeItem> = [
    {
      title: '名称',
      dataIndex: 'title',
      render: (title: string, record) => (
        <>
          {record.kind === 'folder' ? (
            <span
              style={{ cursor: 'pointer', fontWeight: 500 }}
              onClick={() => {
                if (expandedKeys.includes(record.id)) {
                  setExpandedKeys((prev) => prev.filter((k) => k !== record.id));
                } else {
                  if (!record.children || record.children.length === 0) {
                    void handleExpand(true, record);
                  } else {
                    setExpandedKeys((prev) => [...prev, record.id]);
                  }
                }
              }}
            >
              <FolderOutlined style={{ marginRight: 6, color: '#faad14' }} />
              {title}
            </span>
          ) : (
            <Link to={`/dashboards/${record.id}`}>{title}</Link>
          )}
        </>
      ),
    },
    {
      title: '创建人',
      width: 100,
      render: (_, r) => (r.kind === 'folder' ? null : '—'),
    },
    {
      title: '所属团队',
      width: 120,
      render: (_, r) => (r.kind === 'folder' ? null : '—'),
    },
    {
      title: '定时快照',
      width: 100,
      render: (_, r) => (r.kind === 'folder' ? null : <Tag>未开启</Tag>),
    },
    {
      title: '最近快照时间',
      width: 180,
      render: (_, r) => (r.kind === 'folder' ? null : '—'),
    },
  ];

  return (
    <div className="page-container">
      <div className="admin-page-header">
        <h2>仪表盘</h2>
        <Dropdown
          menu={{
            items: [
              { key: 'dashboard', label: '新建仪表盘', onClick: () => { setCreateKind('dashboard'); setCreateOpen(true); } },
              { key: 'folder', label: '新建文件夹', onClick: () => { setCreateKind('folder'); setCreateOpen(true); } },
            ],
          }}
        >
          <Button type="primary" icon={<PlusOutlined />}>
            新建
          </Button>
        </Dropdown>
      </div>

      {selectedIds.length > 0 && (
        <div style={{ marginBottom: 12, padding: '8px 12px', background: '#e6f4ff', borderRadius: 6, display: 'flex', alignItems: 'center', gap: 12 }}>
          <span>已选择 <strong>{selectedIds.length}</strong> 个项目</span>
          <Button danger icon={<DeleteOutlined />} onClick={handleBatchDelete}>删除</Button>
          <Button onClick={() => setMoveOpen(true)}>移动</Button>
        </div>
      )}

      {loading && items.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 80 }}><Spin size="large" /></div>
      ) : items.length === 0 ? (
        <Empty description="暂无仪表盘或文件夹" />
      ) : (
        <Table
          rowKey="id"
          loading={loading}
          columns={columns}
          dataSource={items}
          rowSelection={{
            selectedRowKeys: selectedIds,
            onChange: (keys) => setSelectedIds(keys as string[]),
          }}
          expandable={{
            expandedRowKeys: expandedKeys,
            rowExpandable: (r) => r.kind === 'folder',
            onExpand: (expanded, record) => void handleExpand(expanded, record),
            expandIcon: () => null,
          }}
          pagination={{ pageSize: 50, hideOnSinglePage: true }}
        />
      )}

      <Modal
        title={createKind === 'folder' ? '新建文件夹' : '新建仪表盘'}
        open={createOpen}
        onCancel={() => setCreateOpen(false)}
        onOk={() => void handleCreate()}
        okText="创建"
        cancelText="取消"
      >
        <Input
          placeholder={createKind === 'folder' ? '文件夹名称' : '仪表盘名称'}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onPressEnter={() => void handleCreate()}
        />
      </Modal>

      <Modal
        title="移动到"
        open={moveOpen}
        onCancel={() => setMoveOpen(false)}
        footer={null}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div
            style={{ padding: '8px 12px', cursor: 'pointer', borderRadius: 4, background: '#f0f0f0' }}
            onClick={() => void handleBatchMove(null)}
          >
            <FolderOutlined style={{ marginRight: 6 }} /> 根目录
          </div>
          {items
            .filter((i) => i.kind === 'folder' && !selectedIds.includes(i.id))
            .map((f) => (
              <div
                key={f.id}
                style={{ padding: '8px 12px', cursor: 'pointer', borderRadius: 4 }}
                onMouseEnter={(e) => (e.currentTarget.style.background = '#e6f4ff')}
                onMouseLeave={(e) => (e.currentTarget.style.background = '')}
                onClick={() => void handleBatchMove(f.id)}
              >
                <FolderOutlined style={{ marginRight: 6, color: '#faad14' }} /> {f.title}
              </div>
            ))}
        </div>
      </Modal>
    </div>
  );
}

/** 递归更新 items 树中指定节点的 children */
function updateChildren(items: TreeItem[], parentId: string, children: TreeItem[]): TreeItem[] {
  return items.map((item) => {
    if (item.id === parentId) {
      return { ...item, children };
    }
    if (item.children && item.children.length > 0) {
      return { ...item, children: updateChildren(item.children, parentId, children) };
    }
    return item;
  });
}
