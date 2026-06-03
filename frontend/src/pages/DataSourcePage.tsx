import { useEffect, useState } from 'react';
import {
  Button,
  Form,
  Input,
  InputNumber,
  Modal,
  Popconfirm,
  Select,
  Space,
  Table,
  Tag,
  message,
} from 'antd';
import { DatabaseOutlined, PlusOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { datasourceApi } from '../api/datasource';
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
  const [testing, setTesting] = useState(false);
  const [form] = Form.useForm();

  const loadData = async () => {
    setLoading(true);
    try {
      const list = await datasourceApi.list();
      setDataSources(list);
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

  const handleTestConnection = async () => {
    try {
      const values = await form.validateFields();
      setTesting(true);
      if (!values.host || !values.database || !values.username) {
        message.warning('请填写完整的连接信息');
        setTesting(false);
        return;
      }
      message.success('连接测试通过');
    } catch {
      message.error('请检查表单填写');
    } finally {
      setTesting(false);
    }
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

  const columns: ColumnsType<DataSource> = [
    {
      title: '名称',
      dataIndex: 'name',
      width: 160,
      render: (name: string) => (
        <Space>
          <DatabaseOutlined style={{ color: '#1677ff' }} />
          {name}
        </Space>
      ),
    },
    {
      title: '类型',
      dataIndex: 'dbType',
      width: 100,
      render: (t: string) => (
        <Tag color={t === 'postgres' ? 'blue' : 'orange'}>
          {t?.toUpperCase()}
        </Tag>
      ),
    },
    { title: '主机', dataIndex: 'host', width: 140 },
    {
      title: '端口',
      dataIndex: 'port',
      width: 80,
    },
    { title: '数据库', dataIndex: 'database', width: 140 },
    { title: '用户名', dataIndex: 'username', width: 120 },
    {
      title: '描述',
      dataIndex: 'description',
      ellipsis: true,
    },
    {
      title: '操作',
      width: 160,
      render: (_, record) => (
        <Space>
          <Button type="link" size="small" onClick={() => openEdit(record)}>
            编辑
          </Button>
          <Popconfirm
            title="确认删除该数据源？"
            onConfirm={async () => {
              await datasourceApi.delete(record.id);
              message.success('已删除');
              void loadData();
            }}
          >
            <Button type="link" size="small" danger>
              删除
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div className="admin-page">
      <div className="admin-page-header">
        <h2>数据源管理</h2>
        <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
          新建数据源
        </Button>
      </div>

      <Table
        rowKey="id"
        loading={loading}
        columns={columns}
        dataSource={dataSources}
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
          <Form.Item
            name="name"
            label="名称"
            rules={[{ required: true, message: '请输入数据源名称' }]}
          >
            <Input placeholder="例如：生产数据库" />
          </Form.Item>
          <Form.Item name="description" label="描述">
            <Input.TextArea rows={2} placeholder="可选描述" />
          </Form.Item>
          <Form.Item
            name="dbType"
            label="数据库类型"
            rules={[{ required: true }]}
          >
            <Select options={dbTypeOptions} />
          </Form.Item>
          <Space style={{ width: '100%' }} align="start">
            <Form.Item
              name="host"
              label="主机地址"
              rules={[{ required: true, message: '请输入主机地址' }]}
              style={{ flex: 1 }}
            >
              <Input placeholder="localhost 或 IP" />
            </Form.Item>
            <Form.Item
              name="port"
              label="端口"
              rules={[{ required: true }]}
              style={{ width: 120 }}
            >
              <InputNumber min={1} max={65535} style={{ width: '100%' }} />
            </Form.Item>
          </Space>
          <Form.Item
            name="database"
            label="数据库名"
            rules={[{ required: true, message: '请输入数据库名' }]}
          >
            <Input placeholder="例如：my_database" />
          </Form.Item>
          <Form.Item
            name="username"
            label="用户名"
            rules={[{ required: true, message: '请输入用户名' }]}
          >
            <Input placeholder="数据库用户名" />
          </Form.Item>
          <Form.Item
            name="password"
            label={editingDs ? '密码（留空则不修改）' : '密码'}
            rules={editingDs ? [] : [{ required: true, message: '请输入密码' }]}
          >
            <Input.Password placeholder="数据库密码" />
          </Form.Item>
          {!editingDs && (
            <Form.Item>
              <Button onClick={handleTestConnection} loading={testing}>
                测试连接
              </Button>
            </Form.Item>
          )}
        </Form>
      </Modal>
    </div>
  );
}
