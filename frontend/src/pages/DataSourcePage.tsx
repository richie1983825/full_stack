import { useEffect, useState } from 'react';
import {
  Button,
  Form,
  Input,
  InputNumber,
  Modal,
  Select,
  Space,
  Table,
  message,
} from 'antd';
import { PlusOutlined, DeleteOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { datasourceApi } from '../api/datasource';
import DbTypeIcon from '../components/Charts/DbTypeIcon';
import type {
  CreateDataSourcePayload,
  DataSource,
  UpdateDataSourcePayload,
} from '../types';

const dbTypeOptions = [
  { label: 'PostgreSQL', value: 'postgres' },
  { label: 'MySQL', value: 'mysql' },
];

export default function DataSourcePage() {
  const [dataSources, setDataSources] = useState<DataSource[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingDs, setEditingDs] = useState<DataSource | null>(null);
  const [form] = Form.useForm();
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const loadData = async () => {
    setLoading(true);
    try {
      const list = await datasourceApi.list();
      setDataSources(list);
    } catch {
      message.error('加载失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, []);

  const openCreate = () => {
    setEditingDs(null);
    form.resetFields();
    form.setFieldsValue({ dbType: 'postgres', port: 5432 });
    setModalOpen(true);
  };

  const openEdit = (ds: DataSource) => {
    setEditingDs(ds);
    form.setFieldsValue({
      name: ds.name,
      description: ds.description,
      dbType: ds.dbType,
      host: ds.host,
      port: ds.port,
      database: ds.database,
      username: ds.username,
    });
    setModalOpen(true);
  };

  const handleSubmit = async () => {
    const values = await form.validateFields();
    try {
      if (editingDs) {
        const payload: UpdateDataSourcePayload = {
          name: values.name,
          description: values.description,
          dbType: values.dbType,
          host: values.host,
          port: values.port,
          database: values.database,
          username: values.username,
          password: values.password || undefined,
        };
        await datasourceApi.update(editingDs.id, payload);
        message.success('数据源已更新');
      } else {
        const payload: CreateDataSourcePayload = {
          name: values.name,
          description: values.description,
          dbType: values.dbType,
          host: values.host,
          port: values.port,
          database: values.database,
          username: values.username,
          password: values.password,
        };
        await datasourceApi.create(payload);
        message.success('数据源已创建');
      }
      setModalOpen(false);
      void loadData();
    } catch (err) {
      message.error(err instanceof Error ? err.message : '保存失败');
    }
  };

  const handleBatchDelete = () => {
    if (selectedIds.length === 0) return;
    Modal.confirm({
      title: '删除数据源',
      content: `确认删除选中的 ${selectedIds.length} 个数据源？`,
      okText: '删除',
      okType: 'danger',
      cancelText: '取消',
      onOk: async () => {
        await Promise.all(selectedIds.map((id) => datasourceApi.delete(id)));
        message.success(`已删除 ${selectedIds.length} 个数据源`);
        setSelectedIds([]);
        void loadData();
      },
    });
  };

  const columns: ColumnsType<DataSource> = [
    {
      title: '名称',
      dataIndex: 'name',
      render: (name: string, record) => (
        <a onClick={() => openEdit(record)} style={{ cursor: 'pointer' }}>
          {name}
        </a>
      ),
    },
    {
      title: '类型',
      dataIndex: 'dbType',
      width: 60,
      render: (t: string) => <DbTypeIcon type={t} size={20} />,
    },
    { title: '主机', dataIndex: 'host', width: 140 },
    { title: '端口', dataIndex: 'port', width: 80 },
    { title: '数据库', dataIndex: 'database', width: 140 },
    { title: '用户名', dataIndex: 'username', width: 120 },
    { title: '描述', dataIndex: 'description', ellipsis: true },
  ];

  return (
    <div className="admin-page">
      <div className="admin-page-header">
        <h2>数据源管理</h2>
        <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
          新建数据源
        </Button>
      </div>

      {selectedIds.length > 0 && (
        <div style={{ marginBottom: 12, padding: '8px 12px', background: '#e6f4ff', borderRadius: 6, display: 'flex', alignItems: 'center', gap: 12 }}>
          <span>已选择 <strong>{selectedIds.length}</strong> 个数据源</span>
          <Button danger icon={<DeleteOutlined />} onClick={handleBatchDelete}>删除</Button>
        </div>
      )}

      <Table
        rowKey="id"
        loading={loading}
        columns={columns}
        dataSource={dataSources}
        rowSelection={{
          selectedRowKeys: selectedIds,
          onChange: (keys) => setSelectedIds(keys as string[]),
        }}
        pagination={{ pageSize: 20, hideOnSinglePage: true }}
      />

      <Modal
        title={editingDs ? '编辑数据源' : '新建数据源'}
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        onOk={() => void handleSubmit()}
        okText="保存"
        cancelText="取消"
        width={560}
        destroyOnClose
      >
        <Form form={form} layout="vertical">
          <Form.Item name="name" label="名称" rules={[{ required: true, message: '请输入名称' }]}>
            <Input placeholder="例如：生产数据库" />
          </Form.Item>
          <Form.Item name="description" label="描述">
            <Input.TextArea rows={2} placeholder="可选描述" />
          </Form.Item>
          <Form.Item name="dbType" label="数据库类型" rules={[{ required: true }]}>
            <Select options={dbTypeOptions} />
          </Form.Item>
          <Space style={{ width: '100%' }} align="start">
            <Form.Item name="host" label="主机地址" rules={[{ required: true }]} style={{ flex: 1 }}>
              <Input placeholder="localhost 或 IP" />
            </Form.Item>
            <Form.Item name="port" label="端口" rules={[{ required: true }]} style={{ width: 120 }}>
              <InputNumber min={1} max={65535} style={{ width: '100%' }} />
            </Form.Item>
          </Space>
          <Form.Item name="database" label="数据库名" rules={[{ required: true }]}>
            <Input placeholder="例如：my_database" />
          </Form.Item>
          <Form.Item name="username" label="用户名" rules={[{ required: true }]}>
            <Input placeholder="数据库用户名" />
          </Form.Item>
          <Form.Item
            name="password"
            label={editingDs ? '密码（留空则不修改）' : '密码'}
            rules={editingDs ? [] : [{ required: true, message: '请输入密码' }]}
          >
            <Input.Password placeholder="数据库密码" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
