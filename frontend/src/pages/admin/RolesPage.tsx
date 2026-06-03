import { useEffect, useState } from 'react';
import {
  Button,
  Form,
  Input,
  Modal,
  Popconfirm,
  Select,
  Space,
  Table,
  Tag,
  message,
} from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import {
  adminApi,
  type CreateRolePayload,
  type PermissionItem,
  type RoleDetail,
} from '../../api/admin';
import { useAuthStore } from '../../stores/useAuthStore';

export default function RolesPage() {
  const [roles, setRoles] = useState<RoleDetail[]>([]);
  const [permissions, setPermissions] = useState<PermissionItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<RoleDetail | null>(null);
  const [form] = Form.useForm();
  const canWrite = useAuthStore((s) => s.hasPermission('roles:write'));

  const loadData = async () => {
    setLoading(true);
    try {
      const [roleList, permissionList] = await Promise.all([
        adminApi.listRoles(),
        adminApi.listPermissions(),
      ]);
      setRoles(roleList);
      setPermissions(permissionList);
    } catch (err) {
      message.error(err instanceof Error ? err.message : '加载失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, []);

  const openCreate = () => {
    setEditingRole(null);
    form.resetFields();
    form.setFieldsValue({ permission_ids: [] });
    setModalOpen(true);
  };

  const openEdit = (role: RoleDetail) => {
    setEditingRole(role);
    form.setFieldsValue({
      name: role.name,
      description: role.description,
      permission_ids: role.permissions.map((item) => item.id),
    });
    setModalOpen(true);
  };

  const handleSubmit = async () => {
    const values = await form.validateFields();
    try {
      if (editingRole) {
        await adminApi.updateRole(editingRole.id, values);
        message.success('角色已更新');
      } else {
        await adminApi.createRole(values as CreateRolePayload);
        message.success('角色已创建');
      }
      setModalOpen(false);
      void loadData();
    } catch (err) {
      message.error(err instanceof Error ? err.message : '保存失败');
    }
  };

  const columns: ColumnsType<RoleDetail> = [
    {
      title: '角色名称',
      dataIndex: 'name',
      render: (name: string, record) => (
        <Space>
          <strong>{name}</strong>
          {record.is_system && <Tag color="blue">系统内置</Tag>}
        </Space>
      ),
    },
    { title: '描述', dataIndex: 'description', ellipsis: true },
    {
      title: '权限',
      dataIndex: 'permissions',
      render: (items: RoleDetail['permissions']) =>
        items.map((item) => <Tag key={item.id}>{item.code}</Tag>),
    },
    {
      title: '操作',
      width: 160,
      render: (_, record) => (
        <Space>
          {canWrite && (
            <Button type="link" size="small" onClick={() => openEdit(record)}>
              编辑
            </Button>
          )}
          {canWrite && !record.is_system && (
            <Popconfirm
              title="确认删除该角色？"
              onConfirm={async () => {
                await adminApi.deleteRole(record.id);
                message.success('已删除');
                void loadData();
              }}
            >
              <Button type="link" size="small" danger>
                删除
              </Button>
            </Popconfirm>
          )}
        </Space>
      ),
    },
  ];

  return (
    <div className="admin-page">
      <div className="admin-page-header">
        <h2>角色管理</h2>
        {canWrite && (
          <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
            新建角色
          </Button>
        )}
      </div>

      <Table rowKey="id" loading={loading} columns={columns} dataSource={roles} />

      <Modal
        title={editingRole ? '编辑角色' : '新建角色'}
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        onOk={() => void handleSubmit()}
        okText="保存"
        cancelText="取消"
        width={640}
      >
        <Form form={form} layout="vertical">
          <Form.Item name="name" label="角色名称" rules={[{ required: true, message: '请输入角色名称' }]}>
            <Input disabled={editingRole?.is_system} />
          </Form.Item>
          <Form.Item name="description" label="描述">
            <Input.TextArea rows={2} placeholder="角色说明" />
          </Form.Item>
          <Form.Item name="permission_ids" label="权限">
            <Select
              mode="multiple"
              placeholder="请选择权限"
              optionFilterProp="label"
              options={permissions.map((item) => ({
                label: `${item.code} — ${item.description}`,
                value: item.id,
              }))}
            />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
