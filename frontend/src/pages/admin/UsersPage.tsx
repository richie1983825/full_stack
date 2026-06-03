import { useEffect, useState } from 'react';
import {
  Button,
  Form,
  Input,
  Modal,
  Popconfirm,
  Select,
  Space,
  Switch,
  Table,
  Tag,
  message,
} from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { adminApi, type CreateUserPayload, type RoleDetail } from '../../api/admin';
import type { UserProfile } from '../../api/auth';
import { useAuthStore } from '../../stores/useAuthStore';

export default function UsersPage() {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [roles, setRoles] = useState<RoleDetail[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserProfile | null>(null);
  const [form] = Form.useForm();
  const canWrite = useAuthStore((s) => s.hasPermission('users:write'));
  const canAdmin = useAuthStore((s) => s.hasPermission('users:admin'));

  const loadData = async () => {
    setLoading(true);
    try {
      const [userList, roleList] = await Promise.all([
        adminApi.listUsers(),
        adminApi.listRoles(),
      ]);
      setUsers(userList);
      setRoles(roleList);
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
    setEditingUser(null);
    form.resetFields();
    form.setFieldsValue({ is_active: true, is_grafana_admin: false, role_ids: [] });
    setModalOpen(true);
  };

  const openEdit = (user: UserProfile) => {
    setEditingUser(user);
    form.setFieldsValue({
      username: user.username,
      email: user.email,
      display_name: user.display_name,
      is_active: user.is_active,
      is_grafana_admin: user.is_grafana_admin,
      role_ids: user.roles.map((role) => role.id),
    });
    setModalOpen(true);
  };

  const handleSubmit = async () => {
    const values = await form.validateFields();
    try {
      if (editingUser) {
        await adminApi.updateUser(editingUser.id, {
          email: values.email,
          display_name: values.display_name,
          password: values.password || undefined,
          is_active: values.is_active,
          is_grafana_admin: values.is_grafana_admin,
          role_ids: values.role_ids,
        });
        message.success('用户已更新');
      } else {
        const payload: CreateUserPayload = values;
        await adminApi.createUser(payload);
        message.success('用户已创建');
      }
      setModalOpen(false);
      void loadData();
    } catch (err) {
      message.error(err instanceof Error ? err.message : '保存失败');
    }
  };

  const columns: ColumnsType<UserProfile> = [
    { title: '用户名', dataIndex: 'username', width: 120 },
    { title: '显示名', dataIndex: 'display_name', width: 140 },
    { title: '邮箱', dataIndex: 'email', ellipsis: true },
    {
      title: '角色',
      dataIndex: 'roles',
      render: (roles: UserProfile['roles']) =>
        roles.map((role) => (
          <Tag key={role.id} color={role.is_system ? 'blue' : 'default'}>
            {role.name}
          </Tag>
        )),
    },
    {
      title: '状态',
      dataIndex: 'is_active',
      width: 90,
      render: (active: boolean) => (
        <Tag color={active ? 'green' : 'default'}>{active ? '启用' : '禁用'}</Tag>
      ),
    },
    {
      title: '超级管理员',
      dataIndex: 'is_grafana_admin',
      width: 120,
      render: (value: boolean) => (value ? <Tag color="gold">是</Tag> : '否'),
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
          {canAdmin && record.username !== 'admin' && (
            <Popconfirm
              title="确认删除该用户？"
              onConfirm={async () => {
                await adminApi.deleteUser(record.id);
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
        <h2>用户管理</h2>
        {canWrite && (
          <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
            新建用户
          </Button>
        )}
      </div>

      <Table rowKey="id" loading={loading} columns={columns} dataSource={users} />

      <Modal
        title={editingUser ? '编辑用户' : '新建用户'}
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        onOk={() => void handleSubmit()}
        okText="保存"
        cancelText="取消"
        width={560}
      >
        <Form form={form} layout="vertical">
          {!editingUser && (
            <Form.Item name="username" label="用户名" rules={[{ required: true, message: '请输入用户名' }]}>
              <Input />
            </Form.Item>
          )}
          <Form.Item name="display_name" label="显示名" rules={[{ required: true, message: '请输入显示名' }]}>
            <Input />
          </Form.Item>
          <Form.Item name="email" label="邮箱" rules={[{ required: true, type: 'email', message: '请输入有效邮箱' }]}>
            <Input />
          </Form.Item>
          <Form.Item
            name="password"
            label={editingUser ? '密码（留空则不修改）' : '密码'}
            rules={editingUser ? [] : [{ required: true, message: '请输入密码' }]}
          >
            <Input.Password />
          </Form.Item>
          <Form.Item name="role_ids" label="角色">
            <Select
              mode="multiple"
              placeholder="请选择角色"
              options={roles.map((role) => ({ label: role.name, value: role.id }))}
            />
          </Form.Item>
          <Form.Item name="is_active" label="启用账号" valuePropName="checked">
            <Switch />
          </Form.Item>
          <Form.Item name="is_grafana_admin" label="超级管理员" valuePropName="checked">
            <Switch />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
