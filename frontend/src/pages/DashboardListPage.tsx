import { useEffect, useState } from 'react';
import { Button, Card, Col, Empty, Input, Modal, Popconfirm, Row, Space, Spin, Tag, message } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import { Link, useNavigate } from 'react-router-dom';
import { useDashboardStore } from '../stores/useDashboardStore';

export default function DashboardListPage() {
  const navigate = useNavigate();
  const { dashboards, loadDashboards, createDashboard, deleteDashboard, loading } =
    useDashboardStore();
  const [createOpen, setCreateOpen] = useState(false);
  const [title, setTitle] = useState('');

  useEffect(() => {
    void loadDashboards();
  }, [loadDashboards]);

  const handleCreate = async () => {
    if (!title.trim()) {
      message.warning('请输入仪表盘名称');
      return;
    }
    try {
      const dashboard = await createDashboard(title.trim());
      setCreateOpen(false);
      setTitle('');
      navigate(`/dashboards/${dashboard.id}`);
    } catch (err) {
      message.error(err instanceof Error ? err.message : '创建失败');
    }
  };

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
        <Row gutter={[16, 16]}>
          {dashboards.map((item) => (
            <Col key={item.id} xs={24} sm={12} lg={8}>
              <Card
                hoverable
                actions={[
                  <Link key="edit" to={`/dashboards/${item.id}`}>
                    <EditOutlined /> 编辑
                  </Link>,
                  <Popconfirm
                    key="delete"
                    title="确认删除该仪表盘？"
                    onConfirm={async () => {
                      await deleteDashboard(item.id);
                      message.success('已删除');
                    }}
                  >
                    <span style={{ color: '#ff4d4f' }}>
                      <DeleteOutlined /> 删除
                    </span>
                  </Popconfirm>,
                ]}
              >
                <Card.Meta
                  title={item.title}
                  description={
                    <Space direction="vertical" size={4}>
                      <span>{item.description || '无描述'}</span>
                      <Tag>{item.panelCount} 个组件</Tag>
                    </Space>
                  }
                />
              </Card>
            </Col>
          ))}
        </Row>
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
