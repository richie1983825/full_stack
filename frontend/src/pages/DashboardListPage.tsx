import { useEffect, useState, useCallback, useMemo } from 'react';
import {
  Button,
  Dropdown,
  Empty,
  Input,
  Modal,
  Spin,
  Table,
  Tag,
  message,
} from 'antd';
import {
  PlusOutlined,
  DeleteOutlined,
  FolderOutlined,
  CaretDownOutlined,
  CaretUpOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { Link } from 'react-router-dom';
import { useDashboardStore } from '../stores/useDashboardStore';
import { dashboardApi } from '../api/dashboard';
import type { DashboardSummary } from '../types/dashboard';

interface FolderCrumb {
  id: string;
  title: string;
}

interface TreeItem extends DashboardSummary {
  children?: TreeItem[];
}

type FlatRowKind = 'item' | 'empty';

interface FlatRow {
  key: string;
  rowKind: FlatRowKind;
  depth: number;
  item?: TreeItem;
  parentFolderId?: string;
}

/** 文件夹行内：箭头(22) + 间距(4) + 图标(14) + 间距(6) = 名称文字起始位置 */
const FOLDER_NAME_OFFSET = 46;

function flattenDisplayRows(items: TreeItem[], expandedKeys: string[], depth = 0): FlatRow[] {
  const rows: FlatRow[] = [];
  for (const item of items) {
    rows.push({ key: item.id, rowKind: 'item', depth, item });
    if (item.kind === 'folder' && expandedKeys.includes(item.id)) {
      const children = item.children ?? [];
      if (children.length === 0) {
        rows.push({
          key: `${item.id}__empty`,
          rowKind: 'empty',
          depth: depth + 1,
          parentFolderId: item.id,
        });
      } else {
        rows.push(...flattenDisplayRows(children, expandedKeys, depth + 1));
      }
    }
  }
  return rows;
}

/** 按层级缩进，使子级名称与同层文件夹名称文字左对齐 */
function rowContentOffset(depth: number): number {
  return depth * FOLDER_NAME_OFFSET;
}

export default function DashboardListPage() {
  const { deleteDashboard } = useDashboardStore();
  const [items, setItems] = useState<TreeItem[]>([]);
  const [rootFolders, setRootFolders] = useState<DashboardSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [createKind, setCreateKind] = useState<'folder' | 'dashboard'>('dashboard');
  const [createParentId, setCreateParentId] = useState<string | undefined>(undefined);
  const [title, setTitle] = useState('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [folderPath, setFolderPath] = useState<FolderCrumb[]>([]);
  const [expandedKeys, setExpandedKeys] = useState<string[]>([]);
  const [moveOpen, setMoveOpen] = useState(false);
  const [renameOpen, setRenameOpen] = useState(false);
  const [renameTitle, setRenameTitle] = useState('');

  const currentFolderId = folderPath.length > 0 ? folderPath[folderPath.length - 1].id : null;
  const inFolder = folderPath.length > 0;
  const dashboardsInView = items.filter((i) => i.kind === 'dashboard');

  const loadChildren = useCallback(async (parentId: string): Promise<TreeItem[]> => {
    try {
      const list = await dashboardApi.listChildren(parentId);
      return list.map((i) => ({
        ...i,
        children: i.kind === 'folder' ? [] : undefined,
      }));
    } catch {
      return [];
    }
  }, []);

  const loadItems = useCallback(async () => {
    setLoading(true);
    try {
      const list = currentFolderId
        ? await dashboardApi.listChildren(currentFolderId)
        : await dashboardApi.listTree();
      setItems(
        list.map((i) => ({
          ...i,
          children: i.kind === 'folder' ? [] : undefined,
        })),
      );
    } catch {
      message.error('加载失败');
    } finally {
      setLoading(false);
    }
  }, [currentFolderId]);

  const loadRootFolders = useCallback(async () => {
    try {
      const list = await dashboardApi.listTree();
      setRootFolders(list.filter((i) => i.kind === 'folder'));
    } catch {
      setRootFolders([]);
    }
  }, []);

  useEffect(() => {
    void loadItems();
    setExpandedKeys([]);
  }, [loadItems]);

  useEffect(() => {
    void loadRootFolders();
  }, [loadRootFolders]);

  const enterFolder = (record: DashboardSummary) => {
    setFolderPath((prev) => [...prev, { id: record.id, title: record.title }]);
    setSelectedIds([]);
    setExpandedKeys([]);
  };

  const goUp = () => {
    setFolderPath((prev) => prev.slice(0, -1));
    setSelectedIds([]);
    setExpandedKeys([]);
  };

  const toggleFolderExpand = async (record: TreeItem) => {
    const isExpanded = expandedKeys.includes(record.id);
    if (isExpanded) {
      setExpandedKeys((prev) => prev.filter((k) => k !== record.id));
      return;
    }

    const children = await loadChildren(record.id);
    setItems((prev) => updateChildren(prev, record.id, children));
    setExpandedKeys((prev) => [...prev, record.id]);
  };

  const openCreate = (kind: 'folder' | 'dashboard', parentId?: string) => {
    setCreateKind(kind);
    setCreateParentId(parentId ?? currentFolderId ?? undefined);
    setCreateOpen(true);
  };

  const openRename = () => {
    if (!inFolder) return;
    setRenameTitle(folderPath[folderPath.length - 1].title);
    setRenameOpen(true);
  };

  const handleRename = async () => {
    if (!currentFolderId) return;
    const nextTitle = renameTitle.trim();
    if (!nextTitle) {
      message.warning('请输入文件夹名称');
      return;
    }
    try {
      await dashboardApi.update(currentFolderId, { title: nextTitle });
      setFolderPath((prev) => {
        const next = [...prev];
        next[next.length - 1] = { ...next[next.length - 1], title: nextTitle };
        return next;
      });
      setRenameOpen(false);
      void loadRootFolders();
      message.success('文件夹名称已更新');
    } catch (err) {
      message.error(err instanceof Error ? err.message : '修改失败');
    }
  };

  const handleCreate = async () => {
    if (!title.trim()) {
      message.warning('请输入名称');
      return;
    }
    const parentId = createParentId;
    try {
      await dashboardApi.create({
        title: title.trim(),
        kind: createKind,
        parentId,
      });
      setCreateOpen(false);
      setTitle('');
      void loadItems();
      void loadRootFolders();
      if (parentId && expandedKeys.includes(parentId)) {
        const children = await loadChildren(parentId);
        setItems((prev) => updateChildren(prev, parentId, children));
      }
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
        void loadItems();
        void loadRootFolders();
      },
    });
  };

  const handleBatchMove = async (targetId: string | null) => {
    if (selectedIds.length === 0) return;
    await Promise.all(selectedIds.map((id) => dashboardApi.move(id, targetId)));
    message.success(`已移动 ${selectedIds.length} 个项目`);
    setSelectedIds([]);
    setMoveOpen(false);
    void loadItems();
    void loadRootFolders();
  };

  const columns: ColumnsType<FlatRow> = [
    {
      title: '名称',
      dataIndex: 'title',
      render: (_name, row) => {
        if (row.rowKind === 'empty') {
          return (
            <div
              className="dashboard-folder-inline-empty"
              style={{ paddingLeft: rowContentOffset(row.depth) }}
            >
              <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="此文件夹暂无仪表盘">
                <Button
                  type="primary"
                  size="small"
                  icon={<PlusOutlined />}
                  onClick={() => openCreate('dashboard', row.parentFolderId)}
                >
                  新建仪表盘
                </Button>
              </Empty>
            </div>
          );
        }

        const record = row.item!;
        const name = record.title;
        const offset = rowContentOffset(row.depth);

        if (record.kind === 'folder') {
          return (
            <span className="dashboard-folder-row" style={{ paddingLeft: offset }}>
              <button
                type="button"
                className="dashboard-folder-arrow-btn"
                aria-label={expandedKeys.includes(record.id) ? '收起' : '展开'}
                aria-expanded={expandedKeys.includes(record.id)}
                onClick={(e) => {
                  e.stopPropagation();
                  void toggleFolderExpand(record);
                }}
              >
                {expandedKeys.includes(record.id) ? (
                  <CaretUpOutlined />
                ) : (
                  <CaretDownOutlined />
                )}
              </button>
              <button
                type="button"
                className="dashboard-folder-name-btn"
                onClick={() => enterFolder(record)}
              >
                <FolderOutlined className="dashboard-folder-icon" />
                <span>{name}</span>
              </button>
            </span>
          );
        }

        return (
          <span className="dashboard-item-name" style={{ paddingLeft: offset }}>
            <Link to={`/dashboards/${record.id}`}>{name}</Link>
          </span>
        );
      },
    },
    {
      title: '创建人',
      width: 100,
      render: (_, row) => (row.rowKind === 'item' && row.item?.kind === 'dashboard' ? '—' : null),
    },
    {
      title: '所属团队',
      width: 120,
      render: (_, row) => (row.rowKind === 'item' && row.item?.kind === 'dashboard' ? '—' : null),
    },
    {
      title: '定时快照',
      width: 100,
      render: (_, row) =>
        row.rowKind === 'item' && row.item?.kind === 'dashboard' ? <Tag>未开启</Tag> : null,
    },
    {
      title: '最近快照时间',
      width: 180,
      render: (_, row) => (row.rowKind === 'item' && row.item?.kind === 'dashboard' ? '—' : null),
    },
  ];

  const displayRows = useMemo(
    () => flattenDisplayRows(items, expandedKeys),
    [items, expandedKeys],
  );

  const pathTitle = useMemo(
    () => (folderPath.length > 0 ? `/${folderPath.map((f) => f.title).join('/')}` : '/'),
    [folderPath],
  );

  const showEmptyFolderHint = inFolder && !loading && dashboardsInView.length === 0 && items.length > 0;

  return (
    <div className="page-container">
      <div className="admin-page-header">
        <div className="dashboard-page-title">
          <h2>{pathTitle}</h2>
        </div>
        <div className="admin-page-header-actions">
          {inFolder && (
            <Button onClick={goUp}>返回上一层</Button>
          )}
          {inFolder && (
            <Button onClick={openRename}>重命名文件夹</Button>
          )}
          <Dropdown
            menu={{
              items: [
                {
                  key: 'dashboard',
                  label: '新建仪表盘',
                  onClick: () => openCreate('dashboard'),
                },
                {
                  key: 'folder',
                  label: '新建文件夹',
                  onClick: () => openCreate('folder'),
                },
              ],
            }}
          >
            <Button type="primary" icon={<PlusOutlined />}>
              新建
            </Button>
          </Dropdown>
        </div>
      </div>

      {selectedIds.length > 0 && (
        <div className="selection-bar">
          <span>
            已选择 <strong>{selectedIds.length}</strong> 个项目
          </span>
          <Button danger icon={<DeleteOutlined />} onClick={handleBatchDelete}>
            删除
          </Button>
          <Button onClick={() => setMoveOpen(true)}>移动</Button>
        </div>
      )}

      {loading && items.length === 0 && !inFolder ? (
        <div style={{ textAlign: 'center', padding: 80 }}>
          <Spin size="large" />
        </div>
      ) : !inFolder && items.length === 0 ? (
        <Empty description="暂无仪表盘或文件夹" />
      ) : (
        <>
          <Table
            className="dashboard-list-table"
            rowKey="key"
            loading={loading}
            columns={columns}
            dataSource={displayRows}
            rowSelection={{
              selectedRowKeys: selectedIds,
              onChange: (keys) => setSelectedIds(keys as string[]),
              getCheckboxProps: (row) => ({
                disabled: row.rowKind === 'empty',
                style: row.rowKind === 'empty' ? { display: 'none' } : undefined,
              }),
            }}
            onRow={(row) =>
              row.rowKind === 'empty' ? { className: 'dashboard-list-empty-row' } : {}
            }
            pagination={{ pageSize: 50, hideOnSinglePage: true }}
          />
          {inFolder && !loading && items.length === 0 && (
            <Empty
              className="dashboard-folder-empty-hint"
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              description="此文件夹暂无内容"
            >
              <Button type="primary" icon={<PlusOutlined />} onClick={() => openCreate('dashboard')}>
                新建仪表盘
              </Button>
            </Empty>
          )}
          {showEmptyFolderHint && (
            <Empty
              className="dashboard-folder-empty-hint"
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              description="此文件夹暂无仪表盘"
            >
              <Button type="primary" icon={<PlusOutlined />} onClick={() => openCreate('dashboard')}>
                新建仪表盘
              </Button>
            </Empty>
          )}
        </>
      )}

      <Modal
        title="修改文件夹名称"
        open={renameOpen}
        onCancel={() => setRenameOpen(false)}
        onOk={() => void handleRename()}
        okText="保存"
        cancelText="取消"
        destroyOnClose
      >
        <Input
          placeholder="文件夹名称"
          value={renameTitle}
          onChange={(e) => setRenameTitle(e.target.value)}
          onPressEnter={() => void handleRename()}
          autoFocus
        />
      </Modal>

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

      <Modal title="移动到" open={moveOpen} onCancel={() => setMoveOpen(false)} footer={null}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div
            style={{ padding: '8px 12px', cursor: 'pointer', borderRadius: 4, background: '#f0f0f0' }}
            onClick={() => void handleBatchMove(null)}
          >
            <FolderOutlined style={{ marginRight: 6 }} /> 根目录
          </div>
          {rootFolders
            .filter((f) => !selectedIds.includes(f.id))
            .map((f) => (
              <div
                key={f.id}
                style={{ padding: '8px 12px', cursor: 'pointer', borderRadius: 4 }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = '#e6f4ff';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = '';
                }}
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
