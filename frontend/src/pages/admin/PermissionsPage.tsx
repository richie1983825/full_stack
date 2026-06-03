import { useEffect, useState } from 'react';
import { Card, Collapse, Table, Tag, message } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { adminApi, type PermissionGroup, type PermissionItem } from '../../api/admin';

const resourceLabels: Record<string, string> = {
  dashboards: '仪表盘',
  users: '用户',
  roles: '角色',
  settings: '设置',
};

const actionLabels: Record<string, string> = {
  read: '查看',
  write: '编辑',
  admin: '管理',
};

export default function PermissionsPage() {
  const [groups, setGroups] = useState<PermissionGroup[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const data = await adminApi.listPermissionsGrouped();
        setGroups(data);
      } catch (err) {
        message.error(err instanceof Error ? err.message : '加载失败');
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, []);

  const columns: ColumnsType<PermissionItem> = [
    { title: '权限码', dataIndex: 'code', width: 180 },
    {
      title: '操作类型',
      dataIndex: 'action',
      width: 100,
      render: (action: string) => actionLabels[action] ?? action,
    },
    { title: '说明', dataIndex: 'description' },
    {
      title: '资源',
      dataIndex: 'resource',
      width: 120,
      render: (resource: string) => (
        <Tag>{resourceLabels[resource] ?? resource}</Tag>
      ),
    },
  ];

  return (
    <div className="admin-page">
      <div className="admin-page-header">
        <h2>权限管理</h2>
      </div>

      <Card loading={loading} className="permissions-card">
        <Collapse
          defaultActiveKey={groups.map((group) => group.resource)}
          items={groups.map((group) => ({
            key: group.resource,
            label: (
              <span>
                <Tag color="blue">{resourceLabels[group.resource] ?? group.resource}</Tag>
                共 {group.permissions.length} 项权限
              </span>
            ),
            children: (
              <Table
                rowKey="id"
                size="small"
                pagination={false}
                columns={columns}
                dataSource={group.permissions}
              />
            ),
          }))}
        />
      </Card>
    </div>
  );
}
